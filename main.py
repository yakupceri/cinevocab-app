from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import Request
from pydantic import BaseModel
import psycopg2

app = FastAPI()

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Şablon klasörünü tanımla
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
    tr: str

# Kök dizin için HTML arayüzü sunucusu
@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/add-word")
def add_word(word: WordCreate):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO words (eng, tr) VALUES (%s, %s) RETURNING id, created_at;",
            (word.eng, word.tr)
        )
        new_word = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "success", "id": new_word[0], "eng": word.eng, "tr": word.tr}
    except Exception as e:
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
        
        words_list = [{"id": r[0], "eng": r[1], "tr": r[2], "created_at": r[3]} for r in rows]
        return words_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))