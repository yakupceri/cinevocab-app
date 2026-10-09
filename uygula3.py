"""Temayı bağlar: theme.css yolunu ekler, iki sayfaya <link> koyar.
Kullanım (proje klasöründe, theme.css templates/ içinde olmalı):  python3 uygula3.py"""
import shutil

LINK = '<link rel="stylesheet" href="/theme.css">\n</head>'
ROUTE = '''@router.get("/theme.css")
def theme_css():
    return FileResponse("templates/theme.css", media_type="text/css")


@router.get("/account")'''


def patch(path, old, new):
    try:
        text = open(path, encoding="utf-8").read()
    except FileNotFoundError:
        print(f"! {path} bulunamadı, atlandı.")
        return
    if new in text:
        print(f"= {path} zaten güncel.")
        return
    if text.count(old) != 1:
        print(f"! {path}: eşleşmedi ({text.count(old)} kez). Dokunulmadı.")
        return
    shutil.copy(path, path + ".bak3")
    open(path, "w", encoding="utf-8").write(text.replace(old, new))
    print(f"✓ {path} güncellendi (yedek: {path}.bak3)")


patch("accounts.py", '@router.get("/account")', ROUTE)
patch("templates/game.html", "</head>", LINK)
patch("templates/account.html", "</head>", LINK)