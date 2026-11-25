"""Eşleştirme oyunu (/match): kelimeyle çevirisini eşle, taşlar patlasın. HESAP GEREKMEZ, kurulum gerekmez.

Kelimeler o dil çiftinin ortak, kaliteli havuzundan gelir (günlük meydan okuma ve bulmacayla aynı havuz).
Sunucuda oyuncuya ait hiçbir şey saklanmaz: skor ve en iyi skor yalnızca tarayıcıda durur.
"""
import random
import time

from fastapi import APIRouter, HTTPException, Request

import vocab
from accounts import _throttle_ip, q

router = APIRouter()

N_WORDS = 48                       # bir oyuna gönderilen çift sayısı (tur boyunca yeter)
MIN_POOL = 12                      # bundan az uygun çift varsa o dil çifti "hazır değil"
MAX_LEN = 16                       # taşa sığacak uzunluk
CACHE_SECS = 600

_pool_fn = None                    # main.py verir: (src, dst) -> [{"tr": kelime, "eng": çeviri}]
_cache = {}                        # (src, dst) -> (zaman, uygun çiftler)
_pairs_cache = [0.0, []]


def init(pool_fn):
    global _pool_fn
    _pool_fn = pool_fn


def usable(pool: list) -> list:
    """Saf fonksiyon: taşa uygun çiftler. Kısa, tek ya da iki sözcüklü, kelime ile çevirisi farklı;
    aynı kelime ve aynı çeviri bir kez (tahtada iki doğru eş olmasın)."""
    seen_w, seen_t, out = set(), set(), []
    for p in sorted(pool, key=lambda p: (p["tr"], p["eng"])):
        w, t = p["tr"].strip(), p["eng"].strip()
        lw, lt = w.lower(), t.lower()
        if (not 2 <= len(w) <= MAX_LEN or not 1 <= len(t) <= MAX_LEN or lw == lt or lw in seen_w or lt in seen_t
                or lw in seen_t or lt in seen_w or len(w.split()) > 2 or len(t.split()) > 2
                or any(ch.isdigit() for ch in w + t)):
            continue
        seen_w.add(lw)
        seen_t.add(lt)
        out.append({"w": w, "t": t})
    return out


def pick(pairs: list, n: int = N_WORDS, rng=None) -> list:
    """Saf fonksiyon: uygun çiftlerden rastgele n tanesi (azsa hepsi), karışık sırada."""
    rng = rng or random
    return rng.sample(pairs, min(n, len(pairs)))


def _usable_for(src: str, dst: str) -> list:
    now = time.time()
    hit = _cache.get((src, dst))
    if hit and now - hit[0] < CACHE_SECS:
        return hit[1]
    pairs = usable(_pool_fn(src, dst)) if _pool_fn else []
    if len(_cache) > 400:
        _cache.clear()
    _cache[(src, dst)] = (now, pairs)
    return pairs


@router.get("/api/match/words")
def match_words(request: Request, src: str = "en", dst: str = "tr"):
    _throttle_ip(request, limit=40, window=60, bucket="match")
    vocab.check_pair(src, dst)
    pairs = _usable_for(src, dst)
    if len(pairs) < MIN_POOL:
        return {"ready": False, "src": src, "dst": dst, "words": []}
    return {"ready": True, "src": src, "dst": dst, "words": pick(pairs)}


@router.get("/api/match/pairs")
def match_pairs(request: Request):
    """Oynanabilecek dil çiftleri (havuzu yeterince dolu olanlar), kelime sayısına göre. 10 dakika önbellekte."""
    _throttle_ip(request, limit=40, window=60, bucket="match")
    now = time.time()
    if now - _pairs_cache[0] < CACHE_SECS and _pairs_cache[1]:
        return {"pairs": _pairs_cache[1]}
    out = []
    try:
        rows = q("SELECT src, dst, count(*) FROM words_ml GROUP BY src, dst HAVING count(*) >= %s ORDER BY count(*) DESC LIMIT 60;",
                 (MIN_POOL,), True)
        cand = [(r[0], r[1]) for r in rows]
    except Exception:
        cand = []
    if vocab.LEGACY not in cand:
        cand.append(vocab.LEGACY)
    for src, dst in cand:
        try:
            n = len(_usable_for(src, dst))
        except Exception:
            n = 0
        if n >= MIN_POOL and src in vocab.LANGS and dst in vocab.LANGS:
            out.append({"src": src, "dst": dst, "n": n})
    out.sort(key=lambda p: -p["n"])
    _pairs_cache[0], _pairs_cache[1] = now, out
    return {"pairs": out}
