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
    q("CREATE TABLE IF NOT EXISTS progress (user_id INT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}');")
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
        # --- yönetim: ban / ceza / son görülme ---
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS game_banned_until TIMESTAMP;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS game_ban_reason TEXT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_hash TEXT;",
        "CREATE TABLE IF NOT EXISTS episode_meta (episode TEXT PRIMARY KEY, thumb TEXT NOT NULL DEFAULT '');",
        "CREATE TABLE IF NOT EXISTS admin_log (id SERIAL PRIMARY KEY, at TIMESTAMP DEFAULT now(), "
        "action TEXT NOT NULL, target TEXT, detail TEXT, ip TEXT);",
        # Kimlik içermeyen günlük kullanım sayacı (IP, kullanıcı adı ya da cümle saklanmaz)
        "CREATE TABLE IF NOT EXISTS usage_daily (day DATE PRIMARY KEY, calls INT NOT NULL DEFAULT 0, "
        "anon_calls INT NOT NULL DEFAULT 0, words INT NOT NULL DEFAULT 0);",
        "CREATE TABLE IF NOT EXISTS store_stats (day DATE PRIMARY KEY, installs INT NOT NULL DEFAULT 0, users INT NOT NULL DEFAULT 0);",
        "CREATE TABLE IF NOT EXISTS usage_pairs (day DATE NOT NULL, src TEXT NOT NULL, dst TEXT NOT NULL, "
        "calls INT NOT NULL DEFAULT 0, PRIMARY KEY (day, src, dst));",
    ):
        q(sql)


def _lang(v) -> str:
    v = str(v or "").lower()[:8]
    return v if re.fullmatch(r"[a-z]{2,3}(-[a-z0-9]{2,4})?", v) else "??"


def count_usage(signed_in: bool, n_words: int, src: str = "tr", dst: str = "en"):
    """Eklentiden gelen çeviri isteğini günlük toplam olarak sayar. Hata verirse çeviriyi bozmaz."""
    try:
        q("INSERT INTO usage_daily (day, calls, anon_calls, words) VALUES (current_date, 1, %s, %s) "
          "ON CONFLICT (day) DO UPDATE SET calls = usage_daily.calls + 1, "
          "anon_calls = usage_daily.anon_calls + EXCLUDED.anon_calls, words = usage_daily.words + EXCLUDED.words;",
          (0 if signed_in else 1, max(0, min(int(n_words), 30))))
        q("INSERT INTO usage_pairs (day, src, dst, calls) VALUES (current_date, %s, %s, 1) "
          "ON CONFLICT (day, src, dst) DO UPDATE SET calls = usage_pairs.calls + 1;", (_lang(src), _lang(dst)))
    except Exception as e:
        print(f"Sayaç hatası: {e}")


# ---------- Parola ve oturum ----------

def _hash(pw: str, salt: str = "") -> str:
    salt = salt or os.urandom(16).hex()
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex()
    return f"{salt}${h}"


NO_PW = "!"  # Google ile açılan hesap: parola yok


def _check(pw: str, stored: str) -> bool:
    if not stored or "$" not in stored:
        return False
    return hmac.compare_digest(_hash(pw, stored.split("$")[0]), stored)


def _owner_ok(uid: int, username: str, typed: str) -> bool:
    """Hassas işlem onayı: parolası olan hesapta parola, parolasız (Google) hesapta kullanıcı adı."""
    r = q("SELECT pw_hash FROM users WHERE id = %s;", (uid,), True)
    if not r:
        return False
    if r[0][0] == NO_PW:
        return (typed or "").strip().lower() == username.lower()
    return _check(typed or "", r[0][0])


def _sha(t: str) -> str:
    return hashlib.sha256(t.encode()).hexdigest()


def _new_session(uid: int) -> str:
    t = secrets.token_urlsafe(32)
    q("INSERT INTO sessions (token_hash, user_id) VALUES (%s, %s);", (_sha(t), uid))
    return t


SESSION_DAYS = 90


def user_from_token(t):
    """Geçerli oturumun kullanıcısı. Banlı kullanıcı için None döner.
    Dönen sözlük: id, username, gban (oyun yasağı var mı)."""
    if not t:
        return None
    r = q("SELECT u.id, u.username, "
          "coalesce(u.banned_until > now(), false), "
          "coalesce(u.game_banned_until > now(), false) "
          "FROM sessions s JOIN users u ON u.id = s.user_id "
          "WHERE s.token_hash = %s AND s.created_at > now() - make_interval(days => %s);",
          (_sha(t), SESSION_DAYS), True)
    if not r or r[0][2]:
        return None
    try:  # dakikada en fazla 1 yazma
        q("UPDATE users SET last_seen = now() WHERE id = %s "
          "AND (last_seen IS NULL OR last_seen < now() - interval '1 minute');", (r[0][0],))
    except Exception:
        pass
    return {"id": r[0][0], "username": r[0][1], "gban": bool(r[0][3])}


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
    ref: str = ""


_HITS = {}


def client_ip(request: Request) -> str:
    """Railway gibi bir proxy arkasında en sağdaki X-Forwarded-For adresi güvenilirdir;
    soldakiler istemci tarafından sahtelenebilir."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[-1].strip()
    return request.client.host if request.client else "?"


def _throttle_ip(request: Request, limit: int = 10, window: int = 60, bucket: str = "auth"):
    """Aynı IP'den `window` saniyede en fazla `limit` isteğe izin verir."""
    key = f"{bucket}:{client_ip(request)}"
    now = time.time()
    hits = [h for h in _HITS.get(key, []) if now - h < window]
    if len(hits) >= limit:
        raise HTTPException(429, "Çok fazla deneme. Biraz sonra tekrar dene.")
    hits.append(now)
    _HITS[key] = hits
    if len(_HITS) > 20000:
        _HITS.clear()


def _login_response(uid: int, request: Request, response: Response, username: str):
    t = _new_session(uid)
    response.set_cookie(COOKIE, t, httponly=True, samesite="lax", max_age=90 * 86400,
                        secure=request.headers.get("x-forwarded-proto") == "https")
    return {"username": username}


# ---------- Kurtarma kodu (e-posta olmadan "şifremi unuttum") ----------
_RC_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _rc_norm(code: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", (code or "").upper())


def _new_recovery(uid: int) -> str:
    """12 karakterlik kod üretir, yalnızca özeti saklanır; kullanıcıya bir kez gösterilir."""
    raw = "".join(secrets.choice(_RC_ALPHABET) for _ in range(12))
    q("UPDATE users SET recovery_hash = %s WHERE id = %s;", (_hash(raw), uid))
    return f"{raw[:4]}-{raw[4:8]}-{raw[8:]}"


@router.get("/account")
def account_page():
    return FileResponse("templates/account.html")


def create_user(name: str, password: str, ref: str = "") -> int:
    """Kullanıcı adı ve parolayla yeni hesap; kimliği döner."""
    name = name.strip()
    if not re.fullmatch(r"\w{3,16}", name):
        raise HTTPException(400, "Kullanıcı adı 3-16 karakter olmalı (harf, rakam, _).")
    if len(password) < 6:
        raise HTTPException(400, "Parola en az 6 karakter olmalı.")
    if q("SELECT 1 FROM users WHERE lower(username) = lower(%s);", (name,), True):
        raise HTTPException(409, "Bu kullanıcı adı alınmış.")
    uid = q("INSERT INTO users (username, pw_hash) VALUES (%s, %s) RETURNING id;",
            (name, _hash(password)), True)[0][0]
    try:
        from growth import record_ref
        record_ref(uid, ref)
    except Exception as e:
        print(f"   [ref] {e}")
    return uid


@router.post("/api/register")
def register(c: Cred, request: Request, response: Response):
    _throttle_ip(request)
    if os.environ.get("BREVO_API_KEY", "").strip() and os.environ.get("MAIL_FROM", "").strip():
        raise HTTPException(400, "E-posta doğrulaması gerekli. Sayfayı yenile.")
    name = c.username.strip()
    uid = create_user(name, c.password, c.ref)
    out = _login_response(uid, request, response, name)
    out["recovery"] = _new_recovery(uid)
    return out


class ForgotReq(BaseModel):
    username: str
    recovery: str
    password: str


@router.post("/api/forgot")
def forgot(c: ForgotReq, request: Request, response: Response):
    """Kurtarma koduyla yeni parola belirler. Başarılıysa eski oturumlar kapanır, yeni kod üretilir."""
    _throttle_ip(request, 5, 60, "forgot")
    if len(c.password) < 6:
        raise HTTPException(400, "Parola en az 6 karakter olmalı.")
    r = q("SELECT id, username, recovery_hash FROM users WHERE lower(username) = lower(%s);",
          (c.username.strip(),), True)
    ok = bool(r and r[0][2] and _check(_rc_norm(c.recovery), r[0][2]))
    if not r or not r[0][2]:
        _hash("x")  # kullanıcı var mı yok mu süreden anlaşılmasın
    if not ok:
        raise HTTPException(401, "Kurtarma kodu ya da kullanıcı adı hatalı.")
    uid = r[0][0]
    q("UPDATE users SET pw_hash = %s WHERE id = %s;", (_hash(c.password), uid))
    q("DELETE FROM sessions WHERE user_id = %s;", (uid,))
    out = _login_response(uid, request, response, r[0][1])
    out["recovery"] = _new_recovery(uid)
    return out


class ChangePw(BaseModel):
    current: str
    password: str


@router.post("/api/change-password")
def change_password(c: ChangePw, request: Request):
    _throttle_ip(request, 8, 60, "chpw")
    u = need_user(request)
    r = q("SELECT pw_hash FROM users WHERE id = %s;", (u["id"],), True)
    # Google ile açılan hesabın parolası yoktur: ilk parolayı eski parola sormadan belirleyebilir
    if not r or (r[0][0] != NO_PW and not _check(c.current, r[0][0])):
        raise HTTPException(401, "Parola hatalı.")
    if len(c.password) < 6:
        raise HTTPException(400, "Parola en az 6 karakter olmalı.")
    q("UPDATE users SET pw_hash = %s WHERE id = %s;", (_hash(c.password), u["id"]))
    tok = request.cookies.get(COOKIE)  # bu tarayıcı dışındaki oturumlar kapanır
    if tok:
        q("DELETE FROM sessions WHERE user_id = %s AND token_hash <> %s;", (u["id"], _sha(tok)))
    return {"ok": True}


class PwOnly(BaseModel):
    password: str


@router.post("/api/new-recovery")
def new_recovery(c: PwOnly, request: Request):
    """Yeni kurtarma kodu (eskisi geçersiz olur). Hesabı eskiden açanlar da buradan alır."""
    _throttle_ip(request, 8, 60, "chpw")
    u = need_user(request)
    if not _owner_ok(u["id"], u["username"], c.password):
        raise HTTPException(401, "Parola hatalı.")
    return {"recovery": _new_recovery(u["id"])}


def ban_guard(uid: int):
    """Askıdaki hesap giriş yapamaz (karar veritabanı saatiyle verilir)."""
    r = q("SELECT banned_until, ban_reason, coalesce(banned_until > now(), false) FROM users WHERE id = %s;",
          (uid,), True)
    if r and r[0][2]:
        until = "süresiz" if r[0][0].year >= 9000 else r[0][0].strftime("%d.%m.%Y %H:%M")
        why = f" Sebep: {r[0][1]}." if r[0][1] else ""
        raise HTTPException(403, f"Hesabın askıya alındı ({until}).{why}")


def check_login(username: str, password: str):
    """Kullanıcı adı + parola doğrular; (id, kullanıcı adı) döner."""
    r = q("SELECT id, username, pw_hash FROM users WHERE lower(username) = lower(%s);",
          (username.strip(),), True)
    if not r or not _check(password, r[0][2]):
        if not r:
            _hash("x")  # kullanıcı var mı yok mu süreden anlaşılmasın
        raise HTTPException(401, "Kullanıcı adı ya da parola hatalı.")
    ban_guard(r[0][0])
    return r[0][0], r[0][1]


@router.post("/api/login")
def login(c: Cred, request: Request, response: Response):
    _throttle_ip(request)
    uid, name = check_login(c.username, c.password)
    return _login_response(uid, request, response, name)


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
    try:
        n += q("SELECT count(DISTINCT (src, dst, word)) FROM user_words_ml WHERE user_id = %s;", (u["id"],), True)[0][0]
    except Exception:
        pass
    ex = q("SELECT country, avatar, recovery_hash IS NOT NULL, pw_hash <> %s FROM users WHERE id = %s;",
           (NO_PW, u["id"]), True)[0]
    return {"username": u["username"], "games": g[0], "score": g[1], "wins": g[2], "words": n,
            "country": ex[0] or "", "avatar": ex[1] or "", "has_recovery": bool(ex[2]), "has_password": bool(ex[3])}


class DeleteReq(BaseModel):
    password: str


@router.post("/api/delete-account")
def delete_account(c: DeleteReq, request: Request, response: Response):
    """Kullanıcının kendi hesabını ve tüm kişisel verilerini siler (mağaza/KVKK şartı)."""
    _throttle_ip(request)
    u = need_user(request)
    if not _owner_ok(u["id"], u["username"], c.password):
        raise HTTPException(401, "Parola hatalı.")
    delete_user_data(u["id"])
    response.delete_cookie(COOKIE)
    return {"ok": True}


def delete_user_data(uid: int):
    try:
        import leagues
        leagues.on_user_deleted(uid)
    except Exception as e:
        print(f"Lig temizleme hatası: {e}")
    for t in ("sessions", "user_words", "game_results", "user_words_ml", "known_words", "progress", "daily_play",
              "word_stats", "xp_log", "starred_words"):
        try:
            q(f"DELETE FROM {t} WHERE user_id = %s;", (uid,))
        except Exception as e:
            print(f"Silme hatası ({t}): {e}")
    q("DELETE FROM users WHERE id = %s;", (uid,))


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


_PERIODS = {"week": "7 days", "month": "30 days", "year": "365 days"}


@router.get("/api/leaderboard")
def leaderboard(period: str = "all", by: str = "people"):
    where = f"WHERE r.created_at > now() - interval '{_PERIODS[period]}'" if period in _PERIODS else ""
    if by == "country":
        cond = (" AND" if where else " WHERE") + " u.country IS NOT NULL AND u.country <> ''"
        rows = q("SELECT u.country, sum(r.score), count(DISTINCT u.id), sum((r.place = 1)::int) "
                 "FROM game_results r JOIN users u ON u.id = r.user_id " + where + cond +
                 " GROUP BY u.country ORDER BY sum(r.score) DESC LIMIT 20;", (), True)
        return [{"username": r[0], "country": r[0], "score": int(r[1]), "players": r[2], "wins": int(r[3])} for r in rows]
    rows = q("SELECT u.username, max(u.country), sum(r.score), count(*), sum((r.place = 1)::int) "
             "FROM game_results r JOIN users u ON u.id = r.user_id " + where +
             " GROUP BY u.username ORDER BY sum(r.score) DESC LIMIT 20;", (), True)
    return [{"username": r[0], "country": r[1] or "", "score": int(r[2]), "players": 1, "games": r[3], "wins": int(r[4])} for r in rows]


class SettingsReq(BaseModel):
    username: str = ""
    country: str = ""
    avatar: str = ""


@router.post("/api/settings")
def settings(s: SettingsReq, request: Request):
    u = need_user(request)
    _throttle_ip(request, 20, 60, "settings")
    name = s.username.strip()
    if name and name != u["username"]:
        if not re.fullmatch(r"\w{3,16}", name):
            raise HTTPException(400, "Kullanıcı adı 3-16 karakter olmalı (harf, rakam, _).")
        if q("SELECT 1 FROM users WHERE lower(username) = lower(%s) AND id <> %s;", (name, u["id"]), True):
            raise HTTPException(409, "Bu kullanıcı adı alınmış.")
        q("UPDATE users SET username = %s WHERE id = %s;", (name, u["id"]))
    cc = s.country.strip().upper()
    if cc and not re.fullmatch(r"[A-Z]{2}", cc):
        raise HTTPException(400, "Ülke geçersiz.")
    q("UPDATE users SET country = %s WHERE id = %s;", (cc or None, u["id"]))
    if s.avatar:
        if len(s.avatar) > 60000 or not re.fullmatch(r"data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+", s.avatar):
            raise HTTPException(400, "Fotoğraf geçersiz ya da çok büyük.")
        q("UPDATE users SET avatar = %s WHERE id = %s;", (s.avatar, u["id"]))
    return {"ok": True}


class DelEps(BaseModel):
    episodes: list[str]


@router.post("/api/delete-episodes")
def delete_episodes(d: DelEps, request: Request):
    u = need_user(request)
    eps = [e[:80] for e in d.episodes[:500]]
    if not eps:
        return {"deleted": 0}
    r = q("DELETE FROM user_words WHERE user_id = %s AND episode = ANY(%s) RETURNING 1;", (u["id"], eps), True)
    r2 = q("DELETE FROM user_words_ml WHERE user_id = %s AND episode = ANY(%s) RETURNING 1;", (u["id"], eps), True)
    return {"deleted": len(r) + len(r2)}


class ProgressReq(BaseModel):
    data: dict


@router.get("/api/progress")
def get_progress(request: Request):
    """Arayüz tercihleri / ilerleme (tarayıcılar arası senkron)."""
    u = need_user(request)
    r = q("SELECT data FROM progress WHERE user_id = %s;", (u["id"],), True)
    return r[0][0] if r else {}


@router.post("/api/progress")
def set_progress(d: ProgressReq, request: Request):
    import json
    u = need_user(request)
    raw = json.dumps(d.data)
    if len(raw) > 20000:
        raise HTTPException(400, "Veri çok büyük.")
    q("INSERT INTO progress (user_id, data) VALUES (%s, %s) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data;",
      (u["id"], raw))
    return {"ok": True}


PRIVACY = """<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CineVocab Gizlilik Politikası</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1c2428}h1,h2{line-height:1.25}h2{margin-top:28px}</style></head><body>
<h1>CineVocab Gizlilik Politikası</h1><p>Son güncelleme: 12 Kasım 2026</p>
<h2>Ne yapıyoruz?</h2><p>CineVocab, Prime Video, YouTube, Netflix ve Udemy'de, ayrıca senin "Bu sitede aç" diyerek izin verdiğin diğer sitelerde altyazılı içerik izlerken, yalnızca sen eklentiyi açtığında, altyazıdaki kelimelerin seçtiğin dildeki karşılıklarını gösterir ve bunları kişisel kelime listene kaydeder. Eklenti diğer sitelerde yalnızca sen o site için butona basıp izin verdikten sonra çalışır; yalnızca ekranda görünen altyazı satırını okur, sayfanın geri kalanını okumaz.</p>
<h2>Hangi verileri topluyoruz?</h2><ul>
<li><b>Hesap bilgisi:</b> Kullanıcı adın ve parolan (parola yalnızca tek yönlü şifrelenmiş hâliyle saklanır); Google ile giriş yaparsan parola yerine yalnızca Google hesabının kimlik numarası saklanır (Google'dan e-posta adresin, adın ve fotoğrafın alınıp saklanmaz). Kullanıcı adı ve parolayla hesap açarken doğrulama kodu göndermek için e-posta adresin istenir ve hesabınla birlikte saklanır; hesabını silince o da silinir, reklam ya da bülten için kullanılmaz, oturum anahtarların ve son görülme zamanın. Kural ihlali hâlinde hesap askıya alınabilir; bu durumda askı sebebi ve süresi de saklanır.</li>
<li><b>Kelime listen:</b> İzlerken karşılaştığın kelimeler, çevirileri, "biliyorum" dediğin kelimeler ve izlediğin bölümün ya da videonun adı. Panelde göstermek için videonun küçük resminin adresi de saklanır (görselin kendisi değil, YouTube/Udemy/Amazon sunucularındaki adresi).</li>
<li><b>Oyun verisi:</b> Düello sonuçların, puanların ve liderlik tablosu sıralaman.</li>
<li><b>Altyazı cümlesi:</b> Çeviri için sunucuya gönderilir ve yalnızca geçici olarak bellekte tutulur, kalıcı olarak kaydedilmez.</li>
<li><b>Kullanım sayacı:</b> Hizmetin kullanılıp kullanılmadığını anlamak için günlük toplam çeviri isteği sayısı tutulur. Bu sayı kimliğinle, IP adresinle ya da çevirdiğin metinle ilişkilendirilmez.</li></ul>
<h2>Sesli okuma ve mikrofon (isteğe bağlı)</h2><p>Kelimeleri seslendirme özelliği cihazının kendi sesini kullanır; sunucuya hiçbir şey gönderilmez. Konuşma düellosunda mikrofonu yalnızca sen düğmeye dokununca kullanabilirsin. Konuşmayı yazıya çevirme işini tarayıcın yapar (Chrome, sesi bu iş için Google'ın konuşma tanıma hizmetine gönderebilir). Sunucumuz yalnızca tanınan <b>metni</b> alır; ses kaydı almaz, saklamaz. İstersen mikrofon yerine cevabı yazabilirsin.</p>
<h2>Günlük meydan okuma</h2><p>Günlük meydan okumada cevapların, puanın ve o günkü sıralaman kullanıcı adınla birlikte saklanır ve günlük sıralamada görünür.</p>
<h2>Üçüncü taraflar</h2><p>Altyazı cümleleri ve kelimeler çeviri için Google Çeviri hizmetine (translate.googleapis.com) gönderilir. Sunucu Railway üzerinde barındırılır. Verilerini satmayız, reklam için kullanmayız ve amaç dışında paylaşmayız.</p>
<h2>Çerezler ve yerel depolama</h2><p>Web sitesinde oturumunu açık tutmak için bir oturum çerezi, eklentide ise eklenti anahtarını saklamak için tarayıcı depolaması kullanılır.</p>
<h2>Verilerini silme</h2><p>Hesabını ve tüm verilerini, hesap sayfandaki <b>Hesabımı sil</b> düğmesiyle anında silebilirsin. İstersen aşağıdaki adrese yazarak da silinmesini isteyebilirsin.</p>
<h2>İletişim</h2><p>__CONTACT__</p>
<p>CineVocab, Amazon, Prime Video, Google, YouTube, Netflix ve Udemy ile bağlantılı değildir ve onlar tarafından onaylanmamıştır.</p></body></html>"""


PRIVACY_EN = """<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CineVocab Privacy Policy</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1c2428}h1,h2{line-height:1.25}h2{margin-top:28px}</style></head><body>
<p><a href="/privacy?lang=tr">Türkçe</a></p>
<h1>CineVocab Privacy Policy</h1><p>Last updated: November 12, 2026</p>
<h2>What we do</h2><p>While you watch subtitled content on Prime Video, YouTube, Netflix and Udemy, and on other sites where you choose "Turn on for this site", and only when you turn the extension on, CineVocab shows the translation of the subtitle words in the language you chose and saves them to your personal word list. On other sites the extension runs only after you press that button and grant permission for that site; it reads only the subtitle line shown on screen, not the rest of the page.</p>
<h2>What data we collect</h2><ul>
<li><b>Account information:</b> Your username and password (the password is stored only as a one-way hash); if you sign in with Google, only the ID number of your Google account is stored instead of a password (your email address, name and photo are not taken from Google or stored). When you create an account with a username and password, your email address is requested to send a verification code and is stored with your account; it is deleted when you delete your account and is never used for ads or newsletters, your session keys and your last-seen time. If an account is suspended for breaking the rules, the reason and duration are stored too.</li>
<li><b>Your word list:</b> The words you meet while watching, their translations, the words you mark as "known", and the name of the episode or video. To show it in your panel we also store the address of the video's thumbnail (not the image itself, only its address on YouTube/Udemy/Amazon servers).</li>
<li><b>Game data:</b> Your duel results, scores and leaderboard rank.</li>
<li><b>Subtitle sentence:</b> Sent to our server for translation and kept only temporarily in memory; it is not stored permanently.</li>
<li><b>Usage counter:</b> To tell whether the service is being used, we keep a daily total of translation requests. The total is not linked to your identity, your IP address or the text you translate.</li></ul>
<h2>Read-aloud and microphone (optional)</h2><p>The read-aloud feature uses your device's own voices; nothing is sent to our server. In the speaking duel the microphone is used only when you tap the button. Your browser converts speech to text (Chrome may send the audio to Google's speech-recognition service for this). Our server receives only the recognised <b>text</b>; we do not receive, record or store audio. You can type your answer instead of using the microphone.</p>
<h2>Daily challenge</h2><p>In the daily challenge, your answers, score and that day's rank are stored with your username and shown on the daily leaderboard.</p>
<h2>Third parties</h2><p>Subtitle sentences and words are sent to the Google Translate service (translate.googleapis.com) to be translated. The server is hosted on Railway. We do not sell your data, use it for advertising, or share it for any other purpose.</p>
<h2>Cookies and local storage</h2><p>The website uses a session cookie to keep you logged in. The extension uses browser storage to keep your extension key and settings.</p>
<h2>Deleting your data</h2><p>You can delete your account and all of your data at any time with the <b>Delete my account</b> button on your account page. You can also ask us to delete it by writing to the address below.</p>
<h2>Contact</h2><p>__CONTACT__</p>
<p>CineVocab is not affiliated with or endorsed by Amazon, Prime Video, Google, YouTube, Netflix or Udemy.</p></body></html>"""


@router.get("/privacy", response_class=HTMLResponse)
def privacy(request: Request):
    """?lang=tr|en; yoksa tarayıcı diline göre (Türkçe değilse İngilizce)."""
    mail = os.environ.get("CONTACT_EMAIL", "").strip() or "[set the CONTACT_EMAIL environment variable]"
    lang = (request.query_params.get("lang") or "").lower()
    if lang not in ("tr", "en"):
        lang = "tr" if request.headers.get("accept-language", "").lower().startswith("tr") else "en"
    if lang == "tr":
        return PRIVACY.replace("__CONTACT__", mail).replace("<h1>", '<p><a href="/privacy?lang=en">English</a></p><h1>', 1)
    return PRIVACY_EN.replace("__CONTACT__", mail)