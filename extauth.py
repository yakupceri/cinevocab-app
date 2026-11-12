"""Eklenti için anahtarsız giriş.

- Eklentiden doğrudan kullanıcı adı + parola ile giriş / kayıt (anahtar kopyalamak yok).
- Google ile giriş (GOOGLE_CLIENT_ID ortam değişkeni ayarlıysa): yalnızca Google hesap kimliği (sub) saklanır,
  e-posta saklanmaz.
- Eklentiden siteye tek kullanımlık giriş bileti: eklentide giriş yapan, sitede tekrar parola yazmaz.
- Açılır pencere için tek istekte özet (seviye, seri, tekrar bekleyen kelimeler, son kelimeler).
"""
import datetime as dt
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
from accounts import (COOKIE, NO_PW, Cred, _login_response, _new_recovery, _new_session, _sha, _throttle_ip,
                      ban_guard, check_login, create_user, need_user, q)

router = APIRouter()
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
TICKET_SECONDS = 60
XP_LEVEL = 200
# Bilet yalnızca bu sayfalara götürür (açık yönlendirme olmasın)
DESTS = {"panel": "/account", "words": "/account#words", "practice": "/account#practice",
         "duel": "/account#duel", "leagues": "/account#leagues", "settings": "/account#settings", "daily": "/daily"}


def init():
    q("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;")
    q("CREATE UNIQUE INDEX IF NOT EXISTS users_google_idx ON users (google_sub) WHERE google_sub IS NOT NULL;")
    q("CREATE TABLE IF NOT EXISTS ext_tickets (hash TEXT PRIMARY KEY, user_id INT NOT NULL, "
      "created_at TIMESTAMP DEFAULT now());")


# ---------------------------------------------------------------- kullanıcı adı + parola
@router.get("/api/ext/config")
def config():
    return {"google": GOOGLE_CLIENT_ID}


@router.post("/api/ext/login")
def ext_login(c: Cred, request: Request):
    _throttle_ip(request)
    uid, name = check_login(c.username, c.password)
    return {"key": _new_session(uid), "username": name}


@router.post("/api/ext/register")
def ext_register(c: Cred, request: Request):
    _throttle_ip(request)
    name = c.username.strip()
    uid = create_user(name, c.password, c.ref)
    return {"key": _new_session(uid), "username": name, "recovery": _new_recovery(uid)}


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
    }
