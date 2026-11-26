/* Anonim ziyaret sayacı. Yalnızca GERÇEK bir tarayıcıda, sayfa görünür durumda en az 5 saniye kaldıysa tek bir küçük istek gönderir.
   JavaScript çalıştırmayan ya da hemen kapanan istekler (botların çoğu) böylece sayılmaz. Çerez yok, kimlik yok:
   giden bilgi yalnızca sayfanın yolu, geliş kaynağı (site adı ya da ?src= etiketi) ve sayfaya dokunulup dokunulmadığıdır. */
(function () {
  "use strict";
  var WAIT = 5000, KEY = "cv-visit";
  if (navigator.webdriver) return;                                   // otomasyonla sürülen tarayıcı
  var state = "";
  try { state = sessionStorage.getItem(KEY) || ""; } catch (e) {}     // "" | "seen" | "act": sekme oturumu başına bir kez
  if (state === "act") return;
  var seen = 0, since = 0, acted = false, timer = null;
  var q = new URLSearchParams(location.search), tag = q.get("src") || q.get("utm_source") || "";

  function send(act) {
    var body = JSON.stringify({ p: location.pathname.slice(0, 80), r: (document.referrer || "").slice(0, 200), s: tag.slice(0, 40), a: !!act });
    try { fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true, credentials: "same-origin" }).catch(function () {}); } catch (e) {}
    state = act ? "act" : "seen";
    try { sessionStorage.setItem(KEY, state); } catch (e) {}
  }
  function due() { timer = null; if (document.visibilityState !== "visible") return; send(acted); if (acted) unbind(); }
  function arm() {                                                   // yalnızca görünürken geçen süre sayılır
    if (state || timer) return;
    since = Date.now(); timer = setTimeout(due, Math.max(0, WAIT - seen));
  }
  function pause() { if (!timer) return; clearTimeout(timer); timer = null; seen += Date.now() - since; }
  function onVis() { if (document.visibilityState === "visible") arm(); else pause(); }
  function onAct() {                                                 // ilk gerçek etkileşim: ziyaret zaten sayıldıysa bir kez "etkileşimli"ye yükselt
    if (acted) return; acted = true;
    if (state === "seen") { send(true); unbind(); }
  }
  var EV = ["pointerdown", "keydown", "scroll", "touchstart"];
  function unbind() { EV.forEach(function (e) { removeEventListener(e, onAct, true); }); document.removeEventListener("visibilitychange", onVis); }
  EV.forEach(function (e) { addEventListener(e, onAct, { capture: true, passive: true }); });
  document.addEventListener("visibilitychange", onVis);
  if (document.visibilityState === "visible") arm();
})();
