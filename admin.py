"""CineVocab yönetim paneli (sadece site sahibi).

Kurulum: Railway > Variables kısmına şunları ekle:
    ADMIN_USER      = senin seçtiğin kullanıcı adı
    ADMIN_PASSWORD  = uzun, benzersiz bir parola (en az 12 karakter)
    ADMIN_SECRET    = rastgele uzun bir metin (oturum imzası için; opsiyonel ama önerilir)

Bu değişkenler tanımlı değilse panel TAMAMEN kapalıdır (404 döner).
Admin hesabı veritabanında DEĞİL, ortam değişkenlerindedir; normal kullanıcı hesabı değildir,
bu yüzden kullanıcı tablosundan kimse admin yapılamaz.
"""
import re
import asyncio
import hashlib
import hmac
import os
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel

from accounts import q, _hash, client_ip, delete_user_data, TR_TODAY

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

# Türkiye'de yaz saati yok: her zaman UTC+3. Veritabanındaki saatler sunucu saatiyle (UTC) tutulur; panelde İstanbul saati gösterilir.
_TR = timezone(timedelta(hours=3))


def _iso(dt):
    return dt.astimezone(_TR).strftime("%Y-%m-%d %H:%M") if dt else None


def _tr_ts(col: str) -> str:
    """SQL: 'timestamp without time zone' sütununu İstanbul yerel saatine çevirir (sunucu saat dilimi neyse onu esas alır)."""
    return f"timezone('Europe/Istanbul', {col} AT TIME ZONE current_setting('TimeZone'))"


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


# Kullanıcı kelime kayıtları tek görünümde: eski tablo (tr>en) + çok dilli tablo, çevirisiyle birlikte.
_UW = ("SELECT uw.user_id, 'tr'::text AS src, 'en'::text AS dst, uw.tr AS word, uw.episode, uw.created_at, "
       "(SELECT max(w.eng) FROM words w WHERE w.tr = uw.tr) AS trans FROM user_words uw "
       "UNION ALL "
       "SELECT m.user_id, m.src, m.dst, m.word, m.episode, m.created_at, x.trans FROM user_words_ml m "
       "LEFT JOIN words_ml x ON x.src = m.src AND x.dst = m.dst AND x.word = m.word")
# Kelimenin geldiği yer, bölüm adının başından anlaşılır ("Netflix · Friends ...").
_PLATFORM = ("CASE WHEN episode = '' THEN '(etiketsiz)' "
             "WHEN split_part(episode, ' · ', 1) IN ('YouTube', 'Netflix', 'Udemy') THEN split_part(episode, ' · ', 1) "
             "WHEN episode ~ ' S[0-9]+ E[0-9]+$' THEN 'Prime Video' ELSE 'Diğer' END")
# Giriş yöntemi: e-posta adresi ya da Google kimliği gösterilmez, yalnızca hangisiyle girdiği.
_METHOD = ("CASE WHEN u.google_sub IS NOT NULL THEN 'Google' WHEN u.email IS NOT NULL THEN 'E-posta' "
           "ELSE 'Kullanıcı adı' END")


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
            "SELECT d, count(*) FROM (SELECT " + _tr_ts("created_at") + "::date AS d FROM users "
            "WHERE created_at > now() - interval '16 days') t WHERE d > " + TR_TODAY + " - 14 GROUP BY d ORDER BY d;", (), True)],
        "usage": [{"day": str(r[0]), "calls": r[1], "anon": r[2], "words": r[3]} for r in q(
            "SELECT day, calls, anon_calls, words FROM usage_daily WHERE day > " + TR_TODAY + " - 14 "
            "ORDER BY day;", (), True)],
        "pairs": [{"pair": r[0] + "→" + r[1], "calls": r[2]} for r in q(
            "SELECT src, dst, sum(calls) FROM usage_pairs WHERE day > " + TR_TODAY + " - 14 "
            "GROUP BY src, dst ORDER BY sum(calls) DESC LIMIT 12;", (), True)],
        "top_sources": [{"episode": r[0], "n": r[1]} for r in q(
            "SELECT coalesce(nullif(episode, ''), '(etiketsiz)') e, count(*) FROM user_words GROUP BY e "
            "ORDER BY count(*) DESC LIMIT 8;", (), True)],
    }


# ---------- Ziyaretçiler: kim, nereden, hangi cihazdan, saat kaçta (hepsi İstanbul saati) ----------

@router.get("/admin/api/traffic")
def traffic(request: Request, days: int = 7):
    """Kimlik yok: yalnızca sayılar, cihaz türü, ülke tahmini, yönlendiren site adı ve saat."""
    need_admin(request)
    days = max(1, min(int(days), 90))
    out = {"days": days}
    win_v = "day > " + TR_TODAY + " - %s"
    win_h = "timezone('Europe/Istanbul', at)::date > " + TR_TODAY + " - %s"

    _block(out, "now", lambda: q("SELECT to_char(now() AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI');",
                                 (), True)[0][0], "")

    def totals():
        site, ext = q("SELECT count(*) FILTER (WHERE kind = 'site'), count(*) FILTER (WHERE kind = 'ext') "
                      "FROM visits_daily WHERE " + win_v + ";", (days,), True)[0]
        clicks = q("SELECT coalesce(sum(n), 0) FROM link_clicks WHERE " + win_v + ";", (days,), True)[0][0]
        signups = q("SELECT count(*) FROM users WHERE " + _tr_ts("created_at") + "::date > " + TR_TODAY + " - %s;",
                    (days,), True)[0][0]
        res = {"site": int(site), "ext": int(ext), "clicks": int(clicks), "signups": int(signups)}
        try:  # Eklentiyi kullananlar: hesaplı / hesapsız / bilinmiyor (acct sütunundan önceki kayıtlar). Hata diğer sayıları bozmaz.
            anon, acct, unk = q("SELECT count(*) FILTER (WHERE kind = 'ext' AND acct = false), "
                                "count(*) FILTER (WHERE kind = 'ext' AND acct = true), "
                                "count(*) FILTER (WHERE kind = 'ext' AND acct IS NULL) "
                                "FROM visits_daily WHERE " + win_v + ";", (days,), True)[0]
            res.update(ext_anon=int(anon), ext_acct=int(acct), ext_unknown=int(unk))
        except Exception as e:
            print(f"Hesaplı/hesapsız sayısı okunamadı: {e}")
        return res
    _block(out, "totals", totals, {})

    def daily():
        rows = [{"day": r[0], "site": int(r[1]), "ext": int(r[2]), "clicks": int(r[3]), "signups": int(r[4])} for r in q(
            "WITH d AS (SELECT g::date AS day FROM generate_series(" + TR_TODAY + " - 13, " + TR_TODAY + ", interval '1 day') g) "
            "SELECT to_char(d.day, 'DD.MM'), "
            "(SELECT count(*) FROM visits_daily v WHERE v.day = d.day AND v.kind = 'site'), "
            "(SELECT count(*) FROM visits_daily v WHERE v.day = d.day AND v.kind = 'ext'), "
            "(SELECT coalesce(sum(n), 0) FROM link_clicks c WHERE c.day = d.day), "
            "(SELECT count(*) FROM users u WHERE " + _tr_ts("u.created_at") + "::date = d.day) "
            "FROM d ORDER BY d.day;", (), True)]
        try:  # günlük hesapsız kullanan; o gün hiç "bilinen" kayıt yoksa None (eski günler)
            known = {r[0]: (int(r[1]), int(r[2])) for r in q(
                "SELECT to_char(day, 'DD.MM'), count(*) FILTER (WHERE acct = false), count(*) FILTER (WHERE acct IS NOT NULL) "
                "FROM visits_daily WHERE kind = 'ext' AND day > " + TR_TODAY + " - 14 GROUP BY day;", (), True)}
            for r in rows:
                a, k = known.get(r["day"], (0, 0))
                r["ext_anon"] = a if k else None
        except Exception as e:
            print(f"Günlük hesapsız sayısı okunamadı: {e}")
        return rows
    _block(out, "daily", daily, [])

    def devices():
        res = {"site": {}, "clicks": {}, "os": {}}
        for dev, n in q("SELECT device, count(*) FROM visits_daily WHERE kind = 'site' AND device <> '' AND " + win_v +
                        " GROUP BY device;", (days,), True):
            res["site"][dev] = int(n)
        for dev, n in q("SELECT device, count(*) FROM link_hits WHERE device <> '' AND " + win_h + " GROUP BY device;",
                        (days,), True):
            res["clicks"][dev] = int(n)
        for os_, n in q("SELECT os, sum(n) FROM (SELECT os, count(*) n FROM visits_daily WHERE kind = 'site' AND os <> '' AND " + win_v +
                        " GROUP BY os UNION ALL SELECT os, count(*) FROM link_hits WHERE os <> '' AND " + win_h +
                        " GROUP BY os) t GROUP BY os ORDER BY 2 DESC;", (days, days), True):
            res["os"][os_] = int(n)
        return res
    _block(out, "devices", devices, {"site": {}, "clicks": {}, "os": {}})

    _block(out, "referrers", lambda: [{"ref": r[0], "n": int(r[1])} for r in q(
        "SELECT ref, count(*) FROM visits_daily WHERE kind = 'site' AND " + win_v + " GROUP BY ref ORDER BY 2 DESC LIMIT 12;",
        (days,), True)], [])

    def sources():
        rows = {r[0]: {"src": r[0], "n": int(r[1]), "telefon": 0, "bilgisayar": 0, "tablet": 0} for r in q(
            "SELECT src, sum(n) FROM link_clicks WHERE " + win_v + " GROUP BY src ORDER BY 2 DESC LIMIT 15;", (days,), True)}
        for src, dev, n in q("SELECT src, device, count(*) FROM link_hits WHERE " + win_h + " GROUP BY src, device;",
                             (days,), True):
            if src in rows and dev in ("telefon", "bilgisayar", "tablet"):
                rows[src][dev] = int(n)
        return list(rows.values())
    _block(out, "sources", sources, [])

    def countries():
        c = {}
        for k, s_, e in q("SELECT country, count(*) FILTER (WHERE kind = 'site'), count(*) FILTER (WHERE kind = 'ext') "
                          "FROM visits_daily WHERE " + win_v + " GROUP BY country;", (days,), True):
            c.setdefault(k or "?", {"site": 0, "ext": 0, "clicks": 0}).update(site=int(s_), ext=int(e))
        for k, n in q("SELECT country, count(*) FROM link_hits WHERE " + win_h + " GROUP BY country;", (days,), True):
            c.setdefault(k or "?", {"site": 0, "ext": 0, "clicks": 0})["clicks"] = int(n)
        top = sorted(c.items(), key=lambda kv: -(kv[1]["site"] + kv[1]["ext"] + kv[1]["clicks"]))[:40]  # panel ilk 10 ülkeyi gösterir, kalanını "diğer"de toplar
        return [{"country": k, **v} for k, v in top]
    _block(out, "countries", countries, [])

    def hours():
        v, c = [0] * 24, [0] * 24
        for h, n in q("SELECT extract(hour FROM timezone('Europe/Istanbul', first_at))::int, count(*) FROM visits_daily "
                      "WHERE kind = 'site' AND first_at IS NOT NULL AND " + win_v + " GROUP BY 1;", (days,), True):
            v[int(h)] = int(n)
        for h, n in q("SELECT extract(hour FROM timezone('Europe/Istanbul', at))::int, count(*) FROM link_hits "
                      "WHERE " + win_h + " GROUP BY 1;", (days,), True):
            c[int(h)] = int(n)
        return {"site": v, "clicks": c}
    _block(out, "hours", hours, {"site": [0] * 24, "clicks": [0] * 24})

    _block(out, "recent", lambda: [
        {"at": r[0], "kind": r[1], "what": r[2], "device": r[3], "os": r[4], "country": r[5]} for r in q(
            "SELECT to_char(timezone('Europe/Istanbul', t), 'DD.MM HH24:MI'), kind, what, device, os, country FROM ("
            "(SELECT at AS t, 'tıklama' AS kind, src AS what, device, os, country FROM link_hits ORDER BY at DESC LIMIT 30) "
            "UNION ALL "
            "(SELECT first_at, CASE kind WHEN 'ext' THEN 'eklenti' ELSE 'site' END, ref, device, os, country FROM visits_daily "
            "WHERE first_at IS NOT NULL ORDER BY first_at DESC LIMIT 30)) x ORDER BY t DESC LIMIT 30;", (), True)], [])
    return out


# ---------- Kullanıcılar ----------

@router.get("/admin/api/users")
def users(request: Request, q_: str = "", limit: int = 100):
    need_admin(request)
    limit = max(1, min(limit, 300))
    like = "%" + q_.strip().replace("%", "").replace("_", r"\_") + "%"
    base = ("SELECT u.id, u.username, u.created_at, u.last_seen, u.banned_until, u.game_banned_until, "
            "{words}, "
            "(SELECT count(*) FROM game_results g WHERE g.user_id = u.id), "
            "(SELECT coalesce(sum(score), 0) FROM game_results g WHERE g.user_id = u.id){extra} "
            "FROM users u WHERE u.username ILIKE %s ORDER BY u.id DESC LIMIT %s;")
    try:
        # Eskiden yalnızca tr>en tablosu sayılıyordu: başka dil çiftiyle izleyenler "0 kelime" görünüyordu.
        rows = q(base.format(
            words="(SELECT count(DISTINCT tr) FROM user_words w WHERE w.user_id = u.id) + "
                  "(SELECT count(DISTINCT (src, dst, word)) FROM user_words_ml m WHERE m.user_id = u.id)",
            extra=", " + _METHOD + ", coalesce(u.signup_via, ''), "
                  "coalesce((SELECT i.username FROM referrals r JOIN users i ON i.id = r.inviter "
                  "WHERE r.new_user = u.id), '')"), (like, limit), True)
    except Exception as e:
        print(f"[admin] kullanıcı listesi (yeni sorgu) hatası, eskiye dönüldü: {e}")
        rows = [tuple(r) + ("", "", "") for r in q(base.format(
            words="(SELECT count(DISTINCT tr) FROM user_words w WHERE w.user_id = u.id)", extra=""), (like, limit), True)]
    return [{"id": r[0], "username": r[1], "created": _iso(r[2]), "last_seen": _iso(r[3]),
             "ban": _until(r[4]), "game_ban": _until(r[5]), "words": int(r[6]), "games": r[7],
             "score": int(r[8]), "method": r[9], "via": r[10], "invited_by": r[11]} for r in rows]


@router.get("/admin/api/users/{uid}")
def user_detail(uid: int, request: Request):
    need_admin(request)
    r = q("SELECT id, username, created_at, last_seen, banned_until, ban_reason, game_banned_until, "
          "game_ban_reason FROM users WHERE id = %s;", (uid,), True)
    if not r:
        raise HTTPException(404, "Kullanıcı yok.")
    r = r[0]
    try:
        words = q(f"WITH uw AS ({_UW}) SELECT word, coalesce(trans, ''), episode, created_at, src || '→' || dst FROM uw "
                  "WHERE user_id = %s ORDER BY created_at DESC LIMIT 60;", (uid,), True)
        eps = q(f"WITH uw AS ({_UW}) SELECT coalesce(nullif(episode, ''), '(etiketsiz)') e, count(*), max(created_at) FROM uw "
                "WHERE user_id = %s GROUP BY e ORDER BY max(created_at) DESC LIMIT 15;", (uid,), True)
    except Exception as e:
        print(f"[admin] kullanıcı ayrıntısı (yeni sorgu) hatası, eskiye dönüldü: {e}")
        words = [tuple(w) + ("tr→en",) for w in q(
            "SELECT uw.tr, coalesce(w.eng, ''), uw.episode, uw.created_at FROM user_words uw "
            "LEFT JOIN words w ON w.tr = uw.tr WHERE uw.user_id = %s "
            "ORDER BY uw.created_at DESC LIMIT 60;", (uid,), True)]
        eps = q("SELECT coalesce(nullif(episode, ''), '(etiketsiz)') e, count(*), max(created_at) FROM user_words "
                "WHERE user_id = %s GROUP BY e ORDER BY max(created_at) DESC LIMIT 15;", (uid,), True)
    origin = {"method": "", "via": "", "invited_by": "", "invited": 0, "has_email": False}
    try:
        o = q("SELECT " + _METHOD + ", coalesce(u.signup_via, ''), u.email IS NOT NULL, "
              "coalesce((SELECT i.username FROM referrals r JOIN users i ON i.id = r.inviter WHERE r.new_user = u.id), ''), "
              "(SELECT count(*) FROM referrals r WHERE r.inviter = u.id) FROM users u WHERE u.id = %s;", (uid,), True)[0]
        # E-posta adresi panelde gösterilmez; yalnızca kayıtlı olup olmadığı görünür.
        origin = {"method": o[0], "via": o[1], "has_email": bool(o[2]), "invited_by": o[3], "invited": int(o[4])}
    except Exception as e:
        print(f"[admin] kullanıcı kaynağı okunamadı: {e}")
    games = q("SELECT episode, score, place, players, created_at FROM game_results WHERE user_id = %s "
              "ORDER BY created_at DESC LIMIT 15;", (uid,), True)
    sessions = q("SELECT count(*) FROM sessions WHERE user_id = %s;", (uid,), True)[0][0]
    return {
        "id": r[0], "username": r[1], "created": _iso(r[2]), "last_seen": _iso(r[3]),
        "ban": _until(r[4]), "ban_reason": r[5] if _until(r[4]) else None,
        "game_ban": _until(r[6]), "game_ban_reason": r[7] if _until(r[6]) else None,
        "sessions": sessions, "origin": origin,
        "words": [{"tr": w[0], "eng": w[1], "episode": w[2], "at": _iso(w[3]), "pair": w[4]} for w in words],
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
    for t in ("user_words", "user_words_ml", "known_words"):
        q(f"DELETE FROM {t} WHERE user_id = %s;", (uid,))
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


class Rename(BaseModel):
    username: str


@router.post("/admin/api/users/{uid}/rename")
def rename_user(uid: int, c: Rename, request: Request):
    need_admin(request)
    old = _user_exists(uid)
    new = c.username.strip()
    if not re.fullmatch(r"\w{3,16}", new):
        raise HTTPException(400, "Kullanıcı adı 3-16 karakter olmalı (harf, rakam, _).")
    if q("SELECT 1 FROM users WHERE lower(username) = lower(%s) AND id <> %s;", (new, uid), True):
        raise HTTPException(409, "Bu kullanıcı adı alınmış.")
    q("UPDATE users SET username = %s WHERE id = %s;", (new, uid))
    log(request, "rename_user", old + " -> " + new)
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

_LANG_RE = re.compile(r"^[a-z]{2,3}$")


def _pair(pair: str):
    """'ro>tr' -> ('ro', 'tr'); tr>en (eski tablo) için None döner."""
    src, _, dst = (pair or "tr>en").partition(">")
    if not (_LANG_RE.match(src) and _LANG_RE.match(dst)):
        raise HTTPException(400, "Dil çifti geçersiz.")
    return None if (src, dst) == ("tr", "en") else (src, dst)


@router.get("/admin/api/word-pairs")
def word_pairs(request: Request):
    """Önbellekte kelimesi olan dil çiftleri ve sayıları (tr>en eski `words` tablosundadır)."""
    need_admin(request)
    out = [{"pair": "tr>en", "n": q("SELECT count(*) FROM words;", (), True)[0][0]}]
    out += [{"pair": f"{r[0]}>{r[1]}", "n": r[2]} for r in q(
        "SELECT src, dst, count(*) FROM words_ml GROUP BY src, dst ORDER BY count(*) DESC;", (), True)]
    return out


@router.get("/admin/api/words")
def words(request: Request, q_: str = "", limit: int = 80, pair: str = "tr>en"):
    need_admin(request)
    limit = max(1, min(limit, 300))
    like = "%" + q_.strip().replace("%", "").replace("_", r"\_") + "%"
    p = _pair(pair)
    if p is None:
        rows = q("SELECT id, tr, eng, created_at FROM words WHERE tr ILIKE %s OR eng ILIKE %s "
                 "ORDER BY id DESC LIMIT %s;", (like, like, limit), True)
        return [{"id": r[0], "tr": r[1], "eng": r[2], "at": _iso(r[3])} for r in rows]
    rows = q("SELECT word, trans, created_at FROM words_ml WHERE src = %s AND dst = %s "
             "AND (word ILIKE %s OR trans ILIKE %s) ORDER BY created_at DESC NULLS LAST, word LIMIT %s;",
             (p[0], p[1], like, like, limit), True)
    return [{"id": None, "tr": r[0], "eng": r[1], "at": _iso(r[2]) if r[2] else "(eski kayıt)"} for r in rows]


class StoreStat(BaseModel):
    day: str
    installs: int = 0
    users: int = 0


@router.get("/admin/api/bot-check")
def bot_check(request: Request):
    """Mağaza panelinden elle girilen yükleme/kullanıcı sayıları ile sunucudaki gerçek çeviri isteklerini yan yana koyar."""
    need_admin(request)
    rows = q("""SELECT d::date, coalesce(s.installs, 0), coalesce(s.users, 0), coalesce(u.calls, 0), coalesce(u.anon_calls, 0),
                       s.day IS NOT NULL
                FROM generate_series(current_date - 13, current_date, interval '1 day') d
                LEFT JOIN store_stats s ON s.day = d::date
                LEFT JOIN usage_daily u ON u.day = d::date
                ORDER BY d DESC;""", (), True)
    days = [{"day": str(r[0]), "installs": r[1], "users": r[2], "calls": r[3], "anon": r[4], "entered": r[5]} for r in rows]
    entered = [d for d in days if d["entered"]]
    inst = sum(d["installs"] for d in entered)
    calls = sum(d["calls"] for d in entered)
    if inst < 10:
        verdict = "Yeterli veri yok: mağaza panelinden birkaç günün yükleme sayısını gir (en az ~10 yükleme)."
    elif calls == 0:
        verdict = "Şüpheli: yükleme var ama sunucuya hiç çeviri isteği gelmedi. Yüklenenler eklentiyi kullanmamış (bot ya da boş yükleme olabilir)."
    elif calls < inst:
        verdict = "Zayıf kullanım: yükleme başına 1'den az istek. Çoğu yükleme eklentiyi çalıştırmamış olabilir."
    else:
        verdict = "Kullanım var: yüklemeye oranla düzenli çeviri isteği geliyor. Bu gerçek kullanıcı olabileceğini gösterir, kanıtlamaz."
    return {"days": days, "installs": inst, "calls": calls, "verdict": verdict}


@router.post("/admin/api/store-stats")
def store_stats_set(c: StoreStat, request: Request):
    need_admin(request)
    try:
        day = datetime.strptime(c.day, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Tarih YYYY-AA-GG olmalı.")
    if not (0 <= c.installs <= 100000 and 0 <= c.users <= 100000):
        raise HTTPException(400, "Sayı geçersiz.")
    q("INSERT INTO store_stats (day, installs, users) VALUES (%s, %s, %s) "
      "ON CONFLICT (day) DO UPDATE SET installs = EXCLUDED.installs, users = EXCLUDED.users;", (day, c.installs, c.users))
    log(request, "store_stats", str(day), f"yükleme={c.installs} kullanıcı={c.users}")
    return {"ok": True}


class WordMlEdit(BaseModel):
    pair: str
    word: str
    eng: str = ""


@router.post("/admin/api/words-ml/edit")
def word_ml_edit(c: WordMlEdit, request: Request):
    need_admin(request)
    p = _pair(c.pair)
    eng = c.eng.strip()[:80]
    if p is None or not eng:
        raise HTTPException(400, "Geçersiz istek.")
    r = q("UPDATE words_ml SET trans = %s WHERE src = %s AND dst = %s AND word = %s RETURNING word;",
          (eng, p[0], p[1], c.word[:60]), True)
    if not r:
        raise HTTPException(404, "Kelime yok.")
    log(request, "word_ml_edit", f"{c.pair}:{r[0][0]}", eng)
    return {"ok": True}


@router.post("/admin/api/words-ml/delete")
def word_ml_delete(c: WordMlEdit, request: Request):
    need_admin(request)
    p = _pair(c.pair)
    if p is None:
        raise HTTPException(400, "Geçersiz istek.")
    r = q("DELETE FROM words_ml WHERE src = %s AND dst = %s AND word = %s RETURNING word;",
          (p[0], p[1], c.word[:60]), True)
    if not r:
        raise HTTPException(404, "Kelime yok.")
    log(request, "word_ml_delete", f"{c.pair}:{r[0][0]}")
    return {"ok": True}


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

# ====================================================================================
# Sağlık · Huni · Veri talepleri
# Sağlık ve Huni'deki her sayı TOPLUDUR: tek tek kişilerin kelimesini ya da izlediğini göstermez.
# ====================================================================================

def _block(out: dict, key: str, fn, default=None):
    """Bir sorgu bozulursa sekmenin tamamı düşmesin: sonuç boş kalır, hata listeye yazılır."""
    try:
        out[key] = fn()
    except Exception as e:
        out[key] = [] if default is None else default
        out.setdefault("errors", []).append(f"{key}: {e}"[:200])


def _pct(a, b):
    return round(100 * a / b) if b else 0


@router.get("/admin/api/health")
def health(request: Request, days: int = 14):
    """Eklenti düzgün çalışıyor mu? Çevirisi boş kalan, bölümü okunamayan ve çevirisi kelimenin aynısı olan
    kayıtların oranı (sonuncusu çoğunlukla yanlış dil çiftinin işaretidir)."""
    need_admin(request)
    days = max(1, min(int(days), 90))
    out = {"days": days}
    where = "WHERE created_at > now() - make_interval(days => %s)"
    _block(out, "daily", lambda: [
        {"day": r[0], "rows": int(r[1]), "untagged": int(r[2]), "no_trans": int(r[3]), "same": int(r[4]), "users": int(r[5])}
        for r in q(f"WITH uw AS ({_UW}) SELECT to_char(created_at::date, 'YYYY-MM-DD'), count(*), "
                   "count(*) FILTER (WHERE episode = ''), count(*) FILTER (WHERE coalesce(trans, '') = ''), "
                   "count(*) FILTER (WHERE lower(coalesce(trans, '')) = lower(word)), count(DISTINCT user_id) "
                   f"FROM uw {where} GROUP BY 1 ORDER BY 1 DESC;", (days,), True)])
    _block(out, "pairs", lambda: [
        {"pair": r[0] + "→" + r[1], "rows": int(r[2]), "users": int(r[3]), "no_trans": int(r[4]), "same": int(r[5])}
        for r in q(f"WITH uw AS ({_UW}) SELECT src, dst, count(*), count(DISTINCT user_id), "
                   "count(*) FILTER (WHERE coalesce(trans, '') = ''), "
                   "count(*) FILTER (WHERE lower(coalesce(trans, '')) = lower(word)) "
                   f"FROM uw {where} GROUP BY src, dst ORDER BY 3 DESC LIMIT 20;", (days,), True)])
    _block(out, "platforms", lambda: [
        {"platform": r[0], "rows": int(r[1]), "users": int(r[2]), "no_trans": int(r[3])}
        for r in q(f"WITH uw AS ({_UW}) SELECT {_PLATFORM} AS p, count(*), count(DISTINCT user_id), "
                   "count(*) FILTER (WHERE coalesce(trans, '') = '') "
                   f"FROM uw {where} GROUP BY 1 ORDER BY 2 DESC;", (days,), True)])
    rows = sum(d["rows"] for d in out["daily"])
    tot = {k: sum(d[k] for d in out["daily"]) for k in ("untagged", "no_trans", "same")}
    out["total"] = {"rows": rows, **tot, **{k + "_pct": _pct(v, rows) for k, v in tot.items()}}
    notes = []
    if rows < 30:
        notes.append({"level": "info", "text": f"Son {days} günde {rows} kelime kaydı var: oranlar için veri az."})
    else:
        if _pct(tot["no_trans"], rows) >= 10:
            notes.append({"level": "bad", "text": f"Kelimelerin %{_pct(tot['no_trans'], rows)}'i çevirisiz kaydedilmiş. "
                          "Çeviri servisi engelli olabilir (Sistem sekmesi) ya da kullanıcılar yanlış dil çiftiyle izliyor."})
        if _pct(tot["untagged"], rows) >= 25:
            notes.append({"level": "warn", "text": f"Kelimelerin %{_pct(tot['untagged'], rows)}'i bölüm adı olmadan kaydedilmiş: "
                          "eklenti o sitede başlığı okuyamıyor. Aşağıda hangi platformda olduğuna bak."})
        for p in out["pairs"]:
            if p["rows"] >= 20 and _pct(p["same"], p["rows"]) >= 15:
                notes.append({"level": "warn", "text": f"{p['pair']}: kelimelerin %{_pct(p['same'], p['rows'])}'inde çeviri kelimenin "
                              "aynısı. Bu çoğunlukla altyazının seçilen dilde olmadığını gösterir."})
        if not notes:
            notes.append({"level": "ok", "text": "Belirgin bir sorun görünmüyor."})
    out["notes"] = notes
    return out


_FUNNEL_CTE = (
    "WITH nu AS (SELECT id, created_at::date AS d0, last_seen::date AS seen FROM users "
    "            WHERE created_at > now() - make_interval(days => %s)), "
    "uw AS (SELECT user_id, created_at::date AS d FROM user_words UNION ALL "
    "       SELECT user_id, created_at::date FROM user_words_ml), "
    "wc AS (SELECT user_id, count(*) AS n, max(d) AS last_d FROM uw GROUP BY user_id), "
    "xp AS (SELECT user_id, max(day) AS last_d FROM xp_log WHERE xp > 0 GROUP BY user_id), "
    "j AS (SELECT nu.id, nu.d0, coalesce(wc.n, 0) AS n, xp.user_id IS NOT NULL AS practiced, "
    "      greatest(nu.d0, coalesce(nu.seen, nu.d0), coalesce(wc.last_d, nu.d0), coalesce(xp.last_d, nu.d0)) AS last_act "
    "      FROM nu LEFT JOIN wc ON wc.user_id = nu.id LEFT JOIN xp ON xp.user_id = nu.id) ")
_FUNNEL_COLS = (
    "count(*), count(*) FILTER (WHERE n >= 1), count(*) FILTER (WHERE n >= 20), count(*) FILTER (WHERE practiced), "
    "count(*) FILTER (WHERE last_act > d0), count(*) FILTER (WHERE d0 <= current_date - 7), "
    "count(*) FILTER (WHERE d0 <= current_date - 7 AND last_act >= d0 + 7)")


def _funnel_row(r):
    return {"signups": int(r[0]), "word1": int(r[1]), "word20": int(r[2]), "practiced": int(r[3]),
            "returned": int(r[4]), "old7": int(r[5]), "kept7": int(r[6])}


@router.get("/admin/api/funnel")
def funnel(request: Request, days: int = 30):
    """Tıklama → kayıt → ilk kelime → 20 kelime → geri gelme. Kişi adı yok, yalnızca sayılar."""
    need_admin(request)
    days = max(1, min(int(days), 365))
    out = {"days": days}
    _block(out, "clicks", lambda: int(q("SELECT coalesce(sum(n), 0) FROM link_clicks WHERE day > " + TR_TODAY + " - %s;",
                                        (days,), True)[0][0]), 0)
    _block(out, "steps", lambda: _funnel_row(q(_FUNNEL_CTE + "SELECT " + _FUNNEL_COLS + " FROM j;", (days,), True)[0]), {})
    _block(out, "cohorts", lambda: [
        {"week": r[0], **_funnel_row(r[1:])} for r in q(
            _FUNNEL_CTE + "SELECT to_char(date_trunc('week', d0), 'YYYY-MM-DD'), " + _FUNNEL_COLS +
            " FROM j GROUP BY 1 ORDER BY 1 DESC LIMIT 12;", (max(days, 56),), True)])
    period = "WHERE u.created_at > now() - make_interval(days => %s)"
    _block(out, "methods", lambda: [{"name": r[0], "n": int(r[1])} for r in q(
        f"SELECT {_METHOD} AS m, count(*) FROM users u {period} GROUP BY 1 ORDER BY 2 DESC;", (days,), True)])
    _block(out, "via", lambda: [{"name": r[0], "n": int(r[1])} for r in q(
        f"SELECT coalesce(u.signup_via, 'bilinmiyor'), count(*) FROM users u {period} GROUP BY 1 ORDER BY 2 DESC;", (days,), True)])
    _block(out, "invited", lambda: int(q(
        f"SELECT count(*) FROM referrals r JOIN users u ON u.id = r.new_user {period};", (days,), True)[0][0]), 0)
    _block(out, "countries", lambda: [{"name": r[0], "n": int(r[1])} for r in q(
        "SELECT coalesce(nullif(u.country, ''), '(seçmemiş)'), count(*) FROM users u GROUP BY 1 ORDER BY 2 DESC LIMIT 10;", (), True)])
    _block(out, "dau", lambda: [{"day": r[0], "n": int(r[1])} for r in q(
        "WITH a AS (SELECT user_id, created_at::date AS d FROM user_words WHERE created_at > now() - interval '14 days' "
        "UNION SELECT user_id, created_at::date FROM user_words_ml WHERE created_at > now() - interval '14 days' "
        "UNION SELECT user_id, day FROM xp_log WHERE day > current_date - 14 AND xp > 0) "
        "SELECT to_char(g::date, 'YYYY-MM-DD'), (SELECT count(DISTINCT user_id) FROM a WHERE a.d = g::date) "
        "FROM generate_series(current_date - 13, current_date, interval '1 day') g ORDER BY 1;", (), True)])
    return out


# ---------- Veri talepleri (KVKK / GDPR): bul, dışa aktar, sil, temizlik ----------

# Kullanıcıya bağlı satır tutan tablolar (hesap silinince hepsi boşalmalı)
_USER_TABLES = ("sessions", "user_words", "user_words_ml", "known_words", "starred_words", "word_stats", "xp_log",
                "game_results", "daily_play", "puzzle_play", "progress", "ext_tickets", "league_members")


class Find(BaseModel):
    query: str


@router.post("/admin/api/data/find")
def data_find(c: Find, request: Request):
    """Talep sahibinin verdiği kullanıcı adı ya da e-posta ile hesabı bulur. Yalnızca TAM eşleşme: e-postalar
    aranıp listelenemez, adres de geri gösterilmez."""
    need_admin(request)
    s = c.query.strip().lower()
    if len(s) < 3 or len(s) > 120:
        raise HTTPException(400, "Kullanıcı adını ya da e-posta adresini tam yaz.")
    rows = q("SELECT id, username, to_char(created_at, 'YYYY-MM-DD'), email IS NOT NULL, google_sub IS NOT NULL "
             "FROM users WHERE lower(username) = %s OR lower(email) = %s ORDER BY id LIMIT 5;", (s, s), True)
    log(request, "data_find", "", f"eşleşme: {len(rows)}")  # aranan adres kayda yazılmaz
    return [{"id": r[0], "username": r[1], "created": r[2], "has_email": bool(r[3]), "google": bool(r[4])} for r in rows]


def _count(sql, params=()):
    try:
        return int(q(sql, params, True)[0][0])
    except Exception:
        return None  # tablo henüz yok


@router.get("/admin/api/users/{uid}/footprint")
def footprint(uid: int, request: Request):
    """Bu kimlik için hangi tabloda kaç satır var (içerik değil, sayı). Silmeden sonra hepsi 0 olmalı."""
    need_admin(request)
    tables = [{"table": t, "n": _count(f"SELECT count(*) FROM {t} WHERE user_id = %s;", (uid,))} for t in _USER_TABLES]
    tables.append({"table": "referrals", "n": _count("SELECT count(*) FROM referrals WHERE inviter = %s OR new_user = %s;", (uid, uid))})
    tables.append({"table": "leagues (sahibi)", "n": _count("SELECT count(*) FROM leagues WHERE owner = %s;", (uid,))})
    exists = bool(q("SELECT 1 FROM users WHERE id = %s;", (uid,), True))
    return {"id": uid, "exists": exists, "tables": tables, "total": sum(t["n"] or 0 for t in tables) + (1 if exists else 0)}


@router.get("/admin/api/users/{uid}/export")
def export_user(uid: int, request: Request):
    """Erişim talebi: kullanıcının bizde duran bütün verisi tek dosyada. Parola özeti, oturum anahtarları ve
    kurtarma kodu DAHİL DEĞİLDİR. İşlem kayda geçer."""
    need_admin(request)
    name = _user_exists(uid)
    ts = "'YYYY-MM-DD HH24:MI'"

    def rows(sql, cols):
        try:
            return [dict(zip(cols, r)) for r in q(sql, (uid,), True)]
        except Exception as e:
            return [{"error": str(e)[:120]}]

    acc = q("SELECT id, username, coalesce(email, ''), coalesce(country, ''), "
            f"to_char(created_at, {ts}), coalesce(to_char(last_seen, {ts}), ''), google_sub IS NOT NULL "
            "FROM users WHERE id = %s;", (uid,), True)[0]
    data = {
        "exported_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "account": {"id": acc[0], "username": acc[1], "email": acc[2], "country": acc[3], "created": acc[4],
                    "last_seen": acc[5], "google_linked": bool(acc[6])},
        "words_tr_en": rows(f"SELECT tr, episode, to_char(created_at, {ts}) FROM user_words WHERE user_id = %s "
                            "ORDER BY created_at;", ("word", "source", "added")),
        "words": rows(f"SELECT src, dst, word, episode, to_char(created_at, {ts}) FROM user_words_ml WHERE user_id = %s "
                      "ORDER BY created_at;", ("from", "to", "word", "source", "added")),
        "known_words": rows(f"SELECT src, word, to_char(created_at, {ts}) FROM known_words WHERE user_id = %s "
                            "ORDER BY created_at;", ("language", "word", "added")),
        "starred_words": rows(f"SELECT src, dst, word, to_char(created_at, {ts}) FROM starred_words WHERE user_id = %s "
                              "ORDER BY created_at;", ("from", "to", "word", "added")),
        "review_progress": rows("SELECT src, dst, word, box, to_char(due, 'YYYY-MM-DD'), right_n, wrong_n FROM word_stats "
                                "WHERE user_id = %s ORDER BY src, dst, word;", ("from", "to", "word", "box", "due", "right", "wrong")),
        "daily_xp": rows("SELECT to_char(day, 'YYYY-MM-DD'), xp FROM xp_log WHERE user_id = %s ORDER BY day;", ("day", "xp")),
        "games": rows(f"SELECT coalesce(episode, ''), score, place, players, to_char(created_at, {ts}) FROM game_results "
                      "WHERE user_id = %s ORDER BY created_at;", ("source", "score", "place", "players", "at")),
        "daily_challenge": rows("SELECT to_char(day, 'YYYY-MM-DD'), src, dst, score, correct, done FROM daily_play "
                                "WHERE user_id = %s ORDER BY day;", ("day", "from", "to", "score", "correct", "done")),
        "puzzles": rows("SELECT to_char(day, 'YYYY-MM-DD'), src, dst, secs, score FROM puzzle_play WHERE user_id = %s "
                        "ORDER BY day;", ("day", "from", "to", "seconds", "score")),
        "leagues": rows("SELECT l.name, to_char(m.joined_at, 'YYYY-MM-DD') FROM league_members m JOIN leagues l "
                        "ON l.id = m.league_id WHERE m.user_id = %s ORDER BY m.joined_at;", ("league", "joined")),
        "site_progress": rows("SELECT data::text FROM progress WHERE user_id = %s;", ("data",)),
        "invites": {"friends_invited": _count("SELECT count(*) FROM referrals WHERE inviter = %s;", (uid,)),
                    "was_invited": bool(_count("SELECT count(*) FROM referrals WHERE new_user = %s;", (uid,)))},
    }
    log(request, "export_user", name)
    return data


@router.get("/admin/api/hygiene")
def hygiene(request: Request):
    """Gereğinden uzun tutulan ya da sahipsiz kalmış kayıtlar (sayı olarak)."""
    need_admin(request)
    orphans = []
    for t in _USER_TABLES:
        n = _count(f"SELECT count(*) FROM {t} x WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.user_id);")
        if n:
            orphans.append({"table": t, "n": n})
    return {
        "signups_old": _count("SELECT count(*) FROM signups WHERE created_at < now() - interval '1 day';"),
        "signups_pending": _count("SELECT count(*) FROM signups;"),
        "tickets_old": _count("SELECT count(*) FROM ext_tickets WHERE created_at < now() - interval '10 minutes';"),
        "log_old": _count("SELECT count(*) FROM admin_log WHERE at < now() - interval '180 days';"),
        "inactive_12m": _count("SELECT count(*) FROM users WHERE coalesce(last_seen, created_at) < now() - interval '12 months';"),
        "orphans": orphans,
    }


@router.post("/admin/api/hygiene/clean")
def hygiene_clean(request: Request):
    """Süresi geçmiş doğrulama kayıtlarını, eski tek kullanımlık biletleri, 180 günden eski yönetim kayıtlarını ve
    silinmiş hesaplardan kalan sahipsiz satırları siler. Hesaplara dokunmaz."""
    need_admin(request)
    done = {}

    def run(key, sql):
        try:
            done[key] = len(q(sql + " RETURNING 1;", (), True))
        except Exception as e:
            done[key] = f"hata: {e}"[:80]

    run("signups", "DELETE FROM signups WHERE created_at < now() - interval '1 day'")
    run("tickets", "DELETE FROM ext_tickets WHERE created_at < now() - interval '10 minutes'")
    run("admin_log", "DELETE FROM admin_log WHERE at < now() - interval '180 days'")
    for t in _USER_TABLES:
        run("sahipsiz:" + t, f"DELETE FROM {t} x WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = x.user_id)")
    done = {k: v for k, v in done.items() if v}
    log(request, "hygiene_clean", "", ", ".join(f"{k}={v}" for k, v in done.items())[:300])
    return {"deleted": done}


# ---------- Davetler: kim kimi getirdi ----------

@router.get("/admin/api/referrals")
def referrals(request: Request):
    """Davet bağlantısıyla (/?ref=kullanıcıadı) kayıt olanlar: en çok davet edenler ve son davetler."""
    need_admin(request)
    used = ("(EXISTS (SELECT 1 FROM user_words w WHERE w.user_id = r.new_user) "
            "OR EXISTS (SELECT 1 FROM user_words_ml m WHERE m.user_id = r.new_user))")
    out = {}
    _block(out, "total", lambda: int(q("SELECT count(*) FROM referrals r JOIN users n ON n.id = r.new_user;", (), True)[0][0]), 0)
    _block(out, "top", lambda: [
        {"id": r[0], "username": r[1], "n": int(r[2]), "last": r[3], "active": int(r[4])} for r in q(
            "SELECT i.id, i.username, count(*), to_char(max(r.created_at), 'YYYY-MM-DD'), "
            f"count(*) FILTER (WHERE {used}) FROM referrals r JOIN users i ON i.id = r.inviter "
            "JOIN users n ON n.id = r.new_user GROUP BY i.id, i.username ORDER BY 3 DESC, 4 DESC LIMIT 50;", (), True)])
    _block(out, "recent", lambda: [
        {"id": r[0], "username": r[1], "inviter_id": r[2], "inviter": r[3], "at": r[4], "active": bool(r[5])} for r in q(
            "SELECT n.id, n.username, i.id, i.username, to_char(r.created_at, 'YYYY-MM-DD HH24:MI'), "
            f"{used} FROM referrals r JOIN users n ON n.id = r.new_user JOIN users i ON i.id = r.inviter "
            "ORDER BY r.created_at DESC LIMIT 50;", (), True)])
    return out


@router.get("/admin/api/users/{uid}/invited")
def invited_by_user(uid: int, request: Request):
    """Bu kullanıcının davetiyle kayıt olanlar."""
    need_admin(request)
    return [{"id": r[0], "username": r[1], "at": r[2]} for r in q(
        "SELECT n.id, n.username, to_char(r.created_at, 'YYYY-MM-DD') FROM referrals r JOIN users n ON n.id = r.new_user "
        "WHERE r.inviter = %s ORDER BY r.created_at DESC LIMIT 100;", (uid,), True)]
