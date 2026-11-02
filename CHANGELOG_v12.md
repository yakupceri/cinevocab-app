# v12 (eklenti 1.8.7)

v11 (eklenti 1.8.6, başlarken rehberi) + günlük kullanım sayacı + **Romence ve Japonca**.

## Yeni
- **Romence (ro) ve Japonca (ja)** altyazı dili olarak eklendi (sunucu, eklenti, site: kaynak ve hedef dil).
  - Romence: dil tespiti (ă ș ț ve yaygın kelimeler), yanlış dil uyarısı, seslendirme (ro-RO).
  - Japonca: kelimeler boşlukla ayrılmadığı için `Intl.Segmenter` ile bölünür; tek harfli parçacıklar (は, が, を…) ve yaygın işlev sözcükleri atlanır; yazı türüyle dil tespiti; seslendirme (ja-JP).
- **Günlük kullanım sayacı** (sunucu, kimlik içermez): toplam istek, hesapsız istek, kelime sayısı, dil çifti kırılımı; admin özetinde görünür; gizlilik politikasına eklendi.
- Pratik sınavı artık Latin olmayan çevirilerde (ja/ru/ar hedefli çiftler) kelimeleri elemiyor; tek karakterli Japonca kaynak kelimeler (örn. 水) sorulabiliyor.

- **Açılır pencere daha açıklayıcı** (6 arayüz dilinde): "Nasıl çalışır?" kutusu (yeni kullanıcıda açık, anahtarı olanda kapalı), net etiketler ("Altyazı şu dilde" / "Çeviriler şu dilde"), anahtarın isteğe bağlı olduğunu söyleyen açıklama ve etkin sekme Prime Video/YouTube/Udemy değilse "başlamak için bir video aç" notu (ek izin istemez; içerik betiğine ping atar).

## Test edilenler
- Dil tespiti ve yanlış dil koruması: 16 kontrol (ro, ja, tr, en karşılaştırmalı) geçti.
- İçerik betiği (sahte YouTube sayfası + sahte çeviri yanıtı): Japonca cümle kelimelere doğru bölündü, İngilizce satır reddedildi; Romence cümle doğru gönderildi, Japonca satır reddedildi; sayfa hatası yok.
- Açılır pencere: Romence ve Japonca seçenekleri İngilizce/Türkçe arayüzde listeleniyor; site yardımcıları (PAIR_LANGS, dil adları, ses dilleri) doğru.
- Pratik sınavı filtresi: 9 senaryo.
- Sayaç SQL'i gerçek Postgres'te.

- Açılır pencere (6 dil, anahtarlı/anahtarsız, destekli/desteksiz sekme) sahte `chrome` API'siyle denendi; metinler 6 dilde dolu, hata yok.

## Test EDİLMEYENLER
- Gerçek Chrome'da açılır pencere ve "bu sekmede çalışıyor mu" yoklaması (eklenti yüklenmeden önce açılmış sekmeler yanlışlıkla "başlamak için video aç" notunu gösterir; F5 ile düzelir). fr/it/de/es metinleri ana dili konuşan biri tarafından okunmadı.
- Sunucu uçtan uca (FastAPI + Postgres + gerçek Google çeviri): bu ortamda paket kurulamadı; yalnızca derleme ve SQL doğrulandı. Dağıtım sonrası elle dene: bir Romence ve bir Japonca altyazıyla.
- **Gerçek** Prime Video / YouTube / Udemy altyazısında Japonca ve Romence (sahte sayfayla test edildi).
- Japoncada çekimli fiiller (食べ|まし|た gibi) parçalara ayrılır; sözlük biçimine (lemma) çevrilmez, bu yüzden bazı çeviriler eksik/yanlış olabilir.
- Arayüz dili: Romence/Japonca tarayıcılar İngilizce arayüz görür (6 arayüz dili değişmedi).
- Gerçek bir Romen ya da Japon kullanıcı.

## Sonradan eklenenler
- Altyazı kutusuna "Üst orta" ve "Alt orta" konumları (eklenti 1.8.7, zip yeniden oluşturuldu).
- Admin → Özet: "Bot testi" paneli. Mağaza panelindeki günlük yükleme/kullanıcı sayısı elle girilir, sunucudaki çeviri istekleriyle karşılaştırılır. Sadece ipucu verir, kanıt değildir.
