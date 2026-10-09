const SERVER = "https://cinevocab.up.railway.app";
const key = document.getElementById("key"), st = document.getElementById("st");
chrome.storage.local.get("key", (r) => { if (r.key) { key.value = r.key; st.textContent = "Anahtar kayıtlı."; } });
document.getElementById("save").onclick = () =>
  chrome.storage.local.set({ key: key.value.trim() }, () => (st.textContent = "Kaydedildi."));
document.getElementById("open").onclick = () => chrome.tabs.create({ url: SERVER + "/account" });