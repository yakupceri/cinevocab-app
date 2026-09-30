import psycopg2

DB_CONFIG = {
    "dbname": "lost_vocabulary",
    "user": "yakupceri",
    "password": "",
    "host": "localhost",
    "port": "5432",
}

try:
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    cur.execute("DELETE FROM words;")
    conn.commit()
    cur.close()
    conn.close()
    print("Veritabanındaki bütün kelimeler başarıyla silindi ve sıfırlandı!")
except Exception as e:
    print(f"Hata oluştu: {e}")