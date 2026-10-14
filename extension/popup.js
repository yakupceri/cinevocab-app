const SERVER = "https://cinevocab.up.railway.app";
const LANGS = ["tr", "en", "fr", "it", "de", "es", "pt", "ru", "ar"];
const $ = (id) => document.getElementById(id);
const T = CVL.t;

function fill(sel) {
  sel.replaceChildren(...LANGS.map((l) => { const o = document.createElement("option"); o.value = l; o.textContent = CVL.langName(l).replace(/^./, (c) => c.toLocaleUpperCase()); return o; }));
}
fill($("src")); fill($("dst"));
$("lSrc").textContent = T("subLang"); $("lDst").textContent = T("transLang"); $("lKey").textContent = T("key");
$("key").placeholder = T("keyPh"); $("save").textContent = T("save"); $("open").textContent = T("panel"); $("hint").textContent = T("hint");

let st = { enabled: false, src: "tr", dst: "en", key: "" };
function paint() {
  $("sw").setAttribute("aria-checked", String(!!st.enabled));
  $("state").textContent = st.enabled ? T("status_on") : T("status_off");
  $("state").className = st.enabled ? "" : "off";
  $("src").value = st.src; $("dst").value = st.dst;
}
chrome.storage.local.get(["enabled", "src", "dst", "key", "det"], (r) => {
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
$("save").onclick = () => { st.key = $("key").value.trim(); chrome.storage.local.set({ key: st.key }, () => { $("hint").textContent = T("saved"); setTimeout(() => ($("hint").textContent = T("hint")), 1800); }); };
$("open").onclick = () => chrome.tabs.create({ url: SERVER + "/account" });
