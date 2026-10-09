"""Oda ayarları: soru sayısı, soru süresi, isteğe bağlı oda şifresi.
Kullanım (proje klasöründe, uygula.py'den SONRA):  python3 uygula2.py
Yedekler .bak2 olarak alınır. Bir değişiklik eşleşmezse HİÇBİR ŞEY yazılmaz."""
import shutil
import sys

MAIN = [
(r'''class Room:
''', r'''def _num(v, lo, hi, default):
    try:
        return max(lo, min(hi, int(v)))
    except (TypeError, ValueError):
        return default


class Room:
'''),
(r'''    def __init__(self, code: str, episode: str):
        self.code, self.episode = code, episode
''', r'''    def __init__(self, code: str, episode: str, n_questions: int = N_QUESTIONS,
                 seconds: int = Q_SECONDS, password: str = ""):
        self.code, self.episode = code, episode
        self.n_questions, self.seconds, self.password = n_questions, seconds, password
'''),
(r'''        "t": "room", "code": room.code, "episode": room.episode, "host": room.host,''',
 r'''        "t": "room", "code": room.code, "episode": room.episode, "host": room.host,
        "n": room.n_questions, "seconds": room.seconds, "locked": bool(room.password),'''),
(r'''build_questions, room.episode, [p["uid"] for p in room.players.values()])''',
 r'''build_questions, room.episode, [p["uid"] for p in room.players.values()],
            room.n_questions)'''),
(r'''"tr": q["tr"], "options": q["options"], "seconds": Q_SECONDS})''',
 r'''"tr": q["tr"], "options": q["options"], "seconds": room.seconds})'''),
(r'''room.event.wait(), Q_SECONDS)''', r'''room.event.wait(), room.seconds)'''),
(r'''(a[1] - room.q_start) / Q_SECONDS)''', r'''(a[1] - room.q_start) / room.seconds)'''),
(r'''room = ROOMS[code] = Room(code, episode)''',
 r'''room = ROOMS[code] = Room(
                        code, episode,
                        _num(msg.get("n"), 4, 100, N_QUESTIONS),
                        _num(msg.get("seconds"), 5, 60, Q_SECONDS),
                        str(msg.get("password") or "")[:20])'''),
(r'''                room.players[pid] = {"name": name, "ws": ws, "score": 0, "uid": user["id"]}''',
 r'''                if t == "join" and room.password and str(msg.get("password") or "") != room.password:
                    room = None
                    await ws.send_json({"t": "error", "msg": "Oda şifresi yanlış."})
                    continue
                room.players[pid] = {"name": name, "ws": ws, "score": 0, "uid": user["id"]}'''),
]

GAME = [
(r'''  const create = el("button", "go", "Oda kur");''',
 r'''  const nIn = el("input"); nIn.type = "number"; nIn.min = 4; nIn.max = 100; nIn.value = 10;
  const secIn = el("input"); secIn.type = "number"; secIn.min = 5; secIn.max = 60; secIn.value = 12;
  const pwIn = el("input"); pwIn.placeholder = "Boş bırakırsan herkes katılabilir"; pwIn.maxLength = 20;
  const set = el("div", "row"); set.append(field("Soru sayısı", nIn), field("Süre (sn)", secIn));
  const create = el("button", "go", "Oda kur");'''),
(r'''if (sel.value) connect({ t: "create", name, episode: sel.value }); };''',
 r'''if (sel.value) connect({ t: "create", name, episode: sel.value, n: +nIn.value, seconds: +secIn.value, password: pwIn.value }); };'''),
(r'''  const codeIn = el("input"); codeIn.placeholder = "4 haneli kod";''',
 r'''  const jpIn = el("input"); jpIn.placeholder = "Şifre (varsa)"; jpIn.maxLength = 20; jpIn.style.marginTop = "10px";
  const codeIn = el("input"); codeIn.placeholder = "4 haneli kod";'''),
(r'''connect({ t: "join", name, code: codeIn.value.trim() }); };''',
 r'''connect({ t: "join", name, code: codeIn.value.trim(), password: jpIn.value }); };'''),
(r'''field("Bölüm", sel), create,''',
 r'''field("Bölüm", sel), set, field("Oda şifresi (isteğe bağlı)", pwIn), create,'''),
(r'''field("Ya da bir odaya katıl", jr), errBox);''',
 r'''field("Ya da bir odaya katıl", jr), jpIn, errBox);'''),
(r'''el("p", "msg", info.episode)''',
 r'''el("p", "msg", info.episode + " · " + info.n + " soru · " + info.seconds + " sn" + (info.locked ? " · şifreli" : ""))'''),
]


def patch(path, edits):
    try:
        text = open(path, encoding="utf-8").read()
    except FileNotFoundError:
        print(f"! {path} bulunamadı, atlandı.")
        return False
    for i, (old, new) in enumerate(edits, 1):
        if text.count(old) != 1:
            print(f"! {path}: {i}. değişiklik eşleşmedi ({text.count(old)} kez bulundu). Hiçbir şey yazılmadı.")
            return False
        text = text.replace(old, new)
    shutil.copy(path, path + ".bak2")
    open(path, "w", encoding="utf-8").write(text)
    print(f"✓ {path} güncellendi (yedek: {path}.bak2)")
    return True


if __name__ == "__main__":
    ok = patch("main.py", MAIN)
    patch("templates/game.html", GAME)
    sys.exit(0 if ok else 1)