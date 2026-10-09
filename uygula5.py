"""argostranslate'i kurar ve tr->en dil modelini indirip ekler.
Kullanım (proje klasöründe):  python3 uygula5.py
 - requirements.txt : argostranslate eklenir (yoksa)
 - main.py          : ensure_argos_model() fonksiyonu eklenir, _warm_local() içinde çağrılır
Yedek .bak5 olarak alınır. Değişiklik eşleşmezse dosyaya dokunulmaz."""
import shutil

ENSURE_CODE = '''def ensure_argos_model():
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


'''

OLD_WARM = '''def _warm_local():
    try:
        _get_local().translate("merhaba")'''

NEW_WARM = '''def _warm_local():
    ensure_argos_model()
    try:
        _get_local().translate("merhaba")'''


def patch_main():
    path = "main.py"
    try:
        text = open(path, encoding="utf-8").read()
    except FileNotFoundError:
        print(f"! {path} bulunamadı, atlandı.")
        return
    if "ensure_argos_model" in text:
        print(f"= {path} zaten güncel.")
        return
    if text.count(OLD_WARM) != 1:
        print(f"! {path}: eşleşmedi. Dokunulmadı.")
        return
    shutil.copy(path, path + ".bak5")
    text = text.replace(OLD_WARM, ENSURE_CODE + OLD_WARM, 1)
    text = text.replace(OLD_WARM, NEW_WARM, 1)
    open(path, "w", encoding="utf-8").write(text)
    print(f"✓ {path} güncellendi (yedek: {path}.bak5)")


def patch_requirements():
    path = "requirements.txt"
    try:
        text = open(path, encoding="utf-8").read()
    except FileNotFoundError:
        print(f"! {path} bulunamadı, atlandı.")
        return
    if "argostranslate" in text:
        print(f"= {path} zaten güncel.")
        return
    shutil.copy(path, path + ".bak5")
    text = text.rstrip("\n") + "\nargostranslate\n"
    open(path, "w", encoding="utf-8").write(text)
    print(f"✓ {path} güncellendi (yedek: {path}.bak5)")


if __name__ == "__main__":
    patch_requirements()
    patch_main()
    print("Git'e commit + push yap, Railway otomatik yeniden deploy edecek.")