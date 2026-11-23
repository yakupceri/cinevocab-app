# Forum ve soru-cevap yanıtlarında söylenebilecek özellikler

`firsat-avcisi` ajanı bu dosyayı okur. Amaç: mağazada **şu an yayında olan sürümün (2.0.3)** gerçek davranışını söylemek. `extension/` klasörü 2.3.0'dır ve yayındakinden yenidir; bu dosya ile `extension/` ayrışırsa **bu dosya geçerlidir**. `docs/store/LISTING_*.md` dosyalarına dayanma.

Kanıtlar 2.0.3'ün kodundandır: `git show 523737f:extension/<dosya>` (satır numaraları bu sürüme göre).

## Söylenebilir (2.0.3'te doğrulandı)
1. **Altyazı kelimeleri canlı çevrilir.** Siteler: YouTube, Prime Video, Netflix, Udemy (`manifest.json` içerik betikleri `matches`).
2. **16 dil.** `popup.js:3` `LANGS` listesi (tr, en, fr, it, de, es, pt, ru, ar, ro, ja, hi, id, pl, nl, ko).
3. **Çeviri için hesap gerekmez.** `background.js:16` (`post()`): çeviri isteğine `Authorization` yalnızca giriş yapılmışsa eklenir. Altyazıdaki cümle çeviri için sunucuya gider (gizlilik sorusu gelirse bunu açıkça söyle).
4. **Kelime kaydetme (yıldız), alıştırma ve videodan kelime ekleme ücretsiz hesap ister.** `background.js:229-232` (`/api/star` için `Bearer` anahtarı), `popup.js:248` ve `popup.js:298` (hesapsızken "giriş yap" kartı), `popup.js:204` (videodan ekleme için giriş).
5. **Sitede (cinevocab.up.railway.app) canlı düello ve sıralama/lig, ücretsiz hesapla.** Bu sunucu tarafıdır, eklenti sürümüne bağlı değildir: `templates/game.html`, `leagues.py`.
6. **Ücretsiz.** Kodda ödeme ya da abonelik yok; ürün sahibi de ücretsiz olduğunu belirtti.

## Yazma (2.0.3'te yok ya da doğrulanmadı)
- **"Kurulumdan sonra kapalı başlar" yazma.** 2.0.3'te yeni kurulumda çeviri AÇIK başlar (`background.js:73`). Kapalı başlama 2.1'de geldi (güncel `background.js:86-88`). Kurulum varsayılanı hakkında hiçbir şey söyleme.
- **Hesapsız kelime defteri, yerel aralıklı tekrar** (2.2.0), **boşluk doldurma ve cümle kurma alıştırması, dolgulu vurgu, hızlı altyazı, kalıcı çeviri önbelleği** (2.3.0 ile). Bunlar 2.3.0 mağazada yayına çıkana kadar yazılmaz.
- **Doğrulanmadı, yazma:** seri, XP ve seviye, günlük meydan okuma, "3 doğru cevapla öğrenildi", çeviri hızı ya da doğruluğu hakkında sayılar, kullanıcı sayısı.

## Bu dosya ne zaman güncellenir
2.3.0 mağazada yayına çıkınca: yukarıdaki "yazma" listesindeki 2.2.0 ve 2.3.0 maddelerini 2.3.0 kodundan yeniden doğrulayıp "söylenebilir" bölümüne taşı, başlıktaki sürümü güncelle.
