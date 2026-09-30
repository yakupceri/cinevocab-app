console.log("CineVocab Kesin Yakalayıcı Aktif!");

// 1. Sol üst köşe kutucuğu
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
overlayBox.innerHTML = "<b>CineVocab:</b> Hazır!";
document.body.appendChild(overlayBox);

const miniDictionary = {
  "survivor": "hayatta kalan",
  "island": "ada",
  "water": "su",
  "help": "yardım",
  "fire": "ateş",
  "run": "kaçmak / koşmak",
  "listen": "dinlemek",
  "look": "bakmak",
  "friend": "arkadaş",
  "stranger": "yabancı",
  "ocean": "okyanus",
  "plane": "uçak",
  "crash": "kaza / düşmek",
  "we": "biz",
  "need": "ihtiyacım var",
  "with": "ile"
};

function translateWord(text) {
  let lowerText = text.toLowerCase();
  for (let [eng, tr] of Object.entries(miniDictionary)) {
    if (lowerText.includes(eng)) {
      return `${eng} = ${tr}`;
    }
  }
  return `Kaydedildi: "${text}"`;
}

async function sendWordToBackend(engWord, trWord) {
  try {
    await fetch("http://127.0.0.1:8000/add-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eng: engWord, tr: trWord })
    });
  } catch (error) {
    console.error("Kayıt hatası:", error);
  }
}

// 2. Doğrudan video altyazı container'ını veya body'yi izleyen güçlü gözlemci
const observer = new MutationObserver(() => {
  // Sayfadaki olası tüm altyazı elementlerini ve metinleri tarayalım
  const subtitleElements = document.querySelectorAll('.timedTextContent, [data-automation-id="subtitle-line"], span, div');
  
  let foundText = "";
  for (let el of subtitleElements) {
    let text = el.innerText ? el.innerText.trim() : "";
    // Altyazı uzunluğuna uygun ve İngilizce olabilecek metinleri filtrele
    if (text.length > 3 && text.length < 80 && (text.includes("help") || text.includes("fire") || text.includes("we") || text.includes("is") || text.includes("you"))) {
      foundText = text;
      break;
    }
  }

  if (foundText && foundText !== window.lastSubtitle) {
    window.lastSubtitle = foundText;
    console.log("Yakalanan Altyazı:", foundText);
    
    let translation = translateWord(foundText);
    overlayBox.innerHTML = `<b>EN:</b> ${foundText}<br><b>TR:</b> ${translation}`;
    
    sendWordToBackend(foundText, translation);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});