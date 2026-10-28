"""Çok dilli çeviri: tr->en dışındaki tüm dil çiftleri (fr->en, it->tr ...).

Sıra: önbellek (words_ml) -> Google Cloud API (anahtar varsa) -> ücretsiz gtx.
Kelimeler tek tek / hizalı toplu istekle çevrilir; yanlış hizalama olursa tek tek denenir.
"""
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import requests

import vocab
from accounts import q

LANGS = vocab.LANGS
GKEY = os.environ.get("GOOGLE_TRANSLATE_API_KEY", "").strip()
_low = vocab.low
_pool = ThreadPoolExecutor(4)
_lock = threading.Lock()
_last_call = 0.0
_blocked_until = 0.0
_sent_cache: dict = {}


class Limited(Exception):
    """Servis geçici olarak sınırladı (429)."""


def init(cfg: dict = None):
    q("CREATE TABLE IF NOT EXISTS words_ml (src TEXT NOT NULL, dst TEXT NOT NULL, word TEXT NOT NULL, "
      "trans TEXT NOT NULL, PRIMARY KEY (src, dst, word));")
    q("CREATE TABLE IF NOT EXISTS user_words_ml (user_id INT NOT NULL, src TEXT NOT NULL, dst TEXT NOT NULL, "
      "word TEXT NOT NULL, episode TEXT NOT NULL DEFAULT '', created_at TIMESTAMP DEFAULT now(), "
      "PRIMARY KEY (user_id, src, dst, word, episode));")
    vocab.init()


def _throttle(gap: float = 0.15):
    global _last_call
    if time.time() < _blocked_until:
        raise Limited()
    with _lock:
        wait = _last_call + gap - time.time()
        if wait > 0:
            time.sleep(wait)
        _last_call = time.time()


def _clean(t: str) -> str:
    return (t or "").strip().lower().strip(" .,;:!?\"'«»…-–—")


def _gcloud(texts: list, src: str, dst: str) -> list:
    r = requests.post("https://translation.googleapis.com/language/translate/v2",
                      params={"key": GKEY}, timeout=8,
                      json={"q": texts, "source": src, "target": dst, "format": "text"})
    if r.status_code == 429:
        raise Limited()
    r.raise_for_status()
    import html
    return [html.unescape(x["translatedText"]) for x in r.json()["data"]["translations"]]


def _gtx(text: str, src: str, dst: str):
    _throttle()
    r = requests.get("https://translate.googleapis.com/translate_a/single",
                     params={"client": "gtx", "sl": src, "tl": dst, "dt": "t", "q": text}, timeout=6)
    if r.status_code == 429:
        global _blocked_until
        _blocked_until = time.time() + 45
        raise Limited()
    r.raise_for_status()
    return r.json()


def _gtx_one(word: str, src: str, dst: str) -> str:
    data = _gtx(word, src, dst)
    return _clean("".join(s[0] for s in (data[0] or []) if s and s[0]))


def _gtx_batch(words: list, src: str, dst: str) -> dict:
    """Satır satır toplu çeviri; satır sayısı tutmazsa kaynak parçalarıyla hizala."""
    data = _gtx("\n".join(words), src, dst)
    segs = [s for s in (data[0] or []) if s and s[0]]
    lines = "".join(s[0] for s in segs).split("\n")
    if len(lines) == len(words):
        return {w: _clean(t) for w, t in zip(words, lines)}
    out = {}
    for s in segs:
        if len(s) > 1 and s[1]:
            out[_low(s[1], src)] = _clean(s[0])
    return {w: out[w] for w in words if w in out}


def translate_words(words: list, src: str, dst: str) -> dict:
    """{word: çeviri}. Limit olursa Limited yükseltir (kısmi sonuç kaybolmasın diye ayrıca dönülür)."""
    got: dict = {}
    if not words:
        return got
    if GKEY:
        try:
            for w, t in zip(words, _gcloud(words, src, dst)):
                if _clean(t):
                    got[w] = _clean(t)
            return got
        except Limited:
            raise
        except Exception as e:
            print(f"   [ml] cloud hata: {e}")
    try:
        got.update({w: t for w, t in _gtx_batch(words, src, dst).items() if t})
    except Limited:
        raise
    except Exception as e:
        print(f"   [ml] toplu çeviri hatası: {e}")
    rest = [w for w in words if w not in got]
    if rest and len(rest) <= 10:
        for w, t in zip(rest, _pool.map(lambda x: _safe_one(x, src, dst), rest)):
            if t:
                got[w] = t
    return got


def _safe_one(w, src, dst):
    try:
        return _gtx_one(w, src, dst)
    except Exception:
        return ""


def translate_sentence(text: str, src: str, dst: str) -> str:
    text = (text or "").strip()[:300]
    if not text:
        return ""
    key = (src, dst, text)
    if key in _sent_cache:
        return _sent_cache[key]
    try:
        if GKEY:
            out = _gcloud([text], src, dst)[0].strip()
        else:
            data = _gtx(text, src, dst)
            out = "".join(s[0] for s in (data[0] or []) if s and s[0]).strip()
    except Exception as e:
        print(f"   [ml] cümle çeviri hatası: {e}")
        return ""
    if len(_sent_cache) > 500:
        _sent_cache.clear()
    _sent_cache[key] = out
    return out


def _translation_ok(word: str, trans: str) -> bool:
    return bool(trans) and bool(re.search(r"\w", trans))


def handle(batch, user):
    src, dst = batch.src, batch.dst
    if src not in LANGS or dst not in LANGS or src == dst:
        return {"status": "error", "message": "Dil çifti geçersiz"}
    words = []
    for w in batch.words:
        w = _low(w, src)
        if w and w not in words and len(w) <= 60:
            words.append(w)
    words = words[:30]

    known = set()
    if user:
        known = vocab.known_set(user["id"], src)
    known_hit = [w for w in words if w in known]
    words = [w for w in words if w not in known]

    results = {}
    if words:
        for w, t in q("SELECT word, trans FROM words_ml WHERE src = %s AND dst = %s AND word = ANY(%s);",
                      (src, dst, words), True):
            results[w] = t
    missing = [w for w in words if w not in results]

    def reply(pending, failed, sentence=""):
        return {"status": "success", "results": results, "pending": pending, "failed": failed,
                "sentence_en": sentence, "known": known_hit}

    if batch.lookup_only:
        self_save(user, src, dst, results, batch.episode)
        return reply(missing, [])

    pending, failed = [], []
    if missing:
        try:
            got = translate_words(missing, src, dst)
            limited = False
        except Limited:
            got, limited = {}, True
        for w, t in got.items():
            if _translation_ok(w, t):
                q("INSERT INTO words_ml (src, dst, word, trans) VALUES (%s, %s, %s, %s) "
                  "ON CONFLICT DO NOTHING;", (src, dst, w, t))
                results[w] = t
        left = [w for w in missing if w not in results]
        if limited:
            pending = left
        else:
            failed = left
    sentence = translate_sentence(batch.sentence, src, dst) if batch.sentence.strip() else ""
    self_save(user, src, dst, results, batch.episode)
    return reply(pending, failed, sentence)


def self_save(user, src, dst, results, episode):
    """Kullanıcının listesine ekle (çevirisi kelimeden farklı olanlar)."""
    if not user:
        return
    ep = " ".join((episode or "").split())[:80]
    try:
        for w, t in results.items():
            if vocab._ok(w, t):
                q("INSERT INTO user_words_ml (user_id, src, dst, word, episode) VALUES (%s, %s, %s, %s, %s) "
                  "ON CONFLICT DO NOTHING;", (user["id"], src, dst, w, ep))
    except Exception as e:
        print(f"   [ml] kayıt hatası: {e}")
