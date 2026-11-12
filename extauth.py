"""Eklenti için anahtarsız giriş.

- Eklentiden doğrudan kullanıcı adı + parola ile giriş / kayıt (anahtar kopyalamak yok).
- Google ile giriş (GOOGLE_CLIENT_ID ortam değişkeni ayarlıysa): yalnızca Google hesap kimliği (sub) saklanır,
  e-posta saklanmaz.
- Eklentiden siteye tek kullanımlık giriş bileti: eklentide giriş yapan, sitede tekrar parola yazmaz.
- Açılır pencere için tek istekte özet (seviye, seri, tekrar bekleyen kelimeler, son kelimeler).
"""
import datetime as dt
import hmac
import os
import re
import secrets
import time

import requests
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

import srs
import vocab
from accounts import (COOKIE, NO_PW, Cred, _hash, _login_response, _new_recovery, _new_session, _sha, _throttle_ip,
                      ban_guard, check_login, create_user, need_user, q)

router = APIRouter()
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
# E-posta doğrulaması: Brevo anahtarı ve gönderen adresi ayarlıysa yeni hesap için e-posta kodu zorunlu olur.
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "").strip()
MAIL_FROM = os.environ.get("MAIL_FROM", "").strip()
MAIL_ON = bool(BREVO_API_KEY and MAIL_FROM)
CODE_MINUTES = 15
TICKET_SECONDS = 60
XP_LEVEL = 200
# Bilet yalnızca bu sayfalara götürür (açık yönlendirme olmasın)
DESTS = {"panel": "/account", "words": "/account#words", "practice": "/account#practice",
         "duel": "/account#duel", "leagues": "/account#leagues", "settings": "/account#settings", "daily": "/daily"}


def init():
    q("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;")
    q("CREATE UNIQUE INDEX IF NOT EXISTS users_google_idx ON users (google_sub) WHERE google_sub IS NOT NULL;")
    q("ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;")
    q("CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (lower(email)) WHERE email IS NOT NULL;")
    q("CREATE TABLE IF NOT EXISTS signups (email TEXT PRIMARY KEY, username TEXT NOT NULL, pw_hash TEXT NOT NULL, "
      "code_hash TEXT NOT NULL, tries INT NOT NULL DEFAULT 0, ref TEXT NOT NULL DEFAULT '', "
      "created_at TIMESTAMP DEFAULT now());")
    q("CREATE TABLE IF NOT EXISTS starred_words (user_id INT NOT NULL, src TEXT NOT NULL, dst TEXT NOT NULL, "
      "word TEXT NOT NULL, created_at TIMESTAMP DEFAULT now(), PRIMARY KEY (user_id, src, dst, word));")
    q("CREATE TABLE IF NOT EXISTS link_clicks (day DATE NOT NULL, src TEXT NOT NULL, n INT NOT NULL DEFAULT 0, "
      "PRIMARY KEY (day, src));")
    q("CREATE TABLE IF NOT EXISTS ext_tickets (hash TEXT PRIMARY KEY, user_id INT NOT NULL, "
      "created_at TIMESTAMP DEFAULT now());")


# ---------------------------------------------------------------- kullanıcı adı + parola
@router.get("/api/ext/config")
def config():
    return {"google": GOOGLE_CLIENT_ID, "mail": MAIL_ON}


@router.post("/api/ext/login")
def ext_login(c: Cred, request: Request):
    _throttle_ip(request)
    uid, name = check_login(c.username, c.password)
    return {"key": _new_session(uid), "username": name}


@router.post("/api/ext/register")
def ext_register(c: Cred, request: Request):
    _throttle_ip(request)
    if MAIL_ON:
        raise HTTPException(400, "E-posta doğrulaması gerekli. Eklentiyi güncelle.")
    name = c.username.strip()
    uid = create_user(name, c.password, c.ref)
    return {"key": _new_session(uid), "username": name, "recovery": _new_recovery(uid)}


# ---------------------------------------------------------------- e-posta kodu ile kayıt
def send_mail(to: str, subject: str, text: str):
    try:
        r = requests.post("https://api.brevo.com/v3/smtp/email", timeout=10,
                          headers={"api-key": BREVO_API_KEY, "accept": "application/json"},
                          json={"sender": {"name": "CineVocab", "email": MAIL_FROM}, "to": [{"email": to}],
                                "subject": subject, "textContent": text})
        ok = r.status_code < 300
        if not ok:
            print(f"   [mail] {r.status_code} {r.text[:200]}")
    except Exception as e:
        print(f"   [mail] {e}")
        ok = False
    if not ok:
        raise HTTPException(502, "E-posta gönderilemedi. Biraz sonra tekrar dene.")


_MAIL_TEXT = {
    "tr": ("CineVocab doğrulama kodun: {c}", "Merhaba {u},\n\nCineVocab hesabını açmak için kodun: {c}\n\n"
           "Kod {m} dakika geçerlidir. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin."),
    "en": ("Your CineVocab verification code: {c}", "Hi {u},\n\nYour code to create your CineVocab account is: {c}\n\n"
           "The code is valid for {m} minutes. If you did not ask for this, you can ignore this email."),
}


class SignupStart(BaseModel):
    username: str
    email: str
    password: str
    ref: str = ""
    lang: str = "en"


class SignupVerify(BaseModel):
    email: str
    code: str
    ext: bool = False


def _email(v: str) -> str:
    v = (v or "").strip().lower()
    if len(v) > 254 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]{2,}", v):
        raise HTTPException(400, "E-posta adresi geçersiz.")
    return v


def _code_hash(email: str, code: str) -> str:
    return _sha(email + ":" + re.sub(r"\D", "", code or ""))


@router.post("/api/signup/start")
def signup_start(d: SignupStart, request: Request):
    """Bilgileri denetler, 6 haneli kodu e-postayla yollar. Hesap ancak kod doğrulanınca açılır."""
    if not MAIL_ON:
        raise HTTPException(400, "E-posta doğrulaması kapalı.")
    _throttle_ip(request, 6, 600, "signup")
    name, email = d.username.strip(), _email(d.email)
    if not re.fullmatch(r"\w{3,16}", name):
        raise HTTPException(400, "Kullanıcı adı 3-16 karakter olmalı (harf, rakam, _).")
    if len(d.password) < 6:
        raise HTTPException(400, "Parola en az 6 karakter olmalı.")
    if q("SELECT 1 FROM users WHERE lower(username) = lower(%s);", (name,), True):
        raise HTTPException(409, "Bu kullanıcı adı alınmış.")
    if q("SELECT 1 FROM users WHERE lower(email) = %s;", (email,), True):
        raise HTTPException(409, "Bu e-posta zaten kayıtlı.")
    if q("SELECT 1 FROM signups WHERE email = %s AND created_at > now() - interval '45 seconds';", (email,), True):
        raise HTTPException(429, "Kod az önce gönderildi. Biraz bekle.")
    code = f"{secrets.randbelow(10 ** 6):06d}"
    q("DELETE FROM signups WHERE created_at < now() - interval '1 day';")
    q("INSERT INTO signups (email, username, pw_hash, code_hash, ref) VALUES (%s, %s, %s, %s, %s) "
      "ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, pw_hash = EXCLUDED.pw_hash, "
      "code_hash = EXCLUDED.code_hash, ref = EXCLUDED.ref, tries = 0, created_at = now();",
      (email, name, _hash(d.password), _code_hash(email, code), (d.ref or "")[:40]))
    subj, body = _MAIL_TEXT["tr" if d.lang == "tr" else "en"]
    send_mail(email, subj.format(c=code), body.format(u=name, c=code, m=CODE_MINUTES))
    return {"sent": True}


@router.post("/api/signup/verify")
def signup_verify(d: SignupVerify, request: Request, response: Response):
    _throttle_ip(request, 12, 60, "verify")
    email = _email(d.email)
    r = q("SELECT username, pw_hash, code_hash, tries, ref FROM signups WHERE email = %s "
          "AND created_at > now() - make_interval(mins => %s);", (email, CODE_MINUTES), True)
    if not r or r[0][3] >= 5:
        q("DELETE FROM signups WHERE email = %s;", (email,))
        raise HTTPException(422, "Kodun süresi doldu. Yeni kod iste.")
    name, pw_hash, code_hash, _tries, ref = r[0]
    if not hmac.compare_digest(code_hash, _code_hash(email, d.code)):
        q("UPDATE signups SET tries = tries + 1 WHERE email = %s;", (email,))
        raise HTTPException(422, "Kod hatalı.")
    if q("SELECT 1 FROM users WHERE lower(username) = lower(%s) OR lower(email) = %s;", (name, email), True):
        q("DELETE FROM signups WHERE email = %s;", (email,))
        raise HTTPException(409, "Bu kullanıcı adı ya da e-posta artık kullanımda.")
    uid = q("INSERT INTO users (username, pw_hash, email) VALUES (%s, %s, %s) RETURNING id;",
            (name, pw_hash, email), True)[0][0]
    q("DELETE FROM signups WHERE email = %s;", (email,))
    try:
        from growth import record_ref
        record_ref(uid, ref)
    except Exception as e:
        print(f"   [ref] {e}")
    if d.ext:
        return {"key": _new_session(uid), "username": name, "recovery": _new_recovery(uid)}
    out = _login_response(uid, request, response, name)
    out["recovery"] = _new_recovery(uid)
    return out


class NameReq(BaseModel):
    username: str


@router.post("/api/ext/username")
def set_username(d: NameReq, request: Request):
    """Google ile açılan hesap ilk girişte kullanıcı adını seçer (sonradan Ayarlar'dan da değişir)."""
    _throttle_ip(request, 20, 60, "settings")
    u = need_user(request)
    name = d.username.strip()
    if not re.fullmatch(r"\w{3,16}", name):
        raise HTTPException(400, "Kullanıcı adı 3-16 karakter olmalı (harf, rakam, _).")
    if q("SELECT 1 FROM users WHERE lower(username) = lower(%s) AND id <> %s;", (name, u["id"]), True):
        raise HTTPException(409, "Bu kullanıcı adı alınmış.")
    q("UPDATE users SET username = %s WHERE id = %s;", (name, u["id"]))
    return {"username": name}


def _bearer(request: Request) -> str:
    h = request.headers.get("authorization", "")
    return h[7:] if h.startswith("Bearer ") else ""


@router.post("/api/ext/logout")
def ext_logout(request: Request):
    """Yalnızca bu eklentinin oturumunu kapatır (sitedeki oturuma dokunmaz)."""
    t = _bearer(request)
    if t:
        q("DELETE FROM sessions WHERE token_hash = %s;", (_sha(t),))
    return {"ok": True}


# ---------------------------------------------------------------- Google ile giriş
_ISS = ("accounts.google.com", "https://accounts.google.com")


def google_claims(credential: str, nonce: str = "") -> dict:
    """Google kimlik belirtecini Google'a doğrulatır; geçerliyse içeriğini döner.
    İmza ve süre Google tarafında, hedef (aud), yayıncı (iss) ve tek kullanımlık değer (nonce) burada denetlenir."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google ile giriş şu an kapalı.")
    if not credential or len(credential) > 4096 or credential.count(".") != 2:
        raise HTTPException(400, "Geçersiz istek.")
    try:
        r = requests.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": credential}, timeout=8)
    except Exception:
        raise HTTPException(502, "Google'a ulaşılamadı. Biraz sonra tekrar dene.")
    if r.status_code != 200:
        raise HTTPException(401, "Google girişi doğrulanamadı.")
    c = r.json()
    try:
        exp = int(c.get("exp", 0))
    except (TypeError, ValueError):
        exp = 0
    if (c.get("aud") != GOOGLE_CLIENT_ID or c.get("iss") not in _ISS or not c.get("sub")
            or exp < time.time() or (nonce and c.get("nonce") != nonce)):
        raise HTTPException(401, "Google girişi doğrulanamadı.")
    return c


def _free_username(base: str) -> str:
    base = re.sub(r"[^\w]", "", base or "", flags=re.UNICODE)[:12]
    if len(base) < 3:
        base = "user"
    cand = base
    for _ in range(40):
        if not q("SELECT 1 FROM users WHERE lower(username) = lower(%s);", (cand,), True):
            return cand
        cand = f"{base}{secrets.randbelow(9000) + 1000}"
    return f"user{secrets.token_hex(4)}"


def google_user(c: dict, ref: str = ""):
    """Google hesabına bağlı kullanıcıyı bulur, yoksa açar. (id, kullanıcı adı, yeni mi)"""
    sub = str(c["sub"])[:64]
    r = q("SELECT id, username FROM users WHERE google_sub = %s;", (sub,), True)
    if r:
        ban_guard(r[0][0])
        return r[0][0], r[0][1], False
    name = _free_username(c.get("given_name") or c.get("name") or str(c.get("email", "")).split("@")[0])
    try:
        uid = q("INSERT INTO users (username, pw_hash, google_sub) VALUES (%s, %s, %s) RETURNING id;",
                (name, NO_PW, sub), True)[0][0]
    except Exception:
        # aynı anda iki istek: hesabı diğeri açmış olabilir
        r = q("SELECT id, username FROM users WHERE google_sub = %s;", (sub,), True)
        if not r:
            raise HTTPException(409, "Hesap açılamadı. Tekrar dene.")
        return r[0][0], r[0][1], False
    try:
        from growth import record_ref
        record_ref(uid, ref)
    except Exception as e:
        print(f"   [ref] {e}")
    return uid, name, True


class GoogleReq(BaseModel):
    credential: str
    nonce: str = ""
    ref: str = ""


@router.post("/api/google")
def site_google(d: GoogleReq, request: Request, response: Response):
    """Sitede Google ile giriş (çerez oturumu)."""
    _throttle_ip(request)
    uid, name, new = google_user(google_claims(d.credential), d.ref)
    out = _login_response(uid, request, response, name)
    out["new"] = new
    return out


@router.post("/api/ext/google")
def ext_google(d: GoogleReq, request: Request):
    """Eklentide Google ile giriş. Eklenti her girişte rastgele bir nonce üretir; belirteçteki değerle aynı olmalı."""
    _throttle_ip(request)
    if len(d.nonce) < 16:
        raise HTTPException(400, "Geçersiz istek.")
    uid, name, new = google_user(google_claims(d.credential, d.nonce), d.ref)
    return {"key": _new_session(uid), "username": name, "new": new}


# ---------------------------------------------------------------- eklentiden siteye tek kullanımlık giriş
@router.post("/api/ext/ticket")
def ticket(request: Request):
    """Eklentide giriş yapmış kullanıcı için 60 saniyelik, tek kullanımlık site giriş bileti."""
    _throttle_ip(request, 20, 60, "ticket")
    if not _bearer(request):
        raise HTTPException(401, "Giriş yapmalısın.")
    u = need_user(request)
    t = secrets.token_urlsafe(32)
    q("DELETE FROM ext_tickets WHERE created_at < now() - interval '10 minutes';")
    q("INSERT INTO ext_tickets (hash, user_id) VALUES (%s, %s);", (_sha(t), u["id"]))
    return {"ticket": t}


@router.get("/ext/go")
def go(request: Request, t: str = "", to: str = "panel"):
    """Bileti oturuma çevirir ve panele yönlendirir.
    Yalnızca tarayıcının kendisinin (eklentinin açtığı sekme, adres çubuğu) başlattığı gezinmede çalışır:
    başka bir sitedeki bağlantı ya da yönlendirme (Sec-Fetch-Site: cross-site) birini başkasının hesabına sokamaz."""
    dest = DESTS.get(to, "/account")
    resp = RedirectResponse(dest, status_code=303)
    resp.headers["Cache-Control"] = "no-store"
    resp.headers["Referrer-Policy"] = "no-referrer"
    if request.headers.get("sec-fetch-site", "") != "none" or not t or len(t) > 100:
        return resp
    r = q("DELETE FROM ext_tickets WHERE hash = %s AND created_at > now() - make_interval(secs => %s) "
          "RETURNING user_id;", (_sha(t), TICKET_SECONDS), True)
    if not r:
        return resp
    uid = r[0][0]
    try:
        ban_guard(uid)
    except HTTPException:
        return resp
    resp.set_cookie(COOKIE, _new_session(uid), httponly=True, samesite="lax", max_age=90 * 86400,
                    secure=request.headers.get("x-forwarded-proto") == "https")
    return resp


# ---------------------------------------------------------------- yıldızlı kelimeler
class StarReq(BaseModel):
    src: str
    dst: str
    word: str
    on: bool = True


@router.post("/api/star")
def star(d: StarReq, request: Request):
    """Video üstünde kelimeye tıklayınca yıldızlar / yıldızı kaldırır."""
    u = need_user(request)
    _throttle_ip(request, 120, 60, "star")
    vocab.check_pair(d.src, d.dst)
    w = vocab.low(d.word, d.src).strip()[:60]
    if not w:
        raise HTTPException(400, "Kelime geçersiz.")
    if d.on:
        if q("SELECT count(*) FROM starred_words WHERE user_id = %s;", (u["id"],), True)[0][0] >= 3000:
            raise HTTPException(400, "Yıldızlı kelime sınırına ulaştın.")
        q("INSERT INTO starred_words (user_id, src, dst, word) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING;",
          (u["id"], d.src, d.dst, w))
    else:
        q("DELETE FROM starred_words WHERE user_id = %s AND src = %s AND dst = %s AND word = %s;",
          (u["id"], d.src, d.dst, w))
    return {"ok": True, "on": d.on}


def starred(uid: int, src: str, dst: str) -> list:
    words = [r[0] for r in q("SELECT word FROM starred_words WHERE user_id = %s AND src = %s AND dst = %s "
                             "ORDER BY created_at DESC LIMIT 500;", (uid, src, dst), True)]
    tr = vocab.translation_of(src, dst, words)
    return [{"w": w, "t": tr.get(w, "")} for w in words]


# ---------------------------------------------------------------- açılır pencere özeti
def _streak(days: set, today: dt.date) -> int:
    d = today if today in days else today - dt.timedelta(days=1)
    n = 0
    while d in days:
        n += 1
        d -= dt.timedelta(days=1)
    return n


@router.get("/api/ext/home")
def home(request: Request, src: str = "tr", dst: str = "en"):
    u = need_user(request)
    uid = u["id"]
    vocab.check_pair(src, dst)
    today = srs.today()
    xp_rows = q("SELECT day, xp FROM xp_log WHERE user_id = %s AND xp > 0;", (uid,), True)
    xp = int(sum(r[1] for r in xp_rows))
    xp_today = int(next((r[1] for r in xp_rows if r[0] == today), 0))
    total = q("SELECT count(DISTINCT tr) FROM user_words WHERE user_id = %s;", (uid,), True)[0][0]
    try:
        total += q("SELECT count(DISTINCT (src, dst, word)) FROM user_words_ml WHERE user_id = %s;", (uid,), True)[0][0]
    except Exception:
        pass
    wins = q("SELECT coalesce(sum((place = 1)::int), 0) FROM game_results WHERE user_id = %s;", (uid,), True)[0][0]
    avatar = q("SELECT avatar FROM users WHERE id = %s;", (uid,), True)[0][0] or ""

    rows = vocab.rows_for(uid, src, dst)                       # yeni kelime en üstte
    words = srs._quality([(r[0], r[1]) for r in rows], src, dst)   # quizde sorulabilir olanlar
    stats = {w: s for w, s in srs._stats(uid, src, dst).items() if w in words}
    recent, seen = [], set()
    for w, tr, ep, _at in rows:
        if w in seen:
            continue
        seen.add(w)
        recent.append({"w": w, "t": tr, "ep": ep or ""})
        if len(recent) >= 40:
            break
    return {
        "username": u["username"], "avatar": avatar,
        "level": xp // XP_LEVEL + 1, "xp": xp, "xp_into": xp % XP_LEVEL, "xp_level": XP_LEVEL, "xp_today": xp_today,
        "streak": _streak({r[0] for r in xp_rows}, today), "wins": int(wins), "words": int(total),
        "pair_words": len({r[0] for r in rows}),
        "due": sum(1 for s in stats.values() if s["due"] <= today),
        "new": sum(1 for w in words if w not in stats),
        "mastered": sum(1 for s in stats.values() if s["box"] >= srs.MASTERED_BOX),
        "recent": recent,
        "starred": starred(uid, src, dst),
    }
