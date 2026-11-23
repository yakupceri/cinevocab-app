# Sürüm 2.3.1: hata düzeltmesi (yükleme notu)

Yalnızca `extension/content.js` ve sürüm numarası değişti. İzinler, host izinleri, içerik betiği eşleşmeleri ve mağaza metni **2.3.0 ile aynı**: Privacy sekmesinde ve metinlerde değişiklik yok.

## Ne düzeldi
1. **"Çeviriyi başlat" sorusu** kapalıyken de ve her sayfada çıkıyordu. Artık yalnızca hiç seçim yapmamış (açıp kapatmamış) kullanıcıya, izleme sayfasında, video oynarken ve altyazı varken, **en çok bir kez** çıkıyor. Gösterildiği anda "bir daha sorma" kaydedilir (`startAsk: "no"`). Eklentiyi kapatmış ya da "Şimdi değil" demiş kullanıcıya hiç çıkmaz.
2. **YouTube ana sayfasında altyazı kutusu** çıkıyordu. Ana sayfadaki küçük resim önizlemelerinin altyazısı okunuyordu; eklenti açıksa bu altyazı çeviri için sunucuya da gidiyordu. Artık altyazı yalnızca `/watch`, `/shorts/`, `/live/`, `/embed/` sayfalarında ve yalnızca asıl oynatıcıdan (`#movie_player`) okunuyor. Ana sayfada hiçbir şey okunmaz, hiçbir şey sunucuya gitmez.

## Yükleme
1. Dashboard → CineVocab → **Package** → *Upload new package* → `cinevocab-2.3.1.zip` (`dev/out/release-2.3.1/`). Sürüm 2.3.1 görünmeli.
2. Yeni izin uyarısı çıkmamalı. Store listing ve Privacy sekmesine dokunma.
3. Gönder. Güncelleme genelde saatler içinde yayına çıkar; kullanıcılara Chrome kendiliğinden dağıtır.

## Yayından sonra gerçek Chrome'da dene
- YouTube ana sayfasında bir küçük resmin üstüne gel (önizleme oynasın): CineVocab kutusu çıkmamalı.
- Eklenti **kapalıyken** bir video aç: soru çıkmamalı. (Hiç seçim yapmamış yeni bir profilde soru en çok bir kez çıkar.)
- Eklentiyi aç, bir video aç: çeviri eskisi gibi çalışmalı.

## Test kanıtı
- `dev/e2e/ask-start.mjs`: gerçek eklenti, gerçek Chromium. Eski kodla 7 kontrol kalıyor (kapatmış kullanıcıya soru, ana sayfada soru, ana sayfada sunucuya 2 istek); yeni kodla 16 kontrolün hepsi geçiyor.
- `dev/e2e/yt-dom-probe.mjs`: gerçek YouTube'un sayfa yapısını yoklar (ana sayfada da gizli bir `#movie_player` olduğunu bu gösterdi). YouTube yapıyı değiştirirse altyazı okuyucusunun bozulduğunu bu betikle fark edersin.
- Diğer uçtan uca testler (ilk kurulum, hız, alıştırma, cümle, hesaplı) ve 101 JS birim testi geçiyor.

## Bilinen sınır
Gerçek YouTube'da ana sayfa önizleme oynatıcısının iç yapısını görmeden (anonim tarayıcıda ana sayfa video kartı göstermedi) iki bağımsız kapı koyduk: yalnızca izleme sayfalarında okuma ve yalnızca `#movie_player` içinden okuma. Sahte sayfada bu ikisi test edildi.
