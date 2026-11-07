const SERVER = "https://cinevocab.up.railway.app";
const LANGS = ["tr", "en", "fr", "it", "de", "es", "pt", "ru", "ar", "ro", "ja", "hi", "id", "pl", "nl", "ko"];
const $ = (id) => document.getElementById(id);
const T = CVL.t;

function fill(sel) {
  sel.replaceChildren(...LANGS.map((l) => { const o = document.createElement("option"); o.value = l; o.textContent = CVL.langName(l).replace(/^./, (c) => c.toLocaleUpperCase()); return o; }));
}
fill($("src")); fill($("dst"));
$("lSrc").textContent = T("subLang"); $("lDst").textContent = T("transLang"); $("lKey").textContent = T("key");
$("key").placeholder = T("keyPh");
for (const id of ["howTitle", "h1", "h2", "h3", "hNote", "keyHelp"]) $(id).textContent = T(id);
$("gTitle").textContent = T("gTitle"); $("g1").textContent = T("g1"); $("g2").textContent = T("g2"); $("g3").textContent = T("g3"); $("gOpen").textContent = T("gOpen"); $("gNote").textContent = T("gNote"); $("keyState").textContent = T("keyOk"); $("save").textContent = T("save"); $("open").textContent = T("panel"); $("hint").textContent = T("hint");

function opt(sel, pairs) { sel.replaceChildren(...pairs.map(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; return o; })); }
opt($("pos"), [["tl", T("posTL")], ["tr", T("posTR")], ["bl", T("posBL")], ["br", T("posBR")], ["tc", T("posTC")], ["bc", T("posBC")]]);
opt($("size"), [["s", T("sizeS")], ["m", T("sizeM")], ["l", T("sizeL")]]);
$("lBox").textContent = T("boxTitle"); $("lPos").textContent = T("boxPos"); $("lSize").textContent = T("boxSize"); $("lOp").textContent = T("boxOp");
let ui = { pos: "tl", size: "m", op: 0.85 };
function saveUi() { ui = { pos: $("pos").value, size: $("size").value, op: Number($("op").value) / 100 }; chrome.storage.local.set({ ui }); }
$("pos").onchange = saveUi; $("size").onchange = saveUi; $("op").oninput = saveUi;

let st = { enabled: false, src: "tr", dst: "en", key: "" };
function paint() {
  $("sw").setAttribute("aria-checked", String(!!st.enabled));
  $("state").textContent = st.enabled ? T("status_on") : T("status_off");
  $("state").className = st.enabled ? "" : "off";
  $("src").value = st.src; $("dst").value = st.dst;
  const hasKey = !!st.key;
  $("guide").hidden = hasKey; $("keyState").hidden = !hasKey; $("open").hidden = !hasKey;
  if (!paint.howSet) { $("how").open = !hasKey; paint.howSet = true; } // ilk açılışta yeni kullanıcıya açık, anahtarı olana kapalı
}
chrome.storage.local.get(["enabled", "src", "dst", "key", "det", "ui"], (r) => {
  if (r.ui) { ui = { ...ui, ...r.ui }; }
  $("pos").value = ui.pos; $("size").value = ui.size; $("op").value = Math.round(ui.op * 100);
  st = { enabled: !!r.enabled, src: r.src || "tr", dst: r.dst || "en", key: r.key || "" };
  $("key").value = st.key; paint(); showDet(r.det);
});
function showDet(d) {
  const n = $("det"); n.className = "note"; n.textContent = "";
  if (!st.enabled || !d || Date.now() - d.ts > 60000 || !d.lang) return;
  if (d.ok === false) { n.className = "note bad"; n.textContent = T("mismatchPopup", CVL.langName(d.lang), CVL.langName(st.src)); }
  else { n.className = "note ok"; n.textContent = T("detected", CVL.langName(d.lang)); }
}
chrome.storage.onChanged.addListener((ch) => { if (ch.det) showDet(ch.det.newValue); });

$("sw").onclick = () => { st.enabled = !st.enabled; chrome.storage.local.set({ enabled: st.enabled }); paint(); };
function pair(changed) {
  let src = $("src").value, dst = $("dst").value;
  if (src === dst) { if (changed === "src") dst = LANGS.find((l) => l !== src); else src = LANGS.find((l) => l !== dst); }
  st.src = src; st.dst = dst; paint();
  chrome.storage.local.set({ src, dst });
}
$("src").onchange = () => pair("src"); $("dst").onchange = () => pair("dst");
$("save").onclick = () => { st.key = $("key").value.trim(); paint(); chrome.storage.local.set({ key: st.key }, () => { $("hint").textContent = T("saved"); setTimeout(() => ($("hint").textContent = T("hint")), 1800); }); };
$("open").onclick = () => chrome.tabs.create({ url: SERVER + "/account" });

$("gOpen").onclick = () => chrome.tabs.create({ url: SERVER + "/account" });

// Etkin sekmede CineVocab çalışıyor mu? (içerik betiği yalnızca Prime Video, YouTube ve Udemy'de yüklü; ek izin gerekmez)
(function checkSite() {
  const note = $("site");
  const show = (bad) => { note.hidden = !bad; if (bad) note.textContent = T("siteNote"); };
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || tab.id == null) return show(false);
      try {
        chrome.tabs.sendMessage(tab.id, { cv: "ping" }, (r) => { void chrome.runtime.lastError; show(!(r && r.ok)); });
      } catch (e) { show(false); }
    });
  } catch (e) { show(false); }
})();

// Gizleme ayarı
$("lHide").textContent = T("hideOrig");
chrome.storage.local.get("hideOrig", (r) => { $("hide").checked = r.hideOrig !== false; });
$("hide").onchange = () => chrome.storage.local.set({ hideOrig: $("hide").checked });

// Diğer sitelerde aç: izin kullanıcı hareketiyle istenir, sonra arka plan betiği kaydeder
(function otherSites() {
  const card = $("siteCard"), btn = $("siteEnable"), note = $("siteEnableNote");
  btn.textContent = T("siteEnable"); note.textContent = T("siteEnableNote");
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || tab.id == null || !/^https?:\/\//.test(tab.url || "")) return;
      const u = new URL(tab.url), origins = [u.protocol + "//" + u.hostname + "/*", u.protocol + "//*." + u.hostname + "/*"];
      try { chrome.tabs.sendMessage(tab.id, { cv: "ping" }, (r) => { void chrome.runtime.lastError; card.hidden = !!(r && r.ok); }); } catch (e) { card.hidden = false; }
      btn.onclick = () => chrome.permissions.request({ origins }, (ok) => {
        if (!ok) { note.className = "note bad"; note.textContent = T("siteDenied"); return; }
        chrome.runtime.sendMessage({ action: "enableSite", origins, tabId: tab.id }, (res) => {
          note.className = "note ok"; note.textContent = T("siteOn"); btn.hidden = true;
          void chrome.runtime.lastError;
        });
      });
    });
  } catch (e) {}
})();

// Arkadaşına öner: mağaza bağlantısını ve hazır mesajı panoya kopyalar
const STORE_URL = "https://chromewebstore.google.com/detail/glhogfbfbjifiihgffjpjgijkjplebkl?utm_source=share";
$("share").textContent = T("share");
$("share").onclick = async () => {
  const text = T("shareMsg") + STORE_URL;
  try { await navigator.clipboard.writeText(text); }
  catch (e) { const a = document.createElement("textarea"); a.value = text; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); } catch (_) {} a.remove(); }
  $("share").textContent = T("shareDone");
  setTimeout(() => { $("share").textContent = T("share"); }, 2000);
};
