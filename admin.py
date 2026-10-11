"""CineVocab yönetim paneli (sadece site sahibi).

Kurulum: Railway > Variables kısmına şunları ekle:
    ADMIN_USER      = senin seçtiğin kullanıcı adı
    ADMIN_PASSWORD  = uzun, benzersiz bir parola (en az 12 karakter)
    ADMIN_SECRET    = rastgele uzun bir metin (oturum imzası için; opsiyonel ama önerilir)

Bu değişkenler tanımlı değilse panel TAMAMEN kapalıdır (404 döner).
Admin hesabı veritabanında DEĞİL, ortam değişkenlerindedir; normal kullanıcı hesabı değildir,
bu yüzden kullanıcı tablosundan kimse admin yapılamaz.
"""
import asyncio
import hashlib
import hmac
import os
import time
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel

from accounts import q, _hash, client_ip, delete_user_data

router = APIRouter()
hooks = {}  # main.py doldurur: rooms, providers, reset_providers, kick_user

ADMIN_USER = os.environ.get("ADMIN_USER", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
ENABLED = bool(ADMIN_USER and len(ADMIN_PASSWORD) >= 12)
_SECRET = (os.environ.get("ADMIN_SECRET") or "cv-admin|" + ADMIN_PASSWORD).encode()
COOKIE = "cva"
TTL = 8 * 3600
FOREVER = "9999-12-30"  # "süresiz" ban için çok ileri tarih

if ADMIN_USER and not ENABLED:
    print("[admin] ADMIN_PASSWORD en az 12 karakter olmalı; panel kapalı.")


# ---------- Kimlik doğrulama ----------

def _sign(exp: int) -> str:
    fp = hashlib.sha256(ADMIN_PASSWORD.encode()).hexdigest()[:16]  # parola değişince eski oturumlar düşer
    return hmac.new(_SECRET, f"{exp}|{ADMIN_USER}|{fp}".encode(), hashlib.sha256).hexdigest()


def _make_token() -> str:
    exp = int(time.time()) + TTL
    return f"{exp}.{_sign(exp)}"


def is_admin(request: Request) -> bool:
    if not ENABLED:
        return False
    t = request.cookies.get(COOKIE, "")
    try:
        exp_s, sig = t.split(".", 1)
        exp = int(exp_s)
    except ValueError:
        return False
    return exp > time.time() and hmac.compare_digest(sig, _sign(exp))


def need_admin(request: Request):
    if not ENABLED:
        raise HTTPException(404, "Not found")
    if not is_admin(request):
        raise HTTPException(401, "Yönetici girişi gerekli.")
    # CSRF'e ek önlem: tarayıcı formu/başka site bu özel başlığı gönderemez
    if request.method != "GET" and request.headers.get("x-admin") != "1":
        raise HTTPException(403, "Geçersiz istek.")


def log(request: Request, action: str, target: str = "", detail: str = ""):
    try:
        q("INSERT INTO admin_log (action, target, detail, ip) VALUES (%s, %s, %s, %s);",
          (action, target[:80], detail[:300], client_ip(request)))
    except Exception as e:
        print(f"[admin] log hatası: {e}")


_FAILS = {}  # ip -> [zaman damgaları]


def _login_guard(ip: str):
    now = time.time()
    hits = [h for h in _FAILS.get(ip, []) if now - h < 900]
    _FAILS[ip] = hits
    if len(hits) >= 5:
        raise HTTPException(429, "Çok fazla hatalı deneme. 15 dakika sonra tekrar dene.")
    if len(_FAILS) > 2000:
        _FAILS.clear()


class AdminLogin(BaseModel):
    username: str
    password: str


@router.get("/admin")
def admin_page():
    if not ENABLED:
        raise HTTPException(404, "Not found")
    return FileResponse("templates/admin.html", headers={"X-Robots-Tag": "noindex, nofollow",
                                                         "Cache-Control": "no-store"})


@router.post("/admin/api/login")
def admin_login(c: AdminLogin, request: Request, response: Response):
    if not ENABLED:
        raise HTTPException(404, "Not found")
    ip = client_ip(request)
    _login_guard(ip)
    # İki karşılaştırma da her zaman yapılır (zamanlama farkı sızdırmasın)
    ok_u = hmac.compare_digest(c.username.encode(), ADMIN_USER.encode())
    ok_p = hmac.compare_digest(c.password.encode(), ADMIN_PASSWORD.encode())
    if not (ok_u and ok_p):
        _FAILS.setdefault(ip, []).append(time.time())
        log(request, "admin_login_fail", c.username[:30])
        time.sleep(1)
        raise HTTPException(401, "Kullanıcı adı ya da parola hatalı.")
    _FAILS.pop(ip, None)
    response.set_cookie(COOKIE, _make_token(), httponly=True, samesite="strict", max_age=TTL,
                        secure=request.headers.get("x-forwarded-proto") == "https")
    log(request, "admin_login")
    return {"ok": True}


@router.post("/admin/api/logout")
def admin_logout(request: Request, response: Response):
    response.delete_cookie(COOKIE)
    return {"ok": True}


@router.get("/admin/api/session")
def admin_session(request: Request):
    if not ENABLED:
        raise HTTPException(404, "Not found")
    return {"admin": is_admin(request)}


# ---------- Yardımcılar ----------

def _iso(dt):
    return dt.strftime("%Y-%m-%d %H:%M") if dt else None


def _until(dt):
    """Ban bitişi: None (yok) | 'süresiz' | tarih. Geçmişse None."""
    if not dt or dt <= datetime.now():
        return None
    return "süresiz" if dt.year >= 9000 else _iso(dt)


def _user_exists(uid: int):
    r = q("SELECT username FROM users WHERE id = %s;", (uid,), True)
    if not r:
        raise HTTPException(404, "Kullanıcı yok.")
    return r[0][0]


# ---------- İstatistik ----------

@router.get("/admin/api/stats")
def stats(request: Request):
    need_admin(request)
    one = lambda sql: q(sql, (), True)[0][0]
    return {
        "users": one("SELECT count(*) FROM users;"),
        "users_today": one("SELECT count(*) FROM users WHERE created_at > now() - interval '1 day';"),
        "users_week": one("SELECT count(*) FROM users WHERE created_at > now() - interval '7 days';"),
        "active_24h": one("SELECT count(*) FROM users WHERE last_seen > now() - interval '1 day';"),
        "online_now": one("SELECT count(*) FROM users WHERE last_seen > now() - interval '5 minutes';"),
        "banned": one("SELECT count(*) FROM users WHERE banned_until > now();"),
        "words": one("SELECT count(*) FROM words;"),
        "user_words": one("SELECT count(*) FROM user_words;"),
        "games": one("SELECT count(*) FROM game_results;"),
        "rooms": len(hooks["rooms"]()) if "rooms" in hooks else 0,
        "signups": [{"day": str(r[0]), "n": r[1]} for r in q(
            "SELECT created_at::date d, count(*) FROM users WHERE created_at > now() - interval '14 days' "
            "GROUP BY d ORDER BY d;", (), True)],
        "top_sources": [{"episode": r[0], "n": r[1]} for r in q(
            "SELECT coalesce(nullif(episode, ''), '(etiketsiz)') e, count(*) FROM user_words GROUP BY e "
            "ORDER BY count(*) DESC LIMIT 8;", (), True)],
    }


# ---------- Kullanıcılar ----------

@router.get("/admin/api/users")
def users(request: Request, q_: str = "", limit: int = 100):
    need_admin(request)
    limit = max(1, min(limit, 300))
    like = "%" + q_.strip().replace("%", "").replace("_", r"\_") + "%"
    rows = q(
        "SELECT u.id, u.username, u.created_at, u.last_seen, u.banned_until, u.game_banned_until, "
        "(SELECT count(DISTINCT tr) FROM user_words w WHERE w.user_id = u.id), "
        "(SELECT count(*) FROM game_results g WHERE g.user_id = u.id), "
        "(SELECT coalesce(sum(score), 0) FROM game_results g WHERE g.user_id = u.id) "
        "FROM users u WHERE u.username ILIKE %s ORDER BY u.id DESC LIMIT %s;", (like, limit), True)
    return [{"id": r[0], "username": r[1], "created": _iso(r[2]), "last_seen": _iso(r[3]),
             "ban": _until(r[4]), "game_ban": _until(r[5]), "words": r[6], "games": r[7],
             "score": int(r[8])} for r in rows]


@router.get("/admin/api/users/{uid}")
def user_detail(uid: int, request: Request):
    need_admin(request)
    r = q("SELECT id, username, created_at, last_seen, banned_until, ban_reason, game_banned_until, "
          "game_ban_reason FROM users WHERE id = %s;", (uid,), True)
    if not r:
        raise HTTPException(404, "Kullanıcı yok.")
    r = r[0]
    words = q("SELECT uw.tr, coalesce(w.eng, ''), uw.episode, uw.created_at FROM user_words uw "
              "LEFT JOIN words w ON w.tr = uw.tr WHERE uw.user_id = %s "
              "ORDER BY uw.created_at DESC LIMIT 60;", (uid,), True)
    eps = q("SELECT coalesce(nullif(episode, ''), '(etiketsiz)') e, count(*), max(created_at) FROM user_words "
            "WHERE user_id = %s GROUP BY e ORDER BY max(created_at) DESC LIMIT 15;", (uid,), True)
    games = q("SELECT episode, score, place, players, created_at FROM game_results WHERE user_id = %s "
              "ORDER BY created_at DESC LIMIT 15;", (uid,), True)
    sessions = q("SELECT count(*) FROM sessions WHERE user_id = %s;", (uid,), True)[0][0]
    return {
        "id": r[0], "username": r[1], "created": _iso(r[2]), "last_seen": _iso(r[3]),
        "ban": _until(r[4]), "ban_reason": r[5] if _until(r[4]) else None,
        "game_ban": _until(r[6]), "game_ban_reason": r[7] if _until(r[6]) else None,
        "sessions": sessions,
        "words": [{"tr": w[0], "eng": w[1], "episode": w[2], "at": _iso(w[3])} for w in words],
        "episodes": [{"episode": e[0], "n": e[1], "at": _iso(e[2])} for e in eps],
        "games": [{"episode": g[0], "score": g[1], "place": g[2], "players": g[3], "at": _iso(g[4])}
                  for g in games],
    }


class Punish(BaseModel):
    hours: int | None = None  # None = süresiz
    reason: str = ""


def _until_sql(hours):
    if hours is None:
        return FOREVER, ()
    if hours < 1 or hours > 24 * 365:
        raise HTTPException(400, "Süre 1 saat ile 1 yıl arasında olmalı (süresiz için boş bırak).")
    return None, (hours,)


@router.post("/admin/api/users/{uid}/ban")
async def ban_user(uid: int, p: Punish, request: Request):
    need_admin(request)
    name = _user_exists(uid)
    forever, args = _until_sql(p.hours)
    reason = p.reason.strip()[:200]
    if forever:
        q("UPDATE users SET banned_until = %s::timestamp, ban_reason = %s WHERE id = %s;",
          (forever, reason, uid))
    else:
        q("UPDATE users SET banned_until = now() + make_interval(hours => %s), ban_reason = %s "
          "WHERE id = %s;", (args[0], reason, uid))
    q("DELETE FROM sessions WHERE user_id = %s;", (uid,))  # açık oturumlar ve eklenti anahtarı düşer
    if "kick_user" in hooks:
        await hooks["kick_user"](uid)
    log(request, "ban", name, f"{'süresiz' if p.hours is None else str(p.hours) + ' saat'} | {reason}")
    return {"ok": True}


@router.post("/admin/api/users/{uid}/unban")
def unban_user(uid: int, request: Request):
    need_admin(request)
    name = _user_exists(uid)
    q("UPDATE users SET banned_until = NULL, ban_reason = NULL WHERE id = %s;", (uid,))
    log(request, "unban", name)
    return {"ok": True}


@router.post("/admin/api/users/{uid}/gameban")
async def game_ban_user(uid: int, p: Punish, request: Request):
    """Oyun (düello) yasağı: hesap açık kalır, odaya giremez/kurulamaz."""
    need_admin(request)
    name = _user_exists(uid)
    forever, args = _until_sql(p.hours)
    reason = p.reason.strip()[:200]
    if forever:
        q("UPDATE users SET game_banned_until = %s::timestamp, game_ban_reason = %s WHERE id = %s;",
          (forever, reason, uid))
    else:
        q("UPDATE users SET game_banned_until = now() + make_interval(hours => %s), "
          "game_ban_reason = %s WHERE id = %s;", (args[0], reason, uid))
    if "kick_user" in hooks:
        await hooks["kick_user"](uid)
    log(request, "gameban", name, f"{'süresiz' if p.hours is None else str(p.hours) + ' saat'} | {reason}")
    return {"ok": True}


@router.post("/admin/api/users/{uid}/ungameban")
def ungameban_user(uid: int, request: Request):
    need_admin(request)
    name = _user_exists(uid)
    q("UPDATE users SET game_banned_until = NULL, game_ban_reason = NULL WHERE id = %s;", (uid,))
    log(request, "ungameban", name)
    return {"ok": True}


@router.post("/admin/api/users/{uid}/reset-score")
def reset_score(uid: int, request: Request):
    need_admin(request)
    name = _user_exists(uid)
    q("DELETE FROM game_results WHERE user_id = %s;", (uid,))
    log(request, "reset_score", name)
    return {"ok": True}


@router.post("/admin/api/users/{uid}/clear-words")
def clear_words(uid: int, request: Request):
    need_admin(request)
    name = _user_exists(uid)
    q("DELETE FROM user_words WHERE user_id = %s;", (uid,))
    log(request, "clear_words", name)
    return {"ok": True}


@router.post("/admin/api/users/{uid}/logout")
async def force_logout(uid: int, request: Request):
    need_admin(request)
    name = _user_exists(uid)
    q("DELETE FROM sessions WHERE user_id = %s;", (uid,))
    if "kick_user" in hooks:
        await hooks["kick_user"](uid)
    log(request, "force_logout", name)
    return {"ok": True}


class NewPw(BaseModel):
    password: str


@router.post("/admin/api/users/{uid}/reset-password")
def reset_password(uid: int, c: NewPw, request: Request):
    need_admin(request)
    name = _user_exists(uid)
    if len(c.password) < 6:
        raise HTTPException(400, "Parola en az 6 karakter olmalı.")
    q("UPDATE users SET pw_hash = %s WHERE id = %s;", (_hash(c.password), uid))
    q("DELETE FROM sessions WHERE user_id = %s;", (uid,))
    log(request, "reset_password", name)
    return {"ok": True}


class Confirm(BaseModel):
    username: str


@router.post("/admin/api/users/{uid}/delete")
async def delete_user(uid: int, c: Confirm, request: Request):
    need_admin(request)
    name = _user_exists(uid)
    if c.username.strip().lower() != name.lower():
        raise HTTPException(400, "Onay için kullanıcı adını aynen yazmalısın.")
    if "kick_user" in hooks:
        await hooks["kick_user"](uid)
    delete_user_data(uid)
    log(request, "delete_user", name)
    return {"ok": True}


# ---------- Canlı odalar ----------

@router.get("/admin/api/rooms")
def rooms(request: Request):
    need_admin(request)
    out = []
    for code, r in list(hooks["rooms"]().items()):
        out.append({"code": code, "episode": r.episode, "state": r.state,
                    "players": [{"pid": pid, "name": p["name"], "uid": p["uid"], "score": p["score"]}
                                for pid, p in r.players.items()]})
    return out


@router.post("/admin/api/rooms/{code}/close")
async def close_room(code: str, request: Request):
    need_admin(request)
    room = hooks["rooms"]().get(code)
    if not room:
        raise HTTPException(404, "Oda yok.")
    for p in list(room.players.values()):
        try:
            await p["ws"].close()
        except Exception:
            pass
    log(request, "close_room", code)
    return {"ok": True}


# ---------- Kelime havuzu ----------

@router.get("/admin/api/words")
def words(request: Request, q_: str = "", limit: int = 80):
    need_admin(request)
    limit = max(1, min(limit, 300))
    like = "%" + q_.strip().replace("%", "").replace("_", r"\_") + "%"
    rows = q("SELECT id, tr, eng, created_at FROM words WHERE tr ILIKE %s OR eng ILIKE %s "
             "ORDER BY id DESC LIMIT %s;", (like, like, limit), True)
    return [{"id": r[0], "tr": r[1], "eng": r[2], "at": _iso(r[3])} for r in rows]


class WordEdit(BaseModel):
    eng: str


@router.post("/admin/api/words/{wid}/edit")
def word_edit(wid: int, c: WordEdit, request: Request):
    need_admin(request)
    eng = c.eng.strip()[:80]
    if not eng:
        raise HTTPException(400, "Boş çeviri.")
    r = q("UPDATE words SET eng = %s WHERE id = %s RETURNING tr;", (eng, wid), True)
    if not r:
        raise HTTPException(404, "Kelime yok.")
    log(request, "word_edit", r[0][0], eng)
    return {"ok": True}


@router.post("/admin/api/words/{wid}/delete")
def word_delete(wid: int, request: Request):
    need_admin(request)
    r = q("DELETE FROM words WHERE id = %s RETURNING tr;", (wid,), True)
    if not r:
        raise HTTPException(404, "Kelime yok.")
    log(request, "word_delete", r[0][0])
    return {"ok": True}


# ---------- Çeviri servisleri / günlük ----------

@router.get("/admin/api/providers")
def providers(request: Request):
    need_admin(request)
    return hooks["providers"]()


@router.post("/admin/api/providers/reset")
def providers_reset(request: Request):
    need_admin(request)
    hooks["reset_providers"]()
    log(request, "providers_reset")
    return {"ok": True}


@router.get("/admin/api/log")
def admin_log(request: Request):
    need_admin(request)
    rows = q("SELECT at, action, target, detail, ip FROM admin_log ORDER BY id DESC LIMIT 100;", (), True)
    return [{"at": _iso(r[0]), "action": r[1], "target": r[2], "detail": r[3], "ip": r[4]} for r in rows]