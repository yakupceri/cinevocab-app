"""Çok dilli çeviri: Türkçe->İngilizce dışındaki dil çiftleri (Google çeviri, kelime önbelleği ile)."""
import psycopg2
import requests

LANGS = {"en", "tr", "fr", "it", "de", "es", "pt", "ru", "ar"}
DB = {}


def _q(sql, params=(), fetch=False):
    conn = psycopg2.connect(**DB)
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        rows = cur.fetchall() if fetch else None
        conn.commit()
        return rows
    finally:
        conn.close()


def init(cfg: dict):
    DB.update(cfg)
    _q("CREATE TABLE IF NOT EXISTS words_ml (src TEXT NOT NULL, dst TEXT NOT NULL, word TEXT NOT NULL, "
       "trans TEXT NOT NULL, PRIMARY KEY (src, dst, word));")
    _q("CREATE TABLE IF NOT EXISTS user_words_ml (user_id INT NOT NULL, src TEXT NOT NULL, dst TEXT NOT NULL, "
       "word TEXT NOT NULL, episode TEXT NOT NULL DEFAULT '', created_at TIMESTAMP DEFAULT now(), "
       "PRIMARY KEY (user_id, src, dst, word, episode));")


def _low(w: str, src: str) -> str:
    if src == "tr":
        w = w.replace("İ", "i").replace("I", "ı")
    return w.lower().strip()


def _gtx(text: str, src: str, dst: str):
    r = requests.get("https://translate.googleapis.com/translate_a/single",
                     params={"client": "gtx", "sl": src, "tl": dst, "dt": "t", "q": text}, timeout=5)
    r.raise_for_status()
    return r.json()


def _translate_words(words: list, src: str, dst: str) -> dict:
    data = _gtx("\n".join(words), src, dst)
    segs = {}
    for s in data[0] or []:
        if s and len(s) > 1 and s[0] and s[1]:
            segs[_low(s[1], src)] = s[0].strip().lower().strip(" .,;:!?\"'…-")
    return {w: segs[w] for w in words if segs.get(w) and segs[w] != w}


def handle(batch, user):
    src, dst = batch.src, batch.dst
    if src not in LANGS or dst not in LANGS or src == dst:
        return {"status": "error", "message": "Dil çifti geçersiz"}
    words = []
    for w in batch.words:
        w = _low(w, src)
        if w and w not in words:
            words.append(w)
    words = words[:30]
    known = dict(_q("SELECT word, trans FROM words_ml WHERE src = %s AND dst = %s AND word = ANY(%s);",
                    (src, dst, words), True)) if words else {}
    missing = [w for w in words if w not in known]
    if batch.lookup_only:
        return {"status": "success", "results": known, "pending": missing, "failed": [], "sentence_en": ""}
    failed = []
    if missing:
        try:
            got = _translate_words(missing, src, dst)
        except Exception as e:
            print(f"   [ml] kelime çeviri hatası: {e}")
            got = {}
        for w, t in got.items():
            _q("INSERT INTO words_ml (src, dst, word, trans) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING;", (src, dst, w, t))
        known.update(got)
        failed = [w for w in missing if w not in got]
    sentence = ""
    if batch.sentence.strip():
        try:
            data = _gtx(batch.sentence[:300], src, dst)
            sentence = "".join(seg[0] for seg in (data[0] or []) if seg and seg[0]).strip()
        except Exception as e:
            print(f"   [ml] cümle çeviri hatası: {e}")
    if user and known:
        try:
            for w in known:
                _q("INSERT INTO user_words_ml (user_id, src, dst, word, episode) VALUES (%s, %s, %s, %s, %s) "
                   "ON CONFLICT DO NOTHING;", (user["id"], src, dst, w, batch.episode[:80]))
        except Exception as e:
            print(f"   [ml] kayıt hatası: {e}")
    return {"status": "success", "results": known, "pending": [], "failed": failed, "sentence_en": sentence}