import os
import re
import html
import time
import asyncio
import random
import threading
import concurrent.futures
from urllib.parse import urlparse

import requests
import psycopg2
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from deep_translator import GoogleTranslator
from deep_translator.exceptions import TooManyRequests
from accounts import (router, init_accounts, user_from_request, user_from_token,
                      record_game, tag_user_words, _throttle_ip)
import admin

import multilang
import vocab
from fastapi.staticfiles import StaticFiles

app = FastAPI()
app.include_router(router)
app.include_router(admin.router)
app.include_router(vocab.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # "*" ile birlikte True kullanılmaz
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="templates")
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Railway'de DATABASE_URL tanımlıdır; Mac'te yoksa eski yerel ayarlar kullanılır.
_db_url = os.environ.get("DATABASE_URL")
if _db_url:
    _u = urlparse(_db_url)
    DB_CONFIG = {
        "dbname": _u.path.lstrip("/"),
        "user": _u.username,
        "password": _u.password,
        "host": _u.hostname,
        "port": _u.port or 5432,
    }
else:
    DB_CONFIG = {
        "dbname": "lost_vocabulary",
        "user": "yakupceri",
        "password": "",
        "host": "localhost",
        "port": "5432",
    }


# ======================= Modeller =======================

class WordCreate(BaseModel):
    eng: str  # Uzantıdan 'eng' anahtarıyla geliyor ama içerik Türkçe kelime
    gen: int = 0


class WordsBatch(BaseModel):
    words: list[str]
    gen: int = 0  # cümle numarası (zaman damgası); büyük olan daha yeni cümledir
    lookup_only: bool = False  # True: sadece veritabanına bak (anında döner)
    sentence: str = ""  # cümlenin tamamı (bağlam için)
    episode: str = ""  # ör. "Lost S1 E13" (kelimeleri bölüme etiketlemek için)
    src: str = "tr"  # altyazı dili
    dst: str = "en"  # çeviri dili
    thumb: str = ""  # videonun küçük resmi (https adresi; sadece panelde gösterilir)


# ======================= Yerel sözlük =======================
# Yanlış çıkan kelimeleri buraya elle yazabilirsin; her zaman önce buraya bakılır.

DICTIONARY = {
    "iyi": "good / well",
    "evet": "yes / yeah",
    "zaman": "time",
    "adam": "man",
    "arkadaş": "friend",
    "gerçek": "real",
    "çılgın": "crazy",
    "sadece": "just / only",
    "idi": "was",
    "dehşet": "terror",
    "bilmek": "know",
    "düşünmek": "think",
    "yer": "place",
    "oldukça": "quite",
    "sen": "you",
    "hiç": "ever",
    "sahip": "have",
    "hala": "still",
    "gibi": "like",
    "hissetmek": "feel",
    "iş": "job",
    "ihtiyaç": "need",
    "hakkında": "about",
    "şu": "that",
    "ne": "what",
    "kaldırmak": "remove",
    "aldı": "got",
    "sakin": "calm",
    "bakmak": "look",
    "açık": "open",
    "ve": "and",
    "dışarı": "out",
    "sıvı": "fluid",
    "ben": "I",
    "bir": "a / one",
    "mı": "(question particle)",
    "mi": "(question particle)",
    "mu": "(question particle)",
    "mü": "(question particle)",
    "bu": "this",
    "o": "he / she / it",
    "ama": "but",
    "için": "for",
    "var": "there is / have",
    "yok": "there is not / none",
    "çok": "very / a lot",
    "daha": "more",
    "sonra": "after / later",
    "fazla": "more / too much",
    "bilirsin": "you know",
    "bebek": "baby",
    "malzemesi": "stuff / material",
    "malzeme": "stuff / material",
    "kokpit": "cockpit",
    "seninle": "with you",
    "geleceğim": "I will come",
    "gitmeyi": "to go",
    "düşünüyorsan": "if you think",
    "bulma": "finding",
    "bulması": "finding / for them to find",
    "bizi": "us",
    "gönderebiliriz": "we can send",
    "ekibinin": "of the team",
    "kurtarma": "rescue",
}


# ======================= Yardımcılar =======================

def tr_lower(text: str) -> str:
    """Türkçe'ye uygun küçük harf (İ -> i, I -> ı)."""
    return text.replace("İ", "i").replace("I", "ı").lower()


def has_letters(text) -> bool:
    return bool(text) and bool(re.search(r"[a-zA-Z]", text))


def is_garbage(text: str) -> bool:
    """Yerel modelin ürettiği 'tags tags' gibi tekrarlı veya aşırı uzun çöp çeviriler."""
    tokens = text.lower().split()
    if len(tokens) > 1 and len(set(tokens)) == 1:
        return True
    if len(tokens) > 5:
        return True
    return False


# Yerel modelin bilinmeyen kelimelerde sürekli uydurduğu çeviriler
SUSPECT_GLOSSES = {"home", "tags", "tag"}
SUSPECT_EXEMPT_PREFIX = ("ev", "etiket")  # gerçek 'ev' ve 'etiket' kelimeleri


def is_suspect(tr: str, eng: str) -> bool:
    """'home', 'o home', 'tags' gibi uydurma çeviri mi?"""
    if tr.startswith(SUSPECT_EXEMPT_PREFIX):
        return False
    toks = [t for t in re.findall(r"[a-z']+", eng.lower()) if t not in STOP_EN and len(t) > 1]
    return bool(toks) and all(t in SUSPECT_GLOSSES for t in toks)


def norm_sentence(text: str) -> str:
    return " ".join((text or "").split())[:300]


# ======================= Veritabanı =======================

def lookup_words(words: list) -> dict:
    """Veritabanında geçerli çevirisi olan kelimeleri {tr: en} döndürür."""
    if not words:
        return {}
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cur = conn.cursor()
        cur.execute("SELECT tr, eng FROM words WHERE tr = ANY(%s);", (words,))
        rows = cur.fetchall()
        cur.close()
    finally:
        conn.close()
    return {
        tr: eng
        for tr, eng in rows
        if has_letters(eng) and eng.strip().lower() != tr and not is_garbage(eng)
        and not is_suspect(tr, eng)
    }


def safe_lookup(words: list) -> dict:
    """DB hatasında istek patlamasın; sadece çeviri servislerine düşsün."""
    try:
        return lookup_words(words)
    except Exception as e:
        print(f"DB arama hatası: {e}")
        return {}


def store_translations(pairs: dict, overwrite: bool = True):
    """Birden çok kelimeyi tek bağlantıyla kaydet.
    overwrite=False: kayıt zaten varsa dokunma."""
    if not pairs:
        return
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cur = conn.cursor()
        for tr_word, en_word in pairs.items():
            cur.execute("SELECT id FROM words WHERE tr = %s LIMIT 1;", (tr_word,))
            row = cur.fetchone()
            if row:
                if overwrite:
                    cur.execute("UPDATE words SET eng = %s WHERE id = %s;", (en_word, row[0]))
            else:
                cur.execute("INSERT INTO words (eng, tr) VALUES (%s, %s);", (en_word, tr_word))
        conn.commit()
        cur.close()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def safe_store(pairs: dict, overwrite: bool = True):
    try:
        store_translations(pairs, overwrite)
    except Exception as e:
        print(f"DB kayıt hatası: {e}")


# ---------- Bölüm etiketleri ----------

TAGGED = set()  # (bölüm, kelime) çiftleri; aynı çifti tekrar yazmamak için


def init_db():
    """Tabloları oluşturur (yoksa). Railway'deki boş veritabanı için gerekli."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        try:
            cur = conn.cursor()
            cur.execute(
                "CREATE TABLE IF NOT EXISTS words ("
                "id SERIAL PRIMARY KEY, eng TEXT, tr TEXT, "
                "created_at TIMESTAMP DEFAULT now());"
            )
            cur.execute(
                "CREATE TABLE IF NOT EXISTS episode_words ("
                "episode TEXT NOT NULL, tr TEXT NOT NULL, "
                "created_at TIMESTAMP DEFAULT now(), PRIMARY KEY (episode, tr));"
            )
            conn.commit()
            cur.close()
        finally:
            conn.close()
    except Exception as e:
        print(f"Tablolar oluşturulamadı: {e}")


init_db()
try:
    init_accounts(DB_CONFIG)
    multilang.init(DB_CONFIG)
except Exception as e:
    # Veritabanı hazır değilse uygulama yine de açılsın (çökmesin)
    print(f"Hesap tabloları oluşturulamadı: {e}")


def tag_episode(episode: str, words: list):
    """Kelimeleri bölüme etiketle (aynı bölümde tekrar geçse de bir kez)."""
    episode = " ".join((episode or "").split())[:80]
    new = [w for w in words if (episode, w) not in TAGGED]
    if not episode or not new:
        return
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        try:
            cur = conn.cursor()
            for w in new:
                cur.execute(
                    "INSERT INTO episode_words (episode, tr) VALUES (%s, %s) "
                    "ON CONFLICT DO NOTHING;", (episode, w))
            conn.commit()
            cur.close()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
        TAGGED.update((episode, w) for w in new)
        if len(TAGGED) > 20000:
            TAGGED.clear()
    except Exception as e:
        print(f"Bölüm etiketi hatası: {e}")


def save_translations(translated: dict, sources: dict):
    """Kaynağa göre kaydet:
    gcloud / gtx / deep / dict : güvenilir, eski kaydın üstüne yazar
    ctx               : yerel model + cümle bağlamıyla doğrulandı, sadece yeni kayıt ekler
    local             : doğrulanamadı, sadece ekranda gösterilir, KAYDEDİLMEZ"""
    strong = {w: t for w, t in translated.items() if sources.get(w) in ("gtx", "deep", "dict", "gcloud")}
    weak = {w: t for w, t in translated.items() if sources.get(w) == "ctx"}
    if strong:
        safe_store(strong)
    if weak:
        safe_store(weak, overwrite=False)


# ======================= Çeviri servisleri =======================

def clean_translation(text, original: str):
    """Noktalama çöplerini temizle; anlamsızsa None döndür."""
    if not text:
        return None
    text = text.strip().lower().strip(" .,;:!?\"'…-")
    if not has_letters(text):
        return None
    if text == original:
        return None
    if is_garbage(text):
        return None
    return text


def _gtx_request(text: str):
    r = requests.get(
        "https://translate.googleapis.com/translate_a/single",
        params={"client": "gtx", "sl": "tr", "tl": "en", "dt": "t", "q": text},
        timeout=5,
    )
    if r.status_code == 429:
        raise TooManyRequests()
    r.raise_for_status()
    return r.json()


def gtx_batch(words: list):
    """Google gtx: kelimeleri satır satır TEK istekle çevirir.
    Eşleştirme kaynak metne göre yapılır; satır sayısı tutmasa bile çalışır."""
    data = _gtx_request("\n".join(words))

    segs = {}
    for s in data[0] or []:
        if s and len(s) > 1 and s[0] and s[1]:
            segs[tr_lower(s[1].strip())] = s[0].strip()
    out = {w: segs[w] for w in words if w in segs}
    if out:
        return out

    text = "".join(seg[0] for seg in (data[0] or []) if seg and seg[0])
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    if len(lines) == len(words):
        return dict(zip(words, lines))
    return None


def gtx_sentence(sentence: str):
    data = _gtx_request(sentence)
    return "".join(seg[0] for seg in (data[0] or []) if seg and seg[0]).strip()


def deep_single(words: list):
    """deep_translator Google: en fazla 10 kelime, tek tek."""
    out = {}
    for w in words[:10]:
        try:
            out[w] = GoogleTranslator(source="tr", target="en").translate(w)
        except TooManyRequests:
            if not out:
                raise
            break
    return out


# Resmi Google Cloud Translation API (önerilir). Railway > Variables: GOOGLE_TRANSLATE_API_KEY
# Ücretsiz gtx ucu Railway IP'sinden sık sık 429 ile engellenir; resmi API engellenmez.
GCLOUD_KEY = os.environ.get("GOOGLE_TRANSLATE_API_KEY", "").strip()


def _gcloud(texts: list):
    r = requests.post(
        "https://translation.googleapis.com/language/translate/v2",
        params={"key": GCLOUD_KEY},
        json={"q": texts, "source": "tr", "target": "en", "format": "text"},
        timeout=8,
    )
    if r.status_code == 429:
        raise TooManyRequests()
    r.raise_for_status()
    return [html.unescape(t["translatedText"]) for t in r.json()["data"]["translations"]]


def gcloud_batch(words: list):
    return dict(zip(words, _gcloud(words)))


def gcloud_sentence(sentence: str):
    return _gcloud([sentence])[0].strip()


class LocalMissing(Exception):
    """Yerel çeviri modeli kurulu değil."""


_local = {"translation": None}
_local_lock = threading.Lock()


def _get_local():
    with _local_lock:
        if _local["translation"] is not None:
            return _local["translation"]
        try:
            import argostranslate.translate as at
        except ImportError:
            raise LocalMissing("argostranslate kurulu değil")
        langs = at.get_installed_languages()
        src = next((lang for lang in langs if lang.code == "tr"), None)
        dst = next((lang for lang in langs if lang.code == "en"), None)
        tr = src.get_translation(dst) if (src and dst) else None
        if tr is None:
            raise LocalMissing("tr->en modeli kurulu değil")
        _local["translation"] = tr
        return tr


def local_batch(words: list):
    """Argos Translate: bilgisayarda çalışır, limit ve engel yoktur."""
    t = _get_local()
    return {w: t.translate(w) for w in words}


def local_sentence(sentence: str):
    return _get_local().translate(sentence)


# ---------- Kök bulma (lemma): bulması -> bulmak ----------
# Kurulum: pip3 install zeyrek   (kurulu değilse atlanır)

_zey = {"a": None, "tried": False}
_zey_lock = threading.Lock()
_LEMMA_CACHE = {}


def _analyzer():
    with _zey_lock:
        if not _zey["tried"]:
            _zey["tried"] = True
            try:
                import zeyrek
                _zey["a"] = zeyrek.MorphAnalyzer()
                print("   [lemma] zeyrek hazır")
            except Exception as e:
                print(f"   [lemma] zeyrek yok ({e}). Daha doğru çeviri için: pip3 install zeyrek")
        return _zey["a"]


def get_lemmas(word: str) -> list:
    """Kelimenin olası kökleri (en fazla 3), örn. bulması -> [bulma, bulmak]."""
    if word in _LEMMA_CACHE:
        return _LEMMA_CACHE[word]
    a = _analyzer()
    lemmas = []
    if a is not None:
        try:
            out = a.lemmatize(word)
            cands = out[0][1] if out else []
            for l in cands:
                l = tr_lower(l)
                if l and l != word and l not in lemmas:
                    lemmas.append(l)
        except Exception as e:
            print(f"   [lemma] hata: {e}")
    _LEMMA_CACHE[word] = lemmas[:3]
    return _LEMMA_CACHE[word]


def dict_stems(word: str) -> list:
    """Ekleri (en fazla 4 harf) atınca sözlükte bulunan kökler: adama -> adam."""
    out = []
    for k in range(1, 5):
        stem = word[:-k]
        if len(stem) < 3:
            break
        for cand in (stem, stem + "mak", stem + "mek"):
            if cand in DICTIONARY and cand != word and cand not in out:
                out.append(cand)
    return out


_LEMMA_GLOSS = {}


def lemma_gloss(lemma: str):
    """Kökü yerel modelle çevir (çekimli halden çok daha güvenilir)."""
    if lemma in DICTIONARY:
        return DICTIONARY[lemma]
    if lemma in _LEMMA_GLOSS:
        return _LEMMA_GLOSS[lemma]
    try:
        g = clean_translation(_get_local().translate(lemma), lemma)
    except Exception:
        g = None
    _LEMMA_GLOSS[lemma] = g
    return g


def ensure_argos_model():
    """tr->en çeviri modeli kurulu değilse indirip kurar (ilk açılışta ~1 kez)."""
    try:
        import argostranslate.package
        import argostranslate.translate as at
    except ImportError:
        print("   [local] argostranslate kurulu değil (requirements.txt kontrol et)")
        return
    installed = at.get_installed_languages()
    if any(l.code == "tr" for l in installed) and any(l.code == "en" for l in installed):
        return
    try:
        print("   [local] tr->en modeli indiriliyor...")
        argostranslate.package.update_package_index()
        available = argostranslate.package.get_available_packages()
        pkg = next((p for p in available if p.from_code == "tr" and p.to_code == "en"), None)
        if pkg is None:
            print("   [local] tr->en paketi indeks listesinde bulunamadı")
            return
        path = pkg.download()
        argostranslate.package.install_from_path(path)
        print("   [local] tr->en modeli kuruldu")
    except Exception as e:
        print(f"   [local] model kurulum hatası: {e}")


def _warm_local():
    ensure_argos_model()
    try:
        _get_local().translate("merhaba")
        print("   [local] model hazır")
    except LocalMissing as e:
        print(f"   [local] {e}. (Sorun değil, Google servisleri kullanılacak)")
    except Exception as e:
        print(f"   [local] ısınma hatası: {e}")
    _analyzer()


threading.Thread(target=_warm_local, daemon=True).start()


# ---------- Cümle bağlamıyla doğrulama ----------

STOP_EN = {
    "to", "the", "a", "an", "of", "and", "for", "you", "are", "was", "not", "has", "have",
    "there", "that", "this", "its", "our", "his", "her", "they", "them", "she", "him", "who",
    "with", "from", "can", "will", "be", "is", "it", "me", "my", "we", "i", "question",
    "particle", "he", "us", "your", "in", "on", "at", "by", "or", "if", "as", "do", "so",
}


def sentence_tokens(text: str) -> list:
    return re.findall(r"[a-z']+", (text or "").lower())


def gloss_matches(gloss: str, s_tokens: list) -> bool:
    """Çevirideki anlamlı kelimelerden biri, cümlenin İngilizcesinde geçiyor mu?"""
    for t in re.findall(r"[a-z']+", gloss.lower()):
        if t in STOP_EN:
            continue
        if len(t) <= 3:
            if t in s_tokens:
                return True
        elif any(len(st) >= 4 and st[:4] == t[:4] for st in s_tokens):
            return True
    return False


_FULL_LOCAL = {}


def ablate_gloss(word: str, sentence: str):
    """Kelimeyi Türkçe cümleden çıkar, cümleyi yerel modelle yeniden çevir;
    İngilizce çıktıda kaybolan kelime(ler) o kelimenin cümledeki karşılığıdır.
    Örn: 'odun' çıkınca 'wood' kaybolur."""
    if not sentence:
        return None
    pattern = re.compile(r"(?<!\w)" + re.escape(word) + r"(?!\w)", re.IGNORECASE)
    if not pattern.search(sentence):
        return None
    reduced = " ".join(pattern.sub(" ", sentence, count=1).split())
    if not reduced:
        return None
    try:
        t = _get_local()
        if sentence not in _FULL_LOCAL:
            if len(_FULL_LOCAL) > 200:
                _FULL_LOCAL.clear()
            _FULL_LOCAL[sentence] = t.translate(sentence)
        full, part = _FULL_LOCAL[sentence], t.translate(reduced)
    except Exception:
        return None
    part_tokens = set(sentence_tokens(part))
    diff = []
    for tok in sentence_tokens(full):
        if tok not in STOP_EN and len(tok) > 1 and tok not in part_tokens and tok not in diff:
            diff.append(tok)
    if 1 <= len(diff) <= 2:
        g = " ".join(diff)
        return None if is_suspect(word, g) else g
    return None


def refine_with_context(result: dict, sources: dict, sentence_en: str, sentence: str = ""):
    """Yerel modelden gelen kelime çevirilerini cümle bağlamıyla düzelt.
    1) Adaylar: kelimenin kendisi, zeyrek kökleri, sözlükteki kökler; cümle çevirisinde geçen ilk aday seçilir.
    2) Olmazsa kelimeyi cümleden çıkarıp farkı bul (ablate_gloss).
    Bu ikisi doğrulanmış sayılır ve kaydedilebilir (ctx).
    Doğrulanamazsa: zeyrek kök çevirisi, o da yoksa kelimenin kendisi (kaydedilmez).
    Uydurma çeviriyse ('home' gibi) ve hiç alternatif yoksa kelime '?' kalır."""
    s_tokens = sentence_tokens(sentence_en)
    for w in [w for w, s in sources.items() if s == "local" and w in result]:
        surface = result[w]
        cands = [] if is_suspect(w, surface) else [surface]

        lemma_glosses = []
        for lemma in get_lemmas(w):
            g = lemma_gloss(lemma)
            if g and g not in lemma_glosses:
                lemma_glosses.append(g)
        cands += [g for g in lemma_glosses if g not in cands]
        for stem in dict_stems(w):
            g = DICTIONARY[stem]
            if g not in cands:
                cands.append(g)

        chosen = next((c for c in cands if s_tokens and gloss_matches(c, s_tokens)), None)
        if chosen:
            result[w] = chosen
            sources[w] = "ctx"  # doğrulandı -> kaydedilebilir
            continue

        g = ablate_gloss(w, sentence)
        if g:
            result[w] = g
            sources[w] = "ctx"
        elif lemma_glosses:
            result[w] = lemma_glosses[0]  # doğrulanamadı; kaydedilmez
        elif not cands:
            result.pop(w, None)  # uydurma çeviri, alternatif yok -> "?" göster
            sources.pop(w, None)


# ---------- Sağlayıcı yönetimi ----------

_EXEC = concurrent.futures.ThreadPoolExecutor(max_workers=8)
TRANSLATE_SEM = threading.BoundedSemaphore(3)

# (ad, kelime fonksiyonu, zaman aşımı sn)
PROVIDERS = [
    ("gtx", gtx_batch, 5),
    ("deep", deep_single, 10),
    ("local", local_batch, 20),
]
# (ad, cümle fonksiyonu, zaman aşımı sn)
SENT_PROVIDERS = [
    ("gtx", gtx_sentence, 5),
    ("local", local_sentence, 20),
]
if GCLOUD_KEY:  # anahtar varsa en başa resmi API konur
    PROVIDERS.insert(0, ("gcloud", gcloud_batch, 8))
    SENT_PROVIDERS.insert(0, ("gcloud", gcloud_sentence, 8))
BLOCKED_UNTIL = {name: 0.0 for name, _, _ in PROVIDERS}
FAILS = {name: 0 for name, _, _ in PROVIDERS}
_state_lock = threading.Lock()

_throttle_lock = threading.Lock()
_next_slot = 0.0


def _throttle(min_interval: float = 0.3):
    """İstekleri en az min_interval aralıkla başlat."""
    global _next_slot
    with _throttle_lock:
        now = time.time()
        start = max(now, _next_slot)
        _next_slot = start + min_interval
    wait = start - now
    if wait > 0:
        time.sleep(wait)


def _block(name: str, rate_limited: bool) -> int:
    """Servisi bir süre kullanma. 429 alınca bekleme uzar: 5, 10, 20, 40, 60 dk."""
    with _state_lock:
        FAILS[name] += 1
        if rate_limited:
            secs = min(300 * 2 ** (FAILS[name] - 1), 3600)
        else:
            secs = 60
        BLOCKED_UNTIL[name] = time.time() + secs
    return secs


def _call(name: str, fn, timeout: int, arg):
    """Servisi çağır; hata/engel durumunda ilgili süre kadar devre dışı bırak. Hata = None."""
    if time.time() < BLOCKED_UNTIL[name]:
        return None
    try:
        _throttle()
        fut = _EXEC.submit(fn, arg)
        try:
            return fut.result(timeout=timeout)
        except concurrent.futures.TimeoutError:
            raise Exception(f"{timeout} sn içinde cevap vermedi")
    except TooManyRequests:
        secs = _block(name, rate_limited=True)
        print(f"   [{name}] 429 - Google engel verdi, {secs // 60} dk beklenecek")
    except LocalMissing as e:
        with _state_lock:
            BLOCKED_UNTIL[name] = time.time() + 3600
        print(f"   [{name}] {e}")
    except Exception as e:
        secs = _block(name, rate_limited=False)
        print(f"   [{name}] hata: {e} ({secs} sn atlanacak)")
    return None


def _ok(name: str):
    with _state_lock:
        FAILS[name] = 0


# ---------- Cümle çevirisi ----------

SENT_CACHE = {}


def cached_sentence(sentence: str) -> str:
    return SENT_CACHE.get(norm_sentence(sentence), "")


def translate_sentence(sentence: str) -> str:
    """Cümlenin tamamını çevirir (bağlam için). Başarısızsa boş döner."""
    sentence = norm_sentence(sentence)
    if not sentence:
        return ""
    if sentence in SENT_CACHE:
        return SENT_CACHE[sentence]

    if not TRANSLATE_SEM.acquire(timeout=15):
        return ""
    text = ""
    try:
        for name, fn, timeout in SENT_PROVIDERS:
            out = _call(name, fn, timeout, sentence)
            if out and has_letters(out) and out.strip().lower() != sentence.lower():
                text = out.strip()
                _ok(name)
                print(f"   [{name}] cümle: {text}")
                break
    finally:
        TRANSLATE_SEM.release()

    if text:
        SENT_CACHE[sentence] = text
        if len(SENT_CACHE) > 300:
            SENT_CACHE.pop(next(iter(SENT_CACHE)), None)
    return text


# ---------- Kelime çevirisi ----------

# Çevrilemeyen kelimeler için kısa süreli "negatif önbellek" (Google'ı yormamak için)
FAILED_UNTIL = {}
FAILED_TTL = 120.0


def is_failed(word: str) -> bool:
    with _state_lock:
        exp = FAILED_UNTIL.get(word)
        if exp is None:
            return False
        if exp < time.time():
            FAILED_UNTIL.pop(word, None)
            return False
        return True


def mark_failed(word: str):
    with _state_lock:
        FAILED_UNTIL[word] = time.time() + FAILED_TTL
        if len(FAILED_UNTIL) > 5000:
            now = time.time()
            for k in [k for k, v in FAILED_UNTIL.items() if v < now]:
                FAILED_UNTIL.pop(k, None)


def translate_missing(words: list, sources: dict | None = None, sentence_en: str = "",
                      sentence: str = "") -> dict:
    """Verilen kelimeleri çevirir. Başarılı olanları {tr: en} döndürür.
    sources: {kelime: 'dict'|'gtx'|'deep'|'local'|'ctx'} doldurulur.
    sentence_en: cümlenin İngilizcesi; yerel model çevirilerini doğrulamak için kullanılır.
    sentence: cümlenin Türkçesi; kelimeyi çıkarıp fark bulmak için kullanılır."""
    if sources is None:
        sources = {}
    result = {}
    todo = []
    for w in words:
        if w in DICTIONARY:
            result[w] = DICTIONARY[w]
            sources[w] = "dict"
        elif not is_failed(w):
            todo.append(w)
    if not todo:
        return result

    if not TRANSLATE_SEM.acquire(timeout=15):
        print("   [kuyruk] meşgul, kelimeler sonra denenecek")
        return result

    answered = False  # en az bir servis gerçekten cevap verdi mi
    try:
        for name, fn, timeout in PROVIDERS:
            pending = [w for w in todo if w not in result]
            if not pending:
                break
            out = _call(name, fn, timeout, pending)
            if out is None:
                continue
            if out:
                answered = True
            got = 0
            for w, t in out.items():
                c = clean_translation(t, w)
                if c:
                    result[w] = c
                    sources[w] = name
                    got += 1
            if got:
                _ok(name)
            print(f"   [{name}] {got}/{len(pending)} kelime çevrildi")
    finally:
        TRANSLATE_SEM.release()

    # Yerel model çevirilerini cümle bağlamı + kök çevirisiyle düzelt
    if any(s == "local" for s in sources.values()):
        try:
            refine_with_context(result, sources, sentence_en, norm_sentence(sentence))
        except Exception as e:
            print(f"   [bağlam] hata: {e}")

    # Servis cevap verdi ama kelime çevrilemedi -> kısa süre tekrar deneme
    if answered:
        for w in todo:
            if w not in result:
                mark_failed(w)
    return result


# ======================= Öncelik ve arka plan kuyruğu =======================

LATEST_GEN = 0
LAST_REQUEST_TIME = 0.0
DEFERRED = {}  # eski cümlelerden kalan çevrilmemiş kelimeler
_deferred_lock = threading.Lock()


def deferred_worker():
    """Boşta olunduğunda eski kelimeleri TOPLU çevirip kaydeder."""
    while True:
        time.sleep(1.0)
        if time.time() - LAST_REQUEST_TIME < 2.0:
            continue
        with _deferred_lock:
            batch = list(DEFERRED)[:10]
            for w in batch:
                DEFERRED.pop(w, None)
        if not batch:
            continue
        try:
            src = {}
            done = translate_missing(batch, src)
            if done:
                save_translations(done, src)
                print(f"-> (arka plan) {len(done)} kelime işlendi")
        except Exception as e:
            print(f"Arka plan hatası: {e}")


threading.Thread(target=deferred_worker, daemon=True).start()


# ======================= Canlı oyun (2+ kişi) =======================

Q_SECONDS = 12      # soru başına süre
REVEAL_SECONDS = 2.5
N_QUESTIONS = 10
ROOMS = {}


def db_rows(sql: str, params=()):
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        rows = cur.fetchall()
        cur.close()
        return rows
    finally:
        conn.close()


def valid_pairs(rows) -> list:
    return [
        {"tr": tr, "eng": eng} for tr, eng in rows
        if has_letters(eng) and eng.strip().lower() != tr
        and not is_garbage(eng) and not is_suspect(tr, eng)
    ]


def episode_pool(episode: str, uids: list, src: str = "tr", dst: str = "en") -> list:
    """Oyuncuların kelimeleri (bölüm boşsa hepsi). Bir oyuncunun bildiği kelimeler onun havuzundan çıkar;
    herkesin bildiği kelime hiç çıkmaz. Aynı çeviri tekrar etmez."""
    rows = []
    for uid in uids:
        for w, t, ep, _ in vocab.rows_for(uid, src, dst):
            if not episode or ep == episode:
                rows.append((w, t))
    seen, out = set(), []
    for w in valid_pairs(rows):
        if w["eng"].lower() not in seen:
            seen.add(w["eng"].lower())
            out.append(w)
    return out


def all_translations(src: str, dst: str) -> list:
    if (src, dst) == ("tr", "en"):
        rows = db_rows("SELECT tr, eng FROM words;")
    else:
        rows = db_rows("SELECT word, trans FROM words_ml WHERE src = %s AND dst = %s;", (src, dst))
    return list({w["eng"] for w in valid_pairs(rows)})


def build_questions(episode: str, uids: list, n: int = N_QUESTIONS, src: str = "tr", dst: str = "en") -> list:
    """Kelimelerden çoktan seçmeli sorular; yanlış şıklar aynı dil çiftinin tüm havuzundan."""
    ep = episode_pool(episode, uids, src, dst)
    if len(ep) < 4:
        raise ValueError(f"En az 4 kelime gerekiyor (şu an {len(ep)}).")
    all_eng = all_translations(src, dst)
    random.shuffle(ep)
    qs = []
    for w in ep:
        others = [e for e in all_eng if e.lower() != w["eng"].lower()]
        random.shuffle(others)
        opts, seen = [], {w["eng"].lower()}
        for e in others:
            if e.lower() not in seen:
                opts.append(e)
                seen.add(e.lower())
            if len(opts) == 3:
                break
        if len(opts) < 3:
            continue
        opts.append(w["eng"])
        random.shuffle(opts)
        qs.append({"tr": w["tr"], "eng": w["eng"], "options": opts})
        if len(qs) == n:
            break
    return qs


class Room:
    def __init__(self, code: str, episode: str, src="tr", dst="en", n=N_QUESTIONS, seconds=Q_SECONDS, password=""):
        self.code, self.episode = code, episode
        self.src, self.dst, self.n, self.seconds, self.password = src, dst, n, seconds, password
        self.players = {}      # pid -> {"name", "ws", "score"}
        self.host = None
        self.state = "lobby"   # lobby | playing | done
        self.answers = {}      # pid -> (seçim, zaman)
        self.event = asyncio.Event()
        self.q_start = 0.0
        self.task = None


async def broadcast(room: Room, msg: dict):
    for p in list(room.players.values()):
        try:
            await p["ws"].send_json(msg)
        except Exception:
            pass


def room_info(room: Room) -> dict:
    return {
        "t": "room", "code": room.code, "episode": room.episode, "host": room.host,
        "src": room.src, "dst": room.dst, "n": room.n, "seconds": room.seconds,
        "locked": bool(room.password),
        "players": [{"id": pid, "name": p["name"], "score": p["score"]}
                    for pid, p in room.players.items()],
    }


async def run_game(room: Room):
    try:
        questions = await asyncio.to_thread(
            build_questions, room.episode, [p["uid"] for p in room.players.values()], room.n, room.src, room.dst)
    except Exception as e:
        room.state = "lobby"
        await broadcast(room, {"t": "error", "msg": str(e)})
        return
    room.state = "playing"
    for p in room.players.values():
        p["score"] = 0
        p["streak"] = 0
    await broadcast(room, {"t": "countdown", "seconds": 3})  # 3-2-1, sonra ilk soru
    await asyncio.sleep(3.2)
    for i, q in enumerate(questions):
        if not room.players:
            return
        room.answers, room.event, room.q_start = {}, asyncio.Event(), time.time()
        await broadcast(room, {"t": "question", "idx": i, "total": len(questions),
                               "tr": q["tr"], "options": q["options"], "seconds": room.seconds})
        try:
            await asyncio.wait_for(room.event.wait(), room.seconds)
        except asyncio.TimeoutError:
            pass
        results = []
        for pid, p in list(room.players.items()):
            a = room.answers.get(pid)
            ok = a is not None and a[0] == q["eng"]
            p["streak"] = p.get("streak", 0) + 1 if ok else 0
            # 100 taban + hız bonusu (0-50) + seri bonusu (arka arkaya doğru başına +10, en fazla +50)
            delta = (100 + int(50 * max(0.0, 1 - (a[1] - room.q_start) / room.seconds))
                     + min(50, 10 * (p["streak"] - 1))) if ok else 0
            p["score"] += delta
            results.append({"id": pid, "name": p["name"], "ok": ok, "delta": delta, "score": p["score"],
                            "streak": p["streak"]})
        await broadcast(room, {"t": "reveal", "correct": q["eng"], "results": results})
        await asyncio.sleep(REVEAL_SECONDS)
    room.state = "done"
    final = sorted(room.players.items(), key=lambda kv: -kv[1]["score"])
    try:
        await asyncio.to_thread(record_game, room.episode,
                                [(p["uid"], p["score"]) for _, p in final])
    except Exception as e:
        print(f"Skor kaydı hatası: {e}")
    await broadcast(room, {"t": "end", "scores": [{"id": pid, "name": p["name"], "score": p["score"]}
                                                  for pid, p in final]})
    room.state = "lobby"  # aynı odada tekrar oynanabilir


async def leave_room(room, pid):
    if not room or pid not in room.players:
        return
    room.players.pop(pid, None)
    if not room.players:
        if room.task:
            room.task.cancel()
        ROOMS.pop(room.code, None)
        return
    if room.host == pid:
        room.host = next(iter(room.players))
    if room.state == "playing" and len(room.answers) >= len(room.players):
        room.event.set()
    await broadcast(room, room_info(room))


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    room, pid = None, str(id(ws))
    try:
        while True:
            msg = await ws.receive_json()
            t = msg.get("t")
            name = ""

            if t in ("create", "join") and room is None:
                user = user_from_token(ws.cookies.get("cv"))
                if not user:
                    await ws.send_json({"t": "error", "msg": "Önce giriş yapmalısın."})
                    continue
                name = user["username"]
                if user.get("gban"):
                    await ws.send_json({"t": "error", "msg": "Oyun odalarına girişin kısıtlandı."})
                    continue
                if t == "create":
                    episode = str(msg.get("episode") or "")[:80]
                    src, dst = str(msg.get("src") or "tr"), str(msg.get("dst") or "en")
                    if src not in vocab.LANGS or dst not in vocab.LANGS or src == dst:
                        await ws.send_json({"t": "error", "msg": "Dil çifti geçersiz."})
                        continue
                    try:
                        qn = max(4, min(30, int(msg.get("n") or N_QUESTIONS)))
                        qsec = max(5, min(60, int(msg.get("seconds") or Q_SECONDS)))
                    except (TypeError, ValueError):
                        qn, qsec = N_QUESTIONS, Q_SECONDS
                    pw = str(msg.get("password") or "")[:30]
                    n = len(await asyncio.to_thread(episode_pool, episode, [user["id"]], src, dst))
                    if n < 4:
                        await ws.send_json({"t": "error", "msg": f"En az 4 kelime gerekiyor (şu an {n})."})
                        continue
                    code = next(c for c in (f"{random.randint(0, 9999):04d}" for _ in range(1000))
                                if c not in ROOMS)
                    room = ROOMS[code] = Room(code, episode, src, dst, qn, qsec, pw)
                    room.host = pid
                else:
                    room = ROOMS.get(str(msg.get("code") or "").strip())
                    if room is None or room.state == "playing":
                        room = None
                        await ws.send_json({"t": "error", "msg": "Oda bulunamadı veya oyun başlamış."})
                        continue
                    if room.password and str(msg.get("password") or "") != room.password:
                        room = None
                        await ws.send_json({"t": "error", "msg": "Oda şifresi yanlış."})
                        continue
                room.players[pid] = {"name": name, "ws": ws, "score": 0, "uid": user["id"]}
                await ws.send_json({"t": "me", "id": pid})
                await broadcast(room, room_info(room))

            elif t == "start" and room and room.host == pid and room.state == "lobby":
                room.state = "playing"  # çift başlatmayı engeller
                room.task = asyncio.create_task(run_game(room))

            elif t == "answer" and room and room.state == "playing" and pid not in room.answers:
                room.answers[pid] = (str(msg.get("choice")), time.time())
                await broadcast(room, {"t": "answered", "id": pid})  # kim cevapladı (seçimi gizli)
                if len(room.answers) >= len(room.players):
                    room.event.set()
    except (WebSocketDisconnect, RuntimeError):
        pass
    except Exception as e:
        print(f"WebSocket hatası: {e}")
    finally:
        await leave_room(room, pid)


# ======================= Endpoint'ler =======================

@app.get("/")
def landing():
    """Herkese açık tanıtım sayfası (eski 'Kelime Arşivim' sayfası artık kökte gösterilmez)."""
    return FileResponse("templates/landing.html")


@app.get("/play")
def play_page():
    """play.html silindi; eski adres oyun sayfasına yönlendirir."""
    return RedirectResponse("/game")


@app.get("/game", response_class=HTMLResponse)
def game_page(request: Request):
    return templates.TemplateResponse(request, "game.html")


@app.get("/health")
def health():
    """Railway'in sunucunun ayakta olduğunu kontrol etmesi için."""
    return {"ok": True}


@app.get("/episodes")
def list_episodes():
    """Bölümler ve her birinde toplanan (çevirisi kayıtlı) kelime sayısı."""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute(
            "SELECT ew.episode, count(*), max(ew.created_at) FROM episode_words ew "
            "JOIN words w ON w.tr = ew.tr GROUP BY ew.episode ORDER BY max(ew.created_at) DESC;"
        )
        rows = cur.fetchall()
        cur.close()
        return [{"episode": r[0], "word_count": r[1], "last_seen": str(r[2])} for r in rows]
    except Exception as e:
        print(f"Bölüm listeleme hatası: {e}")
        return []
    finally:
        if conn:
            conn.close()


@app.get("/episodes/words")
def episode_words(episode: str):
    """Bir bölümün kelimeleri: [{tr, eng}]. Örn: /episodes/words?episode=Lost S1 E13"""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute(
            "SELECT ew.tr, w.eng FROM episode_words ew JOIN words w ON w.tr = ew.tr "
            "WHERE ew.episode = %s ORDER BY ew.created_at;", (episode,)
        )
        rows = cur.fetchall()
        cur.close()
        return [
            {"tr": tr, "eng": eng} for tr, eng in rows
            if has_letters(eng) and eng.strip().lower() != tr
            and not is_garbage(eng) and not is_suspect(tr, eng)
        ]
    except Exception as e:
        print(f"Bölüm kelimeleri hatası: {e}")
        return []
    finally:
        if conn:
            conn.close()


def provider_status():
    now = time.time()
    with _state_lock:
        return {
            "providers": {
                n: {"blocked_for_s": max(0, int(BLOCKED_UNTIL[n] - now)), "fails": FAILS[n]}
                for n in BLOCKED_UNTIL
            },
            "lemma_ready": _zey["a"] is not None,
            "negative_cache": len(FAILED_UNTIL),
            "deferred": len(DEFERRED),
            "gcloud_key": bool(GCLOUD_KEY),
        }


@app.get("/debug/providers")
def debug_providers(request: Request):
    if not admin.is_admin(request):
        raise HTTPException(404, "Not found")
    return provider_status()


def reset_providers():
    with _state_lock:
        for n in BLOCKED_UNTIL:
            BLOCKED_UNTIL[n] = 0.0
            FAILS[n] = 0
        FAILED_UNTIL.clear()


async def kick_user(uid: int):
    """Banlanan / yasaklanan kullanıcıyı açık oyun odalarından at."""
    for room in list(ROOMS.values()):
        for pid, p in list(room.players.items()):
            if p.get("uid") == uid:
                try:
                    await p["ws"].close()
                except Exception:
                    pass


admin.hooks.update(rooms=lambda: ROOMS, providers=provider_status,
                   reset_providers=reset_providers, kick_user=kick_user)


@app.post("/translate-words")
def translate_words(batch: WordsBatch, request: Request):
    """Bir cümlenin kelimelerini alır. Önce veritabanı/sözlük, eksikler için çeviri servisleri."""
    global LATEST_GEN, LAST_REQUEST_TIME
    _throttle_ip(request, limit=240, window=60, bucket="tr")
    batch.sentence = batch.sentence[:300]
    batch.episode = batch.episode[:80]
    if batch.thumb and batch.episode:
        vocab.save_thumb(batch.episode, batch.thumb)
    if (batch.src, batch.dst) != ("tr", "en"):
        return multilang.handle(batch, user_from_request(request))
    LAST_REQUEST_TIME = time.time()
    LATEST_GEN = max(LATEST_GEN, batch.gen)

    words = []
    for w in batch.words:
        w = tr_lower(w.strip())
        if w and w not in words:
            words.append(w)
    words = words[:30]

    known_hit = []
    u = None
    try:
        u = user_from_request(request)
        if u:
            ks = vocab.known_set(u["id"], "tr")
            known_hit = [w for w in words if w in ks]
            words = [w for w in words if w not in ks]
    except Exception as e:
        print(f"Bilinen kelime hatası: {e}")

    if not batch.lookup_only or words:
        tag_episode(batch.episode, words)
    try:
        if u:
            tag_user_words(u["id"], batch.episode, words)
    except Exception as e:
        print(f"Kullanıcı etiketi hatası: {e}")

    db_found = safe_lookup(words)
    results = dict(db_found)
    dict_pairs = {}
    for w in words:
        if w in DICTIONARY:  # sözlük her zaman veritabanının önüne geçer
            results[w] = DICTIONARY[w]
            if db_found.get(w) != DICTIONARY[w]:
                dict_pairs[w] = DICTIONARY[w]
    if dict_pairs:
        safe_store(dict_pairs)
    missing = [w for w in words if w not in results]

    # Sadece arama: bilinenler hemen dönsün
    if batch.lookup_only:
        return {
            "status": "success", "results": results, "pending": missing,
            "failed": [], "sentence_en": cached_sentence(batch.sentence), "known": known_hit,
        }

    stale = bool(batch.gen) and batch.gen < LATEST_GEN

    # Cümle eskidiyse şimdi çevirme, arka plana bırak
    if missing and stale:
        with _deferred_lock:
            for w in missing:
                DEFERRED[w] = True
        return {"status": "success", "results": results, "pending": [], "failed": [],
                "sentence_en": cached_sentence(batch.sentence), "known": known_hit}

    sentence_en = "" if stale else translate_sentence(batch.sentence)

    if missing:
        src = {}
        translated = translate_missing(missing, src, sentence_en, batch.sentence)
        save_translations(translated, src)
        results.update(translated)
        print(
            f"-> {len(words)} kelime | hazırdı: {len(words) - len(missing)} | "
            f"yeni: {len(translated)} | çevrilemeyen: {len(missing) - len(translated)}"
        )

    failed = [w for w in words if w not in results and is_failed(w)]
    pending = [w for w in words if w not in results and w not in failed]
    return {"status": "success", "results": results, "pending": pending,
            "failed": failed, "sentence_en": sentence_en, "known": known_hit}


@app.post("/add-word")
def add_word(word: WordCreate):
    """Eski tek kelime endpoint'i (geriye dönük uyumluluk için)."""
    clean_word = tr_lower(word.eng.strip())
    if not clean_word:
        raise HTTPException(status_code=400, detail="Boş kelime")
    try:
        found = lookup_words([clean_word])
        if clean_word in found:
            return {"status": "success", "eng": found[clean_word], "tr": clean_word, "duplicate": True}

        src = {}
        done = translate_missing([clean_word], src)
        if not done.get(clean_word):
            return {"status": "error", "message": "Çeviri yapılamadı", "tr": clean_word}
        if src.get(clean_word) == "local":
            src[clean_word] = "ctx"  # elle eklenen kelime: kaydet
        save_translations(done, src)
        return {"status": "success", "eng": done[clean_word], "tr": clean_word}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Sunucu Hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/words")
def get_words():
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("SELECT id, eng, tr, created_at FROM words ORDER BY id DESC;")
        rows = cur.fetchall()
        cur.close()
        return [
            {"id": r[0], "eng": r[1], "tr": r[2], "created_at": str(r[3])}
            for r in rows
        ]
    except Exception as e:
        print(f"Listeleme Hatası: {e}")
        return []
    finally:
        if conn:
            conn.close()