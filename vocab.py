"""Kelime yönetimi: bildiğim kelimeler, kelime/video silme ve her dil çifti için ortak okuma.

Tr->En eski tablolarda (words + user_words), diğer tüm dil çiftleri çok dilli tablolarda
(words_ml + user_words_ml) durur. Bu modül ikisini tek biçimde sunar: {tr, eng, episode}
(tr = kaynak dildeki kelime, eng = çevirisi; isimler panelle uyumlu kalsın diye aynı).
"""
import re

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from accounts import q, need_user

router = APIRouter()

LANGS = {"en", "tr", "fr", "it", "de", "es", "pt", "ru", "ar"}
LEGACY = ("tr", "en")


def init():
    q("CREATE TABLE IF NOT EXISTS known_words (user_id INT NOT NULL, src TEXT NOT NULL, "
      "word TEXT NOT NULL, created_at TIMESTAMP DEFAULT now(), PRIMARY KEY (user_id, src, word));")


def low(w: str, src: str) -> str:
    """Dile uygun küçük harf (Türkçe: İ -> i, I -> ı)."""
    w = (w or "").strip()
    if src == "tr":
        w = w.replace("İ", "i").replace("I", "ı")
    return w.lower()


THUMB_HOSTS = ("ytimg.com", "udemycdn.com", "media-amazon.com", "ssl-images-amazon.com",
               "primevideo.com", "aiv-cdn.net", "pv-cdn.net", "cloudfront.net")


def thumb_ok(url: str) -> bool:
    """Yalnızca bilinen görsel sunucularından, düz https adresleri."""
    from urllib.parse import urlparse
    if not url or len(url) > 300 or not url.startswith("https://") or re.search(r"[\s\"'<>\\]", url):
        return False
    host = (urlparse(url).hostname or "").lower()
    return any(host == h or host.endswith("." + h) for h in THUMB_HOSTS)


_thumb_seen: dict = {}


def save_thumb(episode: str, url: str):
    episode = " ".join((episode or "").split())[:80]
    if not episode or _thumb_seen.get(episode) == url or not thumb_ok(url):
        return
    try:
        q("INSERT INTO episode_meta (episode, thumb) VALUES (%s, %s) "
          "ON CONFLICT (episode) DO UPDATE SET thumb = EXCLUDED.thumb;", (episode, url))
        if len(_thumb_seen) > 5000:
            _thumb_seen.clear()
        _thumb_seen[episode] = url
    except Exception as e:
        print(f"Küçük resim kaydı hatası: {e}")


def check_pair(src: str, dst: str):
    if src not in LANGS or dst not in LANGS or src == dst:
        raise HTTPException(400, "Dil çifti geçersiz.")


def known_set(uid: int, src: str) -> set:
    """Kullanıcının 'biliyorum' dediği kaynak dil kelimeleri."""
    try:
        rows = q("SELECT word FROM known_words WHERE user_id = %s AND src = %s;", (uid, src), True)
        return {r[0] for r in rows}
    except Exception as e:
        print(f"Bilinen kelime okuma hatası: {e}")
        return set()


def known_all(uids: list, src: str) -> set:
    """Listedeki HERKESİN bildiği kelimeler (düello havuzundan çıkarılır)."""
    sets = [known_set(u, src) for u in uids]
    return set.intersection(*sets) if sets else set()


def _ok(word: str, trans) -> bool:
    t = (trans or "").strip().lower()
    return bool(t) and bool(re.search(r"\w", t)) and t != word


def rows_for(uid: int, src: str, dst: str, limit: int = 5000) -> list:
    """Kullanıcının bu dil çiftindeki kelimeleri: [(word, trans, episode, created_at)] (bildikleri hariç)."""
    if (src, dst) == LEGACY:
        rows = q("SELECT uw.tr, w.eng, uw.episode, uw.created_at FROM user_words uw "
                 "JOIN words w ON w.tr = uw.tr WHERE uw.user_id = %s "
                 "ORDER BY uw.created_at DESC LIMIT %s;", (uid, limit), True)
    else:
        rows = q("SELECT uw.word, w.trans, uw.episode, uw.created_at FROM user_words_ml uw "
                 "JOIN words_ml w ON w.src = uw.src AND w.dst = uw.dst AND w.word = uw.word "
                 "WHERE uw.user_id = %s AND uw.src = %s AND uw.dst = %s "
                 "ORDER BY uw.created_at DESC LIMIT %s;", (uid, src, dst, limit), True)
    known = known_set(uid, src)
    return [r for r in rows if r[0] not in known and _ok(r[0], r[1])]


def translation_of(src: str, dst: str, words: list) -> dict:
    """{word: trans} (çevirisi kayıtlı olanlar)."""
    if not words:
        return {}
    if (src, dst) == LEGACY:
        rows = q("SELECT tr, eng FROM words WHERE tr = ANY(%s);", (words,), True)
    else:
        rows = q("SELECT word, trans FROM words_ml WHERE src = %s AND dst = %s AND word = ANY(%s);",
                 (src, dst, words), True)
    return {w: t for w, t in rows if _ok(w, t)}


# ---------- Uç noktalar ----------

@router.get("/api/pairs")
def pairs(request: Request):
    """Kullanıcının kelimesi olan dil çiftleri ve kelime sayıları."""
    u = need_user(request)
    out = []
    n = q("SELECT count(DISTINCT uw.tr) FROM user_words uw JOIN words w ON w.tr = uw.tr "
          "WHERE uw.user_id = %s;", (u["id"],), True)[0][0]
    if n:
        out.append({"src": "tr", "dst": "en", "count": n})
    for src, dst, c in q("SELECT src, dst, count(DISTINCT word) FROM user_words_ml WHERE user_id = %s "
                         "GROUP BY src, dst ORDER BY count(DISTINCT word) DESC;", (u["id"],), True):
        out.append({"src": src, "dst": dst, "count": c})
    return out


@router.get("/api/vocab")
def vocab(request: Request, src: str = "tr", dst: str = "en"):
    """Bu dil çiftindeki kelimeler + 'biliyorum' listesi."""
    u = need_user(request)
    check_pair(src, dst)
    rows = rows_for(u["id"], src, dst)
    words = [{"tr": r[0], "eng": r[1], "episode": r[2]} for r in rows]
    kn = sorted(known_set(u["id"], src))[:3000]
    tr_map = translation_of(src, dst, kn)
    known = [{"tr": w, "eng": tr_map.get(w, "")} for w in kn]
    return {"src": src, "dst": dst, "words": words, "known": known}


@router.get("/api/videos")
def videos(request: Request, src: str = "tr", dst: str = "en"):
    """Video / bölüm listesi (kelime sayısı ve son ekleme)."""
    u = need_user(request)
    check_pair(src, dst)
    agg = {}
    for _, _, ep, at in rows_for(u["id"], src, dst):
        a = agg.setdefault(ep or "", {"episode": ep or "", "count": 0, "last": at})
        a["count"] += 1
        if at and (a["last"] is None or at > a["last"]):
            a["last"] = at
    out = sorted(agg.values(), key=lambda a: a["last"] or 0, reverse=True)
    thumbs = {}
    try:
        eps = [a["episode"] for a in out if a["episode"]]
        if eps:
            thumbs = dict(q("SELECT episode, thumb FROM episode_meta WHERE episode = ANY(%s);", (eps,), True))
    except Exception as e:
        print(f"Küçük resim okuma hatası: {e}")
    for a in out:
        a["last"] = str(a["last"]) if a["last"] else ""
        a["thumb"] = thumbs.get(a["episode"], "")
    return out


class KnownReq(BaseModel):
    src: str
    words: list[str]
    known: bool = True


def _clean_words(words: list, src: str) -> list:
    out = []
    for w in words[:500]:
        w = low(w, src)[:60]
        if w and w not in out:
            out.append(w)
    return out


@router.post("/api/known")
def set_known(d: KnownReq, request: Request):
    """Kelimeleri 'biliyorum' olarak işaretle ya da işareti kaldır."""
    u = need_user(request)
    if d.src not in LANGS:
        raise HTTPException(400, "Dil geçersiz.")
    words = _clean_words(d.words, d.src)
    if not words:
        return {"changed": 0}
    if d.known:
        for w in words:
            q("INSERT INTO known_words (user_id, src, word) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING;",
              (u["id"], d.src, w))
    else:
        q("DELETE FROM known_words WHERE user_id = %s AND src = %s AND word = ANY(%s);",
          (u["id"], d.src, words))
    return {"changed": len(words)}


class DelWords(BaseModel):
    src: str
    dst: str
    words: list[str]


@router.post("/api/delete-words")
def delete_words(d: DelWords, request: Request):
    """Seçilen kelimeleri kullanıcının listesinden siler (tüm videolardan)."""
    u = need_user(request)
    check_pair(d.src, d.dst)
    words = _clean_words(d.words, d.src)
    if not words:
        return {"deleted": 0}
    if (d.src, d.dst) == LEGACY:
        r = q("DELETE FROM user_words WHERE user_id = %s AND tr = ANY(%s) RETURNING 1;", (u["id"], words), True)
    else:
        r = q("DELETE FROM user_words_ml WHERE user_id = %s AND src = %s AND dst = %s AND word = ANY(%s) "
              "RETURNING 1;", (u["id"], d.src, d.dst, words), True)
    return {"deleted": len(r)}


class DelVideos(BaseModel):
    src: str
    dst: str
    episodes: list[str]


@router.post("/api/delete-videos")
def delete_videos(d: DelVideos, request: Request):
    """Seçilen videoların / bölümlerin tüm kelimelerini kullanıcının listesinden siler."""
    u = need_user(request)
    check_pair(d.src, d.dst)
    eps = [e[:80] for e in d.episodes[:500]]
    if not eps:
        return {"deleted": 0}
    if (d.src, d.dst) == LEGACY:
        r = q("DELETE FROM user_words WHERE user_id = %s AND episode = ANY(%s) RETURNING 1;", (u["id"], eps), True)
    else:
        r = q("DELETE FROM user_words_ml WHERE user_id = %s AND src = %s AND dst = %s AND episode = ANY(%s) "
              "RETURNING 1;", (u["id"], d.src, d.dst, eps), True)
    return {"deleted": len(r)}
