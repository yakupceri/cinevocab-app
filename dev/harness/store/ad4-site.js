/* 2.4.0 videosunun "düello, konuşarak cevap, günlük meydan okuma + lig, öğrenildi" sahneleri. ad4.js sırası gelince çağırır.
   Gerçek arayüz kaynakları (değişirse burayı da güncelle): templates/game.html + daily.html, account.html (lig kartı),
   static/app.css, static/i18n.js (metinler birebir); "öğrenildi" anı extension/popup.js localFeedback + popup.html CSS.
   Puanlar main.py kuralıyla: 100 + hız (0-50) + seri (+10, en çok +50). Oyuncu adları ve lig adı uydurma örnek.
   Düello, günlük meydan okuma ve lig sitede, ÜCRETSİZ HESAPLA: bu sahnelerde rozet her zaman ekranda. */
window.AD4_SITE = (A) => {
const { add, seg, ease, out, rise, show, brand, mid, popHTML, popIn } = A;
const S = {
  en: { badge: "With a free account",
    tDuel: "Duel your friends *with your own words.*", tSpeak: "Or say the answer *out loud.*", speakNote: "Speaking mode uses your browser’s speech recognition, where available. Typing works too.",
    tDaily: "A daily challenge *and private leagues.*", tProg: "Recall it three times, days apart: *it counts as learned.*",
    room: "Room code", copy: "Copy code", share: "Share this code with the other players.", meta: ["All words", "Spanish → English", "10 questions", "12 s"],
    players: "Players", you: "you", host: "host", start: "Start game", fast: "Faster answer = bonus points", row: "3 in a row",
    q: "vida", opts: ["world", "life", "question", "happy"], a: "life",
    sayQ: "love", sayA: "amor", sayIn: "Say it in Spanish", listening: "Listening…", heard: "Heard: amor", type: "Or type it", check: "Check", wait: "Answer sent. Waiting for others…",
    dcTitle: "Daily challenge", dcNum: "Daily #7", dcCard: "Same words for every player today. One try.", dcPlay: "Play today's challenge",
    lg: "Friday League", lgMeta: "3 members · #2 this week · 640 pts", week: "This week", all: "All time", owner: "owner", info: "Points = duel scores + daily challenge + practice XP. The crown marks the leader.",
    pq: "pregunta", ph: "Pick the English meaning", po: ["world", "life", "question", "happy"], pa: "question", right: "Correct · 3 in a row",
    lTag: "Learned", lWord: "feliz", lLine: "You remembered it again. Next review: in 7 days.", cont: "Continue" },
  tr: { badge: "Ücretsiz hesapla",
    tDuel: "Kendi kelimelerinle *arkadaşınla düello.*", tSpeak: "Ya da cevabı *sesli söyle.*", speakNote: "Konuşma modu, destekleyen tarayıcıda konuşma tanımayı kullanır. Yazarak da olur.",
    tDaily: "Her gün meydan okuma, *arkadaş ligi.*", tProg: "Günler arayla üç kez hatırla, *öğrenildi sayılsın.*",
    room: "Oda kodu", copy: "Kodu kopyala", share: "Bu kodu diğer oyunculara ver.", meta: ["Tüm kelimeler", "İngilizce → Türkçe", "10 soru", "12 sn"],
    players: "Oyuncular", you: "sen", host: "oda sahibi", start: "Oyunu başlat", fast: "Hızlı cevap = bonus puan", row: "3 üst üste",
    q: "life", opts: ["dünya", "hayat", "soru", "mutlu"], a: "hayat",
    sayQ: "sevmek", sayA: "love", sayIn: "İngilizce olarak söyle", listening: "Dinliyorum…", heard: "Duyduğum: love", type: "Ya da yaz", check: "Kontrol et", wait: "Cevap gitti. Diğerleri bekleniyor…",
    dcTitle: "Günlük meydan okuma", dcNum: "Günlük #7", dcCard: "Bugün her oyuncuya aynı kelimeler. Tek deneme.", dcPlay: "Bugünün meydan okumasını oyna",
    lg: "Cuma Ligi", lgMeta: "3 üye · bu hafta 2. · 640 puan", week: "Bu hafta", all: "Tüm zamanlar", owner: "kurucu", info: "Puan = düello puanları + günlük meydan okuma + pratik XP. Taç lideri gösterir.",
    pq: "question", ph: "Türkçe anlamını seç", po: ["dünya", "hayat", "soru", "mutlu"], pa: "soru", right: "Doğru · Üst üste 3 doğru",
    lTag: "Öğrenildi", lWord: "happy", lLine: "Yine hatırladın. Sonraki tekrar: 7 gün sonra.", cont: "Devam" },
}[LANG];

const Z = 1.66, COLW = 560, COLX = 1920 - 80 - COLW * Z;
const css = document.createElement("style");
css.textContent = `
  .badge { position:absolute; left:90px; top:92px; padding:12px 28px; border:3px solid var(--sun); border-radius:10px; color:var(--sun); font:700 44px/1.2 var(--text); white-space:nowrap; }
  .note40 { position:absolute; left:90px; width:760px; font:500 40px/1.35 var(--text); color:var(--ink); }
  .web { position:absolute; top:0; width:${COLW}px; height:${1080 / Z}px; display:flex; flex-direction:column; justify-content:center; font:500 15px/1.55 var(--text); color:var(--ink); }
  .web .wc { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:20px; }
  .web .st { position:relative; } .web p { margin:0; } .web .dim { color:var(--dim); } .web .ctr { text-align:center; }
  .web h2 { margin:0; font:800 24px/1.05 var(--display); letter-spacing:.01em; }
  .web .eyebrow { font:500 11px/1.2 var(--mono); letter-spacing:.08em; text-transform:uppercase; color:#968780; text-align:center; }
  .web .btn { display:flex; align-items:center; justify-content:center; gap:8px; min-height:46px; padding:0 16px; border-radius:6px; border:1px solid var(--line2); font:800 17px/1.1 var(--display); letter-spacing:.02em; }
  .web .btn.p { background:var(--sun); border-color:var(--sun); color:var(--on); }
  .web svg.ic { width:18px; height:18px; flex:none; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
  .web .code { display:flex; justify-content:center; gap:10px; margin:10px 0 12px; }
  .web .code span { width:82px; height:104px; display:grid; place-items:center; background:var(--night); border:1px solid var(--line2); border-radius:10px; font:700 62px/1 var(--mono); color:var(--sun); }
  .web .meta { display:flex; gap:6px 14px; justify-content:center; font:500 12.5px var(--mono); color:var(--dim); }
  .web .sec { display:flex; justify-content:space-between; margin-top:14px; font:800 17px/1.2 var(--display); }
  .web ul { list-style:none; margin:0; padding:0; }
  .web li { display:flex; align-items:center; gap:12px; padding:8px 4px; min-height:50px; border-top:1px solid var(--line); } .web li:first-child { border-top:0; }
  .web li.me { background:rgba(255,210,30,.12); border-radius:6px; padding-left:10px; padding-right:10px; border-top-color:transparent; }
  .web .rk { width:28px; text-align:center; font:700 14px var(--mono); color:var(--dim); flex:none; } .web li:first-child .rk { color:var(--sun); }
  .web .av { width:32px; height:32px; border-radius:50%; display:grid; place-items:center; font:800 14px var(--display); flex:none; }
  .web .nm { flex:1; min-width:0; font-weight:600; white-space:nowrap; }
  .web li b { font:700 15px var(--mono); font-variant-numeric:tabular-nums; }
  .web .dl { margin-left:8px; font:700 13px var(--mono); color:var(--mint); display:inline-block; min-width:36px; } .web .dl.x { color:#FF8A96; }
  .web .tag { font:600 10.5px/1 var(--mono); letter-spacing:.04em; text-transform:uppercase; color:var(--dim); border:1px solid var(--line2); border-radius:6px; padding:4px 8px; margin-left:8px; vertical-align:middle; }
  .web .fire { color:var(--sun); font:600 12px var(--mono); margin-left:8px; display:inline-flex; align-items:center; gap:4px; vertical-align:middle; } .web .fire svg { width:13px; height:13px; fill:currentColor; }
  .web .up, .web .dn { display:inline-block; vertical-align:-1px; margin-left:6px; color:var(--mint); } .web .dn { color:#FF8A96; } .web .up svg, .web .dn svg { width:12px; height:12px; stroke-width:2.4; }
  .web .pstrip { display:flex; gap:8px; justify-content:center; margin-bottom:12px; }
  .web .pc { display:flex; align-items:center; gap:8px; padding:5px 14px 5px 5px; border:1px solid var(--line2); border-radius:99px; background:var(--panel); font-size:13px; font-weight:600; }
  .web .pc.done { border-color:var(--mint); background:rgba(123,211,154,.14); } .web .pc .av { width:26px; height:26px; font-size:12px; } .web .pc b { font:700 13px var(--mono); color:var(--sun); }
  .web .top2 { display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; color:var(--dim); }
  .web .timer { height:8px; border-radius:99px; background:var(--line); overflow:hidden; } .web .timer i { display:block; height:100%; background:var(--sun); }
  .web .qword { margin:22px 0 18px; text-align:center; font:700 54px/1.05 var(--display); letter-spacing:.01em; }
  .web .opts { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .web .opt { display:flex; align-items:center; min-height:56px; padding:12px 14px; border:1px solid var(--line2); border-radius:10px; font:800 18px var(--display); letter-spacing:.02em; }
  .web .opt span:first-child { width:26px; height:26px; margin-right:12px; border-radius:6px; background:var(--night); border:1px solid var(--line2); display:grid; place-items:center; font:600 12px var(--mono); color:var(--dim); }
  .web .float { position:absolute; left:0; right:0; text-align:center; font:800 34px var(--display); color:var(--sun); pointer-events:none; }
  .web .conf { position:absolute; width:8px; height:14px; border-radius:1px; pointer-events:none; }
  .web .mic { position:relative; width:92px; height:92px; margin:6px auto 0; border-radius:50%; border:2px solid var(--sun); background:rgba(255,210,30,.12); color:var(--sun); display:grid; place-items:center; }
  .web .mic svg { width:38px; height:38px; } .web .mic.on { background:var(--sun); color:var(--on); }
  .web .pulse { position:absolute; inset:-2px; border-radius:50%; border:2px solid var(--sun); }
  .web .heard { min-height:30px; margin:8px 0; text-align:center; font:700 24px/1.25 var(--display); }
  .web .sayrow { display:flex; gap:8px; } .web .inp { flex:1; min-height:44px; padding:0 12px; line-height:42px; border:1px solid var(--line2); border-radius:6px; background:var(--night); color:var(--dim); }
  .web .chips { display:flex; justify-content:center; margin:10px 0 8px; } .web .chip { padding:5px 12px; border-radius:6px; border:1px solid var(--line2); font-size:13px; font-weight:600; }
  .web .seg { display:inline-flex; background:var(--night); border:1px solid var(--line); border-radius:10px; padding:3px; gap:2px; margin:10px 0 6px; }
  .web .seg span { padding:7px 14px; border-radius:6px; font:800 16px var(--display); color:var(--dim); } .web .seg span.on { background:var(--panel2); color:var(--ink); }
  .web .crown { width:16px; height:16px; margin-left:6px; vertical-align:-3px; color:var(--sun); }
  .pp .pill.stk svg { color:var(--sun); }
  .pp .qw { margin:22px 0 4px; text-align:center; font:800 34px/1.1 var(--display); letter-spacing:.01em; }
  .pp .qh { text-align:center; color:var(--dim); font-size:12.5px; margin-bottom:16px; }
  .pp .fbc { position:relative; margin:34px 0 8px; text-align:center; }
  .pp .ring { position:absolute; left:50%; top:62px; width:110px; height:110px; margin:-55px 0 0 -55px; border-radius:50%; border:2px solid var(--sun); }
  .pp .lw { display:inline-block; position:relative; margin-top:12px; padding:.06em .3em; border-radius:.25em; background:var(--sun); color:var(--on); font:800 40px/1.2 var(--display); }
  .pp .dots { display:flex; justify-content:center; gap:7px; margin-top:14px; } .pp .dots i { width:9px; height:9px; border-radius:50%; background:var(--sun); }
  .pp .lpl { margin:10px 0 16px; color:var(--dim); font-size:13px; }
`;
document.head.appendChild(css);

/* ---------- ortak ---------- */
const ICON_ = { play: '<path d="M7 4.5v15l12-7.5z"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 012-2h9"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>', flame: '<path d="M12 2s5 4.5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-6 1-9z"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>', dn: '<path d="M12 5v14M6 13l6 6 6-6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', crown: '<path d="M4 8l4 4 4-7 4 7 4-4-2 11H6z"/>' };
const ic = (n, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_[n]}</svg>`;
const hue = (n) => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };   // game.html ile aynı avatar rengi
const av = (n) => `<span class="av" style="background:hsl(${hue(n)} 22% 24%);border:1px solid hsl(${hue(n)} 22% 34%)">${n[0]}</span>`;
const web = (inner) => `<div class="web" style="zoom:${Z};left:${COLX / Z}px">${inner}</div>`;
const left = (title, extra = "", h = 620) => `<div class="badge">${S.badge}</div>
  <div class="fit" data-fit style="left:90px;top:200px;width:776px;height:${h}px">${H(title, `font-size:${LANG === "en" ? 124 : 140}px`)}</div>${extra}
  <div class="dash" style="left:90px;top:872px;width:364px"></div>${brand("left:90px;top:930px")}`;
const enter = (n, u) => { rise(n.querySelector(".fit"), u, 0, .3); const w = n.querySelector(".web"), q = out(seg(u, 0, .45)); w.style.opacity = .35 + .65 * q; w.style.translate = `0 ${(1 - q) * 7}px`; };
const strip = (scores, done = {}) => `<div class="pstrip">${["Ada", "Leo", "Mia"].map((n, i) => `<div class="pc${done[n] ? " done" : ""}">${av(n)}<span>${n}</span><b>${scores[i]}</b></div>`).join("")}</div>`;
const appear = (e, u, a, d = .3) => { const q = out(seg(u, a, d)); e.style.opacity = q; e.style.transform = `translateY(${(1 - q) * 10}px)`; };

/* ---------- 1) düello: oda, soru, puan ve sıralama ---------- */
function duel() {
  const D = { leo: .8, mia: 1.5, start: 2.35, q: 2.75, leoA: 3.55, pick: 4.1, miaA: 4.5, rev: 4.85 };
  const row = (n, tags = "") => `<li>${av(n)}<span class="nm">${n}${tags}</span><b>0</b></li>`;
  const lobby = `<div class="st lobby"><div class="wc"><p class="eyebrow">${S.room}</p><div class="code">${[..."4821"].map((c) => `<span>${c}</span>`).join("")}</div>
    <div class="btn" style="width:190px;margin:0 auto 10px">${ic("copy")}${S.copy}</div><p class="dim ctr" style="font-size:13px">${S.share}</p>
    <p class="meta" style="margin-top:10px">${S.meta.join(" · ")}</p><div class="sec"><span>${S.players}</span><span class="dim cnt">1</span></div>
    <ul>${row("Ada", `<span class="tag">${S.you}</span><span class="tag">${S.host}</span>`)}${row("Leo")}${row("Mia")}</ul>
    <div class="btn p go" style="margin-top:10px">${ic("play")}${S.start}</div></div></div>`;
  const rank = (n, i, score, delta, ok) => `<li><span class="rk">${i}</span>${av(n)}<span class="nm">${n}${n === "Ada" ? `<span class="tag">${S.you}</span>` : ""}<span class="${n === "Leo" ? "dn" : "up"}">${ic(n === "Leo" ? "dn" : "up")}</span>${n === "Ada" ? `<span class="fire">${ic("flame")}${S.row}</span>` : ""}</span>
    <span><b class="s${n}">${score}</b><span class="dl${ok ? "" : " x"}">${ok ? "+" + delta : ic("x")}</span></span></li>`;
  const play = `<div class="st play"><div class="ps"></div><div class="wc qc"><div class="top2"><span>3 / 10</span><span>${S.fast}</span></div><div class="timer"><i></i></div><div class="qword">${S.q}</div>
    <div class="opts">${S.opts.map((o, i) => `<div class="opt"><span>${i + 1}</span><span>${o}</span></div>`).join("")}</div><div class="float">+164</div></div>
    <div class="wc rv" style="margin-top:14px;padding-top:8px;padding-bottom:8px"><ul>${rank("Ada", 1, 434, 164, true)}${rank("Mia", 2, 382, 142, true)}${rank("Leo", 3, 276, 0, false)}</ul></div></div>`;
  add("duel", 7.5, left(S.tDuel) + web(lobby + play), (n) => {
    const lb = n.querySelector(".lobby"), pl = n.querySelector(".play"), rows = [...lb.querySelectorAll("li")], cnt = lb.querySelector(".cnt"), go = lb.querySelector(".go");
    const ps = pl.querySelector(".ps"), qc = pl.querySelector(".qc"), fill = pl.querySelector(".timer i"), opts = [...pl.querySelectorAll(".opt")], right = opts[S.opts.indexOf(S.a)];
    const fl = pl.querySelector(".float"), rv = pl.querySelector(".rv"), rvRows = [...rv.querySelectorAll("li")], sA = rv.querySelector(".sAda"), sM = rv.querySelector(".sMia");
    const conf = Array.from({ length: 18 }, (_, i) => { const c = document.createElement("i"); c.className = "conf"; c.style.background = ["#FFD21E", "#FFD21E", "#7BD39A", "#F3E9D2"][i % 4]; pl.appendChild(c); return c; });
    return { clicks: [D.start, D.pick], hide: 5.3,
      cues: [[D.leo, "pop"], [D.mia, "pop"], [D.start, "tap"], [D.leoA, "count"], [D.pick, "tap"], [D.miaA, "count"], [D.rev, "right"], [D.rev + .3, "ding"]],
      measure() {
        show(lb, true); show(pl, false); const a = mid(go, .56, .5);
        show(lb, false); show(pl, true); const b = mid(right, .6, .55);
        this.cursor = [[.9, a[0] + 220, a[1] - 130], [D.start - .2, ...a], [D.q, ...a], [D.pick - .15, ...b], [D.pick + .25, ...b], [5.3, b[0] + 120, b[1] + 200]];
      },
      update: (u) => {
        enter(n, u);
        const inLobby = u < D.q;
        show(lb, inLobby); show(pl, !inLobby);
        if (inLobby) {
          [D.leo, D.mia].forEach((a, i) => appear(rows[i + 1], u, a));
          cnt.textContent = 1 + (u >= D.leo) + (u >= D.mia);
          go.style.filter = u >= D.start && u < D.start + .2 ? "brightness(1.12)" : "";
          return;
        }
        pl.style.opacity = .35 + .65 * seg(u, D.q, .25);
        const done = u >= D.rev, since = u - D.rev;
        ps.innerHTML = strip([270, 276, 240], { Leo: u >= D.leoA, Ada: u >= D.pick, Mia: u >= D.miaA });
        fill.style.width = 100 - (Math.min(u, D.rev) - D.q) / 12 * 100 + "%";
        opts.forEach((o) => { const ok = o === right; o.style.opacity = done && !ok ? .6 : 1;
          o.style.borderColor = done && ok ? "#7BD39A" : !done && ok && u >= D.pick ? "#FFD21E" : "";
          o.style.background = done && ok ? "rgba(123,211,154,.14)" : !done && ok && u >= D.pick ? "rgba(255,210,30,.12)" : "";
          o.style.color = done && ok ? "#7BD39A" : ""; });
        qc.style.borderColor = done ? "#7BD39A" : "";
        const fq = seg(since, 0, 1); fl.style.top = 70 - 34 * out(fq) + "px"; fl.style.opacity = done ? Math.min(1, fq * 5) * (1 - seg(since, .65, .35)) : 0;
        rv.style.opacity = done ? 1 : 0;
        rvRows.forEach((r, i) => appear(r, u, D.rev + .08 + i * .12));
        const c = ease(seg(since, .1, .7)); sA.textContent = Math.round(270 + 164 * c); sM.textContent = Math.round(240 + 142 * c);
        conf.forEach((e, i) => {   // seri 3: sitede küçük bir konfeti (game.html: FX.confetti(0.3))
          const q = seg(since, 0, 1.1), x = 40 + ((i * 131) % 480), y = 60 + ((i * 47) % 90);
          e.style.display = done && q < 1 ? "block" : "none";
          e.style.left = x + (i % 2 ? 1 : -1) * 18 * q + "px"; e.style.top = y + 150 * q * q + "px"; e.style.opacity = 1 - q; e.style.transform = `rotate(${i * 37 + 260 * q}deg)`;
        });
      } };
  });
}

/* ---------- 2) konuşarak cevap: ayrı bir oda (mod oda ayarıdır, çoktan seçmeliyle aynı oyunda karışmaz) ---------- */
function speak() {
  const T = { mic: .8, heard: 1.8, lock: 2.15 };
  const body = `<div class="st"><div class="ps"></div><div class="wc"><div class="top2"><span>1 / 10</span><span>${S.fast}</span></div><div class="timer"><i></i></div><div class="qword">${S.sayQ}</div>
    <p class="dim ctr" style="font-size:15px">${S.sayIn}</p><div class="mic"><i class="pulse"></i>${ic("mic", "")}</div><div class="heard"></div>
    <div class="sayrow"><div class="inp">${S.type}</div><div class="btn">${S.check}</div></div><p class="dim ctr status" style="min-height:24px;margin-top:8px;font-size:14px"></p></div></div>`;
  add("speak", 3.5, left(S.tSpeak, `<div class="note40" style="top:655px">${S.speakNote}</div>`, 440) + web(body), (n) => {
    const ps = n.querySelector(".ps"), mic = n.querySelector(".mic"), pulse = n.querySelector(".pulse"), heard = n.querySelector(".heard"), status = n.querySelector(".status"), fill = n.querySelector(".timer i");
    return { clicks: [T.mic], hide: 2.1, cues: [[T.mic, "tap"], [T.heard, "count"], [T.lock, "right"]],
      measure() { const m = mid(mic, .6, .6); this.cursor = [[.2, m[0] + 200, m[1] + 170], [T.mic - .1, ...m], [T.mic + .35, ...m], [2.1, m[0] + 230, m[1] + 80]]; },
      update: (u) => {
        enter(n, u);
        const on = u >= T.mic && u < T.heard, locked = u >= T.lock;
        ps.innerHTML = strip([0, 0, 0], { Ada: locked });
        fill.style.width = 100 - Math.min(u, T.lock) / 12 * 100 + "%";
        mic.classList.toggle("on", on); mic.style.opacity = locked ? .45 : 1;
        const q = ((u - T.mic) / .8) % 1; pulse.style.display = on ? "block" : "none"; pulse.style.transform = `scale(${1 + .38 * q})`; pulse.style.opacity = 1 - q;
        heard.textContent = locked ? "✓ " + S.sayA : u >= T.heard ? S.heard : ""; heard.style.color = locked ? "#7BD39A" : "";
        status.textContent = locked ? S.wait : on ? S.listening : "";
      } };
  });
}

/* ---------- 3) günlük meydan okuma + arkadaş ligi ---------- */
function daily() {
  const lrow = (i, name, score, { me, own, lead } = {}) => `<li class="${me ? "me" : ""}"><span class="rk">${i}</span><span class="nm">${name}${lead ? ic("crown", "ic crown") : ""}${me ? `<span class="tag">${S.you}</span>` : ""}${own ? `<span class="tag">${S.owner}</span>` : ""}</span><b>${score}</b></li>`;
  const body = `<div class="wc dc ctr"><h2>${S.dcTitle}</h2><div class="chips"><span class="chip">${S.dcNum}</span></div><p class="dim">${S.dcCard}</p><div class="btn p" style="margin-top:14px">${ic("play")}${S.dcPlay}</div></div>
    <div class="wc lgc" style="margin-top:14px"><h2>${S.lg}</h2><p class="dim" style="font-size:13px;margin-top:4px">${S.lgMeta}</p>
    <div class="seg"><span class="on">${S.week}</span><span>${S.all}</span></div><ul>${lrow(1, "Mia", 812, { lead: true, own: true })}${lrow(2, "Ada", 640, { me: true })}${lrow(3, "Leo", 455)}</ul>
    <p class="dim" style="font-size:13px;margin-top:8px">${S.info}</p></div>`;
  add("daily", 5, left(S.tDaily) + web(body), (n) => {
    const lg = n.querySelector(".lgc"), rows = [...n.querySelectorAll(".lgc li")];
    return { cues: [[.2, "pop"], [1.1, "pop"]], update: (u) => { enter(n, u); appear(lg, u, 1.05, .4); rows.forEach((r, i) => appear(r, u, 1.35 + i * .2)); } };
  });
}

/* ---------- 4) ilerleme: üst üste doğru, seri, "öğrenildi" (eklenti penceresi, hesapsız da çalışır) ---------- */
function progress() {
  const T = { pick: .8, fb: 1.1, learned: 2.4 };
  const top = (w) => `<div class="row"><div class="grow"><div class="bar"><i style="width:${w}%"></i></div></div><div class="xb">✕</div></div>`;
  const body = `<div class="q">${top(25)}<div class="qw">${S.pq}</div><div class="qh">${S.ph}</div>${S.po.map((o) => `<div class="ans">${o}</div>`).join("")}</div>
    <div class="ok">${top(25)}<div class="qw">${S.pq}</div><div class="fb-ok">${S.right}</div></div>
    <div class="ln">${top(37)}<div class="fbc"><i class="ring"></i><div class="lp-lab">${S.lTag}</div><div class="lw">${S.lWord}</div><div class="dots"><i></i><i></i><i></i></div><p class="lpl">${S.lLine}</p></div><div class="btnp">${S.cont}</div></div>`;
  const back = (p) => 1 + 2.4 * Math.pow(p - 1, 3) + 1.4 * Math.pow(p - 1, 2);   // popup.html "pop" animasyonu gibi hafif taşmalı büyüme
  add("progress", 5, popHTML(S.tProg, 2, body, 140), (n) => {
    // Üst satırda seri rozeti (popup.html #streak: hesapsızken cihazdaki tekrar serisi).
    const si = n.querySelector(".pp .pill.si");
    si.insertAdjacentHTML("beforebegin", `<span class="pill stk"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2s1 3-2 6-5 5-5 9a6 6 0 0 0 12 0c0-3-2-5-2-5s-1 2-2 2c0-4 1-7-1-12z"/></svg>4</span>`);
    const q = n.querySelector(".q"), ok = n.querySelector(".ok"), ln = n.querySelector(".ln"), right = [...n.querySelectorAll(".ans")].find((a) => a.textContent === S.pa);
    const ring = n.querySelector(".ring"), lw = n.querySelector(".lw"), dots = [...n.querySelectorAll(".dots i")];
    return { clicks: [T.pick], hide: 1.5, cues: [[T.pick, "tap"], [T.fb, "right"], [T.learned, "ding"], ...[0, 1, 2].map((i) => [T.learned + .25 + i * .14, "pop"])],
      measure() { show(q, true); show(ok, false); show(ln, false); const a = mid(right, .34, .55); this.cursor = [[.15, a[0] + 260, a[1] + 170], [T.pick - .1, ...a], [T.pick + .15, ...a], [1.5, a[0] + 330, a[1] + 220]]; },
      update: (u) => {
        popIn(n, u);
        show(q, u < T.fb); show(ok, u >= T.fb && u < T.learned); show(ln, u >= T.learned);
        right.style.background = u >= T.pick ? "#1F3A2B" : ""; right.style.borderColor = right.style.color = u >= T.pick ? "#7BD39A" : "";
        ok.style.opacity = .5 + .5 * seg(u, T.fb, .2);
        const s = u - T.learned;
        const r = seg(s, .12, .9); ring.style.transform = `scale(${.4 + 1.6 * out(r)})`; ring.style.opacity = s >= .12 ? .9 * (1 - r) : 0;
        lw.style.transform = `scale(${.6 + .4 * back(seg(s, 0, .5))})`; lw.style.opacity = seg(s, 0, .2);
        dots.forEach((d, i) => { const p = seg(s, .25 + i * .14, .4); d.style.opacity = p > 0 ? 1 : 0; d.style.transform = `scale(${p > 0 ? .6 + .4 * back(p) : 0})`; });
      } };
  });
}

duel(); speak(); daily(); progress();
};
