"""Günün bulmacası: her dil çiftinde o gün herkese aynı 5 kelime. Harfler karışık verilir, oyuncu doğru sıraya dizer.

Kelimeler ilk istekte seçilip `puzzle_sets` tablosuna yazılır (aynı gün sonradan değişmez).
Sonuç kullanıcı başına günde bir kez kaydedilir ve XP verir; sıralama önce temiz çözülen kelime sayısına,
sonra süreye göredir. Süreyi telefon ölçer, bu yüzden bu sıralama yalnızca eğlence içindir (ödül yok).
"""
import datetime as dt
import json
import random

import psycopg2
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

import srs
import vocab
from accounts import DB, _throttle_ip, need_user, q

router = APIRouter()

N_WORDS = 5
MIN_POOL = 20                      # bulmaca için gereken en az uygun kelime sayısı
MIN_LEN, MAX_LEN = 4, 8
EPOCH = dt.date(2026, 11, 14)      # "Bulmaca #1"
XP_DONE = 20                       # bitirince
XP_PER_GREEN = 6                   # ipucusuz ve hatasız çözülen her kelime için
GREEN, YELLOW, RED = "🟩", "🟨", "🟥"
MAX_SECS = 3600

_pool_fn = None                    # main.py verir: (src, dst) -> [{"tr": kelime, "eng": çeviri}]


def init(pool_fn):
    global _pool_fn
    _pool_fn = pool_fn
    q("CREATE TABLE IF NOT EXISTS puzzle_sets (day DATE NOT NULL, src TEXT NOT NULL, dst TEXT NOT NULL, "
      "data TEXT NOT NULL, PRIMARY KEY (day, src, dst));")
    q("CREATE TABLE IF NOT EXISTS puzzle_play (day DATE NOT NULL, src TEXT NOT NULL, dst TEXT NOT NULL, "
      "user_id INT NOT NULL, secs INT NOT NULL, grid TEXT NOT NULL, score INT NOT NULL DEFAULT 0, "
      "PRIMARY KEY (day, src, dst, user_id));")


def today() -> dt.date:
    return dt.datetime.now(dt.timezone.utc).date()


def day_num(day: dt.date) -> int:
    return (day - EPOCH).days + 1


def pick_words(pool: list, pop: dict, seed: str, n: int = N_WORDS):
    """Saf fonksiyon (test edilebilir): havuzdan deterministik n kelime. Yeterli kelime yoksa None.

    Yalnızca tek parça, tamamı harf olan, 4-8 harfli kelimeler; harfleri karıştırınca farklı bir dizilim çıkabilenler."""
    seen, ok = set(), []
    for w in sorted(pool, key=lambda w: (w["tr"], w["eng"])):
        word, hint = w["tr"].strip().lower(), w["eng"].strip()
        if (word in seen or not word.isalpha() or not MIN_LEN <= len(word) <= MAX_LEN
                or len(set(word)) < 3 or not 1 <= len(hint) <= 24 or hint.lower() == word):
            continue
        seen.add(word)
        ok.append({"w": word, "hint": hint, "pop": pop.get(w["tr"], 0)})
    if len(ok) < MIN_POOL:
        return None
    common = [w for w in ok if w["pop"] >= 2]
    base = common if len(common) >= MIN_POOL else ok
    rng = random.Random(seed)
    pick = rng.sample(base, n)
    pick.sort(key=lambda w: (len(w["w"]), w["w"]))          # kısadan uzuna: kolaydan zora
    return [{"w": w["w"], "hint": w["hint"]} for w in pick]


def _popularity(src: str, dst: str) -> dict:
    if (src, dst) == vocab.LEGACY:
        rows = q("SELECT tr, count(DISTINCT user_id) FROM user_words GROUP BY tr;", (), True)
    else:
        rows = q("SELECT word, count(DISTINCT user_id) FROM user_words_ml WHERE src = %s AND dst = %s GROUP BY word;",
                 (src, dst), True)
    return {w: c for w, c in rows}


def get_set(day: dt.date, src: str, dst: str):
    r = q("SELECT data FROM puzzle_sets WHERE day = %s AND src = %s AND dst = %s;", (day, src, dst), True)
    if r:
        return json.loads(r[0][0])
    ws = pick_words(_pool_fn(src, dst), _popularity(src, dst), f"puzzle|{day}|{src}|{dst}")
    if not ws:
        return None
    q("INSERT INTO puzzle_sets (day, src, dst, data) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING;",
      (day, src, dst, json.dumps(ws, ensure_ascii=False)))
    r = q("SELECT data FROM puzzle_sets WHERE day = %s AND src = %s AND dst = %s;", (day, src, dst), True)
    return json.loads(r[0][0]) if r else ws


def score_of(grid: str, secs: int) -> int:
    """Saf fonksiyon: önce yeşil sayısı, sonra sarı sayısı, sonra hız."""
    return grid.count(GREEN) * 100000 + grid.count(YELLOW) * 10000 + (9999 - min(secs, 9999))


def xp_of(grid: str) -> int:
    return XP_DONE + XP_PER_GREEN * grid.count(GREEN)


def valid_grid(grid: str) -> bool:
    return len(grid) == N_WORDS and all(c in (GREEN, YELLOW, RED) for c in grid)


def _summary(day, src, dst, uid):
    r = q("SELECT secs, grid, score FROM puzzle_play WHERE day = %s AND src = %s AND dst = %s AND user_id = %s;",
          (day, src, dst, uid), True)
    if not r:
        return None
    secs, grid, score = r[0]
    total = q("SELECT count(*) FROM puzzle_play WHERE day = %s AND src = %s AND dst = %s;", (day, src, dst), True)[0][0]
    better = q("SELECT count(*) FROM puzzle_play WHERE day = %s AND src = %s AND dst = %s AND score > %s;",
               (day, src, dst, score), True)[0][0]
    return {"secs": secs, "grid": grid, "rank": better + 1, "players": total, "num": day_num(day)}


@router.get("/api/puzzle")
def puzzle_info(request: Request, src: str = "tr", dst: str = "en"):
    u = need_user(request)
    vocab.check_pair(src, dst)
    day = today()
    base = {"day": str(day), "num": day_num(day), "total": N_WORDS}
    ws = get_set(day, src, dst)
    if not ws:
        return {**base, "ready": False}
    res = _summary(day, src, dst, u["id"])
    if res:
        return {**base, "ready": True, "done": True, "result": res, "words": ws}
    return {**base, "ready": True, "done": False, "words": ws}


class DoneReq(BaseModel):
    src: str = "tr"
    dst: str = "en"
    secs: int = 0
    grid: str = ""


@router.post("/api/puzzle/done")
def puzzle_done(d: DoneReq, request: Request):
    """Bulmaca sonucunu kaydeder (günde bir kez) ve XP verir."""
    u = need_user(request)
    _throttle_ip(request, 20, 60, "puzzle")
    vocab.check_pair(d.src, d.dst)
    day = today()
    if not get_set(day, d.src, d.dst):
        raise HTTPException(404, "Bu dil çifti için bulmaca hazır değil.")
    if not valid_grid(d.grid):
        raise HTTPException(400, "Sonuç geçersiz.")
    secs = max(1, min(MAX_SECS, int(d.secs)))
    gain = xp_of(d.grid)
    conn = psycopg2.connect(**DB)
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO puzzle_play (day, src, dst, user_id, secs, grid, score) VALUES (%s, %s, %s, %s, %s, %s, %s) "
                    "ON CONFLICT DO NOTHING;", (day, d.src, d.dst, u["id"], secs, d.grid, score_of(d.grid, secs)))
        first = cur.rowcount == 1
        if first:                   # XP yalnızca ilk kayıtta
            cur.execute(
                "INSERT INTO xp_log (user_id, day, xp) VALUES (%s, %s, %s) ON CONFLICT (user_id, day) DO UPDATE "
                "SET xp = LEAST(xp_log.xp + EXCLUDED.xp, %s);", (u["id"], day, gain, srs.XP_DAY_CAP))
        conn.commit()
    finally:
        conn.close()
    out = _summary(day, d.src, d.dst, u["id"])
    out["xp"] = gain if first else 0
    return out
