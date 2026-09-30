from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import Request
from pydantic import BaseModel
import psycopg2
from deep_translator import GoogleTranslator

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="templates")

DB_CONFIG = {
    "dbname": "lost_vocabulary",
    "user": "yakupceri",
    "password": "",
    "host": "localhost",
    "port": "5432"
}

class WordCreate(BaseModel):
    eng: str

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse(request, "index.html")

@app.post("/add-word")
def add_word(word: WordCreate):
    try:
        clean_word = word.eng.strip().lower()
        print(f"-> Gelen İngilizce Kelime: {clean_word}")
        
        # En çok geçen kelimeler için hızlı yerel sözlük
        dictionary = {
            "give": "vermek",
            "gonna": "-ecek / -acak",
            "count": "saymak",
            "thats": "şu ki / bu",
            "started": "başladı",
            "five": "beş",
            "but": "fakat / ama",
            "its": "onun",
            "and": "ve",
            "her": "onun / o",
            "out": "dışarı",
            "flowing": "akış / akan",
            "fluid": "sıvı",
            "spinal": "omurilik",
            "spilled": "dökülen",
            "open": "açık / açmak",
            "was": "idi",
            "real": "gerçek",
            "crazy": "çılgın / deli",
            "just": "sadece / henüz",
            "terror": "dehşet / terör",
            "know": "bilmek",
            "think": "düşünmek",
            "yeah": "evet",
            "place": "yer / mekan",
            "quite": "oldukça",
            "cant": "yapamaz",
            "you": "sen / siz",
            "anywhere": "hiçbir yerde",
            "met": "tanıştı",
            "ever": "hiç",
            "have": "sahip olmak",
            "still": "hala",
            "standing": "ayakta duran",
            "like": "gibi / sevmek",
            "feel": "hissetmek",
            "job": "iş",
            "need": "ihtiyaç duymak",
            "shrapnel": "şarapnel",
            "about": "hakkında",
            "that": "şu / o",
            "what": "ne",
            "remove": "kaldırmak",
            "got": "aldı",
            "him": "o",
            "calm": "sakin",
            "let": "izin vermek",
            "cockpit": "kokpit",
            "look": "bakmak",
            "good": "iyi",
            "well": "iyi",
            "time": "zaman",
            "man": "adam",
            "friend": "arkadaş",
            "all": "tüm / hepsi",
            "for": "için",
            "only": "sadece",
            "thing": "şey",
            "seconds": "saniyeler"
        }
        
        # 1. Önce yerel sözlüğe bak
        translated_tr = dictionary.get(clean_word, "")
        
        # 2. Sözlükte yoksa Google Translate ile otomatik çevir
        if not translated_tr:
            try:
                translator = GoogleTranslator(source='en', target='tr')
                res = translator.translate(clean_word)
                if res:
                    translated_tr = res.lower()
            except Exception as e:
                print(f"Çeviri API Hatası: {e}")
                
        # 3. Çeviri de başarısız olursa orijinalini temiz bırak
        if not translated_tr:
            translated_tr = clean_word

        print(f"-> İngilizce: {clean_word} | Türkçe Çeviri: {translated_tr}")
        
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO words (eng, tr) VALUES (%s, %s) RETURNING id, created_at;",
            (clean_word, translated_tr)
        )
        new_word = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        return {"status": "success", "id": new_word[0], "eng": clean_word, "tr": translated_tr}
    except Exception as e:
        print(f"Sunucu Hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/words")
def get_words():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("SELECT id, eng, tr, created_at FROM words ORDER BY id DESC;")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        return [
            {
                "id": r[0],
                "eng": r[1],
                "tr": r[2],
                "created_at": str(r[3])
            } 
            for r in rows
        ]
    except Exception as e:
        print(f"Listeleme Hatası: {e}")
        return []