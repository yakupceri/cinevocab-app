console.log("CineVocab aktif - Saf Altyazı Modu");

// ---------- Overlay kutusu ----------
const overlayBox = document.createElement("div");
overlayBox.id = "cinevocab-overlay";
Object.assign(overlayBox.style, {
  position: "fixed",
  top: "20px",
  left: "20px",
  zIndex: "2147483647",
  backgroundColor: "rgba(0,0,0,0.85)",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: "10px",
  fontFamily: "Arial, sans-serif",
  fontSize: "15px",
  boxShadow: "0 4px 8px rgba(0,0,0,0.4)",
  pointerEvents: "none",
  maxWidth: "640px",
});
overlayBox.textContent = "CineVocab: Dinlemede...";
document.body.appendChild(overlayBox);

document.addEventListener("fullscreenchange", () => {
  (document.fullscreenElement || document.body).appendChild(overlayBox);
});

function makeChip(word) {
  const chip = document.createElement("div");
  Object.assign(chip.style, {
    display: "inline-block",
    textAlign: "center",
    margin: "3px 8px 3px 0",
    verticalAlign: "top",
  });

  const tr = document.createElement("div");
  tr.textContent = word;
  tr.style.fontWeight = "bold";

  const en = document.createElement("div");
  en.textContent = "…";
  Object.assign(en.style, { fontSize: "13px", color: "#7ee0a8" });

  chip.append(tr, en);
  return { chip, en };
}

function splitWords(sentence) {
  return sentence
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'…♪\[\]]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim().toLocaleLowerCase("tr"))
    .filter((w) => w.length >= 2 && !/\d/.test(w));
}

let sentenceId = 0;

// Gecikmeler: 2 sn, 4 sn, 8 sn (sunucu bloklanmışsa Google'ı yormayalım)
const RETRY_DELAYS = [2000, 4000, 8000];

function showSentence(sentence) {
  const myId = ++sentenceId;
  const gen = Date.now();
  const words = splitWords(sentence);
  if (words.length === 0) return;

  overlayBox.textContent = "";
  const row = document.createElement("div");
  overlayBox.appendChild(row);

  // Cümlenin İngilizcesi (bağlam için sunucudan gelir)
  const transLine = document.createElement("div");
  Object.assign(transLine.style, {
    marginTop: "8px",
    paddingTop: "6px",
    borderTop: "1px solid rgba(255,255,255,0.15)",
    fontSize: "14px",
    color: "#ddd",
    fontStyle: "italic",
  });
  transLine.textContent = "…";
  overlayBox.appendChild(transLine);

  const uniqueWords = [...new Set(words)];
  const slots = {};
  words.forEach((word) => {
    const { chip, en } = makeChip(word);
    row.appendChild(chip);
    (slots[word] = slots[word] || []).push(en);
  });

  const setText = (w, text) => (slots[w] || []).forEach((el) => (el.textContent = text));
  const markFailed = (list) => list.forEach((w) => setText(w, "?"));
  const giveUpSentence = () => {
    if (transLine.textContent === "…") transLine.textContent = "";
  };

  // lookupOnly=true: sadece veritabanı/sözlük (anında); false: gerçek çeviri
  function request(list, attempt, lookupOnly) {
    if (myId !== sentenceId || !chrome.runtime?.id) return;

    chrome.runtime.sendMessage(
      { action: "translateWords", words: list, gen, lookupOnly, sentence },
      (res) => {
        if (myId !== sentenceId) return;

        if (chrome.runtime.lastError || res?.status !== "success") {
          if (attempt < RETRY_DELAYS.length) {
            setTimeout(() => request(list, attempt + 1, false), RETRY_DELAYS[attempt]);
          } else {
            markFailed(list);
            giveUpSentence();
          }
          return;
        }

        for (const [w, eng] of Object.entries(res.results || {})) setText(w, eng);
        markFailed(res.failed || []); // sunucu "çevrilemedi" dediyse tekrar deneme
        if (res.sentence_en) transLine.textContent = res.sentence_en;

        if (lookupOnly) {
          // Hızlı arama bitti; şimdi cümle bağlamıyla gerçek çeviri iste
          request(uniqueWords, 0, false);
          return;
        }

        const pending = res.pending || [];
        if (!pending.length && res.sentence_en) return; // her şey tamam

        if (attempt < RETRY_DELAYS.length) {
          const retryList = pending.length ? pending : uniqueWords;
          setTimeout(() => request(retryList, attempt + 1, false), RETRY_DELAYS[attempt]);
        } else {
          markFailed(pending);
          giveUpSentence();
        }
      }
    );
  }

  request(uniqueWords, 0, true);
}

// ---------- Saf Altyazı Yakalama ----------
let lastSubtitle = "";

function readSubtitle() {
  const nodes = [
    ...document.querySelectorAll(
      ".atvwebplayersdk-captions-text, [class*='captions-text'], .timedTextWindow, [data-automation-id='subtitle-line']"
    ),
  ];
  // İç içe eşleşen elemanlarda metin iki kez gelmesin: sadece en dıştakileri al
  const outer = nodes.filter((n) => !nodes.some((o) => o !== n && o.contains(n)));
  return outer
    .map((n) => (n.innerText ? n.innerText.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

setInterval(() => {
  const text = readSubtitle();

  if (!text) {
    lastSubtitle = ""; // altyazı kayboldu; aynı cümle tekrar gelirse yeniden işle
    return;
  }
  if (text.length < 3 || text.length > 200 || text === lastSubtitle) return;

  lastSubtitle = text;
  console.log("Gerçek Altyazı Yakalandı:", text);
  showSentence(text);
}, 500);