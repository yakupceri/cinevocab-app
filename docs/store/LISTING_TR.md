# CineVocab: Chrome Web Store ilanı (Türkçe, ek dil)
Eklenti sürümü 2.2.0. Her blok Geliştirici Paneli'ndeki ilgili alana kopyalanır.
Bu metin yalnızca kodun yaptığını söyler; ad ve özette üçüncü taraf marka adı yoktur (daha önce bu yüzden reddedildi, bkz. git 23a3778).

## Özet (en fazla 132 karakter; manifest'teki metinle aynı, `_locales/tr/messages.json`)
İzlediğin diziden dil öğren. Altyazılı video sitelerinde her altyazı kelimesi anında çevrilir. Ücretsiz.

## Açıklama
İzlerken kelime aramak için durmak yok. Dizini izle, CineVocab her altyazı kelimesinin çevirisini doğrudan videonun üstünde göstersin.

Bir kelimeye tıkla, tutulsun. Kelimelerin cihazında kalır, hesap gerekmez. Ücretsiz hesap açtığında tuttuğun kelimeler hesabına taşınır; quiz, seri ve düello açılır.

Prime Video, YouTube, Netflix ve Udemy'de, ayrıca "Bu sitede aç" düğmesiyle başka sitelerde çalışır. Ücretsiz.

NEDEN İŞE YARAR
Bir sahnede karşılaştığın kelimeyi, listeden ezberlediğinden çok daha iyi hatırlarsın. CineVocab zaten yaptığın şeyi (izlemeyi) pratiğe çevirir: kelimeyi görürsün, beğendiklerini tutarsın, sonra quiz olarak karşına gelir.

BİR DAKİKADA DENE
1. CineVocab'ı kur. Bir karşılama sayfası açılır.
2. İki dili (altyazı dili, çeviri dili) kontrol et ve büyük düğmeye bas. CineVocab açılır ve altyazılı bir video açılır.
3. Altyazı kapalıysa oynatıcıda CC'ye bas. Her altyazı kelimesi çevirisiyle görünür, cümlenin tamamı da altında çevrilir.
4. Bir kelimeye tıkla, tutulsun.

SEN AÇMADIKÇA KAPALI
Yeni kurulumdan sonra CineVocab, karşılama sayfasındaki düğmeye, araç çubuğu penceresine ya da altyazılı videoda sunduğu "Çeviriyi başlat" düğmesine basana kadar hiçbir şey yapmaz. İstediğin an tekrar kapatabilirsin.

İZLERKEN
- Her dil çiftiyle çalışır, örneğin İspanyolca → İngilizce, Fransızca → İngilizce, Türkçe → İngilizce
- 16 altyazı dili: Türkçe, İngilizce, Fransızca, İtalyanca, Almanca, İspanyolca, Portekizce, Rusça, Arapça, Rumence, Japonca, Hintçe, Endonezce, Lehçe, Felemenkçe ve Korece
- Eklenti arayüzü 9 dilde
- Dil koruması: altyazı seçtiğin dilde değilse çeviriyi durdurur
- Altyazı kutusunu videonun üstünde istediğin yere taşı, boyutunu ve saydamlığını ayarla
- Bir YouTube videosunun tüm kelimelerini tek seferde çıkar (ücretsiz hesap gerekir)

TUTTUĞUN KELİMELERLE ÇALIŞ (hesap gerekmez)
- Tuttuğun kelimelerden açılır pencerede hızlı turlar
- Boşluk doldurma soruları kelimeyi duyduğun altyazı cümlesiyle sorar; her tur bir cümle kurma bonusuyla biter
- Aralıklı tekrar: yanlış yaptığın kelimeler erken, bildiklerin geç karşına çıkar
- Birkaç gün sonra hâlâ hatırladığın kelimeler "öğrenildi" sayılır
- Araç çubuğu simgesi kaç kelimenin tekrar beklediğini gösterir

ÜCRETSİZ HESAPLA (CineVocab sitesinde ve açılır pencerede)
- Cihazda tuttuğun kelimeler hesabına taşınır; platform, dizi ve bölüme göre gruplanır
- Seviye, seri ve günlük hedefli quiz'ler
- Günlük meydan okuma: herkese günde bir kez aynı kelimeler
- Özel arkadaş ligleri ve 4 haneli kodla canlı düello

GİZLİLİK
Eklentiyi açtıktan sonra, okuduğu altyazı satırını çevrilmek üzere sunucumuza, oradan da Google Translate'e gönderir. Altyazı cümlesi veritabanımıza kaydedilmez. Tek tek kelimeler ve çevirileri, geldikleri videonun adı ve küçük resim adresiyle birlikte, adına bağlı olmayan ortak bir çeviri sözlüğüne kaydedilir. Tıkladığın kelimeler, geçtikleri altyazı satırı ve çevirisiyle birlikte cihazında tutulur; alıştırma bu satırla boşluk doldurma soruları sorar. Bu satır kopyası cihazında kalır. Hesap açtığında ya da giriş yaptığında tutulan kelimeler (bu satırlar olmadan) hesabına gönderilir, bundan sonra gördüğün kelimeler hesabına kaydedilir. Ayrıca eklentinin kullanılıp kullanılmadığını görmek için anonim kullanım sayaçları tutarız (günlük istek sayısı, yaklaşık ülke, cihaz türü ve işletim sistemi gibi); bunlar bir hesapla ilişkilendirilmez. Verilerini asla satmayız. Hesabını ve tüm verilerini istediğin zaman silebilirsin. Tam metin: https://cinevocab.up.railway.app/privacy

CineVocab bağımsız bir projedir. Amazon, Prime Video, Google, YouTube, Netflix veya Udemy ile bağlantılı değildir ve onlar tarafından onaylanmamıştır.

## İzin gerekçeleri (Gizlilik sekmesi)
- storage: Açma/kapama düğmesini, dil çiftini, kutu ayarlarını, kullanıcının cihazında tuttuğu kelimeleri ve isteğe bağlı giriş anahtarını saklar.
- identity: İsteğe bağlı "Google ile devam et". Google'ın giriş penceresini açar, yalnızca temel profil (openid, profile) ister; e-posta adresi istenmez.
- scripting: Çeviri kutusunu bir sitede yalnızca kullanıcı "Bu sitede aç"a bastıktan sonra başlatır ve açık sayfadaki büyük video çerçevelerinin adreslerini okur, böylece gömülü oynatıcılarda da çalışır.
- activeTab: Açılır pencerenin açık sekmenin adresini görmesini, ve yalnızca kullanıcı isterse CineVocab'ı orada açmasını sağlar.
- Sunucu izni (https://cinevocab.up.railway.app/*): Altyazı satırını çevrilmek üzere CineVocab sunucusuna gönderir, kullanıcının kelimelerini oradaki hesabına kaydeder.
- İsteğe bağlı site izinleri (https://*/*, http://*/*): Kurulumda verilmez. Yalnızca kullanıcı "Bu sitede aç"a bastığında, o site ve video oynatıcısının alan adı için, tek tek istenir.
- İçerik betiği siteleri (primevideo.com, youtube.com, udemy.com, netflix.com): Oynatıcının gösterdiği altyazı satırını okur; her kelime çevrilip videonun üstündeki kutuda gösterilir.
