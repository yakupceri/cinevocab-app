// CineVocab sitesinde çalışır: sitede giriş yapılmışsa eklentiyi sessizce bağlar (anahtar kopyalamak yok).
// Site oturum çerezi HttpOnly olduğu için buradan okunamaz; yalnızca aynı kökene istek atılır ve
// dönen eklenti oturumu chrome.storage.local içinde saklanır (sayfalar oraya erişemez).
(() => {
  if (window.top !== window) return;
  try { document.documentElement.dataset.cvExt = chrome.runtime.getManifest().version; } catch (e) {}
  let busy = false;
  async function connect() {
    if (busy) return; busy = true;
    try {
      const r = await chrome.storage.local.get(["key", "noAuto"]);
      if (r.key || r.noAuto) return; // zaten bağlı ya da kullanıcı eklentiden bilerek çıkış yaptı
      const res = await fetch("/api/ext-key", { method: "POST", credentials: "same-origin" });
      if (!res.ok) return;
      const d = await res.json();
      if (d && d.key) { await chrome.storage.local.set({ key: d.key, authSkip: true }); document.documentElement.dataset.cvLinked = "1"; }
    } catch (e) {} finally { busy = false; }
  }
  connect();
  window.addEventListener("cv-login", connect); // site, giriş tamamlanınca bu olayı yayınlar
})();
