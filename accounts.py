"""CineVocab hesap sistemi: kayıt, giriş, kişisel kelimeler, liderlik tablosu."""
import hashlib
import hmac
import os
import re
import secrets
import time

import psycopg2
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

router = APIRouter()
DB = {}
COOKIE = "cv"


def q(sql, params=(), fetch=False):
    conn = psycopg2.connect(**DB)
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        rows = cur.fetchall() if fetch else None
        conn.commit()
        return rows
    finally:
        conn.close()


def init_accounts(db_config: dict):
    DB.update(db_config)
    for sql in (
        "CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT NOT NULL, "
        "pw_hash TEXT NOT NULL, created_at TIMESTAMP DEFAULT now());",
        "CREATE UNIQUE INDEX IF NOT EXISTS users_name_idx ON users (lower(username));",
        "CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INT NOT NULL, "
        "created_at TIMESTAMP DEFAULT now());",
        "CREATE TABLE IF NOT EXISTS user_words (user_id INT NOT NULL, tr TEXT NOT NULL, "
        "episode TEXT NOT NULL DEFAULT '', created_at TIMESTAMP DEFAULT now(), "
        "PRIMARY KEY (user_id, tr, episode));",
        "CREATE TABLE IF NOT EXISTS game_results (id SERIAL PRIMARY KEY, user_id INT NOT NULL, "
        "episode TEXT, score INT NOT NULL, place INT NOT NULL, players INT NOT NULL, "
        "created_at TIMESTAMP DEFAULT now());",
    ):
        q(sql)


# ---------- Parola ve oturum ----------

def _hash(pw: str, salt: str = "") -> str:
    salt = salt or os.urandom(16).hex()
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex()
    return f"{salt}${h}"


def _check(pw: str, stored: str) -> bool:
    return hmac.compare_digest(_hash(pw, stored.split("$")[0]), stored)


def _sha(t: str) -> str:
    return hashlib.sha256(t.encode()).hexdigest()


def _new_session(uid: int) -> str:
    t = secrets.token_urlsafe(32)
    q("INSERT INTO sessions (token_hash, user_id) VALUES (%s, %s);", (_sha(t), uid))
    return t


def user_from_token(t):
    if not t:
        return None
    r = q("SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id "
          "WHERE s.token_hash = %s;", (_sha(t),), True)
    return {"id": r[0][0], "username": r[0][1]} if r else None


def user_from_request(req: Request):
    h = req.headers.get("authorization", "")
    return user_from_token(h[7:] if h.startswith("Bearer ") else req.cookies.get(COOKIE))


def need_user(req: Request) -> dict:
    u = user_from_request(req)
    if not u:
        raise HTTPException(401, "Giriş yapmalısın.")
    return u


# ---------- Sunucunun kullandığı yardımcılar ----------

def tag_user_words(uid: int, episode: str, words: list):
    episode = " ".join((episode or "").split())[:80]
    if not words:
        return
    conn = psycopg2.connect(**DB)
    try:
        cur = conn.cursor()
        for w in words:
            cur.execute("INSERT INTO user_words (user_id, tr, episode) VALUES (%s, %s, %s) "
                        "ON CONFLICT DO NOTHING;", (uid, w, episode))
        conn.commit()
    finally:
        conn.close()


def record_game(episode: str, results: list):
    """results: [(user_id, puan), ...] puana göre azalan sıralı."""
    for i, (uid, score) in enumerate(results):
        q("INSERT INTO game_results (user_id, episode, score, place, players) "
          "VALUES (%s, %s, %s, %s, %s);", (uid, episode, score, i + 1, len(results)))


# ---------- Uç noktalar ----------

class Cred(BaseModel):
    username: str
    password: str


_HITS = {}


def _throttle_ip(request: Request, limit: int = 10, window: int = 60):
    """Aynı IP'den dakikada en fazla `limit` giriş/kayıt denemesine izin verir."""
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0].strip()
    now = time.time()
    hits = [h for h in _HITS.get(ip, []) if now - h < window]
    if len(hits) >= limit:
        raise HTTPException(429, "Çok fazla deneme. Bir dakika sonra tekrar dene.")
    hits.append(now)
    _HITS[ip] = hits
    if len(_HITS) > 5000:
        _HITS.clear()


def _login_response(uid: int, request: Request, response: Response, username: str):
    t = _new_session(uid)
    response.set_cookie(COOKIE, t, httponly=True, samesite="lax", max_age=90 * 86400,
                        secure=request.headers.get("x-forwarded-proto") == "https")
    return {"username": username}


@router.get("/account")
def account_page():
    return FileResponse("templates/account.html")


@router.post("/api/register")
def register(c: Cred, request: Request, response: Response):
    _throttle_ip(request)
    name = c.username.strip()
    if not re.fullmatch(r"\w{3,16}", name):
        raise HTTPException(400, "Kullanıcı adı 3-16 karakter olmalı (harf, rakam, _).")
    if len(c.password) < 6:
        raise HTTPException(400, "Parola en az 6 karakter olmalı.")
    if q("SELECT 1 FROM users WHERE lower(username) = lower(%s);", (name,), True):
        raise HTTPException(409, "Bu kullanıcı adı alınmış.")
    uid = q("INSERT INTO users (username, pw_hash) VALUES (%s, %s) RETURNING id;",
            (name, _hash(c.password)), True)[0][0]
    return _login_response(uid, request, response, name)


@router.post("/api/login")
def login(c: Cred, request: Request, response: Response):
    _throttle_ip(request)
    r = q("SELECT id, username, pw_hash FROM users WHERE lower(username) = lower(%s);",
          (c.username.strip(),), True)
    if not r or not _check(c.password, r[0][2]):
        raise HTTPException(401, "Kullanıcı adı ya da parola hatalı.")
    return _login_response(r[0][0], request, response, r[0][1])


@router.post("/api/logout")
def logout(request: Request, response: Response):
    t = request.cookies.get(COOKIE)
    if t:
        q("DELETE FROM sessions WHERE token_hash = %s;", (_sha(t),))
    response.delete_cookie(COOKIE)
    return {"ok": True}


@router.get("/api/me")
def me(request: Request):
    u = need_user(request)
    g = q("SELECT count(*), coalesce(sum(score), 0), coalesce(sum((place = 1)::int), 0) "
          "FROM game_results WHERE user_id = %s;", (u["id"],), True)[0]
    n = q("SELECT count(DISTINCT tr) FROM user_words WHERE user_id = %s;", (u["id"],), True)[0][0]
    return {"username": u["username"], "games": g[0], "score": g[1], "wins": g[2], "words": n}


@router.post("/api/ext-key")
def ext_key(request: Request):
    """Eklentiye yapıştırılacak ayrı bir anahtar üretir."""
    return {"key": _new_session(need_user(request)["id"])}


@router.get("/api/my-words")
def my_words(request: Request):
    u = need_user(request)
    rows = q("SELECT uw.tr, w.eng, uw.episode FROM user_words uw JOIN words w ON w.tr = uw.tr "
             "WHERE uw.user_id = %s ORDER BY uw.created_at DESC LIMIT 500;", (u["id"],), True)
    return [{"tr": r[0], "eng": r[1], "episode": r[2]} for r in rows]


@router.get("/api/my-episodes")
def my_episodes(request: Request):
    u = need_user(request)
    rows = q("SELECT uw.episode, count(*) FROM user_words uw JOIN words w ON w.tr = uw.tr "
             "WHERE uw.user_id = %s AND uw.episode <> '' GROUP BY uw.episode "
             "ORDER BY max(uw.created_at) DESC;", (u["id"],), True)
    return [{"episode": r[0], "word_count": r[1]} for r in rows]


@router.get("/api/leaderboard")
def leaderboard(period: str = "all"):
    where = "WHERE r.created_at > now() - interval '7 days'" if period == "week" else ""
    rows = q("SELECT u.username, sum(r.score), count(*), sum((r.place = 1)::int) "
             "FROM game_results r JOIN users u ON u.id = r.user_id " + where +
             " GROUP BY u.username ORDER BY sum(r.score) DESC LIMIT 20;", (), True)
    return [{"username": r[0], "score": int(r[1]), "games": r[2], "wins": int(r[3])} for r in rows]

PRIVACY = """<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CineVocab Gizlilik Politikası</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1c2428}h1,h2{line-height:1.25}h2{margin-top:28px}</style></head><body>
<h1>CineVocab Gizlilik Politikası</h1><p>Son güncelleme: 10 Ekim 2026</p>
<h2>Ne yapıyoruz?</h2><p>CineVocab, Prime Video ve YouTube'da Türkçe altyazılı içerik izlerken altyazıdaki kelimelerin İngilizce karşılıklarını gösterir ve bunları kişisel kelime listene kaydeder.</p>
<h2>Hangi verileri topluyoruz?</h2><ul>
<li><b>Hesap bilgisi:</b> Kullanıcı adın ve parolan (parola yalnızca tek yönlü şifrelenmiş hâliyle saklanır), oturum anahtarların.</li>
<li><b>Kelime listen:</b> İzlerken karşılaştığın Türkçe kelimeler, İngilizce karşılıkları ve izlediğin bölümün ya da videonun adı.</li>
<li><b>Oyun verisi:</b> Düello sonuçların, puanların ve liderlik tablosu sıralaman.</li>
<li><b>Altyazı cümlesi:</b> Çeviri için sunucuya gönderilir ve yalnızca geçici olarak bellekte tutulur, kalıcı olarak kaydedilmez.</li></ul>
<h2>Üçüncü taraflar</h2><p>Altyazı cümleleri ve kelimeler çeviri için Google Çeviri hizmetine (translate.googleapis.com) gönderilir. Sunucu Railway üzerinde barındırılır. Verilerini satmayız, reklam için kullanmayız ve amaç dışında paylaşmayız.</p>
<h2>Çerezler ve yerel depolama</h2><p>Web sitesinde oturumunu açık tutmak için bir oturum çerezi, eklentide ise eklenti anahtarını saklamak için tarayıcı depolaması kullanılır.</p>
<h2>Verilerini silme</h2><p>Hesabının ve tüm verilerinin silinmesi için aşağıdaki adrese yaz.</p>
<h2>İletişim</h2><p>[E-POSTA ADRESİNİ BURAYA YAZ]</p>
<p>CineVocab, Amazon, Prime Video, Google ve YouTube ile bağlantılı değildir ve onlar tarafından onaylanmamıştır.</p></body></html>"""


@router.get("/privacy", response_class=HTMLResponse)
def privacy():
    return PRIVACY