const SERVER = "https://cinevocab.up.railway.app";
const $ = (id) => document.getElementById(id);
chrome.storage.local.get(["key", "src", "dst"], (r) => {
  $("src").value = r.src || "tr"; $("dst").value = r.dst || "en";
  if (r.key) { $("key").value = r.key; $("st").textContent = "Anahtar kayıtlı."; }
});
$("save").onclick = () => {
  if ($("src").value === $("dst").value) { $("st").textContent = "Altyazı ve çeviri dili farklı olmalı."; return; }
  chrome.storage.local.set({ key: $("key").value.trim(), src: $("src").value, dst: $("dst").value },
    () => ($("st").textContent = "Kaydedildi. Prime/YouTube sayfasını yenile."));
};
$("open").onclick = () => chrome.tabs.create({ url: SERVER + "/account" });
