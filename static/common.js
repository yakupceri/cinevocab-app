/* davet kodu: ?ref=kullanici adresten yakalanır, kayıtta gönderilir */
try { var _r = new URLSearchParams(location.search).get("ref"); if (_r && /^\w{3,16}$/.test(_r)) localStorage.setItem("cv-ref", _r); } catch (e) {}
/* Ortak yardımcılar: DOM, API, bildirim, onay penceresi, ülke/dil adları. i18n.js'ten SONRA yüklenir. */
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = text;
  return e;
};
const svg = (paths, cls) => {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("class", cls ? "ic " + cls : "ic");
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("focusable", "false");
  s.innerHTML = paths; // yalnızca bu dosyadaki sabit çizim yolları
  return s;
};
/* Satır içi simgeler: stroke tabanlı, currentColor. Biçim (çizgi/dolgu, boyut) app.css'teki svg.ic kurallarından gelir. */
const ICONS = {
  words: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  videos: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/>',
  known: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  practice: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  duel: '<path d="M20.5 3.5l-.6 5.2L11 17.6 6.4 13 15.3 4.1z"/><path d="M7.7 11.7l4.6 4.6M9.3 15.1L4.5 19.9"/><circle cx="3.9" cy="20.5" r=".6"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
  speak: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/>',
  league: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 20h8"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 012-2h9"/>',
  share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v6a2 2 0 002 2h10a2 2 0 002-2v-6"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  chevD: '<path d="M6 9l6 6 6-6"/>', chevL: '<path d="M15 6l-6 6 6 6"/>', chevR: '<path d="M9 6l6 6-6 6"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>', arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/>',
  pencil: '<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/>',
  crown: '<path d="M4 8l4 4 4-7 4 7 4-4-2 11H6z"/>',
  gift: '<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M12 9v11M3 13h18M12 9c-2-4-6-4-6-1.5S10 9 12 9zm0 0c2-4 6-4 6-1.5S14 9 12 9z"/>',
  refresh: '<path d="M20 12a8 8 0 01-14 5.3M4 12a8 8 0 0114-5.3M18 3v4h-4M6 21v-4h4"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
  logout: '<path d="M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4M15 8l4 4-4 4M19 12H9"/>',
  plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4"/>',
  danger: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  flame: '<path d="M12 2s5 4.5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-6 1-9z"/>',
  heart: '<path d="M12 21s-8-5.3-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.7-8 11-8 11z"/>',
  star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
};

/* Simgeli başlık ve simgeli düğme (metin her zaman yanında: simge tek başına anlam taşımaz) */
function ttl(icon, text, tag) { const h = el(tag || "h2", "ttl"); h.append(svg(ICONS[icon]), document.createTextNode(text)); return h; }
function ibtn(icon, text, cls) { const b = el("button", cls || ""); b.type = "button"; if (icon) b.append(svg(ICONS[icon])); if (text) b.append(document.createTextNode(text)); return b; }

/* ---------- Sesli okuma (cihazın kendi sesi, sunucuya hiçbir şey gitmez) ---------- */
const SPEECH_LANG = { tr: "tr-TR", en: "en-US", fr: "fr-FR", it: "it-IT", de: "de-DE", es: "es-ES", pt: "pt-BR", ru: "ru-RU", ar: "ar-SA", ro: "ro-RO", ja: "ja-JP", hi: "hi-IN", id: "id-ID", pl: "pl-PL", nl: "nl-NL", ko: "ko-KR" };
const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
/* Ses seçimi: tarayıcının ilk sesi çoğu zaman en kötüsü (ör. macOS'ta "Albert", "Fred" gibi robot/şaka sesleri).
   Doğal/nöral/Google/Premium seslere ve bilinen iyi seslere puan, robotik seslere eksi puan verilir. */
const BAD_VOICE = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|princess|espeak)\b|compact|espeak/i;
const GOOD_VOICE = /natural|neural|online|google|premium|enhanced|siri|samantha|karen|moira|tessa|yelda|am[eé]lie|audrey|thomas|alice|federica|paola|anna|petra|marlene|paulina|monica|luciana|milena|joana|daniel|serena|aria|jenny/i;
function voiceScore(v, want) {
  const name = String(v.name || ""), lang = String(v.lang || "").replace("_", "-").toLowerCase(), w = want.toLowerCase();
  if (!(lang === w || lang.startsWith(w.slice(0, 2)))) return -1000;
  let sc = lang === w ? 10 : 0;
  if (BAD_VOICE.test(name)) sc -= 100;
  if (/natural|neural|online/i.test(name)) sc += 50;
  if (/google/i.test(name)) sc += 40;
  if (/premium|enhanced|siri/i.test(name)) sc += 35;
  if (GOOD_VOICE.test(name)) sc += 25;
  if (v.default) sc += 3;
  return sc;
}
function voicesFor(lang) {
  if (!canSpeak()) return [];
  const want = SPEECH_LANG[lang] || lang || "en-US";
  return (speechSynthesis.getVoices() || []).map((v) => [voiceScore(v, want), v]).filter((x) => x[0] > -1000).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
}
function pickVoice(lang) {
  let saved = ""; try { saved = localStorage.getItem("cv-voice-" + lang) || ""; } catch (e) {}
  const list = voicesFor(lang);
  if (saved) { const v = list.find((x) => x.name === saved); if (v) return v; }
  return list.length && voiceScore(list[0], SPEECH_LANG[lang] || lang) > -50 ? list[0] : null;
}
function speak(text, lang) {
  if (!canSpeak() || !text) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = SPEECH_LANG[lang] || lang || "en-US"; u.rate = 0.95; u.pitch = 1.05; u.volume = 1;
    const v = pickVoice(lang);
    if (v) { u.voice = v; u.lang = v.lang || u.lang; }
    speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}
if (canSpeak()) { try { speechSynthesis.getVoices(); speechSynthesis.addEventListener("voiceschanged", () => speechSynthesis.getVoices()); } catch (e) {} }
/* Öğrenilen dil: arayüz dilinin dışındaki dil (arayüz Türkçe, çift tr>en ise İngilizce). */
function learnLang(src, dst) { const ui = I18N.lang; return dst === ui ? src : src === ui ? dst : src; }
function speakBtn(text, lang, cls) {
  const b = el("span", "spk " + (cls || ""));
  b.setAttribute("role", "button"); b.tabIndex = 0; b.title = t("listen"); b.setAttribute("aria-label", t("listen"));
  b.append(svg(ICONS.speak));
  const go = (e) => { e.preventDefault(); e.stopPropagation(); if (!speak(text, lang)) toast(t("noVoice")); };
  b.onclick = go; b.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") go(e); };
  return b;
}
/* Konuşmayı yazıya çeviren tarayıcı özelliği (Chrome/Edge). Yoksa null. */
const SpeechRec = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition || null) : null;

async function api(path, body) {
  const opt = body !== undefined ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  let r;
  try { r = await fetch(path, opt); } catch (e) { throw new Error(t("eNet")); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const err = new Error(I18N.err(d.detail || "")); err.status = r.status; throw err; }
  return d;
}

function toast(msg) {
  const x = el("div", "toast", msg);
  document.body.append(x);
  setTimeout(() => x.remove(), 2600);
}

/* Onay penceresi: Promise<boolean> */
function ask(title, text, okLabel, danger = true) {
  return new Promise((res) => {
    const m = el("div", "modal"), c = el("div", "card"), row = el("div", "row");
    const ok = el("button", danger ? "danger" : "primary", okLabel || t("del")), no = el("button", "", t("cancel"));
    const done = (v) => { m.remove(); res(v); };
    ok.onclick = () => done(true); no.onclick = () => done(false);
    m.onclick = (e) => { if (e.target === m) done(false); };
    row.append(ok, no); row.style.marginTop = "18px";
    c.append(el("h2", "", title), el("p", "dim", text || ""), row);
    c.firstChild.style.marginBottom = "8px";
    m.append(c); document.body.append(m); no.focus();
  });
}

const COUNTRY_CODES = "TR DE GB US NL FR AZ RU UA KZ SA AE EG IQ IR ES IT SE BE AT CH CA AU BR IN PK JP KR CN ID MX AR PL GR BG RO PT CY".split(" ");
const PAIR_LANGS = ["tr", "en", "fr", "it", "de", "es", "pt", "ru", "ar", "ro", "ja", "hi", "id", "pl", "nl", "ko"];
function langName(code, inLang) {
  try { const n = new Intl.DisplayNames([inLang || I18N.lang], { type: "language" }).of(code); return n.charAt(0).toLocaleUpperCase(inLang || I18N.lang) + n.slice(1); } catch (e) { return code; }
}
function countryName(cc) { try { return new Intl.DisplayNames([I18N.lang], { type: "region" }).of(cc); } catch (e) { return cc; } }
const flag = (cc) => (cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0))) + " " : "");
const fmtDate = (s) => { const d = new Date(String(s).replace(" ", "T")); return isNaN(d) ? "" : d.toLocaleDateString(I18N.lang, { day: "numeric", month: "short" }); };
const shuf = (a) => [...a].sort(() => Math.random() - 0.5);

/* Üst çubuğa dil seçici (hap) + tema düğmesi ekler (id="tools" kutusuna) */
function mountTools(box) {
  const lp = el("label", "psel"), sel = el("select");
  I18N.list.forEach(([c, n]) => sel.append(new Option(n, c)));
  sel.value = I18N.lang;
  sel.title = t("uiLang"); sel.setAttribute("aria-label", t("uiLang")); lp.title = t("uiLang");
  sel.onchange = () => I18N.set(sel.value);
  lp.append(svg(ICONS.globe), el("span", "", I18N.lang.toUpperCase()), sel);
  const th = el("button", "icon ghost");
  th.setAttribute("aria-label", t("theme")); th.title = t("theme");
  const paint = () => th.replaceChildren(svg(I18N.theme() === "dark" ? ICONS.sun : ICONS.moon));
  paint();
  th.onclick = () => { I18N.setTheme(I18N.theme() === "dark" ? "light" : "dark"); paint(); };
  box.replaceChildren(lp, th);
}

const setBack = () => { const b = document.getElementById("back"); if (b) b.replaceChildren(svg(ICONS.chevL), document.createTextNode(t("backToPanel"))); };

/* Konuşma/yazı eşleştirme: sunucudaki say_match ile aynı kural (kişisel tekrar quizi için). */
function sayNorm(x) {
  return String(x || "").replace(/İ/g, "i").replace(/I/g, "i").replace(/ı/g, "i").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean).join(" ");
}
function sayDist(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)));
    prev = cur;
  }
  return prev[b.length];
}
function sayMatch(heard, answer) {
  const h = sayNorm(heard), a = sayNorm(answer);
  if (!h || !a) return false;
  if (h === a) return true;
  const n = a.length, lim = n < 7 ? 0 : n < 11 ? 1 : 2;
  return lim > 0 && Math.abs(h.length - n) <= lim && sayDist(h, a) <= lim;
}
