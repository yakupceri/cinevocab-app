console.log("CineVocab: Kelime Kelime Ayırıcı Aktif!");

const overlayBox = document.createElement("div");
overlayBox.id = "cinevocab-overlay";
overlayBox.style.position = "fixed";
overlayBox.style.top = "20px";
overlayBox.style.left = "20px";
overlayBox.style.zIndex = "999999";
overlayBox.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
overlayBox.style.color = "#ffffff";
overlayBox.style.padding = "12px 18px";
overlayBox.style.borderRadius = "8px";
overlayBox.style.fontFamily = "Arial, sans-serif";
overlayBox.style.fontSize = "15px";
overlayBox.style.boxShadow = "0 4px 8px rgba(0,0,0,0.4)";
overlayBox.style.pointerEvents = "none";
overlayBox.innerHTML = "<b>CineVocab:</b> Dinlemede...";
document.body.appendChild(overlayBox);

// Kelimeleri sırayla tek tek backend'e gönderen fonksiyon
function sendWordsOneByOne(sentence) {
  if (!chrome.runtime?.id) return;

  // Cümleyi kelimelere ayır, noktalama işaretlerini temizle ve 2 harften uzun olanları al
  let rawWords = sentence.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "").split(/\s+/);
  let uniqueWords = [...new Set(rawWords.map(w => w.trim()).filter(w => w.length > 2))];

  console.log("Cümleden çıkarılan kelimeler:", uniqueWords);

  // Her kelimeyi sırayla veritabanına kaydedelim
  uniqueWords.forEach((word, index) => {
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "addWord", eng: word }, (response) => {
        if (chrome.runtime.lastError) return;

        if (response && response.status === "success") {
          overlayBox.innerHTML = `<b>EN:</b> ${response.eng}<br><b>TR:</b> ${response.tr}`;
          console.log(`Kelime Kaydedildi: ${response.eng} -> ${response.tr}`);
        }
      });
    }, index * 800); // Kelimeler arasına 0.8 saniye koyarak ard arda ekletelim
  });
}

// Altyazı yakalayıcı döngü
setInterval(() => {
  let foundText = "";
  const elements = document.querySelectorAll('span');

  for (let el of elements) {
    let text = el.innerText ? el.innerText.trim() : "";
    
    if (text.length < 3 || text.length > 120) continue;
    if (text === window.lastSubtitle) continue;

    let lower = text.toLowerCase();

    if (
      lower.includes("yaş sınırı") || 
      lower.includes("alkol kullanımı") || 
      lower.includes("tümüne göz at") || 
      lower.includes("mağaza") || 
      lower.includes("menü") || 
      lower.includes("ana sayfa") || 
      lower.includes("sezon") || 
      lower.includes("bölüm") ||
      lower.includes("izle")
    ) {
      continue;
    }

    const basicWords = ["the", "to", "you", "i", "it", "a", "and", "is", "in", "of", "that", "he", "was", "for", "on", "are", "with", "not", "this", "be", "do", "at", "have", "my", "what", "so", "up", "out", "if", "about", "who", "get", "just", "him", "know", "take", "your", "good", "well"];
    let words = lower.replace(/[^a-z\s]/g, "").split(/\s+/);
    let hasMatch = words.some(w => basicWords.includes(w));

    if (hasMatch && /[a-zA-Z]/.test(text)) {
      foundText = text;
      break;
    }
  }

  if (foundText && foundText !== window.lastSubtitle) {
    window.lastSubtitle = foundText;
    overlayBox.innerHTML = `<b>Cümle Yakalandı:</b><br>${foundText}`;
    sendWordsOneByOne(foundText);
  }
}, 500);