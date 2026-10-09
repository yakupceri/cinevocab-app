"""main.py ve templates/game.html dosyalarına hesap sistemi değişikliklerini uygular.
Kullanım (proje klasöründe):  python3 uygula.py
Her dosyanın yedeği .bak olarak alınır. Bir değişiklik eşleşmezse HİÇBİR ŞEY yazılmaz."""
import shutil
import sys

MAIN = [
(r'''from deep_translator.exceptions import TooManyRequests
''', r'''from deep_translator.exceptions import TooManyRequests
from accounts import (router, init_accounts, user_from_request, user_from_token,
                      record_game, tag_user_words)
'''),
(r'''app = FastAPI()
''', r'''app = FastAPI()
app.include_router(router)
'''),
(r'''init_db()


def tag_episode(episode: str, words: list):''', r'''init_db()
init_accounts(DB_CONFIG)


def tag_episode(episode: str, words: list):'''),
(r'''def episode_pool(episode: str) -> list:
    """Bölümün kelimeleri (aynı İngilizce karşılığı tekrar etmeden)."""
    rows = db_rows(
        "SELECT ew.tr, w.eng FROM episode_words ew JOIN words w ON w.tr = ew.tr "
        "WHERE ew.episode = %s;", (episode,))''', r'''def episode_pool(episode: str, uids: list) -> list:
    """Odadaki oyuncuların o bölümde topladığı kelimeler (aynı İngilizce karşılığı tekrar etmeden)."""
    rows = db_rows(
        "SELECT DISTINCT uw.tr, w.eng FROM user_words uw JOIN words w ON w.tr = uw.tr "
        "WHERE uw.episode = %s AND uw.user_id = ANY(%s);", (episode, uids))'''),
(r'''def build_questions(episode: str, n: int = N_QUESTIONS) -> list:''',
 r'''def build_questions(episode: str, uids: list, n: int = N_QUESTIONS) -> list:'''),
(r'''    ep = episode_pool(episode)
''', r'''    ep = episode_pool(episode, uids)
'''),
(r'''questions = await asyncio.to_thread(build_questions, room.episode)''',
 r'''questions = await asyncio.to_thread(
            build_questions, room.episode, [p["uid"] for p in room.players.values()])'''),
(r'''    final = sorted(room.players.items(), key=lambda kv: -kv[1]["score"])
''', r'''    final = sorted(room.players.items(), key=lambda kv: -kv[1]["score"])
    try:
        await asyncio.to_thread(record_game, room.episode,
                                [(p["uid"], p["score"]) for _, p in final])
    except Exception as e:
        print(f"Skor kaydı hatası: {e}")
'''),
(r'''            name = (str(msg.get("name") or "Oyuncu").strip() or "Oyuncu")[:16]''',
 r'''            name = ""'''),
(r'''            if t in ("create", "join") and room is None:
                if t == "create":
''', r'''            if t in ("create", "join") and room is None:
                user = user_from_token(ws.cookies.get("cv"))
                if not user:
                    await ws.send_json({"t": "error", "msg": "Önce giriş yapmalısın."})
                    continue
                name = user["username"]
                if t == "create":
'''),
(r'''n = len(await asyncio.to_thread(episode_pool, episode)) if episode else 0''',
 r'''n = len(await asyncio.to_thread(episode_pool, episode, [user["id"]])) if episode else 0'''),
(r'''room.players[pid] = {"name": name, "ws": ws, "score": 0}''',
 r'''room.players[pid] = {"name": name, "ws": ws, "score": 0, "uid": user["id"]}'''),
(r'''            elif t == "start" and room and room.host == pid and room.state == "lobby":
                room.task = asyncio.create_task(run_game(room))''',
 r'''            elif t == "start" and room and room.host == pid and room.state == "lobby":
                room.state = "playing"  # çift başlatmayı engeller
                room.task = asyncio.create_task(run_game(room))'''),
(r'''def translate_words(batch: WordsBatch):''',
 r'''def translate_words(batch: WordsBatch, request: Request):'''),
(r'''    tag_episode(batch.episode, words)
''', r'''    tag_episode(batch.episode, words)
    try:
        u = user_from_request(request)
        if u:
            tag_user_words(u["id"], batch.episode, words)
    except Exception as e:
        print(f"Kullanıcı etiketi hatası: {e}")
'''),
]

GAME = [
(r'''try { eps = await (await fetch("/episodes")).json(); } catch (e) {}''',
 r'''try { const r = await fetch("/api/my-episodes"); if (r.status === 401) { location = "/account"; return; } eps = await r.json(); } catch (e) {}'''),
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
    shutil.copy(path, path + ".bak")
    open(path, "w", encoding="utf-8").write(text)
    print(f"✓ {path} güncellendi (yedek: {path}.bak)")
    return True


if __name__ == "__main__":
    ok = patch("main.py", MAIN)
    patch("templates/game.html", GAME)
    sys.exit(0 if ok else 1)