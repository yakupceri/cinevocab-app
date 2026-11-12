window.__cvLoaded = true; // aynı çerçeveye iki kez yüklenmesin
const IS_YT = location.hostname.endsWith("youtube.com");
let SRC = "tr";
let DST = "en";
let ENABLED = false; // varsayılan KAPALI: kullanıcı açmadıkça hiçbir şey çevrilmez
const guard = new CVL.Guard(); // altyazı dili kontrolü
const knownCache = new Set(); // "biliyorum" dediğin kelimeler (çevirisi gösterilmez)
const IS_UDEMY = location.hostname.endsWith("udemy.com");
const IS_NETFLIX = location.hostname.endsWith("netflix.com");
const IS_PRIME = /(^|\.)(primevideo|amazon)\./.test(location.hostname);
let HIDE_ORIG = true; // sitenin kendi altyazısını gizle, sadece CineVocab görünsün

// ---------- Çeviri kutusu ----------
// Kutu gölge kökte çizilir (sitenin stilleri bozamaz). Fareyle doğrudan videonun üstünde ayarlanır:
// sürükle = taşı, köşeden çek = boyut, kilit = sabitle (kilitliyken tıklamalar videoya geçer).
const overlayBox = document.createElement("div");
overlayBox.id = "cinevocab-overlay";
overlayBox.style.cssText = "all:initial;position:fixed;z-index:2147483647;display:none;pointer-events:none;";
const ovRoot = overlayBox.attachShadow({ mode: "open" });
const ovStyle = document.createElement("style");
ovStyle.textContent = `
:host { font:16px/1.4 "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif; }
.wrap { position:relative; --s:1; --op:.85; font-family:"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; text-align:left; direction:ltr; }
.box { position:relative; box-sizing:border-box; width:var(--bw, max-content); max-width:min(var(--mw, calc(640px * var(--s))), 96vw); padding:.7em 1em; border-radius:.8em; font-size:calc(16px * var(--s)); line-height:1.4; color:#f6efdf; background:rgba(6,20,26,var(--op)); border:1px solid rgba(246,239,223,.16); box-shadow:0 6px 24px rgba(0,0,0,.4); pointer-events:auto; cursor:grab; user-select:none; -webkit-user-select:none; touch-action:none; }
.locked .box { pointer-events:none; cursor:default; }
.hot:not(.locked) .box, .drag .box { outline:2px dashed rgba(255,197,107,.85); outline-offset:3px; }
.drag .box { cursor:grabbing; }
.chip { display:inline-block; text-align:center; margin:2px 4px 2px 0; padding:1px 4px; border-radius:.45em; vertical-align:top; cursor:pointer; }
.chip:hover { background:rgba(246,239,223,.16); }
.chip .w { font-weight:700; } .chip .t { font-size:.85em; font-weight:600; color:var(--tr, #7ee0a8); min-height:1em; }
.chip.star .w { color:#ffc56b; } .chip.star .w::before { content:"★ "; font-size:.8em; }
.wgrip { position:absolute; right:-10px; top:50%; width:18px; height:44px; margin-top:-22px; display:none; pointer-events:auto; cursor:ew-resize; touch-action:none; }
.wgrip::after { content:""; position:absolute; left:7px; top:6px; bottom:6px; width:4px; border-radius:2px; background:#ffc56b; }
.hot:not(.locked) .wgrip, .drag .wgrip { display:block; }
.pill .dot { width:14px; height:14px; border-radius:50%; background:var(--tr, #7ee0a8); border:2px solid rgba(246,239,223,.6); box-sizing:border-box; }
.ep { font-size:12px; color:#9fb3ae; margin-bottom:4px; }
.sent { margin-top:.5em; padding-top:.4em; border-top:1px solid rgba(246,239,223,.16); font-size:.92em; color:#e4dccb; font-style:italic; }
.hint { margin-top:.6em; font-size:12px; font-weight:600; color:#ffc56b; }
.grip { position:absolute; right:-7px; bottom:-7px; width:22px; height:22px; display:none; pointer-events:auto; cursor:nwse-resize; touch-action:none; }
.grip::after { content:""; position:absolute; right:4px; bottom:4px; width:10px; height:10px; border-right:3px solid #ffc56b; border-bottom:3px solid #ffc56b; border-radius:0 0 5px 0; }
.hot:not(.locked) .grip, .drag .grip { display:block; }
.pill { position:absolute; right:0; bottom:calc(100% + 8px); display:none; gap:2px; padding:4px; border-radius:999px; background:#0f2a31; border:1px solid rgba(246,239,223,.25); box-shadow:0 6px 18px rgba(0,0,0,.5); pointer-events:auto; white-space:nowrap; }
.below .pill { bottom:auto; top:calc(100% + 8px); }
.hot .pill, .drag .pill { display:flex; }
.pill button { all:unset; box-sizing:border-box; width:30px; height:30px; border-radius:50%; display:grid; place-items:center; color:#f6efdf; cursor:pointer; font:700 13px/1 "Segoe UI", system-ui, sans-serif; }
.pill button:hover { background:rgba(246,239,223,.16); }
.pill button:focus-visible { outline:2px solid #ffc56b; }
.pill svg { width:16px; height:16px; }
.locked .pill button:not(.lock) { display:none; }
.pill .lock.on { background:#ff8a3d; color:#2a1204; }
`;
const ovWrap = document.createElement("div"); ovWrap.className = "wrap";
const ovPill = document.createElement("div"); ovPill.className = "pill";
const ovBoxEl = document.createElement("div"); ovBoxEl.className = "box";
const ovContent = document.createElement("div");
const ovGrip = document.createElement("i"); ovGrip.className = "grip";
const ovWgrip = document.createElement("i"); ovWgrip.className = "wgrip";
ovBoxEl.append(ovContent, ovWgrip, ovGrip); ovWrap.append(ovPill, ovBoxEl); ovRoot.append(ovStyle, ovWrap);

const BOX_DEF = { h: "l", hx: 0.02, v: "t", vy: 0.05, s: 1, op: 0.85, locked: false, w: 0, c: 0 };
const TR_COLORS = ["#7ee0a8", "#ffd447", "#7cc7ff", "#ff9ecb", "#ffffff"]; // çeviri rengi seçenekleri
let BOX = { ...BOX_DEF }, boxTip = true, boxBusy = false;
function normBox(b) {
  b = b && typeof b === "object" ? b : {};
  const n = (v, lo, hi, d) => { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  return { h: ["l", "c", "r"].includes(b.h) ? b.h : BOX_DEF.h, hx: n(b.hx, 0, 1, BOX_DEF.hx), v: b.v === "b" ? "b" : "t", vy: n(b.vy, 0, 1, BOX_DEF.vy),
    s: n(b.s, 0.6, 2.4, 1), op: n(b.op, 0.35, 1, 0.85), locked: !!b.locked,
    w: b.w ? n(b.w, 200, 1600, 0) : 0, c: Math.round(n(b.c, 0, TR_COLORS.length - 1, 0)) };
}
function placeBox() {
  const vw = window.innerWidth, vh = window.innerHeight, st = overlayBox.style;
  st.left = st.right = st.top = st.bottom = "auto";
  if (BOX.h === "r") st.right = Math.round((1 - BOX.hx) * vw) + "px"; else st.left = Math.round(BOX.hx * vw) + "px";
  if (BOX.v === "b") st.bottom = Math.round((1 - BOX.vy) * vh) + "px"; else st.top = Math.round(BOX.vy * vh) + "px";
  st.transform = BOX.h === "c" ? "translateX(-50%)" : "none";
  ovWrap.style.setProperty("--s", BOX.s); ovWrap.style.setProperty("--op", BOX.op); ovWrap.style.setProperty("--tr", TR_COLORS[BOX.c] || TR_COLORS[0]);
  applyWidth();
  ovWrap.classList.toggle("locked", BOX.locked);
  lockBtn.classList.toggle("on", BOX.locked); lockBtn.title = CVL.t(BOX.locked ? "ovUnlock" : "ovLock"); lockBtn.setAttribute("aria-label", lockBtn.title);
  clampBox();
}
// Kutu ekranın dışına taşmasın (pencere küçüldüyse ya da cümle uzunsa)
function clampBox() {
  if (overlayBox.style.display === "none" || boxBusy) return;
  const r = ovBoxEl.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight, st = overlayBox.style;
  if (!r.width) return;
  if (r.left < 4 || r.right > vw - 4) { st.right = "auto"; st.transform = "none"; st.left = Math.max(4, Math.min(vw - r.width - 4, r.left)) + "px"; }
  if (r.top < 4 || r.bottom > vh - 4) { st.bottom = "auto"; st.top = Math.max(4, Math.min(vh - r.height - 4, r.top)) + "px"; }
  ovWrap.classList.toggle("below", ovBoxEl.getBoundingClientRect().top < 52);
}
// Genişlik elle ayarlandıysa kutu o genişlikte sabit kalır; ayarlanmadıysa cümleye göre daralır
function applyWidth() {
  if (BOX.w) { const px = Math.round(BOX.w * BOX.s) + "px"; ovWrap.style.setProperty("--bw", px); ovWrap.style.setProperty("--mw", px); }
  else { ovWrap.style.removeProperty("--bw"); ovWrap.style.removeProperty("--mw"); }
}
function saveBox() { try { chrome.storage.local.set({ box: BOX }); } catch (e) {} }
function showBox(on) {
  overlayBox.style.display = on ? "block" : "none";
  if (on) { placeBox(); }
}
// Bırakılan yere göre çapa: solda sol kenar, sağda sağ kenar, ortada merkez; üstte üst, altta alt kenar sabit kalır.
// Böylece cümle uzayınca kutu ekrandan taşmak yerine içeri doğru büyür.
function anchorFromRect() {
  const r = ovBoxEl.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight, cx = (r.left + r.right) / 2 / vw;
  BOX.h = cx < 0.36 ? "l" : cx > 0.64 ? "r" : "c";
  BOX.hx = BOX.h === "l" ? r.left / vw : BOX.h === "r" ? r.right / vw : cx;
  BOX.v = (r.top + r.bottom) / 2 / vh < 0.5 ? "t" : "b";
  BOX.vy = BOX.v === "t" ? r.top / vh : r.bottom / vh;
  BOX = normBox(BOX);
}
function freezeBox() { // sürükleme / boyutlandırma sırasında sol üst köşe piksel olarak sabitlenir
  const r = ovBoxEl.getBoundingClientRect(), st = overlayBox.style;
  st.right = st.bottom = "auto"; st.transform = "none"; st.left = r.left + "px"; st.top = r.top + "px";
  return r;
}
function gesture(target, onStart, onMove) {
  target.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || BOX.locked) return;
    if (target === ovBoxEl && e.target.closest && e.target.closest(".grip, .wgrip")) return;
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX, y0 = e.clientY;
    const chip0 = e.target.closest ? e.target.closest(".chip") : null; // olay bitince hedef gölge kökün dışına çevrilir: şimdi al
    let moved = false, r = null, ctx = null;
    boxBusy = true; clearTimeout(hideTimer);
    try { target.setPointerCapture(e.pointerId); } catch (x) {}
    const move = (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!moved) { if (Math.abs(dx) + Math.abs(dy) < 5) return; moved = true; r = freezeBox(); ctx = onStart(r); ovWrap.classList.add("drag"); }
      onMove(dx, dy, r, ctx);
    };
    const up = (ev) => {
      ev.stopPropagation();
      target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", up); target.removeEventListener("pointercancel", up);
      try { target.releasePointerCapture(e.pointerId); } catch (x) {}
      boxBusy = false; ovWrap.classList.remove("drag");
      if (moved) { anchorFromRect(); placeBox(); saveBox(); tipDone(); }
      else if (target === ovBoxEl && ev.type === "pointerup") { // sürükleme değil, tıklama: kelimeyse yıldızla
        if (chip0 && chip0.dataset.w) toggleStar(chip0.dataset.w);
      }
      hideTimer = setTimeout(() => showBox(false), 12000);
    };
    target.addEventListener("pointermove", move); target.addEventListener("pointerup", up); target.addEventListener("pointercancel", up);
  });
}
gesture(ovBoxEl, () => null, (dx, dy, r) => {
  const st = overlayBox.style;
  st.left = Math.max(4, Math.min(window.innerWidth - r.width - 4, r.left + dx)) + "px";
  st.top = Math.max(4, Math.min(window.innerHeight - r.height - 4, r.top + dy)) + "px";
});
gesture(ovGrip, () => BOX.s, (dx, dy, r, s0) => {
  BOX.s = Math.min(2.4, Math.max(0.6, s0 * (r.width + (Math.abs(dx) > Math.abs(dy) ? dx : dy * (r.width / Math.max(40, r.height)))) / r.width));
  ovWrap.style.setProperty("--s", BOX.s);
});
gesture(ovWgrip, () => null, (dx, dy, r) => {
  BOX.w = Math.min(1600, Math.max(200, (r.width + dx) / BOX.s));
  applyWidth();
});

// ---------- Yıldızlı kelimeler ----------
// Kutudaki bir kelimeye tıklamak onu yıldızlar. Liste cihazda tutulur; giriş yapılmışsa hesaba da yazılır.
let starSet = new Set();
function loadStars() { try { chrome.storage.local.get("stars", (r) => { starSet = new Set(((r && r.stars) || {})[SRC + ">" + DST] || []); paintStars(); }); } catch (e) {} }
function paintStars() { ovContent.querySelectorAll(".chip").forEach((c) => c.classList.toggle("star", starSet.has(c.dataset.w))); }
function toggleStar(word) {
  const on = !starSet.has(word);
  if (on) starSet.add(word); else starSet.delete(word);
  paintStars(); tipDone();
  try {
    chrome.storage.local.get("stars", (r) => { const all = (r && r.stars) || {}; all[SRC + ">" + DST] = [...starSet].slice(-3000); chrome.storage.local.set({ stars: all }); });
    chrome.runtime.sendMessage({ action: "star", word, on }, () => void chrome.runtime.lastError);
  } catch (e) {}
}

// Kutuya yapılan tıklamalar oynatıcıya gitmesin (video durmasın / tam ekran değişmesin)
for (const ev of ["click", "dblclick", "mousedown", "mouseup", "pointerup", "touchstart", "contextmenu", "wheel"]) {
  ovWrap.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
}
// Simge DOM ile kurulur (YouTube gibi Trusted Types isteyen sayfalarda innerHTML kullanılamaz)
function ovIcon(parts) {
  const NS = "http://www.w3.org/2000/svg", s = document.createElementNS(NS, "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.2", "stroke-linecap": "round", "stroke-linejoin": "round" })) s.setAttribute(k, v);
  for (const [tag, attrs] of parts) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); s.append(n); }
  return s;
}
function pillBtn(cls, content, key, fn) {
  const b = document.createElement("button"); b.className = cls; b.append(content);
  if (key) { b.title = CVL.t(key); b.setAttribute("aria-label", b.title); }
  b.addEventListener("pointerdown", (e) => e.stopPropagation());
  b.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); fn(); placeBox(); saveBox(); tipDone(); });
  ovPill.append(b); return b;
}
pillBtn("", "A−", "ovSmaller", () => { BOX.s = Math.max(0.6, Math.round((BOX.s - 0.12) * 100) / 100); });
pillBtn("", "A+", "ovBigger", () => { BOX.s = Math.min(2.4, Math.round((BOX.s + 0.12) * 100) / 100); });
const colorDot = document.createElement("span"); colorDot.className = "dot";
pillBtn("", colorDot, "ovColor", () => { BOX.c = (BOX.c + 1) % TR_COLORS.length; });
pillBtn("", ovIcon([["circle", { cx: 12, cy: 12, r: 8 }], ["path", { d: "M12 4a8 8 0 0 1 0 16z", fill: "currentColor" }]]), "ovOpacity", () => { BOX.op = BOX.op > 0.9 ? 0.55 : BOX.op > 0.7 ? 1 : 0.85; });
const lockBtn = pillBtn("lock", ovIcon([["rect", { x: 5, y: 11, width: 14, height: 10, rx: 2.5 }], ["path", { d: "M8 11V8a4 4 0 0 1 8 0v3" }]]), "ovLock", () => { BOX.locked = !BOX.locked; });

// Fare kutunun üstündeyken araçlar görünür (kilitliyken kutu tıklamayı geçirdiği için :hover çalışmaz, konum elle ölçülür)
let hotOff = null;
document.addEventListener("mousemove", (e) => {
  if (overlayBox.style.display === "none") return;
  const r = ovBoxEl.getBoundingClientRect(), below = ovWrap.classList.contains("below");
  const inside = e.clientX >= r.left - 14 && e.clientX <= r.right + 14 && e.clientY >= r.top - (below ? 14 : 50) && e.clientY <= r.bottom + (below ? 50 : 14);
  if (inside) { clearTimeout(hotOff); hotOff = null; ovWrap.classList.add("hot"); }
  else if (!hotOff && ovWrap.classList.contains("hot")) hotOff = setTimeout(() => { ovWrap.classList.remove("hot"); hotOff = null; }, 500);
}, { passive: true, capture: true });
window.addEventListener("resize", () => { if (overlayBox.style.display !== "none") placeBox(); });

function tipDone() { if (!boxTip) return; boxTip = false; try { chrome.storage.local.set({ boxTip: 1 }); } catch (e) {} const h = ovContent.querySelector(".hint"); if (h) h.remove(); }
try {
  chrome.storage.local.get(["box", "ui", "boxTip"], (r) => {
    if (!r) return;
    if (r.box) BOX = normBox(r.box);
    else if (r.ui) { // eski açılır pencere ayarlarından taşı
      const u = r.ui, p = String(u.pos || "tl");
      BOX = normBox({ h: p[1] === "c" ? "c" : p[1] === "r" ? "r" : "l", hx: p[1] === "c" ? 0.5 : p[1] === "r" ? 0.98 : 0.02, v: p[0] === "b" ? "b" : "t", vy: p[0] === "b" ? 0.9 : 0.05, s: { s: 0.82, m: 1, l: 1.2 }[u.size] || 1, op: u.op });
    }
    boxTip = !r.boxTip;
    placeBox();
  });
} catch (e) {}
(document.body || document.documentElement).appendChild(overlayBox);
let hideTimer = null;

document.addEventListener("fullscreenchange", () => {
  (document.fullscreenElement || document.body || document.documentElement).appendChild(overlayBox);
  if (overlayBox.style.display !== "none") placeBox();
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
  if (IS_NETFLIX) return readNetflixTitle();
  if (!IS_PRIME) return readGenericTitle();
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

// Diğer siteler: sayfa başlığı (iframe içindeyse üst sayfanın başlığı)
function readGenericTitle() {
  let t = document.title.replace(/\s+/g, " ").trim();
  if (window.top !== window) { try { t = window.top.document.title.trim() || t; } catch (e) {} }
  return t ? t.slice(0, 60) : location.hostname;
}

// Netflix: oynatıcının başlık alanı ("Dizi", "S1:E3", "Bölüm adı"); yoksa sayfa başlığı
function readNetflixTitle() {
  const box = document.querySelector("[data-uia='video-title']");
  const parts = box ? [...box.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];
  const raw =
    parts.join(" ") ||
    firstText("[data-uia='video-title']") ||
    document.title.replace(/\s*[-–|]\s*Netflix.*$/i, "");
  const title = raw.replace(/\s+/g, " ").trim().slice(0, 60);
  return title && !/^Netflix$/i.test(title) ? "Netflix · " + title : "";
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

// Netflix: metin altyazıları oynatıcıda .player-timedtext içinde çizilir (resim altyazıları okunamaz)
function readNetflixSubtitle() {
  const nodes = [...document.querySelectorAll(".player-timedtext-text-container")];
  const outer = nodes.filter((n) => !nodes.some((o) => o !== n && o.contains(n)));
  return outer
    .map((n) => (n.innerText ? n.innerText.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

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
  chip.className = "chip" + (starSet.has(word) ? " star" : "");
  chip.dataset.w = word;
  const tr = document.createElement("div"); tr.className = "w"; tr.textContent = word;
  const en = document.createElement("div"); en.className = "t"; en.textContent = "…";
  chip.append(tr, en);
  return { chip, en };
}

// Japonca: kelimeler boşlukla ayrılmaz; tarayıcının Intl.Segmenter'ı ile bölünür.
// Tek karakterli yalnızca-hiragana parçalar (は, が, を ...) ve çok yaygın işlev sözcükleri atlanır.
const JA_STOP = new Set(("んで って たい れる られ ませ ている です ます でし まし ました ません から まで ので のに けど でも そして しかし また この その あの これ それ あれ ここ そこ あそこ ない ある いる する した して され こと もの ため よう など とても").split(/\s+/));
let jaSegmenter = null;
function splitJa(text) {
  const out = [];
  const ok = (w) => {
    if (!w || /[\d０-９]/.test(w) || JA_STOP.has(w)) return false;
    if (/^[぀-ゟ]$/.test(w)) return false; // tek hiragana (parçacık)
    return /[぀-ヿ㐀-䶿一-鿿]/.test(w);
  };
  try {
    jaSegmenter = jaSegmenter || new Intl.Segmenter("ja", { granularity: "word" });
    for (const seg of jaSegmenter.segment(text)) if (seg.isWordLike && ok(seg.segment)) out.push(seg.segment);
    return out;
  } catch (e) {
    // Intl.Segmenter yoksa: kanji, katakana ve 2+ hiragana öbeklerini al
    return (text.match(/[㐀-䶿一-鿿]+|[゠-ヿ]+|[぀-ゟ]{2,}/g) || []).filter(ok);
  }
}

function splitWords(sentence) {
  const cleaned = sentence.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'…♪\[\]。、！？「」『』（）［］【】・〜～，．：；।॥؟،¿¡«»„“”‘’]/g, " ");
  if (SRC === "ja") return splitJa(cleaned);
  return cleaned
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

  clearTimeout(hideTimer);
  if (!boxBusy) hideTimer = setTimeout(() => showBox(false), 12000);
  ovContent.textContent = "";
  const epLabel = document.createElement("div");
  epLabel.className = "ep";
  epLabel.textContent = episode
    ? "📺 " + episode
    : CVL.t("epMissing");
  ovContent.appendChild(epLabel);
  const row = document.createElement("div");
  ovContent.appendChild(row);

  // Cümlenin çevirisi (bağlam için sunucudan gelir)
  const transLine = document.createElement("div");
  transLine.className = "sent";
  transLine.textContent = "…";
  ovContent.appendChild(transLine);
  if (boxTip) { const h = document.createElement("div"); h.className = "hint"; h.textContent = CVL.t("ovHint"); ovContent.appendChild(h); }
  showBox(true);

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
let seenAt = 0; // son altyazı okunma zamanı (açılır pencere "altyazı kapalı" uyarısı için)
let ytCandidate = "", ytSince = 0;
const YT_STABLE_MS = 220, POLL_MS = 100;

// Genel siteler: videonun altyazı kanalı (<track>), yoksa yaygın oynatıcıların altyazı kutuları
const hiddenTracks = new Set();
function restoreTracks() { hiddenTracks.forEach((t) => { try { t.mode = "showing"; } catch (e) {} }); hiddenTracks.clear(); }
function readTrackSubtitle() {
  for (const v of document.querySelectorAll("video")) {
    const tracks = [...(v.textTracks || [])].filter((t) => t.kind === "subtitles" || t.kind === "captions");
    if (!tracks.length) continue;
    const want = String(SRC).toLowerCase();
    const tr =
      tracks.find((t) => t.mode === "showing") ||
      tracks.find((t) => (t.language || "").toLowerCase().startsWith(want)) ||
      tracks[0];
    if (tr.mode === "disabled") tr.mode = "hidden"; // gizli modda altyazı yüklenir ama çizilmez
    else if (tr.mode === "showing" && HIDE_ORIG) { tr.mode = "hidden"; hiddenTracks.add(tr); }
    const cues = tr.activeCues ? [...tr.activeCues] : [];
    const text = cues.map((c) => String(c.text || "").replace(/<[^>]+>/g, " ")).join(" ").replace(/\s+/g, " ").trim();
    if (text) return text;
  }
  return "";
}
const GENERIC_SEL = ".vjs-text-track-cue, .jw-text-track-cue, .plyr__caption, .mejs__captions-text, .fp-subtitle, .shaka-text-container, .bmpui-ui-subtitle-label, .art-subtitle, .dplayer-subtitle, [class*='subtitle-text'], [class*='caption-text']";
// Özel oynatıcılar: videonun üstüne binen, adında subtitle/caption/cue geçen kutuların metni (yoklama 300 ms'de bir)
const hiddenEls = new Set();
let ovScanAt = 0, ovLast = "";
function restoreEls() { hiddenEls.forEach((e) => { try { e.style.removeProperty("opacity"); } catch (x) {} }); hiddenEls.clear(); }
function readOverlayCaption() {
  const now = Date.now();
  if (now - ovScanAt < 300) return ovLast;
  ovScanAt = now; ovLast = "";
  const vids = [...document.querySelectorAll("video")].filter((v) => v.clientWidth > 200 && v.clientHeight > 120);
  if (!vids.length) return "";
  const nodes = [...document.querySelectorAll("[class*='ubtitle' i], [class*='aption' i], [class*='-cue' i], [id*='ubtitle' i], [id*='aption' i]")]
    .filter((n) => n.id !== "cinevocab-overlay" && !n.closest("#cinevocab-overlay") && n.tagName !== "VIDEO" && n.tagName !== "BUTTON");
  const outer = nodes.filter((n) => !nodes.some((o) => o !== n && o.contains(n)));
  const out = [];
  for (const n of outer) {
    const t = n.innerText ? n.innerText.replace(/\s+/g, " ").trim() : "";
    if (!t || t.length > 200) continue;
    const r = n.getBoundingClientRect();
    if (r.width < 20 || r.height < 8) continue;
    if (!vids.some((v) => { const b = v.getBoundingClientRect(); return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top; })) continue;
    out.push(t);
    if (HIDE_ORIG) { n.style.setProperty("opacity", "0", "important"); hiddenEls.add(n); }
  }
  ovLast = out.join(" ");
  return ovLast;
}
function readGenericSubtitle() {
  const fromTrack = readTrackSubtitle();
  if (fromTrack) return fromTrack;
  const nodes = [...document.querySelectorAll(GENERIC_SEL)];
  const outer = nodes.filter((n) => !nodes.some((o) => o !== n && o.contains(n)));
  const known = outer.map((n) => (n.innerText ? n.innerText.trim() : "")).filter(Boolean).join(" ");
  return known || readOverlayCaption();
}

function readSubtitle() {
  if (IS_YT) return readYouTubeSubtitle();
  if (IS_UDEMY) return readUdemySubtitle();
  if (IS_NETFLIX) return readNetflixSubtitle();
  if (!IS_PRIME) return readGenericSubtitle();
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
  if (Date.now() - lastNoticeAt < 60000) { showBox(false); return; }
  lastNoticeAt = Date.now();
  ovContent.textContent = "⏸ " + CVL.t("mismatch", CVL.langName(lastBadLang || "?"), CVL.langName(SRC));
  showBox(true);
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => showBox(false), 6000);
}

setInterval(() => {
  if (!ENABLED) return;
  const text = readSubtitle().replace(/\s+/g, " ").trim();

  if (text) seenAt = Date.now();
  if (!text) {
    lastSubtitle = ""; // altyazı kayboldu; aynı cümle tekrar gelirse yeniden işle
    return;
  }
  if (IS_YT) {
    // Otomatik altyazılar kayarak değişir: metin kısa bir süre (YT_STABLE_MS) değişmeyince işle.
    // Eskiden "iki yoklama aynı" şartı vardı (500 ms aralıkla 0,5-1 sn gecikme); artık yoklama sıklığı 150 ms
    // ve bekleme süresi zamana bağlı, böylece ~0,3 sn'de başlar.
    const now = Date.now();
    if (text !== ytCandidate) { ytCandidate = text; ytSince = now; return; }
    if (now - ytSince < YT_STABLE_MS) return;
  }
  if (text.length < 3 || text.length > 200 || text === lastSubtitle) return;

  lastSubtitle = text;
  const g = guard.check(text, SRC);
  report(g);
  if (!g.ok) { console.log("CineVocab: altyazı dili uyuşmuyor, atlandı:", g.lang, text); showMismatch(g.lang); return; }
  console.log("Gerçek Altyazı Yakalandı:", text);
  showSentence(text);
}, POLL_MS);

// Sitenin kendi altyazısını gizle (opacity: metin sayfada kalır, biz okumaya devam ederiz)
const hideStyle = document.createElement("style");
hideStyle.id = "cinevocab-hide";
hideStyle.textContent =
  ".ytp-caption-window-container, .atvwebplayersdk-captions-overlay, .atvwebplayersdk-captions-text, .player-timedtext, " +
  "[data-purpose='captions-display'], [class*='captions-display--captions-container'], .vjs-text-track-display, .jw-captions, " +
  ".plyr__captions, .mejs__captions-layer, .shaka-text-container, .art-subtitle, .dplayer-subtitle { opacity: 0 !important; }";
function applyHide() {
  const on = ENABLED && HIDE_ORIG;
  if (on) { if (!hideStyle.isConnected) (document.head || document.documentElement).appendChild(hideStyle); }
  else { hideStyle.remove(); restoreTracks(); restoreEls(); }
}

// Açılır pencere "bu sekmede CineVocab çalışıyor mu?" diye sorar
try { chrome.runtime.onMessage.addListener((m, _s, send) => { if (m && m.cv === "ping") send({ ok: true, seenAt }); }); } catch (e) {}

// ---------- Ayarlar (canlı): aç/kapa ve dil değişince sayfayı yenilemeye gerek yok ----------
function applyEnabled() {
  if (ENABLED) return;
  sentenceId++;
  showBox(false);
  lastSubtitle = ""; ytCandidate = ""; guard.reset();
}
function applyEnabledAll() { applyEnabled(); applyHide(); }
function applyPair() {
  wordCache.clear(); sentCache.clear(); knownCache.clear(); loadStars();
  lastSubtitle = ""; ytCandidate = ""; guard.reset(); lastNoticeAt = 0;
}
try {
  chrome.storage.local.get(["enabled", "src", "dst", "hideOrig"], (r) => {
    if (!r) return;
    SRC = r.src || "tr"; DST = r.dst || "en"; ENABLED = !!r.enabled; HIDE_ORIG = r.hideOrig !== false; applyEnabledAll(); loadStars();
  });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local") return;
    if (ch.src || ch.dst) { if (ch.src) SRC = ch.src.newValue || "tr"; if (ch.dst) DST = ch.dst.newValue || "en"; applyPair(); }
    if (ch.enabled) { ENABLED = !!ch.enabled.newValue; applyEnabledAll(); }
    if (ch.hideOrig) { HIDE_ORIG = ch.hideOrig.newValue !== false; applyHide(); }
    if (ch.stars) { starSet = new Set((ch.stars.newValue || {})[SRC + ">" + DST] || []); paintStars(); }
    if (ch.box && !boxBusy) { BOX = normBox(ch.box.newValue || BOX_DEF); placeBox(); }
  });
} catch (e) {}