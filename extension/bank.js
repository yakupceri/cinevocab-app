/* CineVocab: hesapsız "kelimeyi tut" defteri.
   Saf işlevler: yalnızca veriyi düzenler. Saklama chrome.storage.local içindeki "bank" anahtarında, çağıran yapar.
   Biçim: bank = { "es>en": [ { w, t, ts, ep?, vt?, s?, st? } ] }  (en yeni başta)
     w = kelime, t = çevirisi, ts = tutulma zamanı (ms), ep = video/bölüm adı, vt = videodaki saniye, s = kelimenin geçtiği cümle, st = cümlenin çevirisi (ikisi de yalnızca cihazda, sunucuya gitmez),
     n = kullanıcının kendi notu (cihazda durur; yalnızca giriş yapılmışsa ayrıca hesaba da yazılır, bunu bu dosya değil background.js yapar).
   Bu dosya hiçbir şey göndermez: saf işlevler. Hesaba bağlı kullanıcının listesi sunucudadır, bu defter ondan bağımsızdır. */
(function (root) {
  const CAP = 500; // dil çifti başına en çok bu kadar kelime
  const NOTE_MAX = 140;
  const REVIEW_KEYS = ["box", "due", "right", "wrong", "last"];
  // Not metni: boşluklar tekilleşir, uçlar kırpılır, en çok 140 karakter. Sunucudaki vocab.clean_note ile aynı kural.
  const cleanNote = (note) => String(note == null ? "" : note).replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);
  const norm = (bank) => (bank && typeof bank === "object" && !Array.isArray(bank) ? bank : {});
  const list = (bank, pair) => { const l = norm(bank)[pair]; return Array.isArray(l) ? l : []; };
  const has = (bank, pair, w) => list(bank, pair).some((x) => x && x.w === w);

  function add(bank, pair, item, now) {
    const b = Object.assign({}, norm(bank));
    const w = String((item && item.w) || "").slice(0, 60);
    if (!w) return b;
    const e = { w, t: String(item.t || "").slice(0, 80), ts: now || Date.now() };
    if (item.ep) e.ep = String(item.ep).slice(0, 80);
    if (Number.isFinite(item.vt) && item.vt >= 0) e.vt = Math.round(item.vt);
    for (const k of REVIEW_KEYS) if (Number.isFinite(item[k])) e[k] = item[k]; // tekrar durumu (srs.js)
    if (item.s) e.s = String(item.s).slice(0, 160);   // kelimenin geçtiği cümle (yalnızca cihazda)
    if (item.st) e.st = String(item.st).slice(0, 160); // cümlenin çevirisi
    if (item.n) e.n = String(item.n).slice(0, NOTE_MAX);   // kullanıcının kendi notu
    b[pair] = [e].concat(list(b, pair).filter((x) => x && x.w !== w)).slice(0, CAP);
    return b;
  }

  function remove(bank, pair, w) {
    const b = Object.assign({}, norm(bank));
    b[pair] = list(b, pair).filter((x) => x && x.w !== w);
    return b;
  }

  // Bir kelimenin alanlarını günceller (tekrar sonucu gibi); yoksa değişiklik yapmaz
  function update(bank, pair, w, patch) {
    const b = Object.assign({}, norm(bank));
    b[pair] = list(b, pair).map((x) => (x && x.w === w ? Object.assign({}, x, patch) : x));
    return b;
  }

  // Kelimeye not yazar; boş not alanı siler. Kelime listede yoksa değişiklik yapmaz.
  function setNote(bank, pair, w, note) {
    const n = cleanNote(note);
    const b = Object.assign({}, norm(bank));
    b[pair] = list(b, pair).map((x) => { if (!x || x.w !== w) return x; const y = Object.assign({}, x); if (n) y.n = n; else delete y.n; return y; });
    return b;
  }

  // 75 -> "1:15", 3700 -> "1:01:40"
  function clock(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "";
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(s).padStart(2, "0");
  }

  root.CVBank = { CAP, NOTE_MAX, list, has, add, remove, update, setNote, cleanNote, clock };
  if (typeof module !== "undefined") module.exports = root.CVBank;
})(typeof self !== "undefined" ? self : globalThis);
