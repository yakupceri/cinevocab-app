window.__cvLoaded = true; // aynı çerçeveye iki kez yüklenmesin
const IS_YT = location.hostname.endsWith("youtube.com");
let SRC = "tr";
let DST = "en";
let ENABLED = false; // ayar okunana kadar kapalı. Yeni kurulumda da kapalı başlar (welcome düğmesi açar); kapalıyken hiçbir şey çevrilmez
const guard = new CVL.Guard(); // altyazı dili kontrolü
// "Bu sitede aç" ile eski sürümde kaydedilmiş betik listesi bank.js'i içermeyebilir (background.js güncellemede listeyi yeniler).
// O zamana kadar hata vermesin: defter yoksa "tut" yalnızca yıldız olarak çalışır.
const BANK = typeof CVBank !== "undefined" ? CVBank : { list: () => [], add: (b) => b, remove: (b) => b };
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
.box { position:relative; box-sizing:border-box; width:var(--bw, max-content); max-width:min(var(--mw, calc(640px * var(--s))), 96vw); padding:.7em 1em; border-radius:.5em; font-size:calc(16px * var(--s)); line-height:1.4; color:#EDE8DA; background:rgba(11,11,10,var(--op)); border:1px solid rgba(237,232,218,.14); box-shadow:0 6px 24px rgba(0,0,0,.4); pointer-events:auto; cursor:grab; user-select:none; -webkit-user-select:none; touch-action:none; }
.locked .box { pointer-events:none; cursor:default; }
.hot:not(.locked) .box, .drag .box { outline:2px dashed rgba(240,203,74,.85); outline-offset:3px; }
.drag .box { cursor:grabbing; }
.chip { display:inline-block; text-align:center; margin:2px 4px 2px 0; padding:1px 4px; border-radius:.45em; vertical-align:top; cursor:pointer; }
.chip:hover { background:rgba(237,232,218,.16); }
.chip .w { font-weight:700; } .chip .t { font-size:.85em; font-weight:600; color:var(--tr, #F0CB4A); min-height:1em; }
.chip.star .w { background:#F0CB4A; color:#1A1500; box-shadow:0 0 0 .2em #F0CB4A; border-radius:.2em; }
.chip.star .w .p { color:rgba(26,21,0,.6); }
.wgrip { position:absolute; right:-10px; top:50%; width:18px; height:44px; margin-top:-22px; display:none; pointer-events:auto; cursor:ew-resize; touch-action:none; }
.wgrip::after { content:""; position:absolute; left:7px; top:6px; bottom:6px; width:4px; border-radius:2px; background:#F0CB4A; }
.hot:not(.locked) .wgrip, .drag .wgrip { display:block; }
.pill .dot { width:14px; height:14px; border-radius:50%; background:var(--tr, #F0CB4A); border:2px solid rgba(237,232,218,.6); box-sizing:border-box; }
.chip .w .p, .gap { font-weight:600; color:rgba(237,232,218,.72); }
.gap { display:inline-block; vertical-align:top; margin:2px 4px 2px 0; padding:1px 4px; }
.msg { max-width:24em; font-weight:600; white-space:normal; }
.fix { all:unset; box-sizing:border-box; display:inline-block; margin-top:.7em; padding:.5em 1em; border-radius:.7em; background:#F0CB4A; color:#1a1500; font-weight:800; cursor:pointer; pointer-events:auto; }
.fix.later { margin-left:.6em; background:rgba(255,255,255,.14); color:#fff; font-weight:600; }
.fix:hover { filter:brightness(1.07); } .fix:focus-visible { outline:2px solid #fff; outline-offset:2px; }
[hidden] { display:none !important; }
.lg { display:flex; align-items:center; gap:.6em; margin-bottom:.4em; font-size:max(11px, .74em); font-weight:600; color:#B3AE9F; flex-wrap:wrap; row-gap:.2em; }
.lg button, .pick button { all:unset; box-sizing:border-box; cursor:pointer; pointer-events:auto; }
.lg button { padding:.12em .7em; border-radius:99px; border:1px solid rgba(240,203,74,.7); color:#F0CB4A; font-weight:700; }
.lg button:hover { background:#F0CB4A; color:#1a1500; } .lg button:focus-visible, .pick button:focus-visible { outline:2px solid #fff; outline-offset:2px; }
.pick { max-width:27em; white-space:normal; }
.pick b { display:block; margin:.5em 0 .35em; font-size:.9em; }
.pick .l { display:inline-block; margin:0 .35em .35em 0; padding:.2em .7em; border-radius:99px; border:1px solid rgba(237,232,218,.3); font-size:.84em; font-weight:600; }
.pick .l:hover { background:rgba(237,232,218,.16); } .pick .l.on { background:#F0CB4A; border-color:#F0CB4A; color:#1a1500; font-weight:800; }
.pick .ok { display:inline-block; margin-top:.5em; padding:.45em 1.4em; border-radius:.7em; background:#F0CB4A; color:#1a1500; font-weight:800; }
.sent { margin-top:.5em; padding-top:.4em; border-top:1px solid rgba(237,232,218,.16); font-size:.92em; color:#e4dccb; font-style:italic; }
.hint { margin-top:.6em; font-size:12px; font-weight:600; color:#F0CB4A; }
.grip { position:absolute; right:-7px; bottom:-7px; width:22px; height:22px; display:none; pointer-events:auto; cursor:nwse-resize; touch-action:none; }
.grip::after { content:""; position:absolute; right:4px; bottom:4px; width:10px; height:10px; border-right:3px solid #F0CB4A; border-bottom:3px solid #F0CB4A; border-radius:0 0 5px 0; }
.hot:not(.locked) .grip, .drag .grip { display:block; }
.pill { position:absolute; right:0; bottom:calc(100% + 8px); display:none; gap:2px; padding:4px; border-radius:999px; background:#151513; border:1px solid rgba(237,232,218,.25); box-shadow:0 6px 18px rgba(0,0,0,.5); pointer-events:auto; white-space:nowrap; }
.below .pill { bottom:auto; top:calc(100% + 8px); }
.hot .pill, .drag .pill { display:flex; }
.pill button { all:unset; box-sizing:border-box; width:30px; height:30px; border-radius:50%; display:grid; place-items:center; color:#f6efdf; cursor:pointer; font:700 13px/1 "Segoe UI", system-ui, sans-serif; }
.pill button:hover { background:rgba(237,232,218,.16); }
.pill button:focus-visible { outline:2px solid #F0CB4A; }
.pill svg { width:16px; height:16px; }
.locked .pill button:not(.lock) { display:none; }
.pill .lock.on { background:#F0CB4A; color:#1a1500; }
.kept { margin-left:auto; padding:.05em .55em; border-radius:99px; color:#F0CB4A; font-weight:700; transition:background .6s; }
.kept.bump { background:rgba(240,203,74,.35); }
.hint.first { font-weight:700; }
.chip:focus-visible { outline:2px solid #F0CB4A; outline-offset:1px; }
@media (prefers-reduced-motion:reduce) { .kept { transition:none; } }
`;
const ovWrap = document.createElement("div"); ovWrap.className = "wrap";
const ovPill = document.createElement("div"); ovPill.className = "pill";
const ovBoxEl = document.createElement("div"); ovBoxEl.className = "box";
const ovContent = document.createElement("div");
const ovGrip = document.createElement("i"); ovGrip.className = "grip";
const ovWgrip = document.createElement("i"); ovWgrip.className = "wgrip";
// Dil satırı ve dil seçici: uzantı penceresini açmadan, doğrudan videonun üstünde
const ovHead = document.createElement("div"); ovHead.className = "lg";
const ovPick = document.createElement("div"); ovPick.className = "pick"; ovPick.hidden = true;
ovBoxEl.append(ovHead, ovContent, ovPick, ovWgrip, ovGrip); ovWrap.append(ovPill, ovBoxEl); ovRoot.append(ovStyle, ovWrap);

// Çeviri rengi seçenekleri. Sıra değişmez (eski kullanıcıların kayıtlı seçimi dizin olarak durur); yeni varsayılan altyazı sarısı (5).
const TR_COLORS = ["#7ee0a8", "#ffd447", "#7cc7ff", "#ff9ecb", "#ffffff", "#F0CB4A"];
const BOX_DEF = { h: "l", hx: 0.02, v: "t", vy: 0.05, s: 1, op: 0.85, locked: false, w: 0, c: 5 };
let BOX = { ...BOX_DEF }, boxTip = true, boxBusy = false;
let keptN = 0, firstMsgUntil = 0, lastSentence = ""; // bu dil çiftinde tutulan kelime sayısı; "ilk kelime tutuldu" notunun görüneceği son an
function normBox(b) {
  b = b && typeof b === "object" ? b : {};
  const n = (v, lo, hi, d) => { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  return { h: ["l", "c", "r"].includes(b.h) ? b.h : BOX_DEF.h, hx: n(b.hx, 0, 1, BOX_DEF.hx), v: b.v === "b" ? "b" : "t", vy: n(b.vy, 0, 1, BOX_DEF.vy),
    s: n(b.s, 0.6, 2.4, 1), op: n(b.op, 0.6, 1, 0.85), locked: !!b.locked,
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
let picking = false; // dil seçici açıkken kutu kendiliğinden kapanmaz
function ovButton(cls, label, fn) {
  const b = document.createElement("button"); b.className = cls; b.textContent = label;
  b.addEventListener("pointerdown", (e) => e.stopPropagation());
  b.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); fn(); });
  return b;
}
function paintHead() {
  const t = document.createElement("span");
  t.textContent = CVL.langName(SRC) + "  →  " + CVL.langName(DST); // kısa: "Spanish → English" (uzun açıklama dil seçicide)
  const kids = [t];
  if (keptN > 0) { const k = document.createElement("span"); k.className = "kept"; k.textContent = CVL.t("keptN", keptN); kids.push(k); }
  kids.push(ovButton("", CVL.t("lgChange"), () => (picking ? closePick() : openPick())));
  ovHead.replaceChildren(...kids);
}
function paintPick() {
  const row = (title, cur, set) => {
    const b = document.createElement("b"); b.textContent = title; const d = document.createElement("div");
    for (const l of SUB_LANGS) d.append(ovButton("l" + (l === cur ? " on" : ""), CVL.langName(l), () => set(l)));
    return [b, d];
  };
  // Aynı dil iki tarafta seçilirse diğer taraf eski değeri alır (iki dil hep farklı kalır)
  const save = (src, dst) => { try { chrome.storage.local.set({ src, dst, det: null }); } catch (e) {} SRC = src; DST = dst; applyPair(); paintPick(); };
  ovPick.replaceChildren(
    ...row(CVL.t("pickSub"), SRC, (l) => save(l, l === DST ? SRC : DST)),
    ...row(CVL.t("pickDst"), DST, (l) => save(l === SRC ? DST : SRC, l)),
    ovButton("ok", CVL.t("pickDone"), closePick));
}
function openPick() { picking = true; clearTimeout(hideTimer); ovContent.hidden = true; ovPick.hidden = false; paintPick(); showBox(true); }
function closePick() { picking = false; ovPick.hidden = true; ovContent.hidden = false; clearTimeout(hideTimer); hideTimer = setTimeout(() => showBox(false), 2500); placeBox(); }
function showBox(on) {
  if (!on && picking) return;
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
function loadStars() {
  try {
    chrome.storage.local.get(["stars", "bank"], (r) => {
      starSet = new Set(((r && r.stars) || {})[SRC + ">" + DST] || []);
      keptN = BANK.list(r && r.bank, SRC + ">" + DST).length;
      paintStars(); paintHead();
    });
  } catch (e) {}
}
function paintStars() { ovContent.querySelectorAll(".chip").forEach((c) => { const on = starSet.has(c.dataset.w); c.classList.toggle("star", on); c.setAttribute("aria-pressed", String(on)); c.title = CVL.t(on ? "keptTip" : "keepTip"); }); }
function toggleStar(word) {
  const on = !starSet.has(word);
  if (on) starSet.add(word); else starSet.delete(word);
  paintStars(); tipDone();
  keepLocal(word, on);
  try {
    chrome.storage.local.get("stars", (r) => { const all = (r && r.stars) || {}; all[SRC + ">" + DST] = [...starSet].slice(-3000); chrome.storage.local.set({ stars: all }); });
    chrome.runtime.sendMessage({ action: "star", word, on }, () => void chrome.runtime.lastError);
  } catch (e) {}
}

// ---------- Hesapsız "tut" ----------
// Kutudaki kelimeye tıklamak onu tutar: kelime, çevirisi ve videodaki saniye cihazda (chrome.storage.local "bank") saklanır.
// Hesap gerekmez ve sunucuya bir şey gitmez. Giriş yapılmışsa ayrıca hesabın yıldız listesine de yazılır (toggleStar içindeki "star" mesajı).
function addFirstKeptNote() {
  const m = document.createElement("div"); m.className = "hint first"; m.textContent = CVL.t("firstKept"); ovContent.appendChild(m);
}
function keepLocal(word, on) {
  try {
    chrome.storage.local.get(["bank", "keptFirst"], (r) => {
      const pair = SRC + ">" + DST;
      let bank = (r && r.bank) || {};
      if (on) {
        const v = document.querySelector("video");
        const inSentence = lastSentence && lastSentence.toLowerCase().includes(word); // cümle yalnızca kelimeyi içeriyorsa saklanır
        bank = BANK.add(bank, pair, { w: word, t: wordCache.get(word) || "", ep: readEpisode(), vt: v ? v.currentTime : NaN, s: inSentence ? lastSentence : "", st: inSentence ? (sentCache.get(lastSentence) || "") : "" });
      } else bank = BANK.remove(bank, pair, word);
      const patch = { bank }, first = on && !(r && r.keptFirst);
      if (first) patch.keptFirst = Date.now();
      chrome.storage.local.set(patch);
      keptN = BANK.list(bank, pair).length;
      paintHead();
      const k = ovHead.querySelector(".kept");
      if (k && on) { k.classList.add("bump"); setTimeout(() => k.classList.remove("bump"), 700); }
      if (first) { // ilk tutulan kelime: bir kez, kısa ve sakin bir not (sonraki cümlelerde de 9 sn görünür)
        firstMsgUntil = Date.now() + 9000;
        const h = ovContent.querySelector(".hint"); if (h) h.remove();
        addFirstKeptNote();
        clearTimeout(hideTimer); hideTimer = setTimeout(() => showBox(false), 9000);
      }
    });
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
pillBtn("", ovIcon([["circle", { cx: 12, cy: 12, r: 8 }], ["path", { d: "M12 4a8 8 0 0 1 0 16z", fill: "currentColor" }]]), "ovOpacity", () => { BOX.op = BOX.op > 0.95 ? 0.85 : BOX.op > 0.78 ? 0.7 : 1; });
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
// Çubuk gizlenince başlık sayfadan kalkar: son okunan başlık aynı video boyunca hatırlanır.
let nfTitle = "", nfPath = "", nfFromBox = false;
function readNetflixTitle() {
  if (location.pathname !== nfPath) { nfPath = location.pathname; nfTitle = ""; nfFromBox = false; }
  const box = document.querySelector("[data-uia='video-title']");
  const parts = box ? [...box.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];
  const fromBox = parts.join(" ") || firstText("[data-uia='video-title']");
  const raw = fromBox || document.title.replace(/\s*[-–|]\s*Netflix.*$/i, "");
  const title = raw.replace(/\s+/g, " ").trim().slice(0, 60);
  if (title && !/^Netflix$/i.test(title) && (fromBox || !nfFromBox)) { nfTitle = "Netflix · " + title; nfFromBox = !!fromBox; }
  return nfTitle;
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

// Asıl oynatıcı: yalnızca izleme sayfalarında (/watch, /shorts/, /live/, /embed/) ve yalnızca #movie_player içi.
// Ana sayfada, arama sonuçlarında ve kanal sayfalarında altyazı OKUNMAZ: oradaki küçük resim önizleme oynatıcıları
// ve gizli oynatıcı yüzünden video açık olmadan altyazı kutusu çıkıyordu. Gerçek YouTube'da ana sayfada da gizli bir
// #movie_player vardır (genişlik 0), bu yüzden yalnızca kimliğe değil sayfa türüne de bakılır (dev/e2e/yt-dom-probe.mjs).
function ytMainPlayer() {
  const p = location.pathname;
  if (!(p === "/watch" || p.startsWith("/shorts/") || p.startsWith("/live/") || p.startsWith("/embed/"))) return null;
  return (p.startsWith("/shorts/") && document.querySelector("#shorts-player")) || document.querySelector("#movie_player");
}

function readYouTubeSubtitle() {
  const root = ytMainPlayer();
  if (!root) return "";
  return [...root.querySelectorAll("span.ytp-caption-segment")]
    .map((n) => (n.textContent ? n.textContent.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function makeChip(word, shown, lead, trail) {
  const chip = document.createElement("div");
  chip.className = "chip" + (starSet.has(word) ? " star" : "");
  chip.dataset.w = word;
  chip.tabIndex = 0; chip.setAttribute("role", "button"); chip.setAttribute("aria-pressed", String(starSet.has(word))); chip.title = CVL.t(starSet.has(word) ? "keptTip" : "keepTip");
  chip.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleStar(word); } }); // sayfanın kısayolları (boşluk = oynat/durdur) çalışmasın
  const tr = document.createElement("div"); tr.className = "w";
  const punct = (t) => { if (!t) return; const p = document.createElement("span"); p.className = "p"; p.textContent = t; tr.append(p); };
  punct(lead); tr.append(shown || word); punct(trail);
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
  sentence = sentence.replace(/[’‘`´]/g, "'");
  // İngilizce: "don't" tek başına kelime değildir (eskiden "don" diye kaydediliyordu); "she's / we'll / they've" -> she / we / they
  if (SRC === "en") sentence = sentence.replace(/[A-Za-z]+n't(?![A-Za-z])/gi, " ").replace(/'(?:s|re|ve|ll|d|m)(?![A-Za-z])/gi, " ");
  // Fransızca / İtalyanca: "l'amour", "dell'acqua" -> amour, acqua (baştaki kısaltılmış tanımlık atılır)
  else if (SRC === "fr" || SRC === "it") sentence = sentence.replace(/(?:aujourd'hui|quelqu'une?)(?![A-Za-zÀ-ÿ])/gi, " ").replace(/[A-Za-zÀ-ÿ]+'(?=[A-Za-zÀ-ÿ])/g, " ");
  const cleaned = sentence.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'…♪\[\]。、！？「」『』（）［］【】・〜～，．：；।॥؟،¿¡«»„“”‘’]/g, " ");
  if (SRC === "ja") return splitJa(cleaned);
  return cleaned
    .split(/\s+/)
    .map((w) => w.trim().toLocaleLowerCase(SRC))
    .filter((w) => w.length >= 2 && !/\d/.test(w));
}

// Cümleyi altyazıda okunduğu gibi diz: çevrilen kelimeler kutucuk; kısa kelimeler ("I", "a"), kısaltmalar ve
// noktalama düz yazı. Sitenin altyazısı gizliyken de cümlenin tamamı okunabilsin diye.
// Dönen: [{ w, shown, lead, trail } | { gap }] ya da null (o zaman yalnızca kelimeler gösterilir).
function layoutSentence(sentence, all, fr) {
  if (SRC === "ja") return null;
  const items = [];
  let i = 0;
  for (const tok of sentence.split(/\s+/).filter(Boolean)) {
    const ks = splitWords(tok);
    for (let j = 0; j < ks.length; j++) if (all[i + j] !== ks[j]) return null;
    if (ks.length === 1 && !fr[i]) {
      const m = /^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u.exec(tok);
      items.push(m && m[2] ? { w: ks[0], shown: m[2], lead: m[1], trail: m[3] } : { w: ks[0], shown: ks[0] });
    } else if (ks.length > 1) {
      ks.forEach((k, j) => items.push(fr[i + j] ? { gap: k } : { w: k, shown: k }));
    } else items.push({ gap: tok });
    i += ks.length;
  }
  return i === all.length ? items : null;
}

let sentenceId = 0;
const wordCache = new Map(); // tr -> en (sekme açık kaldıkça tekrar sorulmaz)
const sentCache = new Map(); // cümle -> İngilizcesi

// Gecikmeler: 2 sn, 4 sn, 8 sn (sunucu bloklanmışsa Google'ı yormayalım)
const RETRY_DELAYS = [2000, 4000, 8000];

// Kalıcı çeviri önbelleği: görülen kelimelerin çevirisi cihazda (chrome.storage.local "wc", dil çiftine göre, en çok 3000 kelime) saklanır.
// Sayfa yenilense ya da başka videoya geçilse bile bilinen kelimeler ağ beklemeden anında görünür. Sunucuya "bu kelimeler görüldü" isteği yine gider
// (hesap kaydı ve "biliyorum" bilgisi için); yalnızca ekranın ona beklemesi gerekmez.
const WC_MAX = 3000;
let wcTimer = 0;
function loadWordCache() {
  try {
    const key = SRC + ">" + DST;
    chrome.storage.local.get("wc", (r) => { const m = r && r.wc && r.wc[key]; if (m && key === SRC + ">" + DST) for (const [w, t] of Object.entries(m)) if (!wordCache.has(w)) wordCache.set(w, t); });
  } catch (e) {}
}
function saveWordCache() {
  if (wcTimer) return;
  wcTimer = setTimeout(() => {
    wcTimer = 0;
    try {
      const key = SRC + ">" + DST, obj = {};
      for (const [w, t] of [...wordCache.entries()].slice(-WC_MAX)) obj[w] = t;
      chrome.storage.local.get("wc", (r) => { const all = (r && r.wc) || {}; all[key] = obj; chrome.storage.local.set({ wc: all }); });
    } catch (e) {}
  }, 2000);
}

function showSentence(sentence) {
  lastSentence = sentence; // tutulan kelimenin cümlesi için (yalnızca cihazda)
  const myId = ++sentenceId;
  const gen = Date.now();
  const episode = readEpisode();
  let thumb = "";
  if (episode && !thumbSent.has(episode)) { thumb = readThumb(); if (thumb) thumbSent.add(episode); }
  const all = splitWords(sentence);
  const fr = CVL.foreign(all, SRC);
  const words = all.filter((_, i) => !fr[i]);
  if (words.length === 0) return;
  noticeUntil = 0;

  clearTimeout(hideTimer);
  if (!boxBusy) hideTimer = setTimeout(() => showBox(false), 12000);
  ovContent.textContent = "";
  // Bölüm adı kutuda gösterilmez (kutuyu sade tutar); kelimelerle birlikte sunucuya ve cihaz defterine yazılır.
  const row = document.createElement("div");
  if (SRC === "ar") { row.dir = "rtl"; row.style.textAlign = "right"; } // kutu kökü ltr sabit; sağdan sola dilde kelime sırası tersine dönmesin
  ovContent.appendChild(row);

  // Cümlenin çevirisi (bağlam için sunucudan gelir)
  const transLine = document.createElement("div");
  transLine.className = "sent";
  if (DST === "ar") { transLine.dir = "rtl"; transLine.style.textAlign = "right"; }
  transLine.textContent = "…";
  ovContent.appendChild(transLine);
  if (boxTip) { const h = document.createElement("div"); h.className = "hint"; h.textContent = CVL.t("ovHint"); ovContent.appendChild(h); }
  if (Date.now() < firstMsgUntil) addFirstKeptNote();
  showBox(true);

  const uniqueWords = [...new Set(words)];
  const slots = {};
  const items = layoutSentence(sentence, all, fr) || words.map((w) => ({ w, shown: w }));
  items.forEach((it) => {
    if (it.gap !== undefined) { const g = document.createElement("span"); g.className = "gap"; g.textContent = it.gap; row.appendChild(g); return; }
    const { chip, en } = makeChip(it.w, it.shown, it.lead, it.trail);
    row.appendChild(chip);
    (slots[it.w] = slots[it.w] || []).push(en);
  });

  const setText = (w, text) => (slots[w] || []).forEach((el) => (el.textContent = text));
  // Bildiğin kelime: çeviri yok, soluk görünür
  const markKnown = (w) => (slots[w] || []).forEach((el) => { el.textContent = ""; el.parentNode.style.opacity = "0.4"; });
  uniqueWords.forEach((w) => (knownCache.has(w) ? markKnown(w) : wordCache.has(w) && setText(w, wordCache.get(w))));
  if (sentCache.has(sentence)) {
    transLine.textContent = sentCache.get(sentence);
    transLine.dataset.ok = "1";
  }
  const markFailed = (list) => list.forEach((w) => setText(w, ""));
  // Hata/durum mesajını cümle çevirisi satırında göster (cümle çevirisi gelene kadar)
  const status = (msg) => { if (!transLine.dataset.ok) transLine.textContent = msg; };
  const giveUpSentence = () => {
    if (transLine.textContent === "…") transLine.textContent = "";
  };

  let fullSent = false;
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
        const err = chrome.runtime.lastError;
        // Cevap geç kalsa bile (ekranda artık başka cümle var) çeviriler önbelleğe alınır:
        // arka arkaya gelen cümlelerde aynı kelime bir daha sunucuyu beklemez.
        if (!err && res && res.status === "success") {
          for (const w of res.known || []) knownCache.add(w);
          for (const [w, eng] of Object.entries(res.results || {})) if (!knownCache.has(w)) wordCache.set(w, eng);
          saveWordCache();
          if (res.sentence_en) { sentCache.set(sentence, res.sentence_en); if (sentCache.size > 200) sentCache.delete(sentCache.keys().next().value); }
        }
        if (myId !== sentenceId) return;
        if (res && res.status === "disabled") return; // kapatıldı
        if (lookupOnly && fullSent && (err || res?.status !== "success")) return; // gerçek çeviri isteği zaten yolda, o yeniden dener
        console.log("CineVocab cevap:", lookupOnly ? "hızlı" : "tam", res);

        if (err || res?.status !== "success") {
          const why = err?.message || res?.message || "cevap yok";
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
          if (fullSent) return; // eksikler için gerçek çeviri aynı anda istendi
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

  // Hız: eskiden önce "hızlı arama" yapılır, cevabı gelince eksikler için ikinci istek gönderilirdi (iki gidiş-dönüş).
  // Artık bu cihazın önbelleğinde olmayan kelime varsa gerçek çeviri isteği aynı anda yola çıkar.
  const need = uniqueWords.filter((w) => !knownCache.has(w) && !wordCache.has(w));
  fullSent = need.length > 0;
  request(uniqueWords, 0, true);
  if (fullSent) request(need, 0, false);
}

// ---------- Saf Altyazı Yakalama ----------
let lastSubtitle = "";
let seenAt = 0; // son altyazı okunma zamanı (açılır pencere "altyazı kapalı" uyarısı için)
let ytCandidate = "", ytSince = 0;
// Hız: bilinen oynatıcılarda 40 ms'de bir yoklanır (eskiden 100); kayan (otomatik) YouTube altyazısında 150 ms kararlılık beklenir (eskiden 220),
// kaymayan altyazıda hiç beklenmez. Bilinmeyen sitelerde tarama pahalı olduğundan 100 ms kalır.
const YT_STABLE_MS = 150, POLL_MS = (IS_YT || IS_PRIME || IS_NETFLIX || IS_UDEMY) ? 40 : 100;

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

let lastNoticeAt = 0, noticeUntil = 0, lastReport = { lang: "", ok: true, ts: 0 }, lastBadLang = "";

function report(g) {
  const lang = g.v === "match" ? SRC : g.lang;
  if (!lang) return;
  const now = Date.now();
  if (lang === lastReport.lang && g.ok === lastReport.ok && now - lastReport.ts < 5000) return;
  lastReport = { lang, ok: g.ok, ts: now };
  try { chrome.storage.local.set({ det: { lang, ok: g.ok, ts: now } }); } catch (e) {}
}

// Yanlış dilde altyazı: çeviri yok. Bilgi kutusu tek tıkla düzeltme düğmesiyle 12 sn gösterilir,
// sonra bir dakika sessiz kalır. (Eskiden bir sonraki altyazı satırı gelince hemen kayboluyordu.)
const SUB_LANGS = ["tr", "en", "fr", "it", "de", "es", "pt", "ru", "ar", "ro", "ja", "hi", "id", "pl", "nl", "ko"];
const NOTICE_MS = 12000;
function showMismatch(lang) {
  sentenceId++;
  if (lang) lastBadLang = lang;
  const now = Date.now();
  if (now < noticeUntil) return; // bilgi kutusu ekranda
  if (now - lastNoticeAt < 60000) { showBox(false); return; }
  lastNoticeAt = now; noticeUntil = now + NOTICE_MS;
  ovContent.textContent = "";
  const msg = document.createElement("div"); msg.className = "msg";
  msg.textContent = CVL.t("mismatch", CVL.langName(lastBadLang || "?"), CVL.langName(SRC));
  ovContent.appendChild(msg);
  const src = lastBadLang;
  if (SUB_LANGS.includes(src) && src !== SRC) {
    // Altyazı zaten çeviri dilindeyse iki dil yer değiştirir; değilse yalnızca altyazı dili değişir
    const dst = DST === src ? SRC : DST;
    const b = document.createElement("button"); b.className = "fix";
    b.textContent = CVL.t("switchTo", CVL.langName(src) + " → " + CVL.langName(dst));
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => {
      e.stopPropagation(); e.preventDefault();
      noticeUntil = 0; showBox(false);
      try { chrome.storage.local.set({ src, dst, det: null }); } catch (x) {}
    });
    ovContent.appendChild(b);
  }
  showBox(true);
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { noticeUntil = 0; showBox(false); }, NOTICE_MS);
}

// ---------- Yol gösteren kutular: kullanıcı açılır pencereyi hiç açmadan başlayabilsin ----------
// 1) Eklenti kapalıyken sayfada altyazı varsa: videonun üstünde "Çeviriyi başlat" düğmesi (sayfa başına bir kez).
//    Altyazı yalnızca sayfada okunur; düğmeye basılana kadar sunucuya hiçbir şey gitmez.
// 2) Eklenti açık, video oynuyor ama altyazı yoksa: "altyazıyı (CC) aç" bilgisi (video başına bir kez).
let ASK = false, askShown = false, askTick = 0, ccPlayed = 0, ccFor = "";
function guide(text, btnText, onBtn, closeText, onClose, ms) {
  sentenceId++;
  ovContent.textContent = "";
  const msg = document.createElement("div"); msg.className = "msg"; msg.textContent = text; ovContent.appendChild(msg);
  const mk = (label, cls, fn) => {
    const b = document.createElement("button"); b.className = cls; b.textContent = label;
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); noticeUntil = 0; showBox(false); fn(); });
    ovContent.appendChild(b);
  };
  if (btnText) mk(btnText, "fix", onBtn);
  if (closeText) mk(closeText, "fix later", onClose);
  noticeUntil = Date.now() + ms;
  showBox(true);
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { noticeUntil = 0; showBox(false); }, ms);
}
function askStart() {
  askShown = true; ASK = false;
  // Soru en çok BİR kez gösterilir: gösterildiği anda "bir daha sorma" yazılır (kullanıcı hiçbir şeye basmasa da).
  // Düğmeye basarsa aşağıda enabled: true yazılır ve eklenti açılır.
  try { chrome.storage.local.set({ startAsk: "no" }); } catch (e) {}
  guide(CVL.t("askStart"), CVL.t("startNow"), () => { try { chrome.storage.local.set({ enabled: true, startAsk: null }); } catch (e) {} },
    CVL.t("notNow"), () => { ASK = false; try { chrome.storage.local.set({ startAsk: "no" }); } catch (e) {} }, 25000);
}
function playingVideo() {
  const root = IS_YT ? ytMainPlayer() : document;
  if (!root) return null;
  for (const v of root.querySelectorAll("video")) if (!v.paused && !v.ended && v.readyState > 2 && v.offsetWidth >= 300) return v;
  return null;
}
function ccGuide() {
  // Altyazı az önce göründüyse (konuşma arası) ya da YouTube'da CC zaten açıksa uyarma
  if (Date.now() < noticeUntil || Date.now() - seenAt < 60000 || !playingVideo()) return;
  const ytRoot = IS_YT ? ytMainPlayer() : null;
  if (ytRoot && ytRoot.querySelector(".ytp-subtitles-button[aria-pressed='true']")) return;
  ccPlayed += POLL_MS;
  if (ccPlayed < 3000 || ccFor === location.href) return; // 3 sn: kullanıcı boş ekranda uzun beklemesin (e2e ölçümünde 8 sn sürtünmeydi)
  ccFor = location.href;
  const yt = ytRoot ? ytRoot.querySelector(".ytp-subtitles-button[aria-pressed='false']") : null;
  if (!yt) { guide(CVL.t("ccOff"), "", null, "", null, 14000); return; }
  guide(CVL.t("ccOff"), CVL.t("ccOn"), () => {
    const at = Date.now();
    try { yt.click(); } catch (e) {}
    setTimeout(() => { if (ENABLED && seenAt < at && playingVideo()) guide(CVL.t("noCc"), "", null, "", null, 12000); }, 9000);
  }, "", null, 20000);
}

setInterval(() => {
  if (!ENABLED) {
    // Kapalıyken saniyede bir bak: altyazı görünüyorsa başlatma düğmesini göster
    if (ASK && !askShown && Date.now() - askTick > 1000) { askTick = Date.now(); if (playingVideo() && readSubtitle().replace(/\s+/g, " ").trim().length > 2) askStart(); }
    return;
  }
  const text = readSubtitle().replace(/\s+/g, " ").trim();

  if (text) { seenAt = Date.now(); ccPlayed = 0; }
  if (!text) {
    lastSubtitle = ""; // altyazı kayboldu; aynı cümle tekrar gelirse yeniden işle
    ccGuide();
    return;
  }
  if (IS_YT) {
    // Otomatik altyazılar kayarak değişir: metin kısa bir süre (YT_STABLE_MS) değişmeyince işle.
    // Eskiden "iki yoklama aynı" şartı vardı (500 ms aralıkla 0,5-1 sn gecikme); artık yoklama sıklığı 150 ms
    // ve bekleme süresi zamana bağlı, böylece ~0,3 sn'de başlar.
    const now = Date.now();
    if (document.querySelector(".ytp-caption-window-rollup")) { // kayan altyazı: kısa süre değişmeyince işle
      if (text !== ytCandidate) { ytCandidate = text; ytSince = now; return; }
      if (now - ytSince < YT_STABLE_MS) return;
    } else ytCandidate = text; // kaymayan (yüklenmiş) altyazı satırı bütün gelir: beklemeye gerek yok
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
  noticeUntil = 0; ccPlayed = 0;
  if (ENABLED) { showBox(false); return; }
  sentenceId++;
  showBox(false);
  lastSubtitle = ""; ytCandidate = ""; guard.reset();
}
function applyEnabledAll() { applyEnabled(); applyHide(); }
function applyPair() {
  paintHead();
  wordCache.clear(); sentCache.clear(); knownCache.clear(); loadStars(); loadWordCache();
  lastSubtitle = ""; ytCandidate = ""; guard.reset(); lastNoticeAt = 0; noticeUntil = 0;
}
try {
  chrome.storage.local.get(["enabled", "src", "dst", "hideOrig", "startAsk"], (r) => {
    if (!r) return;
    // Soru yalnızca HİÇ seçim yapmamış kullanıcıya: enabled hiç yazılmadıysa (kurulumdan beri açıp kapatmadı) ve daha önce sorulmadıysa.
    // Eklentiyi kapatmış (enabled: false) ya da "şimdi değil" demiş kullanıcıya hiç sorulmaz.
    ASK = r.startAsk !== "no" && r.enabled === undefined;
    SRC = r.src || "tr"; DST = r.dst || "en"; ENABLED = !!r.enabled; HIDE_ORIG = r.hideOrig !== false; applyEnabledAll(); loadStars(); paintHead(); loadWordCache();
  });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local") return;
    if (ch.src || ch.dst) { if (ch.src) SRC = ch.src.newValue || "tr"; if (ch.dst) DST = ch.dst.newValue || "en"; applyPair(); }
    if (ch.enabled) { ENABLED = !!ch.enabled.newValue; applyEnabledAll(); }
    if ((ch.startAsk && ch.startAsk.newValue === "no") || (ch.enabled && ch.enabled.newValue !== undefined)) ASK = false; // sonradan seçim yapıldı: bir daha sorma
    if (ch.hideOrig) { HIDE_ORIG = ch.hideOrig.newValue !== false; applyHide(); }
    if (ch.stars) { starSet = new Set((ch.stars.newValue || {})[SRC + ">" + DST] || []); paintStars(); }
    if (ch.bank) { keptN = BANK.list(ch.bank.newValue, SRC + ">" + DST).length; paintHead(); }
    if (ch.box && !boxBusy) { BOX = normBox(ch.box.newValue || BOX_DEF); placeBox(); }
  });
} catch (e) {}