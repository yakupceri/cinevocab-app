"""Panel ilerlemesini sunucuya kaydeden uç noktaları ve poster klasörünü ekler.
Kullanım (proje klasöründe):  python3 uygula4.py
 - accounts.py : GET/POST /api/progress (XP, öğrenilen kelimeler, başarımlar, seri)
 - main.py     : /static klasörü (afişler için static/posters/lost.jpg gibi)
Yedekler .bak4 olarak alınır. Bir değişiklik eşleşmezse o dosyaya HİÇBİR ŞEY yazılmaz."""
import shutil

PROGRESS_CODE = '''import json as _json

_PROGRESS_READY = {"ok": False}


class ProgressIn(BaseModel):
    data: dict


def _progress_table():
    if not _PROGRESS_READY["ok"]:
        q("CREATE TABLE IF NOT EXISTS user_progress (user_id INT PRIMARY KEY, "
          "data JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMP DEFAULT now());")
        _PROGRESS_READY["ok"] = True


@router.get("/api/progress")
def get_progress(request: Request):
    u = need_user(request)
    _progress_table()
    r = q("SELECT data FROM user_progress WHERE user_id = %s;", (u["id"],), True)
    return r[0][0] if r else {}


@router.post("/api/progress")
def save_progress(p: ProgressIn, request: Request):
    u = need_user(request)
    raw = _json.dumps(p.data, ensure_ascii=False)
    if len(raw) > 200_000:
        raise HTTPException(413, "İlerleme verisi çok büyük.")
    _progress_table()
    q("INSERT INTO user_progress (user_id, data, updated_at) VALUES (%s, %s::jsonb, now()) "
      "ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now();",
      (u["id"], raw))
    return {"ok": True}


'''

STATIC_CODE = '''app.include_router(router)

import os
from fastapi.staticfiles import StaticFiles
os.makedirs("static/posters", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
'''

EDITS = {
    "accounts.py": ('@router.get("/api/leaderboard")', PROGRESS_CODE + '@router.get("/api/leaderboard")', '"/api/progress"'),
    "main.py": ("app.include_router(router)\n", STATIC_CODE, "StaticFiles"),
}


def patch(path, old, new, marker):
    try:
        text = open(path, encoding="utf-8").read()
    except FileNotFoundError:
        print(f"! {path} bulunamadı, atlandı.")
        return
    if marker in text:
        print(f"= {path} zaten güncel.")
        return
    if text.count(old) != 1:
        print(f"! {path}: eşleşmedi ({text.count(old)} kez bulundu). Dokunulmadı.")
        return
    shutil.copy(path, path + ".bak4")
    open(path, "w", encoding="utf-8").write(text.replace(old, new))
    print(f"✓ {path} güncellendi (yedek: {path}.bak4)")


if __name__ == "__main__":
    for path, (old, new, marker) in EDITS.items():
        patch(path, old, new, marker)
    print("Sunucuyu yeniden başlat.")