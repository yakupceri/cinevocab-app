"""Büyüme özellikleri: davet bağlantısı + rozetler, herkese açık profil, hazır kelime paketleri, SEO sayfaları."""
import datetime as dt
import html
import re

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

import multilang
import packs
import vocab
from accounts import q, need_user

router = APIRouter()
T = Jinja2Templates(directory="templates")
SITE = "https://cinevocab.up.railway.app"
XP_LEVEL = 200
UI_LANGS = ("en", "tr", "fr", "it", "de", "es")


def init():
    q("CREATE TABLE IF NOT EXISTS referrals (new_user INT PRIMARY KEY, inviter INT NOT NULL, "
      "created_at TIMESTAMP DEFAULT now());")
    q("ALTER TABLE users ADD COLUMN IF NOT EXISTS public_profile BOOLEAN NOT NULL DEFAULT false;")


# ---------------------------------------------------------------- davet
def record_ref(new_uid: int, ref: str):
    """Kayıt sırasında çağrılır; geçersiz/olmayan davet kodu sessizce yok sayılır."""
    ref = (ref or "").strip()
    if not re.fullmatch(r"\w{3,16}", ref):
        return
    try:
        r = q("SELECT id FROM users WHERE lower(username) = lower(%s);", (ref,), True)
        if r and r[0][0] != new_uid:
            q("INSERT INTO referrals (new_user, inviter) VALUES (%s, %s) ON CONFLICT DO NOTHING;",
              (new_uid, r[0][0]))
    except Exception as e:
        print(f"   [ref] kayıt hatası: {e}")


def badges_for(uid: int) -> list:
    """Rozetler kayıtlı verilerden hesaplanır (ayrı tablo yok)."""
    out = []
    try:
        n = q("SELECT count(*) FROM referrals WHERE inviter = %s;", (uid,), True)[0][0]
        if n >= 1:
            out.append("connector")
        if n >= 5:
            out.append("ambassador")
        if n >= 15:
            out.append("legend")
        if q("SELECT 1 FROM referrals WHERE new_user = %s;", (uid,), True):
            out.append("invited")
    except Exception:
        pass
    return out


@router.get("/api/invite")
def invite(request: Request):
    u = need_user(request)
    n = q("SELECT count(*) FROM referrals WHERE inviter = %s;", (u["id"],), True)[0][0]
    return {"link": f"{SITE}/?ref={u['username']}", "count": n, "badges": badges_for(u["id"])}


# ---------------------------------------------------------------- profil
def _stats(uid: int) -> dict:
    words = q("SELECT count(DISTINCT tr) FROM user_words WHERE user_id = %s;", (uid,), True)[0][0]
    try:
        words += q("SELECT count(DISTINCT (src, dst, word)) FROM user_words_ml WHERE user_id = %s;", (uid,), True)[0][0]
    except Exception:
        pass
    try:
        xp = q("SELECT coalesce(sum(xp), 0) FROM xp_log WHERE user_id = %s;", (uid,), True)[0][0]
        days = {r[0] for r in q("SELECT day FROM xp_log WHERE user_id = %s AND xp > 0;", (uid,), True)}
    except Exception:
        xp, days = 0, set()
    today = dt.datetime.now(dt.timezone.utc).date()
    d = today if today in days else today - dt.timedelta(days=1)
    streak = 0
    while d in days:
        streak += 1
        d -= dt.timedelta(days=1)
    wins = q("SELECT coalesce(sum((place = 1)::int), 0) FROM game_results WHERE user_id = %s;", (uid,), True)[0][0]
    return {"words": words, "level": int(xp) // XP_LEVEL + 1, "streak": streak, "wins": int(wins)}


def _public(username: str):
    r = q("SELECT id, username, country, created_at, public_profile FROM users WHERE lower(username) = lower(%s);",
          (username,), True)
    if not r or not r[0][4]:
        return None
    uid = r[0][0]
    d = _stats(uid)
    d.update({"username": r[0][1], "country": r[0][2] or "", "joined": r[0][3].strftime("%Y-%m"),
              "badges": badges_for(uid)})
    return d


@router.get("/api/profile/{username}")
def profile_api(username: str):
    d = _public(username)
    if not d:
        raise HTTPException(404, "Profil bulunamadı.")
    return d


class PublicReq(BaseModel):
    on: bool


@router.post("/api/profile-public")
def profile_public(d: PublicReq, request: Request):
    u = need_user(request)
    q("UPDATE users SET public_profile = %s WHERE id = %s;", (d.on, u["id"]))
    return {"on": d.on, "url": f"{SITE}/u/{u['username']}"}


@router.get("/api/profile-public")
def profile_public_get(request: Request):
    u = need_user(request)
    on = q("SELECT public_profile FROM users WHERE id = %s;", (u["id"],), True)[0][0]
    return {"on": bool(on), "url": f"{SITE}/u/{u['username']}"}


@router.get("/u/{username}", response_class=HTMLResponse)
def profile_page(username: str, request: Request):
    if not re.fullmatch(r"\w{3,16}", username):
        raise HTTPException(404, "Profil bulunamadı.")
    d = _public(username)
    if not d:
        return T.TemplateResponse(request, "profile.html", {"p": None, "name": username}, status_code=404)
    return T.TemplateResponse(request, "profile.html", {"p": d, "name": d["username"]})


# ---------------------------------------------------------------- hazır paketler
@router.get("/api/packs")
def packs_list(src: str = "en"):
    out = []
    for pid in packs.PACK_META:
        n = len(packs.pack_words(src, pid))
        if n:
            out.append({"id": pid, "count": n, "title": packs.TITLES[pid]})
    return {"packs": out}


class PackReq(BaseModel):
    src: str
    dst: str
    pack: str


@router.post("/api/pack-add")
def pack_add(d: PackReq, request: Request):
    u = need_user(request)
    vocab.check_pair(d.src, d.dst)
    if (d.src, d.dst) == vocab.LEGACY:
        raise HTTPException(400, "Bu dil çifti için hazır paket yok.")
    words = packs.pack_words(d.src, d.pack)
    if not words:
        raise HTTPException(404, "Paket bulunamadı.")
    known = vocab.known_set(u["id"], d.src)
    words = [w for w in words if w not in known]
    have = {w: t for w, t in q("SELECT word, trans FROM words_ml WHERE src = %s AND dst = %s AND word = ANY(%s);",
                               (d.src, d.dst, words), True)}
    need = [w for w in words if w not in have]
    if need:
        try:
            got = multilang.translate_words(need, d.src, d.dst)
        except multilang.Limited:
            raise HTTPException(503, "Çeviri servisi şu an yoğun, biraz sonra tekrar dene.")
        for w, t in got.items():
            q("INSERT INTO words_ml (src, dst, word, trans) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING;",
              (d.src, d.dst, w, t))
        have.update(got)
    added = 0
    for w in words:
        if vocab._ok(w, have.get(w)):
            q("INSERT INTO user_words_ml (user_id, src, dst, word, episode) VALUES (%s, %s, %s, %s, %s) "
              "ON CONFLICT DO NOTHING;", (u["id"], d.src, d.dst, w, "Starter pack"))
            added += 1
    return {"added": added}


# ---------------------------------------------------------------- SEO
import learn_data

LEARN = learn_data.LEARN


def _learn(request: Request, lang: str, hl: str):
    if lang not in LEARN:
        raise HTTPException(404, "Sayfa bulunamadı.")
    d = learn_data.build(lang, hl)
    ld = {"@context": "https://schema.org", "@type": "FAQPage",
          "mainEntity": [{"@type": "Question", "name": a, "acceptedAnswer": {"@type": "Answer", "text": b}}
                         for a, b in d["faq"]]}
    return T.TemplateResponse(request, "learn.html", {"d": d, "ld": ld, "site": SITE, "langs": list(LEARN)})


@router.get("/learn/{lang}", response_class=HTMLResponse)
def learn_page(lang: str, request: Request):
    return _learn(request, lang, "en")


@router.get("/ogren/{lang}", response_class=HTMLResponse)
def ogren_page(lang: str, request: Request):
    return _learn(request, lang, "tr")


@router.get("/sitemap.xml")
def sitemap():
    urls = ["/", "/explore", "/privacy"] + [f"/learn/{k}" for k in LEARN] + [f"/ogren/{k}" for k in LEARN]
    body = "".join(f"<url><loc>{html.escape(SITE + u)}</loc></url>" for u in urls)
    return Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
                    + body + "</urlset>", media_type="application/xml")


@router.get("/google636bdd3334693425.html")
def google_verify():
    return PlainTextResponse("google-site-verification: google636bdd3334693425.html")


@router.get("/robots.txt")
def robots():
    return PlainTextResponse(f"User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: {SITE}/sitemap.xml\n")
