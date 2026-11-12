"""Videodan kelime çıkarma (planlama).

Eklenti, videonun altyazısından çıkardığı kelime listesini [kelime, kaç kez geçti] biçiminde gönderir
(altyazı metninin kendisi sunucuya gitmez). Burada kullanıcının "biliyorum" dediği ve daha önce listesine
eklediği kelimeler elenir, kalanlar sıralanır ve istenen sayıda yeni aday döndürülür.
Çeviri ve kaydetme mevcut /translate-words uç noktasıyla yapılır (bölüm adı = video başlığı).
"""
import re

from fastapi import APIRouter, Request
from pydantic import BaseModel

import vocab
from accounts import q, need_user

router = APIRouter()

MAX_WORDS = 6000   # tek istekte işlenen en çok farklı kelime
MAX_PICK = 150     # tek seferde eklenebilecek en çok kelime


class PlanReq(BaseModel):
    src: str
    dst: str
    words: list[list]  # [[kelime, adet], ...]
    n: int = 50


def saved_words(uid: int, src: str, dst: str) -> set:
    """Kullanıcının bu dil çiftindeki listesine daha önce eklediği kelimeler."""
    if (src, dst) == vocab.LEGACY:
        rows = q("SELECT DISTINCT tr FROM user_words WHERE user_id = %s;", (uid,), True)
    else:
        rows = q("SELECT DISTINCT word FROM user_words_ml WHERE user_id = %s AND src = %s AND dst = %s;",
                 (uid, src, dst), True)
    return {r[0] for r in rows}


def tally(items: list, src: str) -> dict:
    """Gelen [[kelime, adet], ...] listesini {küçük harfli kelime: toplam adet} sözlüğüne çevirir."""
    counts = {}
    for item in items[:MAX_WORDS]:
        try:
            w, c = item[0], int(item[1])
        except (IndexError, TypeError, ValueError):
            continue
        if not isinstance(w, str):
            continue
        w = vocab.low(w, src)[:60]
        if not w or re.search(r"\d", w):
            continue
        counts[w] = counts.get(w, 0) + max(1, min(c, 1000))
    return counts


def rank(fresh: dict) -> list:
    """Öğrenmeye değer sıra: videoda birkaç kez geçenler önde (4'te kırpılır, çok geçen ortak kelime
    olabilir), eşitlikte uzun kelime (genelde daha seyrek) önde."""
    return sorted(fresh, key=lambda w: (-min(fresh[w], 4), -len(w), w))


@router.post("/api/import/plan")
def plan(d: PlanReq, request: Request):
    """Videodaki kelimelerden kullanıcının henüz görmediği en iyi n tanesini seçer."""
    u = need_user(request)
    vocab.check_pair(d.src, d.dst)
    n = max(1, min(int(d.n), MAX_PICK))
    counts = tally(d.words, d.src)
    known = vocab.known_set(u["id"], d.src)
    saved = saved_words(u["id"], d.src, d.dst)
    fresh = {w: c for w, c in counts.items() if w not in known and w not in saved}
    return {
        "total": len(counts),
        "known": sum(1 for w in counts if w in known),
        "saved": sum(1 for w in counts if w in saved and w not in known),
        "fresh": len(fresh),
        "pick": rank(fresh)[:n],
    }
