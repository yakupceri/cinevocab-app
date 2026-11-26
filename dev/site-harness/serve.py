#!/usr/bin/env python3
"""Site deneme ortamı: PostgreSQL olmadan CineVocab sitesini yerelde gösterir.

templates/*.html ve static/* dosyalarını olduğu gibi sunar; /api/* uçlarını SAHTE ama gerçekçi JSON ile yanıtlar
(uç şekilleri account.html, game.html ve daily.html içindeki fetch çağrılarından, ayrıca vocab.py, accounts.py, srs.py,
leagues.py, growth.py, daily.py'den SALT OKUNARAK çıkarıldı). Hiçbir Python dosyası değiştirilmez.
Yalnızca standart kütüphane (http.server). Yalnızca 127.0.0.1'e açılır. Siteye ve eklenti paketine girmez.

  python3 dev/site-harness/serve.py [--port 8810]
  http://127.0.0.1:8810/account            (giriş açık, dolu hesap)
  http://127.0.0.1:8810/__scene?name=full|empty|loggedout|fresh   (durumu sıfırlar)
WebSocket (/ws) stdlib ile yok: game.html testinde tarayıcıda sahte WebSocket enjekte edilir (shots.mjs).
"""
import argparse
import copy
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
TPL = os.path.join(ROOT, "templates")
STATIC = os.path.join(ROOT, "static")
LOCK = threading.Lock()
PORT = 8810

# ----------------------------------------------------------------------------- sahte veri
ES = [  # (kelime, çeviri, bölüm)
    ("verdad", "truth", "Money Heist S1 E1"), ("nunca", "never", "Money Heist S1 E1"), ("dinero", "money", "Money Heist S1 E1"),
    ("miedo", "fear", "Money Heist S1 E1"), ("plan", "plan", "Money Heist S1 E1"), ("ayuda", "help", "Money Heist S1 E1"),
    ("peligro", "danger", "Money Heist S1 E1"), ("silencio", "silence", "Money Heist S1 E2"), ("rehén", "hostage", "Money Heist S1 E2"),
    ("rápido", "fast", "Money Heist S1 E2"), ("cuidado", "careful", "Money Heist S1 E2"), ("jamás", "never ever", "Money Heist S1 E2"),
    ("puerta", "door", "Money Heist S1 E2"), ("corazón", "heart", "Money Heist S1 E3"), ("mentira", "lie", "Money Heist S1 E3"),
    ("confianza", "trust", "Money Heist S1 E3"), ("culpa", "guilt", "Money Heist S1 E3"), ("aliado", "ally", "Money Heist S1 E3"),
    ("hermano", "brother", "Money Heist S1 E3"), ("quizás", "maybe", "Money Heist S1 E3"),
    ("desayuno", "breakfast", "YouTube · Easy Spanish 344"), ("barrio", "neighborhood", "YouTube · Easy Spanish 344"),
    ("quedarse", "to stay", "YouTube · Easy Spanish 344"), ("mercado", "market", "YouTube · Easy Spanish 344"),
    ("calle", "street", "YouTube · Easy Spanish 344"), ("vecino", "neighbor", "YouTube · Easy Spanish 344"),
    ("cansado", "tired", "YouTube · Easy Spanish 344"), ("tarde", "late", "YouTube · Easy Spanish 344"),
    ("nube", "cloud", "YouTube · La Casa de Dreaming Spanish"), ("escalera", "stairs", "YouTube · La Casa de Dreaming Spanish"),
    ("ventana", "window", "YouTube · La Casa de Dreaming Spanish"), ("cocina", "kitchen", "YouTube · La Casa de Dreaming Spanish"),
    ("pegamento", "glue", "YouTube · La Casa de Dreaming Spanish"),
    ("subjuntivo", "subjunctive", "Udemy · Spanish for Beginners: Lesson 4"), ("pretérito", "preterite", "Udemy · Spanish for Beginners: Lesson 4"),
    ("conjugar", "to conjugate", "Udemy · Spanish for Beginners: Lesson 4"), ("verbo", "verb", "Udemy · Spanish for Beginners: Lesson 4"),
    ("acento", "accent", "Udemy · Spanish for Beginners: Lesson 4"), ("frase", "sentence", "Udemy · Spanish for Beginners: Lesson 4"),
    ("dudar", "to doubt", ""),
]
ES_DUP = [("verdad", "truth", "Money Heist S1 E2"), ("miedo", "fear", "Money Heist S1 E3"), ("cuidado", "careful", "YouTube · Easy Spanish 344")]
KNOWN = [("hola", "hello"), ("gracias", "thank you"), ("amigo", "friend")]
STAMPS = {"Money Heist S1 E1": "2026-11-20 21:14:00", "Money Heist S1 E2": "2026-11-21 20:40:00", "Money Heist S1 E3": "2026-11-22 22:05:00",
          "YouTube · Easy Spanish 344": "2026-11-18 13:22:00", "YouTube · La Casa de Dreaming Spanish": "2026-11-15 18:01:00",
          "Udemy · Spanish for Beginners: Lesson 4": "2026-11-10 09:30:00", "": "2026-11-09 10:00:00"}

LEAGUE_ROWS = [("zeri", "TR", 900), ("lucia_m", "ES", 812), ("tomas99", "DE", 455), ("marie_l", "FR", 120)]  # örnek veri: Türkiye bayraklı "zeri" 1. sırada


def fresh_state(scene="full"):
    s = {
        "scene": scene, "logged": scene != "loggedout", "mail": False,
        "me": {"username": "zeri", "games": 14, "score": 6120, "wins": 3, "country": "TR", "avatar": "",
               "has_recovery": False, "has_password": True},
        "words": [] if scene in ("empty", "fresh") else [{"tr": a, "eng": b, "episode": c} for a, b, c in ES + ES_DUP],
        "known": [] if scene in ("empty", "fresh") else [{"tr": a, "eng": b} for a, b in KNOWN],
        "public": False, "leagues": scene == "full", "bank": [], "calls": [],
        # kelime notları (vocab.py /api/notes): {"es>en": {kelime: not}}; tam sahnede iki örnek not
        "notes": {"es>en": {"verdad": "Sık geçiyor: la verdad = gerçek", "miedo": "korku, 'miedo a' ile kullanılır"}} if scene == "full" else {},
    }
    return s


STATE = fresh_state()


def pairs():
    if not STATE["words"]:
        return []
    n = len({w["tr"] for w in STATE["words"]})
    return [{"src": "es", "dst": "en", "count": n}, {"src": "fr", "dst": "en", "count": 12}, {"src": "tr", "dst": "en", "count": 5}]


def videos():
    agg = {}
    for w in STATE["words"]:
        a = agg.setdefault(w["episode"], {"episode": w["episode"], "count": 0, "last": STAMPS.get(w["episode"], "")})
        a["count"] += 1
    out = sorted(agg.values(), key=lambda a: a["last"], reverse=True)
    for a in out:
        a["thumb"] = ""
    return out


def vocab_for(src, dst):
    if (src, dst) == ("es", "en"):
        return {"src": src, "dst": dst, "words": STATE["words"], "known": STATE["known"]}
    return {"src": src, "dst": dst, "words": [], "known": []}


def uniq_words():
    seen, out = set(), []
    for w in STATE["words"]:
        if w["tr"] not in seen:
            seen.add(w["tr"])
            out.append(w)
    return out


def srs_info():
    ws = uniq_words()
    return {"due": 6, "new": max(0, len(ws) - 14), "learning": 8, "mastered": 3,
            "hard": [{"tr": w["tr"], "eng": w["eng"], "wrong": 3 - i % 2, "right": i % 2} for i, w in enumerate(ws[:5])]}


def daily_questions():
    ws = uniq_words()
    qs = []
    for i in range(10):
        w = ws[i % len(ws)]
        opts = [w["eng"]] + [ws[(i + k * 5) % len(ws)]["eng"] for k in (1, 2, 3)]
        qs.append({"tr": w["tr"], "options": opts, "eng": w["eng"]})
    return qs


DAILY = {"started": False, "answers": []}

# ----------------------------------------------------------------------------- uç noktalar
JSON401 = (401, {"detail": "Önce giriş yapmalısın."})


def api_get(path, qs):
    s = STATE
    need = lambda: None if s["logged"] else JSON401
    if path == "/api/ext/config":
        return 200, {"google": "", "mail": s["mail"], "contact": ""}
    if path == "/api/me":
        return need() or (200, dict(s["me"], words=len({w["tr"] for w in s["words"]})))
    if path == "/api/match/pairs":   # eşleştirme oyunu: hesapsız, sahte kelime havuzu
        return 200, {"pairs": [{"src": "es", "dst": "en", "n": 24}, {"src": "en", "dst": "tr", "n": 24}]}
    if path == "/api/match/words":
        src, dst = qs.get("src", "es"), qs.get("dst", "en")
        es = [("verdad", "truth"), ("nunca", "never"), ("dinero", "money"), ("miedo", "fear"), ("ayuda", "help"), ("peligro", "danger"),
              ("silencio", "silence"), ("puerta", "door"), ("corazón", "heart"), ("mentira", "lie"), ("hermano", "brother"), ("quizás", "maybe"),
              ("desayuno", "breakfast"), ("barrio", "neighborhood"), ("mercado", "market"), ("calle", "street"), ("vecino", "neighbor"),
              ("cansado", "tired"), ("tarde", "late"), ("nube", "cloud"), ("escalera", "stairs"), ("ventana", "window"), ("cocina", "kitchen"), ("llave", "key")]
        tr = [("truth", "gerçek"), ("never", "asla"), ("money", "para"), ("fear", "korku"), ("help", "yardım"), ("danger", "tehlike"), ("silence", "sessizlik"),
              ("door", "kapı"), ("heart", "kalp"), ("lie", "yalan"), ("brother", "erkek kardeş"), ("maybe", "belki"), ("breakfast", "kahvaltı"),
              ("neighborhood", "mahalle"), ("market", "pazar"), ("street", "sokak"), ("neighbor", "komşu"), ("tired", "yorgun"), ("late", "geç"),
              ("cloud", "bulut"), ("stairs", "merdiven"), ("window", "pencere"), ("kitchen", "mutfak"), ("key", "anahtar")]
        ws = es if (src, dst) == ("es", "en") else tr if (src, dst) == ("en", "tr") else []
        return 200, {"ready": bool(ws), "src": src, "dst": dst, "words": [{"w": a, "t": b} for a, b in ws]}
    if path == "/api/notes":
        return need() or (200, {"notes": dict(s["notes"].get(qs.get("src", "tr") + ">" + qs.get("dst", "en"), {}))})
    if path == "/api/pairs":
        return need() or (200, pairs())
    if path == "/api/vocab":
        return need() or (200, vocab_for(qs.get("src", "tr"), qs.get("dst", "en")))
    if path == "/api/videos":
        if (qs.get("src"), qs.get("dst")) != ("es", "en"):
            return 200, []
        return need() or (200, videos())
    if path == "/api/progress":
        return need() or (200, {})
    if path == "/api/leaderboard":
        if qs.get("by") == "country":
            return 200, [{"username": "TR", "country": "TR", "score": 9800, "players": 12, "wins": 31},
                         {"username": "DE", "country": "DE", "score": 7410, "players": 8, "wins": 17},
                         {"username": "ES", "country": "ES", "score": 5230, "players": 5, "wins": 11}]
        if s["scene"] in ("empty", "fresh"):
            return 200, []
        return 200, [{"username": n, "country": c, "score": sc * 2, "players": 1, "games": 9, "wins": 5 - i} for i, (n, c, sc) in enumerate(LEAGUE_ROWS)]
    if path == "/api/leagues":
        if not s["leagues"]:
            return need() or (200, [])
        return need() or (200, [{"id": 1, "name": "Cuma Ligi", "code": "K7M2QX", "owner": True, "members": 4, "rank": 2, "pts": 640},
                                {"id": 2, "name": "Madrid Class", "code": "ZP4N8D", "owner": False, "members": 9, "rank": 5, "pts": 215}])
    if path.startswith("/api/leagues/preview"):
        return 200, {"name": "Cuma Ligi", "owner": "lucia_m", "members": 4}
    if path.startswith("/api/leagues/") and path.split("/")[-1].isdigit():
        return need() or (200, {"id": int(path.split("/")[-1]), "name": "Cuma Ligi", "code": "K7M2QX", "owner": True, "period": qs.get("period", "week"),
                                "rows": [{"username": n, "country": c, "pts": p, "me": n == "zeri", "owner": n == "lucia_m"} for n, c, p in LEAGUE_ROWS]})
    if path == "/api/srs":
        return need() or (200, srs_info())
    if path == "/api/srs/session":
        ws = uniq_words()[:10]
        return need() or (200, {"due": 4, "words": [{"tr": w["tr"], "eng": w["eng"]} for w in ws]})
    if path == "/api/invite":
        return need() or (200, {"link": f"http://127.0.0.1:{PORT}/?ref={s['me']['username']}", "count": 2, "badges": ["connector"]})
    if path == "/api/profile-public":
        return need() or (200, {"on": s["public"], "url": f"http://127.0.0.1:{PORT}/u/{s['me']['username']}"})
    if path == "/api/packs":
        return 200, {"packs": [{"id": "travel", "count": 60, "title": {"en": "Travel basics", "tr": "Seyahat temelleri"}},
                               {"id": "food", "count": 48, "title": {"en": "Food and drink", "tr": "Yiyecek ve içecek"}}]}
    if path == "/api/daily":
        ws = uniq_words()
        if len(ws) < 4:
            return need() or (200, {"day": "2026-11-23", "num": 214, "total": 10, "seconds": 12, "ready": False})
        return need() or (200, {"day": "2026-11-23", "num": 214, "total": 10, "seconds": 12, "ready": True, "done": False, "started": DAILY["started"],
                                "answered": len(DAILY["answers"]), "streak": 3})
    if path == "/api/daily/board":
        return need() or (200, {"rows": [{"username": n, "country": c, "score": sc, "correct": 9 - i, "me": n == "zeri"} for i, (n, c, sc) in enumerate(LEAGUE_ROWS)],
                                "rank": 2, "total": 4})
    return 404, {"detail": "yok: " + path}


def api_post(path, body):
    s = STATE
    s["calls"].append((path, body))
    if path in ("/api/login", "/api/register"):
        s["logged"] = True
        return 200, {"ok": True, "recovery": "K4TZ-9QMX-72PB"}
    if path == "/api/logout":
        s["logged"] = False
        return 200, {"ok": True}
    if not s["logged"] and path.startswith("/api/") and path not in ("/api/signup/start", "/api/signup/verify", "/api/forgot"):
        return JSON401
    if path == "/api/known":
        ws = set(body.get("words", []))
        if body.get("known", True):
            for w in [w for w in s["words"] if w["tr"] in ws]:
                if not any(k["tr"] == w["tr"] for k in s["known"]):
                    s["known"].append({"tr": w["tr"], "eng": w["eng"]})
            s["words"] = [w for w in s["words"] if w["tr"] not in ws]
        else:
            back = [k for k in s["known"] if k["tr"] in ws]
            s["known"] = [k for k in s["known"] if k["tr"] not in ws]
            for k in back:
                s["words"].append({"tr": k["tr"], "eng": k["eng"], "episode": ""})
        return 200, {"changed": len(ws)}
    if path == "/api/delete-words":
        ws = set(body.get("words", []))
        n = len([w for w in s["words"] if w["tr"] in ws])
        s["words"] = [w for w in s["words"] if w["tr"] not in ws]
        return 200, {"deleted": n}
    if path == "/api/delete-videos":
        eps = set(body.get("episodes", []))
        n = len([w for w in s["words"] if w["episode"] in eps])
        s["words"] = [w for w in s["words"] if w["episode"] not in eps]
        return 200, {"deleted": n}
    if path == "/api/progress":
        return 200, {"ok": True}
    if path == "/api/note":   # vocab.set_note: boşlukları tekilleştir, 140'a kes, boşsa sil
        note = " ".join(str(body.get("note", "")).split())[:140]
        d = s["notes"].setdefault(str(body.get("src")) + ">" + str(body.get("dst")), {})
        if note:
            d[str(body.get("word", "")).strip().lower()] = note
        else:
            d.pop(str(body.get("word", "")).strip().lower(), None)
        return 200, {"ok": True, "note": note}
    if path == "/api/settings":
        if body.get("username"):
            s["me"]["username"] = body["username"]
        s["me"]["country"] = body.get("country", "")
        return 200, {"ok": True}
    if path == "/api/ext-key":
        return 200, {"key": "cvk_7f3a9c21e84b40d5a6b1c0e2d93f8a77"}
    if path == "/api/change-password":
        return 200, {"ok": True}
    if path == "/api/new-recovery":
        s["me"]["has_recovery"] = True
        return 200, {"recovery": "H7QD-2WLK-N93A"}
    if path == "/api/delete-account":
        s["logged"] = False
        return 200, {"ok": True}
    if path == "/api/profile-public":
        s["public"] = bool(body.get("on"))
        return 200, {"on": s["public"], "url": f"http://127.0.0.1:{PORT}/u/{s['me']['username']}"}
    if path == "/api/pack-add":
        return 200, {"added": 60}
    if path == "/api/leagues":
        return 200, {"id": 3, "name": body.get("name", "Lig")}
    if path == "/api/leagues/join":
        return 200, {"id": 1, "name": "Cuma Ligi", "joined": True}
    if path in ("/api/leagues/leave", "/api/leagues/delete", "/api/leagues/kick", "/api/srs/report", "/api/star"):
        return 200, {"ok": True}
    if path == "/api/daily/start":
        DAILY["started"] = True
        qs = daily_questions()
        return 200, {"num": 214, "seconds": 12, "score": 0, "progress": [], "questions": [{"tr": q["tr"], "options": q["options"]} for q in qs]}
    if path == "/api/daily/answer":
        qs = daily_questions()
        q = qs[body.get("idx", 0)]
        ok = body.get("choice") == q["eng"]
        done = body.get("idx", 0) >= 9
        out = {"ok": ok, "correct": q["eng"], "delta": 120 if ok else 0, "score": 480, "done": done}
        if done:
            out["result"] = {"num": 214, "score": 940, "correct": 8, "total": 10, "grid": "🟩🟩🟥🟩🟩🟩🟩🟥🟩🟩", "rank": 2, "players": 4, "streak": 3}
        return 200, out
    if path in ("/api/signup/start", "/api/signup/verify"):
        return 200, {"ok": True, "recovery": "K4TZ-9QMX-72PB"}
    if path == "/api/forgot":
        return 200, {"ok": True, "recovery": "K4TZ-9QMX-72PB"}
    return 404, {"detail": "yok: " + path}


# ----------------------------------------------------------------------------- sayfalar
def read(path, mode="rb"):
    with open(path, mode) as f:
        return f.read()


def render_plain(name):
    html = read(os.path.join(TPL, name), "r").replace("{{ ASSET_V }}", "dev")
    return html.encode()


def render_jinja(name, ctx):
    try:
        import jinja2
    except ImportError:
        return None
    env = jinja2.Environment(loader=jinja2.FileSystemLoader(TPL), autoescape=True)
    env.globals["ASSET_V"] = "dev"
    return env.get_template(name).render(**ctx).encode()


def learn_ctx(lang, hl):
    sys.path.insert(0, ROOT)
    import learn_data  # salt okunur içe aktarma: dosya değişmez
    d = learn_data.build(lang, hl)
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": []}
    return {"d": d, "ld": ld, "site": f"http://127.0.0.1:{PORT}", "langs": list(learn_data.LEARN) if hasattr(learn_data, "LEARN") else list(learn_data.INFO)}


CT = {".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json"}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, body, ctype="text/html; charset=utf-8"):
        if isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def j(self, code, obj):
        self.send(code, json.dumps(obj, ensure_ascii=False), "application/json; charset=utf-8")

    def do_GET(self):
        global STATE
        u = urlparse(self.path)
        path, qs = u.path, {k: v[0] for k, v in parse_qs(u.query).items()}
        with LOCK:
            if path == "/__scene":
                STATE = fresh_state(qs.get("name", "full"))
                DAILY.update(started=False, answers=[])
                return self.j(200, {"ok": True, "scene": STATE["scene"]})
            if path == "/__state":
                return self.j(200, {"calls": STATE["calls"], "scene": STATE["scene"]})
            if path.startswith("/api/"):
                code, obj = api_get(path, qs)
                return self.j(code, obj)
        if path.startswith("/static/"):
            f = os.path.abspath(os.path.join(ROOT, path.lstrip("/")))
            if f.startswith(STATIC + os.sep) and os.path.isfile(f):
                return self.send(200, read(f), CT.get(os.path.splitext(f)[1], "application/octet-stream"))
            return self.send(404, "yok")
        page = {"/account": "account.html", "/game": "game.html", "/daily": "daily.html", "/explore": "explore.html", "/match": "match.html", "/": "landing.html"}.get(path)
        if page:
            return self.send(200, render_plain(page))
        if path == "/__old/account":  # karşılaştırma için: yeniden tasarımdan önceki (eski) account.html (9ff7113~1), yalnızca okunur
            import subprocess
            out = subprocess.run(["git", "show", "9ff7113~1:templates/account.html"], cwd=ROOT, capture_output=True, check=False).stdout
            return self.send(200, out.replace(b"{{ ASSET_V }}", b"dev"))
        if path.startswith("/join/"):
            return self.send(200, render_plain("join.html"))
        if path.startswith("/u/"):
            out = render_jinja("profile.html", {"p": {"words": 412, "level": 7, "streak": 5, "wins": 3, "badges": ["connector"], "username": "zeri"}, "name": "zeri"})
            return self.send(200, out) if out else self.send(501, "jinja2 yok")
        if path.startswith(("/learn/", "/ogren/")):
            try:
                hl = "tr" if path.startswith("/ogren/") else "en"
                out = render_jinja("learn.html", learn_ctx(path.rstrip("/").split("/")[-1], hl))
            except Exception as e:  # noqa: BLE001
                return self.send(500, "learn render hatası: %r" % (e,))
            return self.send(200, out) if out else self.send(501, "jinja2 yok")
        if path == "/manifest.webmanifest":
            return self.j(200, {"name": "CineVocab", "icons": []})
        if path == "/sw.js":
            return self.send(200, "self.addEventListener('fetch',()=>{})", "text/javascript")
        if path == "/privacy":
            return self.send(200, "<h1>Privacy</h1>")
        return self.send(404, "yok")

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            body = {}
        with LOCK:
            code, obj = api_post(urlparse(self.path).path, body)
        self.j(code, obj)


def main():
    global PORT
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8810)
    a = ap.parse_args()
    PORT = a.port
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), H)
    print(f"site-harness: http://127.0.0.1:{PORT}/account  (Ctrl+C ile durdur)", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
