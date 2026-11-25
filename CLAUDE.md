# CineVocab (eklenti + site) proje kuralları

## Push kuralı (25 Kasım 2026'dan beri)
Site dosyalarını (`main.py`, `accounts.py`, `admin.py`, `srs.py` ve diğer `*.py`, `templates/`, `static/` vb.) değiştirince **hemen push etme**.
- Önce yerelde testleri çalıştır (`cd dev && npm test`, Python testleri `dev/tests/py`, ilgili e2e ve site denetimleri).
- Değişiklikleri biriktir. Yerelde commit etmek serbest, push etmek değil.
- **Push yalnızca proje sahibi "push et" deyince ve toplu yapılır.** Push siteyi Railway'de canlıda yeniden yayınlar; "pushla" gibi bir söz de aynı anlama gelir, ama o söz yoksa push yok.
- Push'tan önce hangi commit'lerin gideceğini (`git log origin/main..HEAD`) ve sır taramasını (DB adresi, anahtar, parola) göster.
