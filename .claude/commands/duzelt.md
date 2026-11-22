---
description: Karışık bir mesajı net bir göreve ve düzgün bir prompt'a çevirir (önce onay ister, sonra yapar)
argument-hint: <karışık mesajın>
---

Aşağıdaki mesaj kullanıcının dağınık yazdığı bir istek. Hemen uygulama. Önce netleştir.

Mesaj:
$ARGUMENTS

Şunları yap:
1. **Ne istiyor:** tek cümleyle asıl görevi yaz.
2. **Net görev listesi:** numaralı, her madde tek eylem. Mesajda geçen ama görevle ilgisi olmayan şeyleri ayrı bir "kapsam dışı" satırına koy.
3. **Eksik ya da çelişen yerler:** en fazla 3 kısa soru. Soru sormadan cevaplanabilecek şeyleri sorma, makul varsayılanı yaz ve işaretle.
4. **Düzgün prompt:** yukarıdaki netleşmiş görevi, bağlamı (hangi dosyalar, hangi kısıtlar: izin, site dosyası, push, dil) ve "bitti sayılır" ölçüsünü içeren, kopyalayıp kullanılabilir tek bir prompt yaz.
5. **Riskler:** site dosyasına dokunuyor mu? Push gerekiyor mu (push = site canlıda yeniden yayınlanır)? Yeni izin gerekiyor mu? Varsa açıkça yaz.

Sonunda dur ve sor: "Bu şekilde başlayayım mı?" Ben "tamam" demeden dosya yazma, komut çalıştırma, kurma.
Türkçe ve sade yaz.
