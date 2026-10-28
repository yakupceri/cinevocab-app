# v8 (eklenti 1.8.4) değişiklikleri

## Kullanıcı geri bildirimi
- Düello sonunda yanlış bilinen kelimeler listelenir (kelime, doğru çeviri, senin cevabın) ve "yanlışlarımı tekrar çöz" ile anında mini quiz çözülür. Sunucu değişikliği yok, game.html içinde.
- Quizde anlamsız kelimeler ("the", "a", "and"...) ve olumsuzluğu kaybolmuş çeviriler ("bilmiyorum" = "know") artık sorulmuyor: main.py quiz_ok(), account.html quizOk().
- DICTIONARY'ye olumsuz/sık fiiller eklendi (bilmiyorum = I don't know, istemiyorum, anlamıyorum...). Sözlük açılışta veritabanına eşitlenir, eski yanlış kayıtlar düzelir.

## Eklenti
- Çeviri kutusu ayarları: konum (4 köşe), yazı boyutu, şeffaflık (popup). Varsayılan kutu biraz daha aşağıda ve büyük.
- Ad ve açıklama İngilizce varsayılan (_locales/en), Türkçe karşılığı (_locales/tr). default_locale = en.
- Sürüm 1.8.4.

## Diğer
- Düello geri sayımı (3-2-1) hatası: const num yeniden atanıyordu, let yapıldı.
- /privacy artık İngilizce de (?lang=en, tarayıcı diline göre otomatik).
- Mağaza metinleri: docs/store/LISTING_EN.md ve LISTING_TR.md.
