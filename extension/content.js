const IS_YT = location.hostname.endsWith("youtube.com");
let SRC = "tr";
let DST = "en";
let ENABLED = false; // varsayılan KAPALI: kullanıcı açmadıkça hiçbir şey çevrilmez
const guard = new CVL.Guard(); // altyazı dili kontrolü
const knownCache = new Set(); // "biliyorum" dediğin kelimeler (çevirisi gösterilmez)
const IS_UDEMY = location.hostname.endsWith("udemy.com");

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
overlayBox.style.display = "none"; // altyazı gelene kadar görünmez
document.body.appendChild(overlayBox);
let hideTimer = null;

document.addEventListener("fullscreenchange", () => {
  (document.fullscreenElement || document.body).appendChild(overlayBox);
});

// ---------- Dizi / bölüm bilgisi ----------
// Oynatıcının başlık alanından okunur ("Lost" + "S1 E13 Kalpler Ve Zihinler").
// Başlık gizlenince son bilinen bölüm kullanılır; sayfa adresi değişirse sıfırlanır.
let currentEpisode = "";
let lastHref = location.href;

const EPISODE_RE = /S(?:ezon)?\s*(\d+)[\s,.:\-]*(?:E|B[öo]l[üu]m)\s*(\d+)/i;

function firstText(selector) {
  for (const n of document.querySelectorAll(selector)) {
    const t = n.textContent ? n.textContent.trim() : "";
    if (t) return t;
  }
  return "";
}

// Sınıf adları tutmazsa: sayfadaki kısa metinlerden "S1 E1 ..." kalıbını ara
function findEpisodeText() {
  for (const n of document.querySelectorAll("span, div, h1, h2")) {
    if (n.children.length) continue;
    const t = n.textContent ? n.textContent.trim() : "";
    if (t && t.length < 80 && EPISODE_RE.test(t)) return t;
  }
  return "";
}

function readEpisode() {
  if (IS_YT) return readYouTubeTitle();
  if (IS_UDEMY) return readUdemyTitle();
  if (location.href !== lastHref) {
    lastHref = location.href;
    currentEpisode = "";
  }
  const show =
    firstText(".atvwebplayersdk-title-text, [class*='title-text']") ||
    document.title.replace(/^Prime Video:\s*/i, "").trim();
  const sub =
    firstText(".atvwebplayersdk-subtitle-text, [class*='subtitle-text']") || findEpisodeText();
  const m = EPISODE_RE.exec(sub) || EPISODE_RE.exec(show);
  if (m && show) {
    const label = `${show.replace(EPISODE_RE, "").replace(/\s*[-–]\s*(Season|Sezon)\s*\d+/i, "").trim()} S${m[1]} E${m[2]}`;
    if (label !== currentEpisode) {
      currentEpisode = label;
      console.log("CineVocab bölüm:", currentEpisode);
    }
  }
  return currentEpisode;
}

setInterval(() => { if (ENABLED) readEpisode(); }, 3000);

// YouTube: "bölüm" yerine video başlığı kullanılır (oyun odalarında bu ad görünür).
function readYouTubeTitle() {
  const raw =
    firstText("h1.ytd-watch-metadata yt-formatted-string, h1.ytd-watch-metadata") ||
    document.title.replace(/^\(\d+\)\s*/, "").replace(/\s*-\s*YouTube\s*$/i, "");
  const title = raw.trim().slice(0, 60);
  // Sayfa henüz yüklenmediyse başlık sadece "YouTube" olur: boş say, sonra tekrar okunur
  return title && !/^(\(\d+\)\s*)?YouTube$/i.test(title) ? "YouTube · " + title : "";
}

// Udemy: kurs adı (sınıf adları sık değiştiği için birkaç yedek seçici + sayfa başlığı)
function readUdemyTitle() {
  const raw =
    firstText("[data-purpose='course-header-title'], [class*='header--course-title'], [class*='curriculum-item-view--title']") ||
    document.title.replace(/\s*[|\-–]\s*Udemy.*$/i, "");
  const title = raw.trim().slice(0, 60);
  return title ? "Udemy · " + title : "";
}

// Panelde gösterilecek küçük resim: YouTube kapağı, Udemy/Prime sayfa görseli
function readThumb() {
  try {
    if (IS_YT) {
      const m = /[?&]v=([\w-]{6,15})/.exec(location.search) || /\/shorts\/([\w-]{6,15})/.exec(location.pathname);
      return m ? "https://i.ytimg.com/vi/" + m[1] + "/mqdefault.jpg" : "";
    }
    const og = document.querySelector("meta[property='og:image']");
    const u = og && og.content ? og.content : "";
    return /^https:\/\//.test(u) && u.length <= 300 ? u : "";
  } catch (e) { return ""; }
}
const thumbSent = new Set(); // episode -> küçük resim bir kez gönderilir

function readUdemySubtitle() {
  const nodes = [
    ...document.querySelectorAll(
      "[data-purpose='captions-cue-text'], [class*='captions-display--captions-cue-text']"
    ),
  ];
  const outer = nodes.filter((n) => !nodes.some((o) => o !== n && o.contains(n)));
  return outer
    .map((n) => (n.innerText ? n.innerText.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function readYouTubeSubtitle() {
  return [...document.querySelectorAll("span.ytp-caption-segment")]
    .map((n) => (n.textContent ? n.textContent.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

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
    .map((w) => w.trim().toLocaleLowerCase(SRC))
    .filter((w) => w.length >= 2 && !/\d/.test(w));
}

let sentenceId = 0;
const wordCache = new Map(); // tr -> en (sekme açık kaldıkça tekrar sorulmaz)
const sentCache = new Map(); // cümle -> İngilizcesi

// Gecikmeler: 2 sn, 4 sn, 8 sn (sunucu bloklanmışsa Google'ı yormayalım)
const RETRY_DELAYS = [2000, 4000, 8000];

function showSentence(sentence) {
  const myId = ++sentenceId;
  const gen = Date.now();
  const episode = readEpisode();
  let thumb = "";
  if (episode && !thumbSent.has(episode)) { thumb = readThumb(); if (thumb) thumbSent.add(episode); }
  let words = splitWords(sentence);
  const fr = CVL.foreign(words, SRC);
  words = words.filter((_, i) => !fr[i]);
  if (words.length === 0) return;

  overlayBox.style.display = "block";
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => (overlayBox.style.display = "none"), 12000);
  overlayBox.textContent = "";
  const epLabel = document.createElement("div");
  Object.assign(epLabel.style, { fontSize: "12px", color: "#8b909c", marginBottom: "4px" });
  epLabel.textContent = episode
    ? "📺 " + episode
    : CVL.t("epMissing");
  overlayBox.appendChild(epLabel);
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
  // Bildiğin kelime: çeviri yok, soluk görünür
  const markKnown = (w) => (slots[w] || []).forEach((el) => { el.textContent = ""; el.parentNode.style.opacity = "0.4"; });
  uniqueWords.forEach((w) => (knownCache.has(w) ? markKnown(w) : wordCache.has(w) && setText(w, wordCache.get(w))));
  if (sentCache.has(sentence)) {
    transLine.textContent = sentCache.get(sentence);
    transLine.dataset.ok = "1";
  }
  const markFailed = (list) => list.forEach((w) => setText(w, "?"));
  // Hata/durum mesajını cümle çevirisi satırında göster (cümle çevirisi gelene kadar)
  const status = (msg) => { if (!transLine.dataset.ok) transLine.textContent = msg; };
  const giveUpSentence = () => {
    if (transLine.textContent === "…") transLine.textContent = "";
  };

  // lookupOnly=true: sadece veritabanı/sözlük (anında); false: gerçek çeviri
  function request(list, attempt, lookupOnly) {
    if (myId !== sentenceId) return;
    if (!chrome.runtime?.id) {
      status(CVL.t("reload"));
      return;
    }

    let answered = false;
    const watchdog = setTimeout(() => {
      if (!answered) status(CVL.t("noAnswer"));
    }, 10000);

    chrome.runtime.sendMessage(
      { action: "translateWords", words: list, gen, lookupOnly, sentence, episode, thumb },
      (res) => {
        answered = true;
        clearTimeout(watchdog);
        if (myId !== sentenceId) return;
        if (res && res.status === "disabled") return; // kapatıldı
        console.log("CineVocab cevap:", lookupOnly ? "hızlı" : "tam", res);

        if (chrome.runtime.lastError || res?.status !== "success") {
          const why = chrome.runtime.lastError?.message || res?.message || "cevap yok";
          console.warn("CineVocab hata:", why);
          status(/401/.test(why) ? CVL.t("noKey") : "⚠ " + why);
          if (attempt < RETRY_DELAYS.length) {
            setTimeout(() => request(list, attempt + 1, false), RETRY_DELAYS[attempt]);
          } else {
            markFailed(list);
            giveUpSentence();
          }
          return;
        }

        for (const w of res.known || []) { knownCache.add(w); markKnown(w); }
        for (const [w, eng] of Object.entries(res.results || {})) {
          if (knownCache.has(w)) continue;
          wordCache.set(w, eng);
          setText(w, eng);
        }
        markFailed(res.failed || []); // sunucu "çevrilemedi" dediyse tekrar deneme
        if (res.sentence_en) {
          transLine.textContent = res.sentence_en;
          transLine.dataset.ok = "1";
          sentCache.set(sentence, res.sentence_en);
          if (sentCache.size > 200) sentCache.delete(sentCache.keys().next().value);
        }

        if (lookupOnly) {
          // Hızlı arama bitti (kelimeler bölüme/hesaba yazıldı).
          const unknown = res.pending || [];
          if (!unknown.length) {
            // Hepsi biliniyor. YouTube'un kayan otomatik altyazılarında her değişiklik için
            // cümle çevirisi istemek Google'ı engelletiyordu: orada atlanır.
            if (IS_YT || sentCache.has(sentence)) { giveUpSentence(); return; }
            request([], 0, false); // Prime/Udemy: sadece cümle çevirisi
            return;
          }
          request(unknown, 0, false);
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
let ytCandidate = "";

function readSubtitle() {
  if (IS_YT) return readYouTubeSubtitle();
  if (IS_UDEMY) return readUdemySubtitle();
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

let lastNoticeAt = 0, lastReport = { lang: "", ok: true, ts: 0 }, lastBadLang = "";

function report(g) {
  const lang = g.v === "match" ? SRC : g.lang;
  if (!lang) return;
  const now = Date.now();
  if (lang === lastReport.lang && g.ok === lastReport.ok && now - lastReport.ts < 5000) return;
  lastReport = { lang, ok: g.ok, ts: now };
  try { chrome.storage.local.set({ det: { lang, ok: g.ok, ts: now } }); } catch (e) {}
}

// Yanlış dilde altyazı: çeviri yok. Bilgi kutusu dakikada bir kez gösterilir, sonra sessiz kalır.
function showMismatch(lang) {
  sentenceId++;
  if (lang) lastBadLang = lang;
  if (Date.now() - lastNoticeAt < 60000) { overlayBox.style.display = "none"; return; }
  lastNoticeAt = Date.now();
  overlayBox.textContent = "⏸ " + CVL.t("mismatch", CVL.langName(lastBadLang || "?"), CVL.langName(SRC));
  overlayBox.style.display = "block";
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => (overlayBox.style.display = "none"), 6000);
}

setInterval(() => {
  if (!ENABLED) return;
  const text = readSubtitle().replace(/\s+/g, " ").trim();

  if (!text) {
    lastSubtitle = ""; // altyazı kayboldu; aynı cümle tekrar gelirse yeniden işle
    return;
  }
  if (IS_YT) {
    // Otomatik altyazılar kayarak değişir: metin iki yoklama boyunca aynı kalınca işle.
    if (text !== ytCandidate) { ytCandidate = text; return; }
  }
  if (text.length < 3 || text.length > 200 || text === lastSubtitle) return;

  lastSubtitle = text;
  const g = guard.check(text, SRC);
  report(g);
  if (!g.ok) { console.log("CineVocab: altyazı dili uyuşmuyor, atlandı:", g.lang, text); showMismatch(g.lang); return; }
  console.log("Gerçek Altyazı Yakalandı:", text);
  showSentence(text);
}, 500);

// ---------- Ayarlar (canlı): aç/kapa ve dil değişince sayfayı yenilemeye gerek yok ----------
function applyEnabled() {
  if (ENABLED) return;
  sentenceId++;
  overlayBox.style.display = "none";
  lastSubtitle = ""; ytCandidate = ""; guard.reset();
}
function applyPair() {
  wordCache.clear(); sentCache.clear(); knownCache.clear();
  lastSubtitle = ""; ytCandidate = ""; guard.reset(); lastNoticeAt = 0;
}
try {
  chrome.storage.local.get(["enabled", "src", "dst"], (r) => {
    if (!r) return;
    SRC = r.src || "tr"; DST = r.dst || "en"; ENABLED = !!r.enabled; applyEnabled();
  });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local") return;
    if (ch.src || ch.dst) { if (ch.src) SRC = ch.src.newValue || "tr"; if (ch.dst) DST = ch.dst.newValue || "en"; applyPair(); }
    if (ch.enabled) { ENABLED = !!ch.enabled.newValue; applyEnabled(); }
  });
} catch (e) {}