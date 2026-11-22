/* CineVocab: cihazdaki "tutulan kelimeler" için aralıklı tekrar (Leitner kutuları).
   Sunucudaki srs.py ile AYNI kutu ve aralık mantığı (0, 1, 3, 7, 14, 30, 60 gün; yanlış cevap 0. kutuya düşer); saf işlevler.
   dev/tests/js/srs.test.js, Python sürümüyle sonuçların aynı olduğunu kanıtlar.
   Gün = kullanıcının YEREL takvim günü (sunucudaki UTC günü gibi gece yarısı kayması olmaz).
   Kelime kaydı (bank.js): { w, t, ts, ep?, vt?, box?, due?, right?, wrong?, last? }  box/due yoksa "yeni" (hiç sorulmamış). */
(function (root) {
  const INTERVALS = [0, 1, 3, 7, 14, 30, 60];
  const MAX_BOX = INTERVALS.length - 1;
  // "Öğrenildi": 3. kutuya ulaşmak. Kutu 0'dan buraya 3 doğru cevap gerekir ve bunların ikisi gecikmeli (1 gün, 3 gün sonra) tekrardır.
  const LEARNED_BOX = 3;
  const TYPE_FROM_BOX = 2; // 2. kutudan sonra şık yerine yazarak cevap (ipuçlu hatırlama, tanımadan daha güçlü kanıt)

  const dayOf = (ms) => { const d = new Date(ms == null ? Date.now() : ms); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); };
  const boxOf = (it) => (Number.isInteger(it && it.box) ? it.box : 0);
  const isNew = (it) => !Number.isInteger(it && it.due);
  const isDue = (it, day) => !isNew(it) && it.due <= day;
  const isLearned = (it) => !isNew(it) && boxOf(it) >= LEARNED_BOX;
  const usable = (it) => !!(it && typeof it.w === "string" && it.w && typeof it.t === "string" && it.t.trim()); // çevirisi olmayan kelime sorulamaz

  // srs.py next_state ile aynı
  function nextState(box, ok, day) {
    if (!ok) return { box: 0, due: day };
    const b = Math.min(MAX_BOX, box + 1);
    return { box: b, due: day + INTERVALS[b] };
  }

  // Bir cevabı kelimeye uygular. counts=false: vadesi gelmemiş "ısınma" sorusu; doğruysa kutu ilerlemez, yanlışsa yine 0'a düşer.
  function answer(it, ok, day, counts) {
    const r = { ...it, right: (it.right || 0) + (ok ? 1 : 0), wrong: (it.wrong || 0) + (ok ? 0 : 1), last: day };
    if (counts === false && ok) return r;
    const ns = nextState(isNew(it) ? 0 : boxOf(it), ok, day);
    r.box = ns.box; r.due = ns.due;
    return r;
  }

  // srs.py pick_session ile aynı sıra: vadesi gelenler (eskiden yeniye) -> hiç sorulmamışlar -> vadesi en yakın olanlar.
  // counts: kutu ilerleyecek mi (vadesi gelmiş ya da yeni); sondakiler yalnızca ısınma.
  function pickSession(items, day, n, rng) {
    n = n || 8; rng = rng || Math.random;
    const ok = (items || []).filter(usable);
    const due = ok.filter((i) => isDue(i, day)).sort((a, b) => a.due - b.due || boxOf(a) - boxOf(b) || (a.w < b.w ? -1 : a.w > b.w ? 1 : 0));
    const fresh = ok.filter(isNew);
    for (let i = fresh.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [fresh[i], fresh[j]] = [fresh[j], fresh[i]]; }
    const later = ok.filter((i) => !isNew(i) && i.due > day).sort((a, b) => a.due - b.due || (a.w < b.w ? -1 : 1));
    const list = due.concat(fresh, later).slice(0, n).map((it) => ({ it, counts: isNew(it) || isDue(it, day) }));
    return { picks: list, due: due.length, fresh: fresh.length };
  }

  // Sayılar: kaç kelime tutuldu, kaçı öğrenildi, kaçı şu an tekrar bekliyor (vadesi gelmiş + hiç sorulmamış)
  function stats(items, day) {
    const ok = (items || []).filter(usable);
    return { kept: (items || []).length, usable: ok.length, learned: ok.filter(isLearned).length, ready: ok.filter((i) => isNew(i) || isDue(i, day)).length, due: ok.filter((i) => isDue(i, day)).length, fresh: ok.filter(isNew).length };
  }

  // Seri: art arda gün sayısı; bugün henüz çalışılmadıysa dünden sayılır (extauth._streak ile aynı)
  function streak(days, today) {
    const set = new Set(days || []);
    let d = set.has(today) ? today : today - 1, n = 0;
    while (set.has(d)) { n++; d--; }
    return n;
  }

  // Yazarak cevap: büyük/küçük harf, aksan, baştaki "to"/"the", noktalama yok sayılır; "a / b" gibi alternatiflerden biri yeter;
  // 5+ harfli cevapta 1 harflik yazım hatası kabul edilir (close=true, doğru yazılışı yine gösterilir)
  const norm = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[.!?¿¡"“”'’]/g, "").replace(/^(to|the|a|an)\s+/, "").replace(/\s+/g, " ").trim();
  function lev1(a, b) { // iki dize arasında en çok 1 düzenleme var mı
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
    return a.length > b.length ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
  }
  function check(typed, expected) {
    const t = norm(typed); if (!t) return { ok: false, close: false };
    const alts = String(expected).split(/\s*[\/;,]\s*|\s+or\s+/i).map(norm).filter(Boolean).concat(norm(expected));
    if (alts.some((a) => a === t)) return { ok: true, close: false };
    if (alts.some((a) => a.length >= 5 && lev1(a, t))) return { ok: true, close: true };
    return { ok: false, close: false };
  }

  root.CVSrs = { INTERVALS, LEARNED_BOX, TYPE_FROM_BOX, dayOf, boxOf, isNew, isDue, isLearned, usable, nextState, answer, pickSession, stats, streak, check, norm };
  if (typeof module !== "undefined") module.exports = root.CVSrs;
})(typeof self !== "undefined" ? self : globalThis);
