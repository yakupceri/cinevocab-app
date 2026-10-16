"""Akıllı tekrar (aralıklı tekrar, Leitner kutuları) + günlük XP kaydı.

Her kelimenin bir kutusu var: doğru bilince bir üst kutuya çıkar ve bir sonraki gösterim uzar
(0, 1, 3, 7, 14, 30, 60 gün); yanlış bilince 0. kutuya düşer ve hemen tekrar sorulur.
"""
import datetime as dt
import random

import psycopg2
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

import vocab
from accounts import DB, _throttle_ip, need_user, q

router = APIRouter()

INTERVALS = [0, 1, 3, 7, 14, 30, 60]
MAX_BOX = len(INTERVALS) - 1
XP_PER_CORRECT = 10
XP_DAY_CAP = 600          # günde en çok bu kadar XP (sahte rapora karşı)
MASTERED_BOX = 5

_quality = None           # main.py verir: (pairs, src, dst) -> {kelime: çeviri} (kaliteli olanlar)


def init(quality_fn):
    global _quality
    _quality = quality_fn
    q("CREATE TABLE IF NOT EXISTS word_stats (user_id INT NOT NULL, src TEXT NOT NULL, dst TEXT NOT NULL, "
      "word TEXT NOT NULL, box INT NOT NULL DEFAULT 0, due DATE NOT NULL, right_n INT NOT NULL DEFAULT 0, "
      "wrong_n INT NOT NULL DEFAULT 0, last_at TIMESTAMP DEFAULT now(), PRIMARY KEY (user_id, src, dst, word));")
    q("CREATE TABLE IF NOT EXISTS xp_log (user_id INT NOT NULL, day DATE NOT NULL, xp INT NOT NULL DEFAULT 0, "
      "PRIMARY KEY (user_id, day));")


def today() -> dt.date:
    return dt.datetime.now(dt.timezone.utc).date()


def next_state(box: int, ok: bool, day: dt.date):
    """Saf fonksiyon: (yeni kutu, bir sonraki tarih)."""
    if not ok:
        return 0, day
    box = min(MAX_BOX, box + 1)
    return box, day + dt.timedelta(days=INTERVALS[box])


class Item(BaseModel):
    w: str
    ok: bool


class ReportReq(BaseModel):
    src: str = "tr"
    dst: str = "en"
    items: list[Item] = []


@router.post("/api/srs/report")
def report(d: ReportReq, request: Request):
    """Bir quiz/düello bittiğinde sonuçları toplu gönderir."""
    u = need_user(request)
    _throttle_ip(request, 40, 60, "srs")
    vocab.check_pair(d.src, d.dst)
    items = [(i.w.strip()[:60], i.ok) for i in d.items[:60] if i.w.strip()]
    if not items:
        return {"ok": True, "xp": 0}
    day = today()
    words = list({w for w, _ in items})
    state = {w: (b, r, x) for w, b, r, x in q(
        "SELECT word, box, right_n, wrong_n FROM word_stats WHERE user_id = %s AND src = %s AND dst = %s "
        "AND word = ANY(%s);", (u["id"], d.src, d.dst, words), True)}
    due = {}
    for w, ok in items:
        box, r, x = state.get(w, (0, 0, 0))
        box, dd = next_state(box, ok, day)
        state[w] = (box, r + (1 if ok else 0), x + (0 if ok else 1))
        due[w] = dd
    gain = XP_PER_CORRECT * sum(1 for _, ok in items if ok)
    conn = psycopg2.connect(**DB)
    try:
        cur = conn.cursor()
        for w in words:
            box, r, x = state[w]
            cur.execute(
                "INSERT INTO word_stats (user_id, src, dst, word, box, due, right_n, wrong_n) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (user_id, src, dst, word) DO UPDATE SET "
                "box = EXCLUDED.box, due = EXCLUDED.due, right_n = EXCLUDED.right_n, wrong_n = EXCLUDED.wrong_n, "
                "last_at = now();", (u["id"], d.src, d.dst, w, box, due[w], r, x))
        if gain:
            cur.execute(
                "INSERT INTO xp_log (user_id, day, xp) VALUES (%s, %s, %s) ON CONFLICT (user_id, day) DO UPDATE "
                "SET xp = LEAST(xp_log.xp + EXCLUDED.xp, %s);", (u["id"], day, min(gain, XP_DAY_CAP), XP_DAY_CAP))
        conn.commit()
    finally:
        conn.close()
    return {"ok": True, "xp": gain}


def _user_words(uid: int, src: str, dst: str) -> dict:
    """{kelime: çeviri}: kullanıcının listesinde olan ve quizde sorulabilir kelimeler."""
    rows = vocab.rows_for(uid, src, dst)
    return _quality([(r[0], r[1]) for r in rows], src, dst)


def _stats(uid: int, src: str, dst: str) -> dict:
    return {w: {"box": b, "due": dd, "right": r, "wrong": x} for w, b, dd, r, x in q(
        "SELECT word, box, due, right_n, wrong_n FROM word_stats WHERE user_id = %s AND src = %s AND dst = %s;",
        (uid, src, dst), True)}


def pick_session(words: dict, stats: dict, day: dt.date, n: int, rng=random):
    """Saf fonksiyon: önce vadesi gelenler (eskiden yeniye), sonra hiç görülmemişler, en sonda vadesi en yakın olanlar."""
    due = sorted([w for w in words if w in stats and stats[w]["due"] <= day],
                 key=lambda w: (stats[w]["due"], stats[w]["box"], w))
    new = [w for w in words if w not in stats]
    rng.shuffle(new)
    later = sorted([w for w in words if w in stats and stats[w]["due"] > day], key=lambda w: (stats[w]["due"], w))
    return (due + new + later)[:n], len(due)


@router.get("/api/srs")
def info(request: Request, src: str = "tr", dst: str = "en"):
    u = need_user(request)
    vocab.check_pair(src, dst)
    day = today()
    words = _user_words(u["id"], src, dst)
    stats = _stats(u["id"], src, dst)
    mine = {w: s for w, s in stats.items() if w in words}
    hard = sorted([(w, s) for w, s in mine.items() if s["wrong"] >= 1 and s["box"] <= 2],
                  key=lambda ws: (-(ws[1]["wrong"] - ws[1]["right"]), -ws[1]["wrong"], ws[0]))[:20]
    return {
        "due": sum(1 for s in mine.values() if s["due"] <= day),
        "new": sum(1 for w in words if w not in stats),
        "learning": sum(1 for s in mine.values() if 0 < s["box"] < MASTERED_BOX),
        "mastered": sum(1 for s in mine.values() if s["box"] >= MASTERED_BOX),
        "hard": [{"tr": w, "eng": words[w], "wrong": s["wrong"], "right": s["right"]} for w, s in hard],
    }


@router.get("/api/srs/session")
def session(request: Request, src: str = "tr", dst: str = "en", n: int = 10, hard: int = 0):
    """Akıllı tekrar için kelime listesi. hard=1: sadece zor kelimeler."""
    u = need_user(request)
    vocab.check_pair(src, dst)
    n = max(4, min(30, n))
    day = today()
    words = _user_words(u["id"], src, dst)
    stats = _stats(u["id"], src, dst)
    if hard:
        cand = sorted([w for w, s in stats.items() if w in words and s["wrong"] >= 1 and s["box"] <= 2],
                      key=lambda w: (-(stats[w]["wrong"] - stats[w]["right"]), w))[:n]
        pick, due_n = cand, len(cand)
    else:
        pick, due_n = pick_session(words, stats, day, n)
    return {"due": due_n, "words": [{"tr": w, "eng": words[w]} for w in pick]}
