"""Arkadaş ligleri: davet kodlu özel gruplar, haftalık ve tüm zamanlar sıralaması.

Puan = düello puanları + günlük meydan okuma puanı + pratik XP (xp_log). Hafta Pazartesi 00:00 UTC'de başlar.
"""
import datetime as dt
import re
import secrets

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from accounts import _throttle_ip, need_user, q

router = APIRouter()

ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"   # 0/O, 1/I/L karışmasın
MAX_MEMBERS = 20
MAX_LEAGUES = 5


def init():
    q("CREATE TABLE IF NOT EXISTS leagues (id SERIAL PRIMARY KEY, name TEXT NOT NULL, code TEXT UNIQUE NOT NULL, "
      "owner INT NOT NULL, created_at TIMESTAMP DEFAULT now());")
    q("CREATE TABLE IF NOT EXISTS league_members (league_id INT NOT NULL, user_id INT NOT NULL, "
      "joined_at TIMESTAMP DEFAULT now(), PRIMARY KEY (league_id, user_id));")


def week_start(day: dt.date) -> dt.date:
    return day - dt.timedelta(days=day.weekday())


def new_code() -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(6))


def clean_code(code: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", str(code or "").upper())[:8]


def clean_name(name: str) -> str:
    return " ".join(str(name or "").split())[:30]


def board(lid: int, since: dt.date) -> list:
    rows = q(
        "SELECT u.id, u.username, coalesce(u.country, ''), "
        "coalesce((SELECT sum(g.score) FROM game_results g WHERE g.user_id = u.id AND g.created_at >= %s), 0) "
        "+ coalesce((SELECT sum(d.score) FROM daily_play d WHERE d.user_id = u.id AND d.done AND d.day >= %s), 0) "
        "+ coalesce((SELECT sum(x.xp) FROM xp_log x WHERE x.user_id = u.id AND x.day >= %s), 0) AS pts "
        "FROM users u JOIN league_members m ON m.user_id = u.id WHERE m.league_id = %s "
        "ORDER BY pts DESC, u.username;", (since, since, since, lid), True)
    return [{"id": r[0], "username": r[1], "country": r[2], "pts": int(r[3])} for r in rows]


def _since(period: str) -> dt.date:
    return week_start(dt.datetime.now(dt.timezone.utc).date()) if period != "all" else dt.date(1970, 1, 1)


def _league(lid: int):
    r = q("SELECT id, name, code, owner FROM leagues WHERE id = %s;", (lid,), True)
    if not r:
        raise HTTPException(404, "Lig bulunamadı.")
    return r[0]


def _member(lid: int, uid: int):
    if not q("SELECT 1 FROM league_members WHERE league_id = %s AND user_id = %s;", (lid, uid), True):
        raise HTTPException(403, "Bu ligin üyesi değilsin.")


def _count(uid: int) -> int:
    return q("SELECT count(*) FROM league_members WHERE user_id = %s;", (uid,), True)[0][0]


@router.get("/api/leagues")
def mine(request: Request):
    u = need_user(request)
    rows = q("SELECT l.id, l.name, l.code, l.owner, (SELECT count(*) FROM league_members x WHERE x.league_id = l.id) "
             "FROM leagues l JOIN league_members m ON m.league_id = l.id WHERE m.user_id = %s ORDER BY m.joined_at;",
             (u["id"],), True)
    since, out = _since("week"), []
    for lid, name, code, owner, n in rows:
        b = board(lid, since)
        rank = next((i + 1 for i, r in enumerate(b) if r["id"] == u["id"]), None)
        pts = next((r["pts"] for r in b if r["id"] == u["id"]), 0)
        out.append({"id": lid, "name": name, "code": code, "owner": owner == u["id"], "members": n, "rank": rank, "pts": pts})
    return out


class CreateReq(BaseModel):
    name: str


@router.post("/api/leagues")
def create(d: CreateReq, request: Request):
    u = need_user(request)
    _throttle_ip(request, 10, 60, "league")
    name = clean_name(d.name)
    if len(name) < 2:
        raise HTTPException(400, "Lig adı en az 2 karakter olmalı.")
    if _count(u["id"]) >= MAX_LEAGUES:
        raise HTTPException(409, f"En fazla {MAX_LEAGUES} ligde olabilirsin.")
    for _ in range(20):
        code = new_code()
        r = q("INSERT INTO leagues (name, code, owner) VALUES (%s, %s, %s) ON CONFLICT (code) DO NOTHING RETURNING id;",
              (name, code, u["id"]), True)
        if r:
            break
    else:
        raise HTTPException(500, "Lig oluşturulamadı, tekrar dene.")
    q("INSERT INTO league_members (league_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;", (r[0][0], u["id"]))
    return {"id": r[0][0], "name": name, "code": code}


class CodeReq(BaseModel):
    code: str


@router.get("/api/leagues/preview")
def preview(request: Request, code: str = ""):
    """Davet sayfası için (giriş gerekmez): lig adı ve üye sayısı."""
    _throttle_ip(request, 30, 60, "league-preview")
    r = q("SELECT l.id, l.name, u.username FROM leagues l JOIN users u ON u.id = l.owner WHERE l.code = %s;",
          (clean_code(code),), True)
    if not r:
        raise HTTPException(404, "Lig bulunamadı.")
    n = q("SELECT count(*) FROM league_members WHERE league_id = %s;", (r[0][0],), True)[0][0]
    return {"name": r[0][1], "owner": r[0][2], "members": n, "max": MAX_MEMBERS}


@router.post("/api/leagues/join")
def join(d: CodeReq, request: Request):
    u = need_user(request)
    _throttle_ip(request, 20, 60, "league")
    r = q("SELECT id, name FROM leagues WHERE code = %s;", (clean_code(d.code),), True)
    if not r:
        raise HTTPException(404, "Lig bulunamadı.")
    lid, name = r[0]
    if q("SELECT 1 FROM league_members WHERE league_id = %s AND user_id = %s;", (lid, u["id"]), True):
        return {"id": lid, "name": name, "joined": False}
    if q("SELECT count(*) FROM league_members WHERE league_id = %s;", (lid,), True)[0][0] >= MAX_MEMBERS:
        raise HTTPException(409, "Lig dolu.")
    if _count(u["id"]) >= MAX_LEAGUES:
        raise HTTPException(409, f"En fazla {MAX_LEAGUES} ligde olabilirsin.")
    q("INSERT INTO league_members (league_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;", (lid, u["id"]))
    return {"id": lid, "name": name, "joined": True}


@router.get("/api/leagues/{lid}")
def detail(lid: int, request: Request, period: str = "week"):
    u = need_user(request)
    _, name, code, owner = _league(lid)
    _member(lid, u["id"])
    rows = board(lid, _since(period))
    return {"id": lid, "name": name, "code": code, "owner": owner == u["id"], "period": period,
            "rows": [{"username": r["username"], "country": r["country"], "pts": r["pts"], "me": r["id"] == u["id"],
                      "owner": r["id"] == owner} for r in rows]}


class IdReq(BaseModel):
    id: int


@router.post("/api/leagues/leave")
def leave(d: IdReq, request: Request):
    u = need_user(request)
    _, name, code, owner = _league(d.id)
    _member(d.id, u["id"])
    drop_member(d.id, u["id"])
    return {"ok": True}


def drop_member(lid: int, uid: int):
    """Üyeyi çıkarır; sahip ayrılırsa en eski üyeye devreder, kimse kalmazsa ligi siler."""
    q("DELETE FROM league_members WHERE league_id = %s AND user_id = %s;", (lid, uid))
    rest = q("SELECT user_id FROM league_members WHERE league_id = %s ORDER BY joined_at LIMIT 1;", (lid,), True)
    if not rest:
        q("DELETE FROM leagues WHERE id = %s;", (lid,))
    else:
        q("UPDATE leagues SET owner = %s WHERE id = %s AND owner = %s;", (rest[0][0], lid, uid))


def on_user_deleted(uid: int):
    """Hesap silinirken çağrılır."""
    for (lid,) in q("SELECT league_id FROM league_members WHERE user_id = %s;", (uid,), True):
        drop_member(lid, uid)


@router.post("/api/leagues/delete")
def delete(d: IdReq, request: Request):
    u = need_user(request)
    _, _, _, owner = _league(d.id)
    if owner != u["id"]:
        raise HTTPException(403, "Bunu sadece ligin sahibi yapabilir.")
    q("DELETE FROM league_members WHERE league_id = %s;", (d.id,))
    q("DELETE FROM leagues WHERE id = %s;", (d.id,))
    return {"ok": True}


class KickReq(BaseModel):
    id: int
    username: str


@router.post("/api/leagues/kick")
def kick(d: KickReq, request: Request):
    u = need_user(request)
    _, _, _, owner = _league(d.id)
    if owner != u["id"]:
        raise HTTPException(403, "Bunu sadece ligin sahibi yapabilir.")
    r = q("SELECT u.id FROM users u JOIN league_members m ON m.user_id = u.id "
          "WHERE m.league_id = %s AND lower(u.username) = lower(%s);", (d.id, d.username), True)
    if r and r[0][0] != u["id"]:
        q("DELETE FROM league_members WHERE league_id = %s AND user_id = %s;", (d.id, r[0][0]))
    return {"ok": True}
