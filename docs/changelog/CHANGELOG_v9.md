# CineVocab v9 (v8 üzerine)

Eklenti DEĞİŞMEDİ (1.8.4, v8 ile birebir aynı). Her şey web sitesinde: mağaza incelemesi gerekmez.

## Yeni
1. **🔊 Kelimeyi duy**: kelime kartlarında ve quizde cevaptan sonra küçük hoparlör düğmesi. Cihazın kendi sesi (speechSynthesis); sunucuya bir şey gitmez.
2. **Dinle ve seç** modu (Pratik): kelimeyi duyarsın, anlamını seçersin. Öğrenilen dil = arayüz dilinin dışındaki dil (`learnLang`).
3. **Günlük meydan okuma** (`/daily`, `daily.py`): her dil çiftinde o gün herkese aynı 10 soru, kullanıcı başına tek deneme, günlük sıralama, günlük seri, paylaşılabilir sonuç (🟩🟥 + puan). Cevaplar sunucuda doğrulanır (istemci doğru cevabı görmez). Gün sınırı UTC.
4. **Konuşma düellosu** (oda modu "Konuşma"): ekranda anlam, oyuncu kelimeyi söyler (Web Speech API) ya da yazar. Sunucu yalnızca metni alır; 6 deneme hakkı; 1-2 harf tanıma toleransı (7+ harfli kelimede). Düello sonu yanlışlar için yazarak tekrar.
5. Gizlilik metni (TR+EN): mikrofon/konuşma tanıma ve günlük sıralama maddeleri eklendi.

## Dosyalar
- Yeni: `daily.py`, `templates/daily.html`
- Değişen: `main.py` (say_*, konuşma odası, `global_pairs`, `/daily`), `accounts.py` (gizlilik, hesap silmede daily_play), `static/common.js` (speak, sayMatch, setBack), `static/app.css`, `static/i18n.js` (6 dil), `templates/account.html`, `templates/game.html`
- Yeni tablolar (başlangıçta otomatik): `daily_sets`, `daily_play`

## Test edilenler
- Python: say_match (18 durum), günlük soru seçimi (deterministik, yaygın kelime önceliği, 4 benzersiz şık), puan formülü
- JS = Python eşleştirme aynı sonuç
- Tarayıcı (Playwright, sahte konuşma/ses API'leri, sahte API sunucusu): kelime kartı 🔊, dinle-seç 10/10, günlük akış + paylaşım + yenileyince tekrar oynatmama, konuşma düellosu (mikrofon, yazı, ıskalama, kilit, reveal, yanlışlar, yazarak tekrar), mikrofonsuz tarayıcı, eski çoktan seçmeli düello
## Test EDİLEMEYENLER
- Gerçek mikrofon / gerçek Chrome tanıma, gerçek sesler (cihaza bağlı)
- Postgres ve FastAPI ile uçtan uca (bu ortamda yok): `daily.py` SQL'i ve WebSocket konuşma yolu yalnızca kod incelemesiyle doğrulandı. Deploy sonrası bir kez elle dene.
