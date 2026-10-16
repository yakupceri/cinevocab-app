"""Günlük meydan okuma: her dil çiftinde o gün herkese aynı 10 soru, kullanıcı başına tek deneme.

Sorular ilk istekte üretilip `daily_sets` tablosuna yazılır (aynı gün sonradan değişmez).
Doğru cevaplar sunucuda kalır; istemci her soruyu tek tek gönderir ve sonucu sunucudan öğrenir.
"""
import datetime as dt
import json
import random
import time

import psycopg2
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

import vocab
from accounts import DB, need_user, q

router = APIRouter()

N_QUESTIONS = 10
SECONDS = 12
MIN_POOL = 30                      # günlük set için gereken en az kelime sayısı
EPOCH = dt.date(2026, 10, 1)       # "Günlük #1"
REVEAL_PAUSE = 1.0                 # istemci cevaptan sonra yaklaşık bu kadar bekler (sunucu süresinden düşülür)
GRACE = 4.0                        # ağ gecikmesi payı

_pool_fn = None                    # main.py verir: (src, dst) -> [{"tr":..., "eng":...}] (kaliteli, tekrarsız)


def init(pool_fn):
    global _pool_fn
    _pool_fn = pool_fn
    q("CREATE TABLE IF NOT EXISTS daily_sets (day DATE NOT NULL, src TEXT NOT NULL, dst TEXT NOT NULL, "
      "data TEXT NOT NULL, PRIMARY KEY (day, src, dst));")
    q("CREATE TABLE IF NOT EXISTS daily_play (day DATE NOT NULL, src TEXT NOT NULL, dst TEXT NOT NULL, "
      "user_id INT NOT NULL, answers TEXT NOT NULL DEFAULT '[]', score INT NOT NULL DEFAULT 0, "
      "correct INT NOT NULL DEFAULT 0, done BOOLEAN NOT NULL DEFAULT false, last_at DOUBLE PRECISION NOT NULL DEFAULT 0, "
      "PRIMARY KEY (day, src, dst, user_id));")


def today() -> dt.date:
    return dt.datetime.now(dt.timezone.utc).date()


def day_num(day: dt.date) -> int:
    return (day - EPOCH).days + 1


def points(t: float, streak: int) -> int:
    """Düello ve pratikle aynı formül: 100 + hız bonusu (0-50) + seri bonusu (en çok +50)."""
    return 100 + int(50 * max(0.0, 1 - t / SECONDS)) + min(50, 10 * (streak - 1))


def _popularity(src: str, dst: str) -> dict:
    """Kelimeyi kaç farklı kullanıcının listesinde gördüğümüz (yaygın kelimeleri öne almak için)."""
    if (src, dst) == vocab.LEGACY:
        rows = q("SELECT tr, count(DISTINCT user_id) FROM user_words GROUP BY tr;", (), True)
    else:
        rows = q("SELECT word, count(DISTINCT user_id) FROM user_words_ml WHERE src = %s AND dst = %s GROUP BY word;",
                 (src, dst), True)
    return {w: c for w, c in rows}


def pick_questions(pool: list, pop: dict, seed: str, n: int = N_QUESTIONS):
    """Saf fonksiyon (test edilebilir): havuzdan deterministik n soru. Yeterli kelime yoksa None."""
    pool = [w for w in pool if 2 <= len(w["tr"]) <= 24 and 2 <= len(w["eng"]) <= 24
            and len(w["tr"].split()) <= 3 and len(w["eng"].split()) <= 3]
    if len(pool) < MIN_POOL:
        return None
    pool.sort(key=lambda w: (w["tr"], w["eng"]))
    common = [w for w in pool if pop.get(w["tr"], 0) >= 2]
    base = common if len(common) >= MIN_POOL else pool
    rng = random.Random(seed)
    cand = base[:]
    rng.shuffle(cand)
    all_eng = sorted({w["eng"] for w in pool})
    out, used = [], set()
    for w in cand:
        if w["eng"].lower() in used:
            continue
        others = [e for e in all_eng if e.lower() != w["eng"].lower()]
        opts = rng.sample(others, 3) if len(others) >= 3 else None
        if not opts:
            continue
        opts.append(w["eng"])
        rng.shuffle(opts)
        out.append({"tr": w["tr"], "eng": w["eng"], "options": opts})
        used.add(w["eng"].lower())
        if len(out) == n:
            return out
    return None


def get_set(day: dt.date, src: str, dst: str):
    r = q("SELECT data FROM daily_sets WHERE day = %s AND src = %s AND dst = %s;", (day, src, dst), True)
    if r:
        return json.loads(r[0][0])
    qs = pick_questions(_pool_fn(src, dst), _popularity(src, dst), f"{day}|{src}|{dst}")
    if not qs:
        return None
    q("INSERT INTO daily_sets (day, src, dst, data) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING;",
      (day, src, dst, json.dumps(qs, ensure_ascii=False)))
    r = q("SELECT data FROM daily_sets WHERE day = %s AND src = %s AND dst = %s;", (day, src, dst), True)
    return json.loads(r[0][0]) if r else qs


def _play(day, src, dst, uid):
    r = q("SELECT answers, score, correct, done, last_at FROM daily_play "
          "WHERE day = %s AND src = %s AND dst = %s AND user_id = %s;", (day, src, dst, uid), True)
    if not r:
        return None
    a, score, correct, done, last = r[0]
    return {"answers": json.loads(a), "score": score, "correct": correct, "done": done, "last_at": last}


def grid(answers: list) -> str:
    return "".join("🟩" if a["ok"] else "🟥" for a in answers)


def streak_days(uid: int, day: dt.date) -> int:
    rows = q("SELECT DISTINCT day FROM daily_play WHERE user_id = %s AND done ORDER BY day DESC LIMIT 400;", (uid,), True)
    have = {r[0] for r in rows}
    d = day if day in have else day - dt.timedelta(days=1)
    n = 0
    while d in have:
        n += 1
        d -= dt.timedelta(days=1)
    return n


def standing(day, src, dst, uid):
    total = q("SELECT count(*) FROM daily_play WHERE day = %s AND src = %s AND dst = %s AND done;", (day, src, dst), True)[0][0]
    mine = q("SELECT score FROM daily_play WHERE day = %s AND src = %s AND dst = %s AND user_id = %s AND done;",
             (day, src, dst, uid), True)
    if not mine:
        return None, total
    better = q("SELECT count(*) FROM daily_play WHERE day = %s AND src = %s AND dst = %s AND done AND score > %s;",
               (day, src, dst, mine[0][0]), True)[0][0]
    return better + 1, total


def summary(day, src, dst, uid, pl) -> dict:
    rank, total = standing(day, src, dst, uid)
    return {"score": pl["score"], "correct": pl["correct"], "total": N_QUESTIONS, "grid": grid(pl["answers"]),
            "rank": rank, "players": total, "streak": streak_days(uid, day), "num": day_num(day)}


def _pair(src: str, dst: str):
    vocab.check_pair(src, dst)


@router.get("/api/daily")
def daily_info(request: Request, src: str = "tr", dst: str = "en"):
    u = need_user(request)
    _pair(src, dst)
    day = today()
    qs = get_set(day, src, dst)
    base = {"day": str(day), "num": day_num(day), "total": N_QUESTIONS, "seconds": SECONDS}
    if not qs:
        return {**base, "ready": False}
    pl = _play(day, src, dst, u["id"])
    if pl and pl["done"]:
        return {**base, "ready": True, "done": True, "result": summary(day, src, dst, u["id"], pl)}
    out = {**base, "ready": True, "done": False, "started": bool(pl), "answered": len(pl["answers"]) if pl else 0,
           "streak": streak_days(u["id"], day)}
    return out


class StartReq(BaseModel):
    src: str = "tr"
    dst: str = "en"


@router.post("/api/daily/start")
def daily_start(d: StartReq, request: Request):
    """Oyunu başlatır (veya kaldığı yerden sürdürür). Soruları (cevapsız) ve şimdiye kadarki cevapları döner."""
    u = need_user(request)
    _pair(d.src, d.dst)
    day = today()
    qs = get_set(day, d.src, d.dst)
    if not qs:
        raise HTTPException(404, "Bu dil çifti için günlük set hazır değil.")
    q("INSERT INTO daily_play (day, src, dst, user_id, last_at) VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING;",
      (day, d.src, d.dst, u["id"], time.time()))
    pl = _play(day, d.src, d.dst, u["id"])
    if pl["done"]:
        raise HTTPException(409, "Bugünün meydan okumasını zaten oynadın.")
    q("UPDATE daily_play SET last_at = %s WHERE day = %s AND src = %s AND dst = %s AND user_id = %s AND NOT done;",
      (time.time(), day, d.src, d.dst, u["id"]))
    prog = []
    for i, a in enumerate(pl["answers"]):
        prog.append({"ok": a["ok"], "correct": qs[i]["eng"], "delta": a["d"]})
    return {"num": day_num(day), "seconds": SECONDS, "score": pl["score"], "progress": prog,
            "questions": [{"tr": x["tr"], "options": x["options"]} for x in qs]}


class AnswerReq(BaseModel):
    src: str = "tr"
    dst: str = "en"
    idx: int
    choice: str = ""
    ms: int = 0


@router.post("/api/daily/answer")
def daily_answer(d: AnswerReq, request: Request):
    u = need_user(request)
    _pair(d.src, d.dst)
    day = today()
    qs = get_set(day, d.src, d.dst)
    pl = _play(day, d.src, d.dst, u["id"]) if qs else None
    if not qs or not pl:
        raise HTTPException(404, "Önce meydan okumayı başlat.")
    if pl["done"]:
        raise HTTPException(409, "Bugünün meydan okumasını zaten oynadın.")
    if d.idx != len(pl["answers"]) or not 0 <= d.idx < len(qs):
        raise HTTPException(409, "Soru sırası uyuşmuyor, sayfayı yenile.")
    now = time.time()
    server_t = max(0.0, now - pl["last_at"] - REVEAL_PAUSE)
    t = min(float(SECONDS), max(0.0, d.ms / 1000.0, server_t))
    qd = qs[d.idx]
    ok = bool(d.choice) and d.choice == qd["eng"] and server_t <= SECONDS + GRACE
    streak = 0
    for a in reversed(pl["answers"]):
        if not a["ok"]:
            break
        streak += 1
    delta = points(t, streak + 1) if ok else 0
    answers = pl["answers"] + [{"c": d.choice[:60], "ok": ok, "d": delta}]
    score, correct = pl["score"] + delta, pl["correct"] + (1 if ok else 0)
    done = len(answers) >= len(qs)
    # Aynı anda iki istek gelirse yalnızca biri geçsin: answers eski değerdeyse güncelle.
    conn = psycopg2.connect(**DB)
    try:
        cur = conn.cursor()
        cur.execute("UPDATE daily_play SET answers = %s, score = %s, correct = %s, done = %s, last_at = %s "
                    "WHERE day = %s AND src = %s AND dst = %s AND user_id = %s AND answers = %s AND NOT done;",
                    (json.dumps(answers), score, correct, done, now, day, d.src, d.dst, u["id"], json.dumps(pl["answers"])))
        changed = cur.rowcount
        conn.commit()
    finally:
        conn.close()
    if not changed:
        raise HTTPException(409, "Soru sırası uyuşmuyor, sayfayı yenile.")
    out = {"ok": ok, "correct": qd["eng"], "delta": delta, "score": score, "done": done}
    if done:
        out["result"] = summary(day, d.src, d.dst, u["id"], {"answers": answers, "score": score, "correct": correct})
    return out


@router.get("/api/daily/board")
def daily_board(request: Request, src: str = "tr", dst: str = "en"):
    u = need_user(request)
    _pair(src, dst)
    day = today()
    rows = q("SELECT u.username, coalesce(u.country, ''), p.score, p.correct, p.user_id FROM daily_play p "
             "JOIN users u ON u.id = p.user_id WHERE p.day = %s AND p.src = %s AND p.dst = %s AND p.done "
             "ORDER BY p.score DESC, p.correct DESC, p.user_id LIMIT 20;", (day, src, dst), True)
    rank, total = standing(day, src, dst, u["id"])
    return {"rows": [{"username": r[0], "country": r[1], "score": r[2], "correct": r[3], "me": r[4] == u["id"]} for r in rows],
            "rank": rank, "players": total}
