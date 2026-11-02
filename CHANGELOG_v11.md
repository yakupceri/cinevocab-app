# v11 (eklenti 1.8.6): ilk kullanım rehberliği

Sorun: kurulumdan sonra kullanıcı popup'ta "Eklenti anahtarı" kutusunu görüyor ama ne olduğunu, nereden alacağını ve neden gerektiğini bilmiyordu. Anahtar yoksa çeviri çalışır ama kelimeler kaydolmaz; kullanıcı eklentiyi "yarım" sanıp silebilirdi.

## Eklenti 1.8.6
- Popup: anahtar yoksa en üstte "Kelimelerini 3 adımda kaydet" kartı (hesap aç → Ayarlar'dan anahtar oluştur → yapıştır). "Hesap aç / giriş yap" butonu siteyi açar. Anahtar yoksa kartın altında "anahtarsız da çeviri çalışır ama kelimeler kaydolmaz" notu.
- Anahtar kaydedilince kart kapanır, "✓ Bağlandı" yazar ve "Panelimi aç" butonu belirir. Anahtar silinirse kart geri gelir.
- 6 dilde (en, tr, fr, it, de, es). Diğer tarayıcı dillerinde İngilizce görünür.
- İzinler, manifest alanları ve içerik betikleri DEĞİŞMEDİ (sadece sürüm 1.8.5 → 1.8.6).

## Site
- Kelimeler ve Videolar sekmeleri boşken "4 adımda başla" kartı: eklentiyi kur (Chrome Web Store linki), anahtarı oluştur ve kopyala (tek tık, panoya kopyalar), eklentiye yapıştır, altyazılı izle. YouTube için "önce CC'yi aç" ipucu.
- Kelimeler gelmeye başlayınca kart kendiliğinden kaybolur (normal boş durum mantığı).
- 6 dilde.

## Mağaza metni
- EN ve TR açıklamaya "GETTING STARTED / BAŞLARKEN" bölümü eklendi (`docs/store/LISTING_*.md`).

## Test edildi (sahte sunucu + Playwright)
- Popup: 4 tarayıcı dilinde (en, tr, de, pt→en yedek), anahtarsız/anahtarlı durum, kayıt sonrası kartın kapanması, anahtar silince geri gelmesi, "hesap aç" butonunun siteyi açması.
- Site: kart 2 dilde, mağaza linki, anahtar oluştur+kopyala, 2. adımın ✓ olması.
## Test EDİLMEDİ
- Gerçek Chrome'a yüklü eklenti, gerçek Chrome Web Store linki (mağaza kimliği paneldeki Kimlik alanından alındı), gerçek anahtar üretimi (SQL), telefon ekranları, it/fr/de/es metinlerinin anadil kontrolü.
