const SERVER = "https://cinevocab.up.railway.app";
const STORE_URL = "https://chromewebstore.google.com/detail/glhogfbfbjifiihgffjpjgijkjplebkl?utm_source=share";
const LANGS = ["tr", "en", "fr", "it", "de", "es", "pt", "ru", "ar", "ro", "ja", "hi", "id", "pl", "nl", "ko"];
const PATHS = { panel: "/account", words: "/account#words", practice: "/account#practice", duel: "/account#duel", daily: "/daily" };
const $ = (id) => document.getElementById(id);
const BANK = typeof CVBank !== "undefined" ? CVBank : { list: () => [], add: (b) => b, remove: (b) => b, clock: () => "" };
const SRS = typeof CVSrs !== "undefined" ? CVSrs : null; // cihazdaki tekrar (srs.js); yoksa Pratik sekmesi eski giriş kartına döner
const T = CVL.t;
document.documentElement.lang = CVL.ui();
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function icon(d) { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", d); s.append(p); return s; }
const IC = { check: "M5 12.5l4.5 4.5L19 7.500", eye: "M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", duel: "M6 3l12 12M14 19l5-5M18 3L6 15M5 14l5 5M3 21l3-3M21 21l-3-3", day: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM9 14l2 2 4-4" };

let st = { enabled: false, src: "tr", dst: "en", key: "" };
let home = null, tab = "watch", cfg = { google: "", mail: false }, authMode = "login", noAuto = false;

// ---------- sunucu ----------
async function api(path, opt = {}) {
  const h = {};
  if (opt.body) h["Content-Type"] = "application/json";
  if (opt.auth !== false && st.key) h.Authorization = "Bearer " + st.key;
  let r;
  try { r = await fetch(SERVER + path, { method: opt.body || opt.post ? "POST" : "GET", headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined, credentials: opt.cookie ? "include" : "omit" }); }
  catch (e) { throw { status: 0 }; }
  let d = null; try { d = await r.json(); } catch (e) {}
  if (!r.ok) throw { status: r.status, detail: d && d.detail };
  return d;
}
function errText(e) {
  const s = e && e.status;
  if (s === 401) return T("errAuth");
  if (s === 409) return /e-posta/i.test(String(e.detail || "")) ? T("errEmailTaken") : T("errTaken");
  if (s === 422) return T("errCode");
  if (s === 502) return T("errMail");
  if (s === 400) return T("errInput");
  if (s === 429) return T("errMany");
  if (s === 403 && e.detail) return String(e.detail);
  return T("errNet");
}
let toastTimer = null;
function toast(text, action, fn) {
  $("toastT").textContent = text; const b = $("toastB");
  b.hidden = !action; b.textContent = action || ""; b.onclick = () => { $("toast").hidden = true; fn && fn(); };
  $("toast").hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => ($("toast").hidden = true), action ? 5000 : 2200);
}
async function openSite(to) {
  let url = SERVER + (PATHS[to] || "/account");
  if (st.key) { try { const r = await api("/api/ext/ticket", { post: true }); url = SERVER + "/ext/go?to=" + encodeURIComponent(to) + "&t=" + encodeURIComponent(r.ticket); } catch (e) {} }
  chrome.tabs.create({ url });
}

// ---------- İzle sekmesi ----------
function fill(sel) { sel.replaceChildren(...LANGS.map((l) => { const o = el("option", "", CVL.langName(l).replace(/^./, (c) => c.toLocaleUpperCase())); o.value = l; return o; })); }
fill($("src")); fill($("dst"));
$("lSrc").textContent = T("subLang"); $("lDst").textContent = T("transLang");
$("boxHint").textContent = T("boxHint"); $("lHide").textContent = T("hideOrig"); $("lReset").textContent = T("boxResetL"); $("boxReset").textContent = T("boxReset");
$("swap").title = T("swap"); $("swap").setAttribute("aria-label", T("swap"));
$("signin").textContent = T("signIn");
document.querySelectorAll("#tabs button").forEach((b) => { b.lastElementChild.textContent = T("tab_" + b.dataset.tab); b.onclick = () => setTab(b.dataset.tab); });

function paint() {
  $("sw").setAttribute("aria-checked", String(!!st.enabled));
  $("state").textContent = st.enabled ? T("status_on") : T("stOff");
  $("hint").textContent = st.enabled ? T("tapOff") : T("offHint");
  $("stateCard").dataset.on = String(!!st.enabled);
  steps();
  $("src").value = st.src; $("dst").value = st.dst;
}
// Nasıl başlarım: üç adımın hangisi tamam, canlı gösterilir. Hepsi tamamsa tek satır "hazır" yazar.
let tabOk = false, subOk = false, detTs = 0;
function steps() {
  const s = [!!st.enabled, tabOk, st.enabled && (subOk || Date.now() - detTs < 15000)];
  const txt = [st.enabled ? T("st1on") : T("st1off"), T("st2"), T("st3")];
  $("howT").textContent = T("howT");
  ["st1", "st2", "st3"].forEach((id, i) => { $(id).className = s[i] ? "done" : ""; $(id).lastElementChild.textContent = txt[i]; });
  const all = s.every(Boolean);
  $("steps").hidden = all; $("howT").hidden = all; $("howOk").hidden = !all; $("howOk").textContent = T("stReady");
}
function showDet(d) {
  detTs = (d && d.ts) || 0; steps();
  const n = $("det"); n.className = "note"; n.textContent = "";
  if (!st.enabled || !d || Date.now() - d.ts > 60000 || !d.lang) return;
  if (d.ok === false) {
    n.className = "note bad"; n.textContent = T("mismatchPopup", CVL.langName(d.lang), CVL.langName(st.src));
    if (LANGS.includes(d.lang)) {
      const b = el("button", "btn sm", T("switchTo", CVL.langName(d.lang)));
      b.onclick = () => { const was = st.src; st.src = d.lang; if (st.dst === st.src) st.dst = was !== st.src ? was : LANGS.find((l) => l !== st.src); paint(); chrome.storage.local.set({ src: st.src, dst: st.dst, det: null }); n.textContent = ""; n.className = "note"; pairChanged(); };
      n.append(el("br"), b);
    }
  } else { n.className = "note ok"; n.textContent = T("detected", CVL.langName(d.lang)); }
}
// Etkin sekmede CineVocab çalışıyor mu, son 10 sn içinde altyazı okudu mu: adım listesi buna göre işaretlenir
function checkSubs() {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs && tabs[0]; if (!t || t.id == null) return;
      chrome.tabs.sendMessage(t.id, { cv: "ping" }, (r) => {
        void chrome.runtime.lastError;
        tabOk = !!(r && r.ok); subOk = !!(r && r.seenAt && Date.now() - r.seenAt < 10000);
        steps();
      });
    });
  } catch (e) {}
}
setTimeout(checkSubs, 600); setInterval(checkSubs, 3000);

$("sw").onclick = () => { st.enabled = !st.enabled; chrome.storage.local.set({ enabled: st.enabled, startAsk: st.enabled ? null : "no" }); paint(); if (!st.enabled) showDet(null); };
function pair(changed) {
  let src = $("src").value, dst = $("dst").value;
  if (src === dst) { if (changed === "src") dst = LANGS.find((l) => l !== src); else src = LANGS.find((l) => l !== dst); }
  st.src = src; st.dst = dst; paint(); chrome.storage.local.set({ src, dst }); pairChanged();
}
$("src").onchange = () => pair("src"); $("dst").onchange = () => pair("dst");
$("swap").onclick = () => { const a = st.src; st.src = st.dst; st.dst = a; paint(); chrome.storage.local.set({ src: st.src, dst: st.dst }); pairChanged(); };
function pairChanged() { home = null; quiz = null; if (st.key) loadHome(); }

chrome.storage.local.get("hideOrig", (r) => $("hide").setAttribute("aria-checked", String(r.hideOrig !== false)));
$("hide").onclick = () => { const on = $("hide").getAttribute("aria-checked") !== "true"; $("hide").setAttribute("aria-checked", String(on)); chrome.storage.local.set({ hideOrig: on }); };
$("boxReset").onclick = () => { chrome.storage.local.set({ box: null }); toast(T("boxResetDone")); };

// Web sayfası olmayan sekmede (yeni sekme, ayarlar) nereden başlanacağını söyle
(function checkSite() {
  const note = $("site");
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs && tabs[0];
      if (!t || t.id == null || /^https?:\/\//.test(t.url || "")) return;
      note.hidden = false; note.textContent = T("siteNote");
    });
  } catch (e) {}
})();

// Diğer sitelerde aç: izin kullanıcı hareketiyle istenir, sonra arka plan betiği kaydeder.
// Video oynatıcı çoğu zaman başka alan adlı bir iframe'de olduğu için, popup açılırken (activeTab ile) sayfadaki
// büyük iframe'lerin adresleri okunur ve izin tek seferde hem sayfa hem oynatıcı için istenir.
(function otherSites() {
  const card = $("siteCard"), btn = $("siteEnable"), note = $("siteEnableNote");
  btn.textContent = T("siteEnable"); note.textContent = T("siteEnableNote");
  const pat = (h) => ["https://" + h + "/*", "https://*." + h + "/*", "http://" + h + "/*", "http://*." + h + "/*"];
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs && tabs[0];
      if (!t || t.id == null || !/^https?:\/\//.test(t.url || "")) return;
      const host = new URL(t.url).hostname;
      if (host === new URL(SERVER).hostname) return; // kendi sitemizde video yok
      const hosts = new Set([host]);
      const build = () => [...hosts].slice(0, 6).flatMap(pat);
      const done = () => { note.className = "note ok"; note.textContent = T("siteOn"); btn.hidden = true; $("site").hidden = true; };
      try {
        chrome.scripting.executeScript({
          target: { tabId: t.id },
          func: () => [...document.querySelectorAll("iframe")].filter((f) => f.src && f.offsetWidth >= 300 && f.offsetHeight >= 150).map((f) => f.src),
        }, (res) => {
          void chrome.runtime.lastError;
          for (const src of (res && res[0] && res[0].result) || []) { try { const u = new URL(src); if (/^https?:$/.test(u.protocol)) hosts.add(u.hostname); } catch (e) {} }
        });
      } catch (e) {}
      try {
        chrome.tabs.sendMessage(t.id, { cv: "ping" }, (r) => {
          void chrome.runtime.lastError;
          card.hidden = !!(r && r.ok);
          // izin daha önce verilmiş ama betik yüklenmemişse (pencere kapanmış olabilir) şimdi yükle
          if (!(r && r.ok)) chrome.permissions.contains({ origins: pat(host) }, (has) => {
            void chrome.runtime.lastError;
            if (has) chrome.runtime.sendMessage({ action: "enableSite", origins: pat(host), tabId: t.id }, () => { void chrome.runtime.lastError; done(); });
          });
        });
      } catch (e) { card.hidden = false; }
      btn.onclick = () => {
        const origins = build();
        chrome.permissions.request({ origins }, (ok) => {
          if (!ok) { note.className = "note bad"; note.textContent = T("siteDenied"); return; }
          chrome.runtime.sendMessage({ action: "enableSite", origins, tabId: t.id }, () => { void chrome.runtime.lastError; done(); });
        });
      };
    });
  } catch (e) {}
})();

// ---------- YouTube videosundan kelime çıkar ----------
// Altyazıyı sayfadaki içerik betiği (yt-import.js) okur; burada sunucudan "bu kelimelerden hangileri yeni?" diye
// sorulur, seçilenlerin eklenmesi arka plana verilir (pencere kapansa bile sürer).
(function ytImport() {
  const card = $("ytCard"), go = $("ytGo"), msg = $("ytMsg"), sel = $("ytN");
  $("ytT").textContent = T("ytT"); $("ytS").textContent = T("ytS"); $("lYtN").textContent = T("ytN"); go.textContent = T("ytGo");
  const say = (cls, text) => { msg.className = "note " + cls; msg.textContent = text; };
  let tabId = null;
  const vis = () => { card.hidden = tabId == null || !st.key; }; // hesap gerektiren özellik: hesapsızken gösterme
  window.cvYtVis = vis;
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs && tabs[0];
      if (t && t.id != null && /^https:\/\/www\.youtube\.com\/(watch|shorts)/.test(t.url || "")) { tabId = t.id; vis(); }
    });
  } catch (e) {}

  function show(imp) {
    if (!imp || !imp.total) return;
    const fresh = Date.now() - (imp.ts || 0) < (imp.state === "run" ? 120000 : 60000);
    if (!fresh) return;
    if (imp.state === "run") { go.disabled = true; say("", T("ytAdding", imp.done, imp.total)); }
    else if (imp.state === "done") { go.disabled = false; say("ok", T("ytDone", imp.added, imp.familiar || 0)); home = null; if (st.key) loadHome(); }
    else if (imp.state === "error") { go.disabled = false; say("bad", T("ytFail")); }
  }
  chrome.storage.local.get("imp", (r) => show(r && r.imp));
  chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && ch.imp) show(ch.imp.newValue); });

  go.onclick = async () => {
    if (go.disabled) return;
    if (!st.key) return say("bad", T("ytLogin"));
    if (tabId == null) return;
    go.disabled = true; say("", T("ytRead"));
    const tr = await new Promise((res) => chrome.tabs.sendMessage(tabId, { cv: "getTranscript", src: st.src }, (r) => { void chrome.runtime.lastError; res(r); }));
    if (!tr) { go.disabled = false; return say("bad", T("ytReload")); }
    if (!tr.ok) { go.disabled = false; return say("bad", T("ytErr_" + (tr.err || "fail"), CVL.langName(st.src))); }
    let plan;
    try { plan = await api("/api/import/plan", { body: { src: st.src, dst: st.dst, words: tr.words, n: +sel.value } }); }
    catch (e) { go.disabled = false; return say("bad", errText(e)); }
    if (!plan.pick || !plan.pick.length) { go.disabled = false; return say("ok", T("ytNone", plan.total)); }
    chrome.runtime.sendMessage({ action: "importWords", words: plan.pick, episode: tr.title, thumb: tr.thumb, src: st.src, dst: st.dst, familiar: plan.known + plan.saved }, (r) => {
      void chrome.runtime.lastError;
      if (!r || !r.ok) { go.disabled = false; say("bad", T("ytFail")); }
    });
  };
})();

// ---------- sekmeler ----------
function setTab(name) {
  tab = name; $("auth").hidden = true;
  for (const k of ["watch", "words", "practice", "me"]) $("v-" + k).hidden = k !== name;
  document.querySelectorAll("#tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  render();
}
function render() {
  const inn = !!st.key;
  if (window.cvYtVis) window.cvYtVis();
  $("signin").hidden = inn; $("avatar").hidden = !inn; $("streak").hidden = !(inn && home);
  if (inn) { const a = $("avatar"); a.replaceChildren(); if (home && home.avatar) { const i = el("img"); i.src = home.avatar; i.alt = ""; a.append(i); } else a.textContent = ((home && home.username) || "?").slice(0, 1).toLocaleUpperCase(); a.title = (home && home.username) || ""; }
  if (home) $("streakN").textContent = home.streak;
  if (!inn) { $("streak").hidden = !(localStreak > 0); $("streakN").textContent = localStreak; } // hesapsız: cihazdaki tekrar serisi
  if (tab === "words") renderWords(); else if (tab === "practice") renderPractice(); else if (tab === "me") renderMe();
}
$("signin").onclick = () => showAuth(); $("avatar").onclick = () => setTab("me");

function guestCard(view, title) {
  const c = el("div", "go"); c.append(el("h2", "", title), el("p", "", T("authSub")));
  const b = el("button", "btn p", T("signIn")); b.onclick = () => showAuth(); c.append(b);
  view.replaceChildren(c);
}
function loading(view) { view.replaceChildren(el("p", "empty", "…")); }

// ---------- Kelimeler ----------
// Hesapsız kullanıcı: videoda tıkladığı kelimeler cihazdaki defterden (chrome.storage.local "bank") gelir.
// Sunucuya hiçbir şey gitmez. Hesap açınca sunucudaki liste gösterilir (aşağıda).
function dropKept(pair, it) {
  chrome.storage.local.get(["bank", "stars"], (q) => {
    const stars = (q && q.stars) || {};
    stars[pair] = (stars[pair] || []).filter((x) => x !== it.w); // videodaki kutuda da işaret kalksın
    chrome.storage.local.set({ bank: BANK.remove(q && q.bank, pair, it.w), stars });
    toast(T("bankRemoved"), T("undo"), () => chrome.storage.local.get(["bank", "stars"], (z) => {
      const s2 = (z && z.stars) || {}; s2[pair] = [...new Set([...(s2[pair] || []), it.w])];
      chrome.storage.local.set({ bank: BANK.add(z && z.bank, pair, it, it.ts), stars: s2 });
    }));
  });
}
function renderBank(v) {
  chrome.storage.local.get("bank", (r) => {
    if (tab !== "words" || st.key) return; // bu arada sekme değişti ya da giriş yapıldı
    const pair = st.src + ">" + st.dst, items = BANK.list(r && r.bank, pair);
    const head = el("div", "sec");
    head.append(el("b", "", T("bankHead")), el("span", "", String(items.length)));
    const kids = [head];
    if (items.length) {
      const list = el("ul", "wl");
      for (const it of items) {
        const li = el("li"), w = el("div", "w"), k = el("button", "k");
        w.append(el("b", "", it.w), el("span", "", it.t || "—"));
        if (it.ep) li.title = it.ep; // hangi videodan
        k.title = T("bankDel"); k.setAttribute("aria-label", T("bankDel")); k.append(icon("M6 6l12 12M18 6L6 18"));
        k.onclick = () => dropKept(pair, it);
        li.append(el("span", "tc", BANK.clock(it.vt)), w, k);
        list.append(li);
      }
      kids.push(list);
    } else kids.push(el("p", "empty", T("bankEmpty")));
    if (items.length >= 3) { // hesap teklifi yalnızca birkaç kelime biriktikten sonra, sakin bir kartla
      const card = el("div", "card"), btn = el("button", "btn", T("bankBack"));
      btn.style.marginTop = "10px"; btn.onclick = () => showAuth();
      card.append(el("p", "note", T("bankSub")), btn);
      kids.push(card);
    }
    v.replaceChildren(...kids);
  });
}
let wq = "", wMode = "recent";
function renderWords() {
  const v = $("v-words");
  if (!st.key) return renderBank(v);
  if (!home) return loading(v);
  const stats = el("div", "stats");
  for (const [k, n, hot] of [["due", home.due, true], ["newW", home.new], ["mastered", home.mastered]]) { const s = el("div", "stat" + (hot && n ? " hot" : "")); s.append(el("b", "", n), el("span", "", T(k))); stats.append(s); }
  const stars = home.starred || [], seg = el("div", "seg");
  for (const [m, label] of [["recent", T("recentTab")], ["star", "★ " + T("starTab") + (stars.length ? " · " + stars.length : "")]]) { const b = el("button", "", label); b.setAttribute("aria-pressed", String(wMode === m)); b.onclick = () => { wMode = m; renderWords(); }; seg.append(b); }
  const list = el("ul", "wl"), search = el("input"); search.type = "search"; search.placeholder = T("search"); search.value = wq; search.style.marginTop = "10px";
  const src = () => (wMode === "star" ? stars : home.recent);
  const draw = () => {
    const f = wq.trim().toLocaleLowerCase();
    const rows = src().filter((r) => !f || r.w.toLocaleLowerCase().includes(f) || String(r.t).toLocaleLowerCase().includes(f));
    list.replaceChildren(...rows.map((r) => {
      const li = el("li"), w = el("div", "w"), k = el("button", "k"); w.append(el("b", "", r.w), el("span", "", r.t));
      if (wMode === "star") {
        k.textContent = "★"; k.classList.add("on"); k.title = T("unstar"); k.setAttribute("aria-label", T("unstar"));
        k.onclick = async () => {
          const i = stars.indexOf(r); if (i < 0) return;
          stars.splice(i, 1); renderWords();
          try {
            await api("/api/star", { body: { src: st.src, dst: st.dst, word: r.w, on: false } });
            await new Promise((res) => chrome.storage.local.get("bank", (q) => chrome.storage.local.set({ bank: BANK.remove(q && q.bank, st.src + ">" + st.dst, r.w) }, res)));
            syncStars();
          } catch (e) { stars.splice(i, 0, r); renderWords(); toast(errText(e)); }
        };
      } else {
        k.title = T("known"); k.setAttribute("aria-label", T("known")); k.append(icon(IC.check));
        k.onclick = async () => {
          const i = home.recent.indexOf(r); if (i < 0) return;
          home.recent.splice(i, 1); draw();
          try { await api("/api/known", { body: { src: st.src, words: [r.w], known: true } }); } catch (e) { home.recent.splice(i, 0, r); draw(); return toast(errText(e)); }
          toast(T("knownDone"), T("undo"), async () => { try { await api("/api/known", { body: { src: st.src, words: [r.w], known: false } }); home.recent.splice(Math.min(i, home.recent.length), 0, r); draw(); } catch (e) { toast(errText(e)); } });
        };
      }
      li.append(w, k); return li;
    }));
    if (!rows.length) list.append(el("p", "empty", src().length ? "—" : T(wMode === "star" ? "noStars" : "noWords")));
  };
  search.oninput = () => { wq = search.value; draw(); };
  const all = el("button", "btn", T("allWords", home.pair_words)); all.style.marginTop = "12px"; all.onclick = () => openSite("words");
  v.replaceChildren(stats, seg, search, list, all); if (!src().length) search.hidden = true; if (!home.recent.length || wMode === "star") all.hidden = true;
  draw();
}
// Video üstündeki kutu yıldızları cihazdaki listeden boyar: hesaptaki listeyle eşitle
function syncStars() {
  if (!home || !home.starred) return;
  chrome.storage.local.get(["stars", "bank"], (r) => {
    const pair = st.src + ">" + st.dst, all = (r && r.stars) || {};
    // hesaptaki liste + cihazda tutulanlar: taşınmamış ya da yıldız olarak yazılmamış kelimelerin kutudaki işareti kaybolmasın
    all[pair] = [...new Set([...home.starred.map((x) => x.w), ...BANK.list(r && r.bank, pair).map((x) => x.w)])];
    chrome.storage.local.set({ stars: all });
  });
}

// ---------- Hesapsız tekrar: cihazdaki kelimelerle ----------
// Kelimeler kutuda tutulunca cihazdaki deftere (bank.js) girer; burada aralıklı tekrarla (srs.js) geri gelir. Sunucuya hiçbir şey gitmez.
// Ödüller yalnızca doğru bilmeye bağlı: üst üste doğru, "öğrenildi" anı (3. kutu), kusursuz tur, gün serisi.
let lq = null, localStreak = 0;
const NEED = 4; // 4 şıklı soru için en az 4 çevirisi olan kelime
function loadLocal() { try { chrome.storage.local.get("reviewDays", (r) => { localStreak = SRS ? SRS.streak(r && r.reviewDays, SRS.dayOf()) : 0; render(); }); } catch (e) {} }
const whenText = (d) => (d <= 0 ? T("lpNow") : d === 1 ? T("lpTomorrow") : T("lpInDays", d));

function renderLocalPractice(v) {
  if (lq) return lq.done ? localResult(v) : localQuestion(v);
  chrome.storage.local.get(["bank", "reviewDays"], (r) => {
    if (tab !== "practice" || st.key || lq) return;
    const pair = st.src + ">" + st.dst, items = BANK.list(r && r.bank, pair), day = SRS.dayOf(), s = SRS.stats(items, day);
    const c = el("div", "go");
    if (s.usable < NEED) {
      const bar = el("div", "bar"), fi = el("i"); fi.style.width = Math.round((s.usable / NEED) * 100) + "%"; bar.append(fi); bar.style.margin = "12px 0";
      c.append(el("h2", "", T("pTitle")), el("p", "", T("lpNeed")), bar, el("p", "lp-line", T("lpOf", s.usable, NEED)));
      return v.replaceChildren(c);
    }
    const streak = SRS.streak(r && r.reviewDays, day), b = el("button", "btn p", s.ready > 0 ? T("lpStart") : T("lpAnyway"));
    b.onclick = () => startLocal(items, pair, day);
    const learning = s.usable - s.learned - s.fresh, stack = el("div", "stack"); // yeni / öğreniliyor / öğrenildi: gerçek kutu sayılarından
    stack.setAttribute("role", "img"); stack.setAttribute("aria-label", T("lpStack", s.learned, learning, s.fresh));
    for (const [k, n] of [["l", s.learned], ["m", learning], ["n", s.fresh]]) if (n > 0) { const i = el("i", k); i.style.flex = String(n); stack.append(i); }
    c.append(el("div", "lp-lab", T("lpReady")), el("div", "lp-num", String(s.ready)), stack,
      el("p", "lp-line", T("lpLine", s.learned, s.kept) + (streak > 0 ? " · " + T("lpStreak", streak) : "")));
    const nextUp = SRS.pickSession(items, day, 4).picks.filter((x) => x.counts).map((x) => x.it.w);
    if (nextUp.length) { // sıradaki kelimeler: yalnızca kelimenin kendisi, anlamı soruda
      const row = el("div", "upnext"); row.append(el("span", "lp-lab", T("lpUpNext")));
      for (const w of nextUp) row.append(el("span", "lw lw-sm", w));
      c.append(row);
    }
    if (!s.ready) c.append(el("p", "lp-line", T("lpNothing")));
    c.append(b);
    v.replaceChildren(c);
  });
}

function startLocal(items, pair, day) {
  const sel = SRS.pickSession(items, day, 8), usable = items.filter(SRS.usable), pool = [...new Set(usable.map((x) => x.t))], words = [...new Set(usable.map((x) => x.w))];
  const qs = sel.picks.map((p) => {
    const it = p.it, others = pool.filter((t) => t !== it.t), box = SRS.isNew(it) ? 0 : SRS.boxOf(it), adv = box >= SRS.TYPE_FROM_BOX;
    const cl = box >= 1 ? SRS.blankSentence(it.s, it.w) : null; // cümle bağlamı: yeni kelimede değil, tanıdıktan sonra (üretme sorusu)
    const q = { it, counts: p.counts, retry: false, cl };
    if (cl) { // boşluk doldurma: kelimeyi cümlede hatırla
      const oth = words.filter((w) => w !== it.w);
      if (adv || oth.length < 3) { q.kind = "clozeType"; } else { q.kind = "clozePick"; q.opts = shuffle([it.w, ...shuffle(oth.slice()).slice(0, 3)]); }
    } else if (adv || others.length < 3) q.kind = "type"; // 2. kutudan sonra yazarak (ipuçlu hatırlama)
    else { q.kind = "pick"; q.opts = shuffle([it.t, ...shuffle(others.slice()).slice(0, 3)]); }
    return q;
  });
  // tur sonunda tek bir "cümle kurma" bonusu: kutuyu etkilemez, yalnızca çeviriyle birlikte saklanan cümlelerden
  const cands = sel.picks.map((p) => p.it).filter((it) => it.s && it.st && SRS.orderTokens(it.s).length >= 4 && SRS.orderTokens(it.s).length <= 12);
  if (cands.length) qs.push({ it: cands[Math.floor(Math.random() * cands.length)], kind: "order", bonus: true, counts: false, retry: false });
  lq = { pair, day, qs, i: 0, run: 0, learned: [], fb: null, done: false, seen: new Set(), right: 0, streakBefore: 0, bonus: { right: 0, total: 0 }, ord: null };
  chrome.storage.local.get("reviewDays", (r) => { lq.streakBefore = SRS.streak(r && r.reviewDays, day); renderPractice(); });
}

function localTop(v) {
  const bar = el("div", "bar"), fi = el("i"); fi.style.width = Math.round((lq.i / lq.qs.length) * 100) + "%"; bar.append(fi);
  const top = el("div", "row"), x = el("button", "btn sm", "✕"), bw = el("div", "grow");
  x.setAttribute("aria-label", T("pQuit")); x.onclick = () => finishLocal(true); bw.append(bar); top.append(bw, x);
  return top;
}
// Cümle: kelime boşken (fill yok) ya da doldurulmuş (sarı, videodaki "tutuldu" vurgusuyla aynı) görünür
function sentenceEl(c, fill) {
  const d = el("div", "cl"), gap = el("span", fill ? "cl-gap on" : "cl-gap", fill || "");
  d.dir = "auto"; if (!fill) gap.setAttribute("aria-label", "…");
  d.append(document.createTextNode(c.before), gap, document.createTextNode(c.after));
  return d;
}
function typeBox(kids, label, v) {
  const inp = el("input"), go = el("button", "btn p", T("lpCheck")), dk = el("button", "link", T("lpDunno"));
  inp.type = "text"; inp.autocomplete = "off"; inp.spellcheck = false; inp.setAttribute("aria-label", label);
  go.style.marginTop = "10px"; go.onclick = () => submitLocal(inp.value); dk.onclick = () => submitLocal("");
  inp.onkeydown = (e) => { if (e.key === "Enter") go.click(); };
  kids.push(inp, go, dk); v.replaceChildren(...kids); inp.focus();
}
function orderQuestion(v, top, q) {
  const want = SRS.orderTokens(q.it.s);
  if (!lq.ord || lq.ord.i !== lq.i) { // karışık dizilim, doğru sırayla aynı çıkmasın
    let pool = want.map((t, k) => ({ t, k })), n = 0;
    do { shuffle(pool); } while (++n < 8 && pool.every((x, k) => x.k === k));
    lq.ord = { i: lq.i, pool, ans: [] };
  }
  const o = lq.ord, ans = el("div", "ord-ans"), pl = el("div", "ord-pool");
  ans.dir = "auto"; pl.dir = "auto";
  o.ans.forEach((x, pos) => { const b = el("button", "tk", x.t); b.onclick = () => { o.ans.splice(pos, 1); renderPractice(); }; ans.append(b); });
  o.pool.forEach((x) => { const b = el("button", "tk", x.t); if (o.ans.includes(x)) { b.disabled = true; b.className = "tk used"; } else b.onclick = () => { o.ans.push(x); renderPractice(); }; pl.append(b); });
  const go = el("button", "btn p", T("lpCheck")), clr = el("button", "link", T("lpClear"));
  go.disabled = o.ans.length !== o.pool.length; go.onclick = () => submitLocal(o.ans.map((x) => x.t));
  clr.onclick = () => { o.ans = []; renderPractice(); };
  v.replaceChildren(top, el("div", "lp-lab lp-c", T("lpBuild")), el("div", "cl-tr big-tr", q.it.st), ans, pl, go, clr);
}
function localQuestion(v) {
  const q = lq.qs[lq.i], it = q.it, top = localTop(v), k = q.kind;
  if (lq.fb) return localFeedback(v, top, q);
  if (k === "order") return orderQuestion(v, top, q);
  const dst = CVL.langName(st.dst);
  if (k === "clozePick" || k === "clozeType") {
    const kids = [top, el("div", "lp-lab lp-c", T("lpCloze")), sentenceEl(q.cl, "")];
    if (it.st) kids.push(el("div", "cl-tr", it.st));
    kids.push(el("div", "cl-tr mono", "= " + it.t));
    if (k === "clozeType") return typeBox(kids, T("lpCloze"), v);
    kids.push(...q.opts.map((o) => { const b = el("button", "ans", o); b.onclick = () => submitLocal(o); return b; }));
    return v.replaceChildren(...kids);
  }
  const kids = [top, el("div", "qw", it.w), el("div", "qh", k === "type" ? T("lpType", dst) : T("pQ", dst))];
  if (k === "type") return typeBox(kids, T("lpType", dst), v);
  kids.push(...q.opts.map((o) => { const b = el("button", "ans", o); b.onclick = () => submitLocal(o); return b; }));
  v.replaceChildren(...kids);
}
function submitLocal(value) {
  if (!lq || lq.fb || lq.done) return;
  const q = lq.qs[lq.i], it = q.it, k = q.kind;
  if (q.bonus) { // cümle kurma: kutuyu ve seriyi etkilemez, yalnızca eğlence ve ek pratik
    const ok = SRS.checkOrder(value, it.s);
    lq.bonus.total++; if (ok) lq.bonus.right++;
    lq.fb = { ok, bonus: true, run: lq.run };
    return renderPractice();
  }
  let ok, close = false;
  if (k === "type") { const c = SRS.check(value, it.t); ok = c.ok; close = c.close; }
  else if (k === "clozeType") { const c = SRS.check(value, it.w); ok = c.ok; close = c.close; }
  else ok = value === (k === "pick" ? it.t : it.w);
  let learnedNow = false;
  if (!q.retry && !lq.seen.has(it.w)) { // yalnızca ilk deneme kutuyu etkiler; aynı oturumdaki tekrar denemesi etkilemez
    lq.seen.add(it.w);
    const ns = SRS.answer(it, ok, lq.day, q.counts);
    learnedNow = !SRS.isLearned(it) && SRS.isLearned(ns);
    if (learnedNow) lq.learned.push(it.w);
    if (ok) lq.right++;
    chrome.storage.local.get(["bank", "reviewDays"], (r) => { // her cevapta yazılır: pencere kapansa da ilerleme kaybolmaz
      const days = [...new Set([...((r && r.reviewDays) || []), lq.day])].sort((a, b) => a - b).slice(-90);
      chrome.storage.local.set({ bank: BANK.update(r && r.bank, lq.pair, it.w, { box: ns.box, due: ns.due, right: ns.right, wrong: ns.wrong, last: ns.last }), reviewDays: days });
    });
  }
  lq.run = ok ? lq.run + 1 : 0;
  if (!ok && !q.retry) { // yanlış bilinen kelime turun sonunda (bonustan önce) bir kez daha sorulur
    const bi = lq.qs.findIndex((x) => x.bonus), again = { ...q, retry: true };
    if (bi < 0) lq.qs.push(again); else lq.qs.splice(bi, 0, again);
  }
  lq.fb = { ok, close, learnedNow, run: lq.run };
  renderPractice();
  if (ok && !learnedNow && !close) { const idx = lq.i; setTimeout(() => { if (lq && !lq.done && lq.i === idx && lq.fb) nextLocal(); }, k.startsWith("cloze") ? 1100 : 650); }
}
function nextLocal() {
  if (!lq || lq.done) return;
  lq.fb = null; lq.i++;
  if (lq.i >= lq.qs.length) finishLocal(false); else renderPractice();
}
function localFeedback(v, top, q) {
  const it = q.it, f = lq.fb, k = q.kind, from = [it.ep, BANK.clock(it.vt)].filter(Boolean).join(" · ");
  if (f.bonus) { // cümle kurma geri bildirimi: doğru cümle her durumda gösterilir
    const b = el("button", "btn p", T("lpContinue")); b.onclick = nextLocal;
    return v.replaceChildren(top, el("div", f.ok ? "fb-ok" : "fb-no", f.ok ? T("lpRight") : T("lpAnswer")), el("div", "cl", it.s), el("div", "cl-tr", it.st), b);
  }
  if (f.ok && f.learnedNow) { // "öğrenildi" anı: sakin ama net. Gerçek bilgi: aralıklı tekrarla yine hatırladı, sonraki tekrar ne zaman
    const c = el("div", "fb-center");
    const dots = el("div", "dots"); dots.setAttribute("aria-hidden", "true"); for (let k = 0; k < SRS.LEARNED_BOX; k++) dots.append(el("i")); // her nokta bir doğru hatırlama
    c.append(el("div", "lp-lab", T("lpLearnedTag")), el("div", "lw lw-xl", it.w), dots, el("p", "lp-line", T("lpLearnedLine", whenText(SRS.INTERVALS[SRS.LEARNED_BOX]))));
    const b = el("button", "btn p", T("lpContinue")); b.onclick = nextLocal;
    return v.replaceChildren(...[top, c, from ? el("p", "src", T("lpFrom", from)) : null, b].filter(Boolean));
  }
  const cloze = k === "clozePick" || k === "clozeType", kids = [top];
  if (cloze) { kids.push(sentenceEl(q.cl, q.cl.shown)); if (it.st) kids.push(el("div", "cl-tr", it.st)); } else kids.push(el("div", "qw", it.w));
  if (f.ok) {
    kids.push(el("div", "fb-ok", T("lpRight") + (f.run >= 3 ? " · " + T("lpRow", f.run) : "")));
    if (f.close) kids.push(el("div", "fb-is", cloze ? it.w : it.t), el("p", "src", T("lpClose", cloze ? it.w : it.t)));
  } else kids.push(el("div", "fb-is", cloze ? it.w : it.t), ...(cloze ? [el("p", "src", "= " + it.t)] : []));
  if (from && !f.ok) kids.push(el("p", "src", T("lpFrom", from)));
  if (!f.ok || f.close || f.learnedNow) { const b = el("button", "btn p", T("lpContinue")); b.onclick = nextLocal; kids.push(b); }
  v.replaceChildren(...kids);
}
function finishLocal(quit) {
  if (!lq || lq.done) return;
  if (quit && lq.seen.size === 0) { lq = null; return renderPractice(); }
  lq.done = true;
  chrome.storage.local.get(["bank", "reviewDays"], (r) => {
    const items = BANK.list(r && r.bank, lq.pair), s = SRS.stats(items, lq.day);
    lq.streakAfter = SRS.streak(r && r.reviewDays, lq.day);
    lq.ready = s.ready;
    const dues = items.filter((x) => SRS.usable(x) && !SRS.isNew(x) && x.due > lq.day).map((x) => x.due - lq.day);
    lq.nextIn = dues.length ? Math.min(...dues) : null;
    renderPractice();
  });
}
function localResult(v) {
  const total = lq.seen.size, again = el("button", "btn p", T("lpAgain")), back = el("button", "link", T("pBack"));
  again.onclick = () => { lq = null; renderPractice(); }; back.onclick = again.onclick;
  const kids = [el("div", "big", lq.right + "/" + total), el("div", "bigs", total && lq.right === total ? T("lpPerfect") : T("lpDone"))];
  if (lq.learned.length) { const c = el("div", "go"); c.append(el("div", "lp-lab", T("lpLearnedH"))); for (const w of lq.learned) c.append(el("span", "lw", w)); c.style.margin = "0 0 14px"; kids.push(c); }
  if (lq.bonus && lq.bonus.total) kids.push(el("p", "lp-line", T("lpBonus", lq.bonus.right, lq.bonus.total)));
  if (lq.streakAfter >= 2 && lq.streakAfter > lq.streakBefore) kids.push(el("p", "lp-line", T("lpDayN", lq.streakAfter)));
  if (lq.ready) kids.push(el("p", "lp-line", T("lpMore", lq.ready)));
  else if (lq.nextIn != null) kids.push(el("p", "lp-line", T("lpNext", whenText(lq.nextIn))));
  kids.push(again, back);
  v.replaceChildren(...kids);
}

// ---------- Pratik (açılır pencerenin içinde hızlı tur) ----------
let quiz = null;
const N_Q = 8;
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function renderPractice() {
  const v = $("v-practice");
  if (!st.key) return SRS ? renderLocalPractice(v) : guestCard(v, T("guestPractice"));
  if (quiz) return quiz.done ? renderResult(v) : renderQuestion(v);
  if (!home) return loading(v);
  const go = el("div", "go"), b = el("button", "btn p", T("pStart")), ok = home.recent.length >= 4;
  go.append(el("h2", "", T("pTitle")), el("p", "", !ok ? T("pNeed") : home.due ? T("pDue", home.due) : T("pSub", N_Q)));
  b.disabled = !ok; b.onclick = () => startQuiz(b); go.append(b);
  const card = (ic, title, sub, to) => { const c = el("button", "opt2"), d = el("div"); d.append(el("b", "", title), el("span", "", sub)); c.append(icon(ic), d); c.onclick = () => openSite(to); return c; };
  v.replaceChildren(go, card(IC.duel, T("duelT"), T("duelS"), "duel"), card(IC.day, T("dailyT"), T("dailyS"), "daily"));
}
async function startQuiz(btn) {
  if (btn) btn.disabled = true;
  try {
    const r = await api("/api/srs/session?n=" + N_Q + "&src=" + st.src + "&dst=" + st.dst);
    const pool = [...new Set([...r.words.map((w) => w.eng), ...((home && home.recent) || []).map((x) => x.t)])];
    const qs = r.words.filter((w) => w.tr && w.eng).map((w) => {
      const wrong = shuffle(pool.filter((p) => p !== w.eng)).slice(0, 3);
      return { w: w.tr, a: w.eng, opts: shuffle([w.eng, ...wrong]) };
    }).filter((x) => x.opts.length >= 3);
    if (!qs.length) { if (btn) btn.disabled = false; return toast(T("pNeed")); }
    quiz = { qs, i: 0, items: [], right: 0, xp: 0, done: false, picked: null };
    renderPractice();
  } catch (e) { if (btn) btn.disabled = false; toast(errText(e)); }
}
function renderQuestion(v) {
  const q = quiz.qs[quiz.i], bar = el("div", "bar"), fillI = el("i"); fillI.style.width = Math.round((quiz.i / quiz.qs.length) * 100) + "%"; bar.append(fillI);
  const top = el("div", "row"), x = el("button", "btn sm", "✕"); x.setAttribute("aria-label", T("pQuit")); x.onclick = () => { finish(true); };
  const bw = el("div", "grow"); bw.append(bar); top.append(bw, x);
  const btns = q.opts.map((o) => { const b = el("button", "ans", o); b.onclick = () => pick(o); return b; });
  v.replaceChildren(top, el("div", "qw", q.w), el("div", "qh", T("pQ", CVL.langName(st.dst))), ...btns);
  function pick(o) {
    if (quiz.picked != null) return; quiz.picked = o;
    const ok = o === q.a; quiz.items.push({ w: q.w, ok }); if (ok) quiz.right++;
    btns.forEach((b) => { b.disabled = true; if (b.textContent === q.a) b.classList.add("ok"); else if (b.textContent === o) b.classList.add("no"); else b.classList.add("fade"); });
    if (ok) v.append(el("div", "xp", "+10 XP"));
    setTimeout(() => { if (!quiz) return; quiz.picked = null; quiz.i++; if (quiz.i >= quiz.qs.length) finish(false); else renderPractice(); }, ok ? 650 : 1500);
  }
}
async function finish(quit) {
  const items = quiz.items;
  if (quit && !items.length) { quiz = null; return renderPractice(); }
  quiz.done = true; quiz.total = items.length; renderPractice();
  try { const r = await api("/api/srs/report", { body: { src: st.src, dst: st.dst, items } }); if (quiz) { quiz.xp = r.xp || 0; if (tab === "practice") renderPractice(); } loadHome(); } catch (e) { toast(errText(e)); }
}
function renderResult(v) {
  const again = el("button", "btn p", T("pAgain")), back = el("button", "link", T("pBack"));
  again.onclick = () => { quiz = null; startQuiz(again); }; back.onclick = () => { quiz = null; renderPractice(); };
  v.replaceChildren(el("div", "big", quiz.right + "/" + quiz.total), el("div", "bigs", T("pDoneT") + (quiz.xp ? " · +" + quiz.xp + " XP" : "")), again, back);
}

// ---------- Ben ----------
const UI_NAMES = { en: "English", tr: "Türkçe", fr: "Français", it: "Italiano", de: "Deutsch", es: "Español", pt: "Português", hi: "हिन्दी", id: "Bahasa Indonesia" };
function fillUiLang(sel) {
  sel.replaceChildren(...Object.keys(UI_NAMES).map((c) => { const o = el("option", "", UI_NAMES[c]); o.value = c; return o; }));
  sel.value = CVL.ui();
  sel.onchange = () => { try { localStorage.setItem("cvUi", sel.value); } catch (e) {} location.reload(); };
}
// Üst çubuktaki dil düğmesi: her ekrandan (giriş ekranı dahil) erişilir
fillUiLang($("lgSel")); $("lgCode").textContent = CVL.ui().toUpperCase(); $("lgSel").setAttribute("aria-label", T("uiLang")); $("lg").title = T("uiLang");
function langSelect() {
  const wrap = el("div", "card"), sel = el("select"), lab = el("label", "", T("uiLang")); sel.id = "uiLang"; lab.htmlFor = "uiLang";
  fillUiLang(sel); wrap.append(lab, sel); return wrap;
}
// Davet bağlantısıyla gelen kişide davet edenin kullanıcı adı (site.js ya da kurulum anında kaydedilir)
function inviteRef() { return new Promise((res) => chrome.storage.local.get("ref", (r) => res(r && /^[\p{L}\p{N}_]{3,16}$/u.test(r.ref || "") ? r.ref : ""))); }
function shareBtn() {
  const b = el("button", "btn", T("share"));
  b.onclick = async () => {
    // Giriş yapılmışsa kişisel davet bağlantısı: arkadaş bununla kayıt olunca davet eden olarak görünürsün
    const text = T("shareMsg") + (st.key && home && home.username ? SERVER + "/?ref=" + encodeURIComponent(home.username) : STORE_URL);
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const a = el("textarea"); a.value = text; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); } catch (_) {} a.remove(); }
    toast(T("shareDone"));
  };
  return b;
}
function renderMe() {
  const v = $("v-me");
  if (!st.key) { guestCard(v, T("guestMe")); v.append(langSelect()); const s = shareBtn(); s.style.marginTop = "10px"; v.append(s); return; }
  if (!home) return loading(v);
  const me = el("div", "me"), av = el("div", "av"), who = el("div", "grow");
  if (home.avatar) { const i = el("img"); i.src = home.avatar; i.alt = ""; av.append(i); } else av.textContent = home.username.slice(0, 1).toLocaleUpperCase();
  who.append(el("b", "", home.username), el("span", "", T("level", home.level) + " · " + T("xpToday", home.xp_today))); me.append(av, who);
  const bar = el("div", "bar"), fi = el("i"); fi.style.width = Math.round((home.xp_into / home.xp_level) * 100) + "%"; bar.append(fi); bar.style.margin = "14px 0 12px";
  bar.title = home.xp_into + " / " + home.xp_level + " XP";
  const stats = el("div", "stats");
  for (const [k, n] of [["streakL", home.streak], ["wordsL", home.words], ["winsL", home.wins]]) { const s = el("div", "stat"); s.append(el("b", "", n), el("span", "", T(k))); stats.append(s); }
  const panel = el("button", "btn p", T("panel")); panel.style.marginTop = "12px"; panel.onclick = () => openSite("panel");
  const share = shareBtn(); share.style.marginTop = "8px";
  const out = el("button", "link", T("signOut")); out.onclick = signOut;
  v.replaceChildren(me, bar, stats, panel, share, langSelect(), out);
}

// ---------- oturum ----------
async function loadHome() {
  if (!st.key) return;
  const pairKey = st.src + ">" + st.dst;
  try {
    const d = await api("/api/ext/home?src=" + st.src + "&dst=" + st.dst);
    if (pairKey !== st.src + ">" + st.dst) return;
    home = d; chrome.storage.local.set({ home: { pair: pairKey, d } }); syncStars(); render();
  } catch (e) {
    if (e.status === 401) { st.key = ""; home = null; chrome.storage.local.remove(["key", "home"]); render(); }
  }
}
function setKey(key) {
  st.key = key; noAuto = false; home = null;
  chrome.storage.local.set({ key, noAuto: false, authSkip: true });
  $("auth").hidden = true; render(); loadHome();
}
async function signOut() {
  try { await api("/api/ext/logout", { post: true }); } catch (e) {}
  st.key = ""; home = null; quiz = null; noAuto = true;
  chrome.storage.local.remove(["key", "home"]); chrome.storage.local.set({ noAuto: true });
  render();
}
function showAuth(recovery) {
  const v = $("auth"); v.hidden = false;
  if (recovery) {
    const done = el("button", "btn p", T("recDone")), cp = el("button", "btn", T("recCopy")); cp.style.marginBottom = "8px";
    cp.onclick = () => navigator.clipboard.writeText(recovery).then(() => toast(T("saved")), () => {});
    done.onclick = () => { v.hidden = true; render(); };
    return v.replaceChildren(el("h1", "", T("recTitle")), el("p", "sub", T("recSub")), el("code", "code", recovery), cp, done);
  }
  const reg = authMode === "register", err = el("p", "note bad"), kids = [el("h1", "", T("authTitle"))];
  if (!reg) kids.push(el("p", "sub", T("authSub"))); else kids[0].style.marginBottom = "12px"; // kayıt formu kaydırmadan sığsın
  const busy = (b, on) => { b.disabled = on; };
  if (cfg.google) {
    const g = el("button", "btn p", T("google"));
    g.onclick = () => {
      busy(g, true); err.textContent = "";
      chrome.runtime.sendMessage({ action: "googleLogin" }, (r) => { void chrome.runtime.lastError; busy(g, false); if (r && r.key) { setKey(r.key); if (r.new) showName(r.username); } else if (r && r.error && r.error !== "cancel") err.textContent = r.status ? errText(r) : T("errGoogle"); });
    };
    kids.push(g);
  }
  const cont = el("button", "btn", ""); cont.hidden = true; cont.style.marginTop = "8px"; kids.push(cont);
  // Sitede açık oturum varsa tek dokunuşla onunla devam et
  api("/api/me", { cookie: true, auth: false }).then((m) => {
    if (!m || !m.username || st.key) return;
    cont.textContent = T("contAs", m.username); cont.hidden = false;
    cont.onclick = async () => { busy(cont, true); try { setKey((await api("/api/ext-key", { post: true, cookie: true, auth: false })).key); } catch (e) { busy(cont, false); err.textContent = errText(e); } };
  }).catch(() => {});
  if (cfg.google) kids.push(el("div", "or", T("or")));
  const user = el("input"), pw = el("input"), pw2 = el("input"), mail = el("input"), f1 = el("div", "field"), f2 = el("div", "field"), f3 = el("div", "field"), f4 = el("div", "field"), eye = el("button", "eye"), go = el("button", "btn" + (cfg.google ? "" : " p"), T(reg ? "signUp" : "signIn"));
  const needMail = reg && cfg.mail;
  user.type = "text"; user.placeholder = T("user"); user.autocomplete = "username"; user.spellcheck = false; user.maxLength = 16; user.setAttribute("aria-label", T("user"));
  mail.type = "text"; mail.inputMode = "email"; mail.placeholder = T("email"); mail.autocomplete = "email"; mail.spellcheck = false; mail.setAttribute("aria-label", T("email"));
  pw.type = "password"; pw.placeholder = T(reg ? "passNew" : "pass"); pw.autocomplete = reg ? "new-password" : "current-password"; pw.setAttribute("aria-label", T("pass")); pw.style.paddingRight = "40px";
  pw2.type = "password"; pw2.placeholder = T("pass2"); pw2.autocomplete = "new-password"; pw2.setAttribute("aria-label", T("pass2"));
  eye.type = "button"; eye.append(icon(IC.eye)); eye.setAttribute("aria-label", T("showPw")); eye.onclick = () => { pw.type = pw2.type = pw.type === "password" ? "text" : "password"; };
  f1.append(user); f2.append(pw, eye); f3.append(pw2); f4.append(mail); go.style.marginTop = "10px";
  go.onclick = async () => {
    err.textContent = "";
    if (!/^[\p{L}\p{N}_]{3,16}$/u.test(user.value.trim()) || pw.value.length < 6) { err.textContent = T("errInput"); return; }
    if (reg && pw.value !== pw2.value) { err.textContent = T("errMatch"); return; }
    if (needMail && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(mail.value.trim())) { err.textContent = T("errEmail"); return; }
    busy(go, true);
    try {
      const body = { username: user.value.trim(), password: pw.value };
      if (reg) { const ref = await inviteRef(); if (ref) body.ref = ref; } // arkadaş davetiyle geldiyse davet edenin adı
      if (needMail) {
        const email = mail.value.trim(), start = () => api("/api/signup/start", { body: { ...body, email, lang: CVL.ui() }, auth: false });
        await start(); return showCode(email, start);
      }
      const r = await api(reg ? "/api/ext/register" : "/api/ext/login", { body, auth: false });
      setKey(r.key); if (r.recovery) showAuth(r.recovery);
    } catch (e) { busy(go, false); err.textContent = errText(e); }
  };
  [user, mail, pw, pw2].forEach((i) => (i.onkeydown = (e) => { if (e.key === "Enter") go.click(); }));
  const sw = el("button", "link", T(reg ? "toSignIn" : "toSignUp")); sw.onclick = () => { authMode = reg ? "login" : "register"; showAuth(); };
  const skip = el("button", "link", T("skip")); skip.style.marginTop = "2px"; skip.onclick = () => { chrome.storage.local.set({ authSkip: true }); v.hidden = true; };
  kids.push(f1, ...(needMail ? [f4] : []), f2, ...(reg ? [f3] : []), go, err, sw, skip);
  v.replaceChildren(...kids);
}

// E-postaya gelen 6 haneli kod: hesap ancak doğrulanınca açılır
function showCode(email, again) {
  const v = $("auth"); v.hidden = false;
  const code = el("input"), go = el("button", "btn p", T("codeGo")), err = el("p", "note bad"), re = el("button", "link", T("codeResend")), back = el("button", "link", T("pBack")), f = el("div", "field");
  code.type = "text"; code.inputMode = "numeric"; code.autocomplete = "one-time-code"; code.maxLength = 6; code.placeholder = T("codePh"); code.setAttribute("aria-label", T("codePh")); code.style.cssText = "text-align:center;letter-spacing:.3em;font-size:19px;height:48px";
  f.append(code); go.style.marginTop = "10px";
  go.onclick = async () => {
    err.textContent = ""; go.disabled = true;
    try { const r = await api("/api/signup/verify", { body: { email, code: code.value.trim(), ext: true }, auth: false }); setKey(r.key); if (r.recovery) showAuth(r.recovery); }
    catch (e) { go.disabled = false; err.textContent = errText(e); }
  };
  re.onclick = async () => { err.textContent = ""; try { await again(); toast(T("codeSent")); } catch (e) { err.textContent = errText(e); } };
  back.style.marginTop = "2px"; back.onclick = () => showAuth();
  code.onkeydown = (e) => { if (e.key === "Enter") go.click(); };
  v.replaceChildren(el("h1", "", T("codeTitle")), el("p", "sub", T("codeSub", email)), f, go, err, re, back); code.focus();
}
// Google ile açılan hesap ilk girişte kullanıcı adını seçer
function showName(suggest) {
  const v = $("auth"); v.hidden = false;
  const name = el("input"), go = el("button", "btn p", T("nameGo")), err = el("p", "note bad"), f = el("div", "field");
  name.type = "text"; name.value = suggest || ""; name.maxLength = 16; name.spellcheck = false; name.autocomplete = "off"; name.setAttribute("aria-label", T("user"));
  f.append(name); go.style.marginTop = "10px";
  const done = () => { chrome.storage.local.remove("pickName"); v.hidden = true; home = null; render(); loadHome(); };
  go.onclick = async () => {
    err.textContent = "";
    if (!/^[\p{L}\p{N}_]{3,16}$/u.test(name.value.trim())) { err.textContent = T("errName"); return; }
    go.disabled = true;
    try { await api("/api/ext/username", { body: { username: name.value.trim() } }); done(); } catch (e) { go.disabled = false; err.textContent = errText(e); }
  };
  name.onkeydown = (e) => { if (e.key === "Enter") go.click(); };
  v.replaceChildren(el("h1", "", T("nameTitle")), el("p", "sub", T("nameSub")), f, go, err); name.focus(); name.select();
}

// ---------- açılış ----------
chrome.storage.local.get(["enabled", "src", "dst", "key", "det", "home", "gcid", "gmail", "noAuto", "authSkip", "pickName"], async (r) => {
  st = { enabled: !!r.enabled, src: r.src || "tr", dst: r.dst || "en", key: r.key || "" };
  noAuto = !!r.noAuto; cfg.google = r.gcid || ""; cfg.mail = !!r.gmail;
  if (r.home && r.home.pair === st.src + ">" + st.dst && st.key) home = r.home.d;
  paint(); showDet(r.det); setTab("watch");
  api("/api/ext/config", { auth: false }).then((c) => { const g = (c && c.google) || "", m = !!(c && c.mail); if (g !== cfg.google || m !== cfg.mail) { cfg.google = g; cfg.mail = m; chrome.storage.local.set({ gcid: g, gmail: m }); if (!$("auth").hidden && !st.key) showAuth(); } }).catch(() => {});
  if (st.key) { if (r.pickName) showName(r.pickName); return loadHome(); }
  // Sitede zaten giriş yapılmışsa sessizce bağlan (kullanıcı eklentiden çıkış yapmadıysa)
  if (!noAuto) { try { const k = await api("/api/ext-key", { post: true, cookie: true, auth: false }); if (k && k.key && !st.key) return setKey(k.key); } catch (e) {} }
  // 2.1: giriş formu artık ilk ekran değil. Hesapsız kullanıcı Kelimeler sekmesinde cihazdaki defterini görür,
  // hesap açma teklifi orada ve "Giriş yap" düğmesinde durur.
});
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== "local") return;
  if (ch.det) showDet(ch.det.newValue);
  if (ch.bank && tab === "words" && !st.key) renderWords(); // videoda yeni kelime tutuldu ya da burada kaldırıldı
  if (ch.bankSyncTs && st.key) { home = null; loadHome(); } // cihazdaki kelimeler hesaba taşındı
  if (ch.reviewDays) loadLocal(); // seri değişti
  if (ch.key && ch.key.newValue && ch.key.newValue !== st.key) { st.key = ch.key.newValue; home = null; $("auth").hidden = true; render(); loadHome(); }
});
if (SRS) loadLocal();
