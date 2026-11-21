/* CineVocab mobil uygulama mantigi. Sunucu: sitenin ve eklentinin kullandigi ayni API.
   Bolumler: ayarlar, metinler, yardimcilar, API, gezinme, giris, ana sayfa, kelimeler, ekle, oyna (pratik, gunluk),
   duello, ligler, profil, acilis.
   Guvenlik kurali: sunucudan ya da kullanicinin getirdigi dosyadan gelen hicbir metin HTML olarak yazilmaz (yalnizca textContent). */
(function () {
  "use strict";
  const CFG = window.CV_CONFIG || {};
  const API = String(CFG.api || "").replace(/\/+$/, "");
  const LANGS = ["en", "tr", "de", "fr", "es", "it", "pt", "ru", "ar", "ro", "ja", "hi", "id", "pl", "nl", "ko"];
  const $ = (id) => document.getElementById(id);
  const main = $("main");

  // Telefonda kalici kucuk kayitlar (oturum anahtari, dil secimi, gunluk isaretler).
  const store = {
    get(k) { try { return localStorage.getItem("cv-" + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem("cv-" + k, String(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem("cv-" + k); } catch (e) {} },
  };
  const sys = String(navigator.language || "en").toLowerCase().split("-")[0];
  const S = {
    key: store.get("key") || "",
    guest: !store.get("key") && store.get("guest") === "1",      // hesapsiz deneme: istekler telefondaki deneme destesine gider
    ui: store.get("ui") || (sys === "tr" ? "tr" : "en"),
    src: store.get("src") || (sys === "en" ? "es" : "en"),          // varsayilan: Ingilizce video, kendi diline ceviri
    dst: store.get("dst") || (LANGS.includes(sys) ? sys : "en"),
    goal: Number(store.get("goal")) || CFG.defaultGoal || 50,
    home: null, daily: null, puzzle: null, videos: null, vocab: null, vocabRaw: null, filterEp: null,
  };

  // Bugune ait yerel isaretler (pratik yapildi mi, kelime eklendi mi, hedef kutlandi mi). Gun degisince sifirlanir.
  function dayKey() { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
  function flags() { try { const o = JSON.parse(store.get("day") || "{}"); return o && o.d === dayKey() ? o : { d: dayKey() }; } catch (e) { return { d: dayKey() }; } }
  function setFlag(k) { const o = flags(); o[k] = true; store.set("day", JSON.stringify(o)); }

  // ---------------------------------------------------------------- metinler
  const T = {
    en: {
      authH: "Pick up words from what you watch.", authSub: "Log in to keep the words you collect.",
      startH: "What are you learning?", startSub: "Words and puzzles are picked for this language. You can change it later.",
      startSrc: "I am learning", startDst: "My own language", startGo: "Start",
      homeH: "Today's screening", hello: "Hi {0}", progH: "Up next", stamp: "Done", playBtn: "Play", ctaAdd: "Add words", ctaDuel: "Start a duel",
      wk0: "Punch today's hole. One game is enough.", wkOn: "{0} days in a row. Today is punched.", wkRisk: "{0}-day streak. Play today to keep it.",
      hFirstS: "Paste a text you want to understand, or pick a starter pack.", hDoneT: "Today's programme is done", hDoneS: "A new puzzle arrives tomorrow. Until then, challenge a friend.",
      flowH: "Word flow", flowS: "Swipe through words. Zero setup.", flowHint: "Swipe up if you knew it, down to see it again.", flowXp: "+{0} XP", flowRun: "{0} in a row", flowEmpty: "Add a few words first, or try the trial pack.", flowBye: "{0} XP earned. Nice flow!", voiceLbl: "Voice", noVoice: "Your phone has no voice for this language.",
      addH: "How do you want to add words?", addSub: "Pick a way. Packs are below.",
      howH: "How do you want to start?", howSub: "Pick one. You can use the others any time.", howQuick: "Start now", howQuickS: "Swipe through words. No typing.", howSnap: "Snap a subtitle", howSnapS: "Coming soon: point your camera at the TV.", howPaste: "Paste text or subtitles", howPasteS: "Learn from your own words.", howDuel: "Duel your friends", howDuelS: "Live, in 16 languages.", howSkip: "Skip",
      cardsH: "Flashcards", cNo: "Again", cYes: "Knew it", fcTip: "Tap to see the meaning", fcTip2: "Swipe right if you knew it, left if not.", cardsRes: "{0} of {1} known",
      rk0: "Viewer", rk1: "Extra", rk2: "Stunt double", rk3: "Supporting role", rk4: "Lead role", rk5: "Star", rk6: "Director", rk7: "Legend", rankUp: "New role: {0}",
      badgeH: "Awards shelf", badgeSub: "{0} of {1} collected", bWords: "words", bStreak: "day streak", bWins: "duel wins", bMaster: "mastered",
      badgeNew: "New award: {0} {1}", badgeNeed: "Locked. Opens at {0} {1}.", badgeHave: "Yours: {0} {1}.",
      setH: "Settings", sndLbl: "Sounds",
      login: "Log in", register: "Sign up", username: "Username", email: "Email", password: "Password",
      loginGo: "Log in", regGo: "Create account", verify: "Verify", back: "Back",
      codeSub: "We sent a 6-digit code to {0}. Enter it to create your account.",
      recText: "Your recovery code. Keep it somewhere safe: it is the only way back in if you forget your password.",
      recOk: "I saved it", eFill: "Fill in every field.",
      google: "Continue with Google", or2: "or", eGoogle: "Google sign-in did not work.",
      tabHome: "Home", tabWords: "Words", tabAdd: "Add words from a video", tabPlay: "Play", tabMe: "Me",
      sDaily: "Daily", sReview: "Review", sDuel: "Duel", sLeague: "League", sPacks: "Packs",
      tryFirst: "Try it without an account", tryBack: "Back to the trial", needAcc: "Create a free account to keep your words and unlock this.", demoPack: "Trial pack", guestName: "Guest", guestBar: "You are trying CineVocab. Create a free account to keep your progress.", demoPair: "No trial pack for that pair yet, so we opened {0} → {1}.", knowNum: "{0} words stuck", knowSub: "of {0} on your list. Counted only after you get a word right again and again over days.",
      goalNum: "{0} / {1} XP", goalLeft: "{0} XP to reach today's goal", goalDone: "Today's goal is done. See you tomorrow!",
      goalToast: "Daily goal reached!", bonusH: "Daily goal done", bonusS: "{0}-day streak. See you tomorrow.", levelUp: "Level {0}!",
      qDaily: "Play the daily challenge", qPractice: "Finish one round of cards", qAdd: "Add new words",
      ctaFirst: "Add your first words", ctaReview: "Review {0} words", ctaDaily: "Play today's challenge", ctaPractice: "Practice new words",
      lvlName: "Level {0}", lvlLeft: "{0} XP to level {1}",
      feedH: "Your sources", feedEmpty: "Videos and texts you collect words from show up here.", noVideo: "Other words", wordsCount: "{0} words",
      videoH: "Words from your own text", videoSub: "Paste any text or pick a subtitle file you have. We find the words you don't know yet.",
      srcLbl: "Video language", dstLbl: "Translate to", swap: "Swap languages",
      titleLbl: "Name it (optional)", textLbl: "Your text", pickFile: "Pick a subtitle or text file", myText: "My text", textPriv: "Your text stays on your phone. Only the word list is sent. Watching on a computer? The CineVocab Chrome extension collects words for you and they appear here.", eText: "Paste a text or pick a file first.", eNoWords: "No new words found in this text.", eFile: "This file could not be read.", eBig: "This file is too large (limit 2 MB).", countLbl: "How many new words?", extract: "Get the words",
      eSame: "The two languages must differ.",
      reading: "Reading your text…", planning: "Picking your new words…",
      planSum: "{0} different words in this text. You have already seen {1}. {2} are new.",
      planNone: "No new words for you in this text. You have already seen all {0}.",
      tapRemove: "Tap a word to leave it out.", addN: "Add {0} words to my list", adding: "Translating and saving… {0}/{1}",
      added: "{0} words added to your list.", eAdd: "Saving stopped: {0}", seeWords: "See my words", autoSub: "auto-generated subtitles",
      packH: "Starter packs", packSub: "No video at hand? Start with a ready-made set.", packAdded: "Added",
      wordsH: "My words", wordsSub: "{0} words · {1} → {2}", search: "Search words…", more: "Show more",
      wEmpty: "No words yet. Tap + to add some from a video.", wNoMatch: "No words match.", know: "I know it", markedKnown: "Marked as known",
      playH: "Play", playSub: "Short games that make your words stick.",
      dailyH: "Daily challenge", dailyNew: "{0} questions. Everyone gets the same ones today.", dailyResume: "Continue: {0} of {1} answered",
      dailyDone: "Done today: {0} points · rank {1} of {2}", dailyNo: "Not available for this language pair today.",
      dailyRes: "{0} of {1} correct", dailyRank: "Rank {0} of {1} today", pts: "pts",
      clozeH: "Finish the line", clozeS: "A line from a scene, one word missing.", clozeNeed: "Not enough example lines yet. Try another mode.", pracH: "Quiz", tQuizS: "Four choices, pick the meaning.", pracInfo: "{0} to review · {1} new", tDuelS: "Race friends live, in 16 languages.", tLeagueS: "Weekly leaderboard with your friends.",
      again: "Again", toHome: "Back to home", pNeed: "You need at least 4 words to practice. Tap + to add some.",
      qCount: "{0} / {1}", xpGain: "+{0} XP", level: "Level {0}", you: "you",
      dH: "Duel", dSub: "Everyone answers the same questions at the same time. Fastest correct answer scores most.",
      dQuick: "Create a room", dCodeLbl: "Have a code from a friend?", dJoin: "Join", dCodeHint: "Enter the 4-digit room code.",
      dRoomLbl: "Room code", dShare: "Share this code. Friends can join from the app or the website.", dHost: "host",
      dStart: "Start the duel", dWaitHost: "Waiting for the host to start…", dLeave: "Leave the room", dGetReady: "Get ready",
      dAnswered: "{0} of {1} answered", dRight: "Correct! +{0} (total {1})", dWrong: "Correct answer: {0}",
      dEndH: "Final scores", dAgain: "Play again", dLost: "The room was closed or the connection dropped.",
      lH: "Leagues", lSub: "A league is a private weekly leaderboard for you and your friends.", lNone: "You are not in a league yet.",
      lRow: "{0} members · your rank: {1}", lNewLbl: "Start a new league", lCreate: "Create", lJoinLbl: "Join with an invite code",
      lNameHint: "The league name needs at least 2 characters.", lCodeHint: "Enter the invite code.",
      lInfo: "Invite code: {0} · this week", lLeave: "Leave this league",
      streak: "Day streak", wordsN: "Words", wins: "Duel wins", goalLbl: "Daily goal", appLang: "App language", logout: "Log out",
      eNet: "No connection. Try again.", eSession: "Your session ended. Log in again.",
      legal: "By continuing you accept the", privacy: "Privacy policy",
      sPuzzle: "Puzzle", qPuzzle: "Solve today's puzzle", ctaPuzzle: "Solve today's puzzle",
      pzH: "Daily puzzle", pzNew: "{0} scrambled words. Everyone gets the same ones today.", pzDone: "Solved in {0} · rank {1} of {2}",
      pzOwn: "Word scramble", pzOwnS: "Unscramble words from your own list.",
      pzHelp: "Reveal a letter", pzSkip: "Skip", pzAnswer: "Answer: {0}",
      pzNeed: "You need at least 5 single words (4 to 8 letters) for this. Tap + to add some.",
      pzClean: "{0} of {1} solved clean", pzRank: "Rank {0} of {1} today", pzOwnAgain: "Play with my own words",
      share: "Share my result", copied: "Copied. Paste it anywhere.", invite: "Invite a friend",
      shPuzzle: "CineVocab Puzzle #{0} ({1})\n{2} ⏱ {3}\nHow fast can you solve it?",
      shDaily: "CineVocab Daily #{0} ({1})\n{2}\n{3} points. Can you beat me?",
      shDuel: "Duel me on CineVocab! Room code: {0}", shLeague: "Join my CineVocab league \"{0}\". Invite code: {1}",
      shInvite: "I'm learning words from videos with CineVocab. Join me and let's duel!",
      lShareBtn: "Share the invite code",
      invH: "Invite friends", invSub0: "Duels and leagues are more fun together.", invSubN: "{0} friends joined with your link.", invBtn: "Share my invite link",
      remAsk: "Keep your streak: want a reminder each evening?", remYes: "Yes, remind me", remNo: "No thanks",
      remLbl: "Evening reminder", remOn: "Reminder is on.", remFail: "Notifications are not allowed. Turn them on in your phone's settings.",
      remStreak: "🔥 Don't lose your {0}-day streak. Two minutes is enough.", remPlain: "🧩 Today's puzzle is waiting for you.", remBack: "🧩 A new puzzle is ready. Can you beat yesterday's time?",
      report: "Report a problem or abuse", delAcc: "Delete my account",
      delText: "This permanently deletes your account, your words, your scores and your league memberships. It cannot be undone.",
      delPwLbl: "Type your password to confirm", delNameLbl: "Type your username to confirm", delGo: "Delete everything", cancel: "Cancel", delDone: "Your account was deleted.",
    },
    tr: {
      authH: "İzlediğin şeyden kelime kap.", authSub: "Topladığın kelimeler kaybolmasın diye giriş yap.",
      startH: "Hangi dili öğreniyorsun?", startSub: "Kelimeler ve bulmacalar bu dile göre seçilir. Sonra değiştirebilirsin.",
      startSrc: "Öğrendiğim dil", startDst: "Kendi dilim", startGo: "Başla",
      homeH: "Bugünün seansı", hello: "Selam {0}", progH: "Sırada ne var", stamp: "Tamam", playBtn: "Oyna", ctaAdd: "Kelime ekle", ctaDuel: "Düello aç",
      wk0: "Bugünün deliğini aç. Bir oyun yeter.", wkOn: "{0} gün üst üste. Bugün delindi.", wkRisk: "{0} günlük serin var. Bozulmasın, bugün oyna.",
      hFirstS: "Anlamak istediğin bir metni yapıştır ya da hazır bir paket seç.", hDoneT: "Bugünün programı tamam", hDoneS: "Yeni bulmaca yarın geliyor. O zamana kadar bir arkadaşına meydan oku.",
      flowH: "Kelime akışı", flowS: "Kelimeleri kaydır geç. Kurulum yok.", flowHint: "Bildiysen yukarı, tekrar görmek için aşağı kaydır.", flowXp: "+{0} XP", flowRun: "Üst üste {0}", flowEmpty: "Önce birkaç kelime ekle ya da deneme paketini aç.", flowBye: "{0} XP kazandın. Harika akış!", voiceLbl: "Ses", noVoice: "Telefonunda bu dil için ses yok.",
      addH: "Nasıl kelime eklemek istersin?", addSub: "Bir yol seç. Hazır paketler aşağıda.",
      howH: "Nasıl başlamak istersin?", howSub: "Birini seç. Diğerlerini istediğin zaman kullanırsın.", howQuick: "Hemen başla", howQuickS: "Kelimeleri kaydır. Yazı yok.", howSnap: "Altyazıyı fotoğrafla", howSnapS: "Yakında: kamerayı TV'ye tut.", howPaste: "Metin ya da altyazı yapıştır", howPasteS: "Kendi kelimelerinle öğren.", howDuel: "Arkadaşlarınla düello", howDuelS: "Canlı, 16 dilde.", howSkip: "Geç",
      cardsH: "Kartlar", cNo: "Tekrar", cYes: "Bildim", fcTip: "Anlamı görmek için dokun", fcTip2: "Bildiysen sağa, bilemediysen sola kaydır.", cardsRes: "{1} kartın {0} tanesini bildin",
      rk0: "Seyirci", rk1: "Figüran", rk2: "Dublör", rk3: "Yardımcı oyuncu", rk4: "Başrol", rk5: "Yıldız", rk6: "Yönetmen", rk7: "Efsane", rankUp: "Yeni rolün: {0}",
      badgeH: "Ödül rafı", badgeSub: "{1} ödülün {0} tanesi sende", bWords: "kelime", bStreak: "gün seri", bWins: "galibiyet", bMaster: "usta kelime",
      badgeNew: "Yeni ödül: {0} {1}", badgeNeed: "Kilitli. {0} {1} olunca açılır.", badgeHave: "Senin: {0} {1}.",
      setH: "Ayarlar", sndLbl: "Sesler",
      login: "Giriş yap", register: "Kayıt ol", username: "Kullanıcı adı", email: "E-posta", password: "Parola",
      loginGo: "Giriş yap", regGo: "Hesap oluştur", verify: "Doğrula", back: "Geri",
      codeSub: "{0} adresine 6 haneli bir kod gönderdik. Hesabını açmak için kodu gir.",
      recText: "Kurtarma kodun. Güvenli bir yere kaydet: parolanı unutursan hesabına dönmenin tek yolu bu.",
      recOk: "Kaydettim", eFill: "Bütün alanları doldur.",
      google: "Google ile devam et", or2: "ya da", eGoogle: "Google ile giriş yapılamadı.",
      tabHome: "Ana sayfa", tabWords: "Kelimeler", tabAdd: "Videodan kelime ekle", tabPlay: "Oyna", tabMe: "Ben",
      sDaily: "Günlük", sReview: "Tekrar", sDuel: "Düello", sLeague: "Lig", sPacks: "Paketler",
      tryFirst: "Hesap açmadan dene", tryBack: "Denemeye dön", needAcc: "Kelimelerini saklamak ve burayı açmak için ücretsiz hesap aç.", demoPack: "Deneme paketi", guestName: "Misafir", guestBar: "CineVocab'ı deniyorsun. İlerlemen kaybolmasın diye ücretsiz hesap aç.", demoPair: "Bu dil çifti için deneme paketi henüz yok, {0} → {1} açıldı.", knowNum: "{0} kelime kalıcı", knowSub: "listendeki {0} kelimeden. Bir kelime ancak günler içinde üst üste bilince sayılır.",
      goalNum: "{0} / {1} XP", goalLeft: "Bugünkü hedefe {0} XP kaldı", goalDone: "Bugünkü hedef tamam. Yarın görüşürüz!",
      goalToast: "Günlük hedef tamam!", bonusH: "Günlük hedef tamam", bonusS: "{0} günlük seri. Yarın görüşürüz.", levelUp: "Seviye {0}!",
      qDaily: "Günlük meydan okumayı oyna", qPractice: "Bir tur kart bitir", qAdd: "Yeni kelime ekle",
      ctaFirst: "İlk kelimelerini ekle", ctaReview: "{0} kelimeyi tekrar et", ctaDaily: "Bugünün meydan okumasını oyna", ctaPractice: "Yeni kelimelerle pratik yap",
      lvlName: "Seviye {0}", lvlLeft: "Seviye {1} için {0} XP",
      feedH: "Kaynakların", feedEmpty: "Kelime topladığın videolar ve metinler burada görünür.", noVideo: "Diğer kelimeler", wordsCount: "{0} kelime",
      videoH: "Kendi metninden kelime çıkar", videoSub: "Bir metin yapıştır ya da elindeki altyazı dosyasını seç. Bilmediğin kelimeleri bulalım.",
      srcLbl: "Video şu dilde", dstLbl: "Çeviriler şu dilde", swap: "Dilleri değiştir",
      titleLbl: "Bir ad ver (isteğe bağlı)", textLbl: "Metnin", pickFile: "Altyazı ya da metin dosyası seç", myText: "Metnim", textPriv: "Metnin telefonundan çıkmaz. Sunucuya yalnızca kelime listesi gider. Bilgisayarda mı izliyorsun? CineVocab Chrome eklentisi kelimeleri senin yerine toplar, burada görünür.", eText: "Önce bir metin yapıştır ya da dosya seç.", eNoWords: "Bu metinde yeni kelime bulunamadı.", eFile: "Bu dosya okunamadı.", eBig: "Dosya çok büyük (sınır 2 MB).", countLbl: "Kaç yeni kelime?", extract: "Kelimeleri çıkar",
      eSame: "İki dil farklı olmalı.",
      reading: "Metnin okunuyor…", planning: "Yeni kelimelerin seçiliyor…",
      planSum: "Bu metinde {0} farklı kelime var. {1} tanesini daha önce gördün. {2} tanesi yeni.",
      planNone: "Bu metinde senin için yeni kelime yok. {0} kelimenin hepsini daha önce gördün.",
      tapRemove: "Eklemek istemediğin kelimeye dokun.", addN: "{0} kelimeyi listeme ekle", adding: "Çevriliyor ve kaydediliyor… {0}/{1}",
      added: "{0} kelime listene eklendi.", eAdd: "Kaydetme durdu: {0}", seeWords: "Kelimelerimi gör", autoSub: "otomatik altyazı",
      packH: "Hazır paketler", packSub: "Elinde video yok mu? Hazır bir setle başla.", packAdded: "Eklendi",
      wordsH: "Kelimelerim", wordsSub: "{0} kelime · {1} → {2}", search: "Kelime ara…", more: "Daha fazla göster",
      wEmpty: "Henüz kelime yok. + düğmesiyle bir videodan ekle.", wNoMatch: "Eşleşen kelime yok.", know: "Biliyorum", markedKnown: "Biliyorum olarak işaretlendi",
      playH: "Oyna", playSub: "Kelimeleri aklında tutan kısa oyunlar.",
      dailyH: "Günlük meydan okuma", dailyNew: "{0} soru. Bugün herkes aynı soruları çözüyor.", dailyResume: "Devam et: {0} / {1} cevaplandı",
      dailyDone: "Bugün tamam: {0} puan · sıra {1} / {2}", dailyNo: "Bu dil çifti için bugün hazır değil.",
      dailyRes: "{0} / {1} doğru", dailyRank: "Bugün {1} kişi içinde {0}. sıradasın", pts: "puan",
      clozeH: "Altyazıyı tamamla", clozeS: "Sahneden bir cümle, bir kelime eksik.", clozeNeed: "Henüz yeterli örnek cümle yok. Başka bir mod dene.", pracH: "Test", tQuizS: "Dört şıktan doğru anlamı seç.", pracInfo: "{0} tekrar · {1} yeni", tDuelS: "Arkadaşlarınla canlı yarış, 16 dilde.", tLeagueS: "Arkadaşlarınla haftalık sıralama.",
      again: "Tekrar", toHome: "Ana sayfaya dön", pNeed: "Pratik için en az 4 kelime lazım. + düğmesiyle ekle.",
      qCount: "{0} / {1}", xpGain: "+{0} XP", level: "Seviye {0}", you: "sen",
      dH: "Düello", dSub: "Herkes aynı soruyu aynı anda cevaplar. En hızlı doğru cevap en çok puanı alır.",
      dQuick: "Oda kur", dCodeLbl: "Arkadaşından kod mu aldın?", dJoin: "Katıl", dCodeHint: "4 haneli oda kodunu gir.",
      dRoomLbl: "Oda kodu", dShare: "Bu kodu paylaş. Arkadaşların uygulamadan ya da siteden katılabilir.", dHost: "kurucu",
      dStart: "Düelloyu başlat", dWaitHost: "Kurucunun başlatması bekleniyor…", dLeave: "Odadan çık", dGetReady: "Hazırlan",
      dAnswered: "{0} / {1} kişi cevapladı", dRight: "Doğru! +{0} (toplam {1})", dWrong: "Doğru cevap: {0}",
      dEndH: "Sonuçlar", dAgain: "Tekrar oyna", dLost: "Oda kapandı ya da bağlantı koptu.",
      lH: "Ligler", lSub: "Lig, sen ve arkadaşların için özel bir haftalık sıralamadır.", lNone: "Henüz bir ligde değilsin.",
      lRow: "{0} üye · sıran: {1}", lNewLbl: "Yeni lig kur", lCreate: "Kur", lJoinLbl: "Davet koduyla katıl",
      lNameHint: "Lig adı en az 2 karakter olmalı.", lCodeHint: "Davet kodunu gir.",
      lInfo: "Davet kodu: {0} · bu hafta", lLeave: "Bu ligden çık",
      streak: "Günlük seri", wordsN: "Kelime", wins: "Düello galibiyeti", goalLbl: "Günlük hedef", appLang: "Uygulama dili", logout: "Çıkış yap",
      eNet: "Bağlantı yok. Tekrar dene.", eSession: "Oturumun sona erdi. Tekrar giriş yap.",
      legal: "Devam ederek şunu kabul edersin:", privacy: "Gizlilik politikası",
      sPuzzle: "Bulmaca", qPuzzle: "Günün bulmacasını çöz", ctaPuzzle: "Günün bulmacasını çöz",
      pzH: "Günün bulmacası", pzNew: "{0} karışık kelime. Bugün herkes aynı kelimeleri çözüyor.", pzDone: "{0} sürede çözdün · sıra {1} / {2}",
      pzOwn: "Harf bulmacası", pzOwnS: "Kendi listendeki kelimelerin harflerini diz.",
      pzHelp: "Harf aç", pzSkip: "Geç", pzAnswer: "Cevap: {0}",
      pzNeed: "Bunun için en az 5 tek kelime (4-8 harfli) lazım. + düğmesiyle ekle.",
      pzClean: "{1} kelimenin {0} tanesi temiz", pzRank: "Bugün {1} kişi içinde {0}. sıradasın", pzOwnAgain: "Kendi kelimelerimle oyna",
      share: "Sonucumu paylaş", copied: "Kopyalandı. İstediğin yere yapıştır.", invite: "Arkadaşını davet et",
      shPuzzle: "CineVocab Bulmaca #{0} ({1})\n{2} ⏱ {3}\nSen kaç saniyede çözersin?",
      shDaily: "CineVocab Günlük #{0} ({1})\n{2}\n{3} puan. Beni geçebilir misin?",
      shDuel: "CineVocab'da düelloya gel! Oda kodu: {0}", shLeague: "CineVocab'daki \"{0}\" ligime katıl. Davet kodu: {1}",
      shInvite: "CineVocab ile videolardan kelime öğreniyorum. Sen de gel, düello yapalım!",
      lShareBtn: "Davet kodunu paylaş",
      invH: "Arkadaşlarını davet et", invSub0: "Düello ve ligler arkadaşlarla daha eğlenceli.", invSubN: "Bağlantınla {0} arkadaşın katıldı.", invBtn: "Davet bağlantımı paylaş",
      remAsk: "Serin bozulmasın: her akşam hatırlatalım mı?", remYes: "Evet, hatırlat", remNo: "Hayır",
      remLbl: "Akşam hatırlatması", remOn: "Hatırlatma açık.", remFail: "Bildirim izni yok. Telefonun ayarlarından açabilirsin.",
      remStreak: "🔥 {0} günlük serin bugün bitmesin. İki dakikan yeter.", remPlain: "🧩 Bugünün bulmacası seni bekliyor.", remBack: "🧩 Yeni bulmaca hazır. Dünkü süreni geçebilir misin?",
      report: "Sorun ya da kötüye kullanım bildir", delAcc: "Hesabımı sil",
      delText: "Hesabın, kelimelerin, puanların ve lig üyeliklerin kalıcı olarak silinir. Bu işlem geri alınamaz.",
      delPwLbl: "Onaylamak için parolanı yaz", delNameLbl: "Onaylamak için kullanıcı adını yaz", delGo: "Her şeyi sil", cancel: "Vazgeç", delDone: "Hesabın silindi.",
    },
  };
  function t(key) {
    let s = (T[S.ui] && T[S.ui][key]) || T.en[key] || key;
    for (let i = 1; i < arguments.length; i++) s = s.split("{" + (i - 1) + "}").join(arguments[i]);
    return s;
  }
  function langName(code) {
    try { const n = new Intl.DisplayNames([S.ui], { type: "language" }).of(code); return n.charAt(0).toLocaleUpperCase(S.ui) + n.slice(1); }
    catch (e) { return String(code).toUpperCase(); }
  }
  function applyTexts() {
    document.documentElement.lang = S.ui;
    document.querySelectorAll("[data-i]").forEach((n) => { n.textContent = t(n.getAttribute("data-i")); });
    document.querySelectorAll("[data-i-ph]").forEach((n) => { n.placeholder = t(n.getAttribute("data-i-ph")); });
    document.querySelectorAll("[data-i-aria]").forEach((n) => { n.setAttribute("aria-label", t(n.getAttribute("data-i-aria"))); });
    $("tryBtn").textContent = t(S.guest ? "tryBack" : "tryFirst");
    for (const id of ["src", "dst"]) {
      const sel = $(id); sel.textContent = "";
      for (const code of LANGS) sel.add(new Option(langName(code), code));
      sel.value = id === "src" ? S.src : S.dst;
    }
    $("uiLang").value = S.ui; $("goalSel").value = String(S.goal);
    $("lnkPrivacy").href = $("lnkPrivacy0").href = API + "/privacy?lang=" + S.ui;
    setAuthMode(authMode);
  }

  // ---------------------------------------------------------------- kucuk yardimcilar
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  // Ikon: index.html'deki ikon setinden (emoji yerine).
  function icon(name) {
    const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg"), use = document.createElementNS(NS, "use");
    svg.setAttribute("class", "ic"); svg.setAttribute("aria-hidden", "true"); use.setAttribute("href", "#i-" + name); svg.appendChild(use); return svg;
  }
  // Sonuc kareleri (🟩🟨🟥 metnini renkli kutulara cevirir; paylasilan metinde emoji kalir).
  function marksInto(node, grid) {
    node.textContent = "";
    for (const ch of Array.from(String(grid || ""))) { const c = ch === "🟩" ? "g" : ch === "🟨" ? "y" : ch === "🟥" ? "r" : ""; if (c) node.appendChild(el("i", c)); }
  }
  // Biletin iki yanindaki centigi delikli cizginin hizasina getirir.
  function notch(ticket) {
    const inn = ticket.querySelector(".ticket-in"), pf = inn && inn.querySelector(".perf");
    if (pf) inn.style.setProperty("--ny", Math.round(pf.getBoundingClientRect().top - inn.getBoundingClientRect().top + 1) + "px");
  }
  // Seviye arttikca degisen rol: Seyirci, Figuran, ... Efsane.
  const RANK_AT = [1, 3, 5, 8, 12, 17, 25, 40];
  function rankOf(level) { let i = 0; while (i + 1 < RANK_AT.length && level >= RANK_AT[i + 1]) i++; return i; }
  // Kisa sesler (dosya yok, telefon uretir). Ayarlardan kapatilabilir.
  let actx = null;
  function sfx(kind) {
    if (store.get("snd") === "0") return;
    const seq = { ok: [[660, 0, .09], [990, .08, .14]], bad: [[196, 0, .22, "square"]], tap: [[520, 0, .04]], combo: [[784, 0, .07], [1175, .07, .12]],
      win: [[523, 0, .1], [659, .1, .1], [784, .2, .1], [1047, .3, .25]] }[kind];
    if (!seq) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      actx = actx || new AC(); if (actx.state === "suspended") actx.resume();
      const now = actx.currentTime;
      for (const n of seq) {
        const o = actx.createOscillator(), g = actx.createGain(), at = now + n[1];
        o.type = n[3] || "triangle"; o.frequency.value = n[0];
        g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(n[3] ? .05 : .13, at + .012); g.gain.exponentialRampToValueAtTime(.0001, at + n[2]);
        o.connect(g); g.connect(actx.destination); o.start(at); o.stop(at + n[2] + .03);
      }
    } catch (e) {}
  }
  // Ust uste dogru cevap sayaci: 2 ve ustunde "3x" gibi gorunur.
  let run = 0;
  function combo(ok, node) {
    run = ok ? run + 1 : 0;
    if (!node) return;
    node.hidden = run < 2;
    if (run >= 2) { node.textContent = run + "x"; node.style.animation = "none"; void node.offsetWidth; node.style.animation = ""; if (run % 5 === 0) sfx("combo"); }
  }
  function say(node, text, kind) { node.textContent = text || ""; node.className = "note" + (kind ? " " + kind : ""); }
  let toastTimer = 0;
  function toast(text) { $("toast").textContent = text; $("toast").hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $("toast").hidden = true; }, 2400); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  const calm = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  // Dogru/yanlis cevapta kisa titresim (telefon destekliyorsa).
  function buzz(ok) { sfx(ok ? "ok" : "bad"); try { if (navigator.vibrate) navigator.vibrate(ok ? 12 : [40, 50, 40]); } catch (e) {} }
  // Sayiyi sifirdan hedefe dogru saydirir.
  function countUp(node, to) {
    if (calm() || !(to > 0)) { node.textContent = to; return; }
    node.textContent = "0";
    const t0 = performance.now();
    (function step(now) { const k = Math.min(1, (now - t0) / 700); node.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); })(t0);
  }
  // Kutlama: ekranin ustunden konfeti.
  function confetti(n) {
    if (calm()) return;
    const c = $("fx"), x = c.getContext("2d"), W = c.width = innerWidth, H = c.height = innerHeight;
    const cols = ["#111111", "#ffffff", "#E5322D", "#129A4D", "#ffffff"];
    sfx("win");
    const ps = Array.from({ length: n || 90 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .5, y: H * .38, vx: (Math.random() - .5) * 10,
      vy: -Math.random() * 12 - 4, s: 6 + Math.random() * 6, r: Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
    const t0 = performance.now();
    (function step(now) {
      const k = (now - t0) / 1800; x.clearRect(0, 0, W, H);
      if (k >= 1) return;
      for (const p of ps) { p.vy += .38; p.x += p.vx; p.y += p.vy; p.r += .2; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = 1 - k * k; x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); x.restore(); }
      requestAnimationFrame(step);
    })(t0);
  }

  // ---------------------------------------------------------------- API
  // Butun sunucu istekleri buradan gecer: oturum anahtarini ekler, hatayi okunur mesaja cevirir.
  // Hesapsiz deneme: sunucu yerine telefondaki kucuk deste cevap verir. Hesap isteyen her sey kayit ekranina yollar.
  function demoState() { try { const o = JSON.parse(store.get("demo") || "{}"); return { xp: Number(o.xp) || 0, d: o.d === dayKey() ? o.d : dayKey(), today: o.d === dayKey() ? Number(o.today) || 0 : 0, ok: o.ok || {}, known: Array.isArray(o.known) ? o.known : [] }; } catch (e) { return { xp: 0, d: dayKey(), today: 0, ok: {}, known: [] }; } }
  function demoApi(path, opt) {
    const p = path.split("?")[0], body = opt.body, st = demoState();
    const deck = CVDEMO.words(S.src, S.dst, t("demoPack")).filter((x) => !st.known.includes(x.tr));
    const save = () => store.set("demo", JSON.stringify(st));
    if (p === "/api/ext/home") return { username: t("guestName"), level: 1 + Math.floor(st.xp / 200), xp: st.xp, xp_into: st.xp % 200, xp_level: 200, xp_today: st.today,
      streak: st.today > 0 ? 1 : 0, wins: 0, words: deck.length, pair_words: deck.length, due: st.today > 0 ? 0 : Math.min(10, deck.length), new: 0,
      mastered: deck.filter((x) => (st.ok[x.tr] || 0) >= 3).length, recent: [] };
    if (p === "/api/vocab") return { words: deck, known: [] };
    if (p === "/api/videos") return deck.length ? [{ episode: t("demoPack"), count: deck.length, last: "", thumb: "" }] : [];
    if (p === "/api/packs") return { packs: [] };
    if (p === "/api/leagues" && !body) return [];
    if (p === "/api/srs/session") return { due: deck.length, words: shuffle(deck.slice()).slice(0, 10).map((x) => ({ tr: x.tr, eng: x.eng })) };
    if (p === "/api/srs/report") {
      let xp = 0;
      for (const it of (body && body.items) || []) { if (it && it.ok) { xp += 10; st.ok[it.w] = (st.ok[it.w] || 0) + 1; } }
      st.xp += xp; st.today += xp; save(); return { ok: true, xp: xp };
    }
    if (p === "/api/known") { for (const w of (body && body.words) || []) if (!st.known.includes(w)) st.known.push(String(w).slice(0, 60)); save(); return { changed: 1 }; }
    if (p === "/api/daily" || p === "/api/puzzle") throw new Error("demo");       // gunluk oyunlar hesapla gelir; kendi kelimelerinle bulmaca acilir
    askAccount(); throw new Error(t("needAcc"));
  }
  function askAccount() {
    showView("v-auth"); showAuthStep("form"); say($("aMsg"), t("needAcc"), "ok");
  }
  async function api(path, opt) {
    opt = opt || {};
    // Giris, kayit ve ayar istekleri misafirken de gercek sunucuya gider.
    if (S.guest && !/^\/api\/(ext\/(login|register|google|config)|signup\/)/.test(path)) return demoApi(path, opt);
    const headers = {};
    if (opt.body) headers["Content-Type"] = "application/json";
    if (S.key) headers.Authorization = "Bearer " + S.key;
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), opt.timeout || 20000);
    let r;
    try { r = await fetch(API + path, { method: opt.body ? "POST" : "GET", headers: headers, body: opt.body ? JSON.stringify(opt.body) : undefined, signal: ctrl.signal }); }
    catch (e) { throw new Error(t("eNet")); }
    finally { clearTimeout(timer); }
    let d = null;
    try { d = await r.json(); } catch (e) {}
    // soft: 401 "parola hatali" anlamina gelebilen isteklerde (hesap silme onayi) oturumu kapatma
    if (r.status === 401 && S.key && !opt.soft) { endSession(); throw new Error(t("eSession")); }
    if (!r.ok) throw new Error((d && typeof d.detail === "string" && d.detail) || "HTTP " + r.status);
    return d;
  }
  const pairQ = () => "?src=" + S.src + "&dst=" + S.dst;

  // ---------------------------------------------------------------- gezinme
  // Alt sayfalar (soru, sonuc, duello, ligler) "Oyna" sekmesine baglidir. Telefonun geri tusu bir onceki ekrana doner.
  const TAB_OF = { "v-flow": "v-play", "v-quiz": "v-play", "v-cards": "v-play", "v-puzzle": "v-play", "v-result": "v-play", "v-duel": "v-play", "v-leagues": "v-play" };
  let curView = "";
  function showView(id, push) {
    if (curView === "v-duel" && id !== "v-duel" && sock) duelClose();
    if (curView === "v-quiz" && id !== "v-quiz") stopQuiz();
    if (curView === "v-puzzle" && id !== "v-puzzle") stopPuzzle();
    if (curView === "v-cards" && id !== "v-cards") { C.busy = true; stopSay(); }
    if (curView === "v-flow" && id !== "v-flow") flowStop();
    curView = id;
    document.querySelectorAll("main section").forEach((s) => { s.hidden = s.id !== id; });
    $("tabs").hidden = id === "v-auth" || id === "v-start" || id === "v-how" || id === "v-flow";
    const tab = TAB_OF[id] || id;
    document.querySelectorAll("#tabs button").forEach((b) => { if (b.dataset.view === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    main.scrollTop = 0;
    if (push !== false) { try { history.pushState({ v: id }, ""); } catch (e) {} }
  }
  function addMode(form) { $("addForm").hidden = !form; $("addPick").hidden = form; $("v-add").classList.toggle("form", form); main.scrollTop = 0; }
  function go(id, push) {
    if (S.guest && (id === "v-add" || id === "v-me" || id === "v-duel" || id === "v-leagues")) return askAccount();
    showView(id, push);
    if (id === "v-home") loadHome();
    else if (id === "v-words") showWords();
    else if (id === "v-add") { addMode(false); loadPacks(); }
    else if (id === "v-play") loadPlay();
    else if (id === "v-me") showMe();
    else if (id === "v-leagues") loadLeagues();
    else if (id === "v-duel") { say($("dMsg"), ""); duelPart("home"); }
  }
  window.addEventListener("popstate", function (ev) {
    if (!S.key && !S.guest) return showView("v-auth", false);
    const v = ev.state && ev.state.v;
    go(v && v !== "v-auth" && v !== "v-start" && v !== "v-how" && v !== "v-flow" && v !== "v-quiz" && v !== "v-cards" && v !== "v-puzzle" && v !== "v-result" ? v : "v-home", false);
  });
  document.querySelectorAll("#tabs button").forEach((b) => b.addEventListener("click", () => { if (b.dataset.view !== "v-words") S.filterEp = null; go(b.dataset.view); }));

  // ---------------------------------------------------------------- giris / kayit
  let authMode = "login", authStep = "form", mailOn = false, pendingKey = "", googleId = "";
  function isNative() { const c = window.Capacitor; return !!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform()); }
  function setAuthMode(m) {
    authMode = m;
    $("segLogin").setAttribute("aria-pressed", m === "login");
    $("segReg").setAttribute("aria-pressed", m === "register");
    $("aMailRow").hidden = !(m === "register" && mailOn);
    $("aPass").autocomplete = m === "login" ? "current-password" : "new-password";
    $("aGo").textContent = t(m === "login" ? "loginGo" : "regGo");
  }
  function showAuthStep(step) {      // "form" | "code" | "rec"
    authStep = step;
    $("authSeg").hidden = step !== "form"; $("authForm").hidden = step !== "form";
    $("gBox").hidden = step !== "form" || !googleId || !isNative();
    $("codeForm").hidden = step !== "code"; $("recBox").hidden = step !== "rec";
    say($("aMsg"), "");
  }
  function startSession(key) {
    S.key = key; store.set("key", key);
    if (S.guest) { S.guest = false; store.del("guest"); store.del("demo"); S.home = S.daily = S.puzzle = S.videos = S.vocab = S.vocabRaw = null; }
    $("aPass").value = ""; $("aCode").value = "";
    showAuthStep("form"); enterApp();
  }
  function endSession() {
    if (sock) duelClose();
    S.key = ""; S.home = S.daily = S.puzzle = S.videos = S.vocab = S.vocabRaw = null; store.del("key");
    $("streak").hidden = true;
    showView("v-auth", false);
  }
  // Kayit bitince sunucu bir kurtarma kodu verir; kullaniciya bir kez gosterilir.
  function afterRegister(d) {
    if (d.recovery) { pendingKey = d.key; $("recCode").textContent = d.recovery; showAuthStep("rec"); }
    else startSession(d.key);
  }
  $("segLogin").addEventListener("click", () => setAuthMode("login"));
  $("segReg").addEventListener("click", () => setAuthMode("register"));
  $("authForm").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    const username = $("aUser").value.trim(), password = $("aPass").value, email = $("aMail").value.trim();
    if (!username || !password || (authMode === "register" && mailOn && !email)) return say($("aMsg"), t("eFill"), "bad");
    $("aGo").disabled = true; say($("aMsg"), "");
    try {
      if (authMode === "login") startSession((await api("/api/ext/login", { body: { username: username, password: password } })).key);
      else if (mailOn) {
        await api("/api/signup/start", { body: { username: username, email: email, password: password, lang: S.ui } });
        $("codeSub").textContent = t("codeSub", email); showAuthStep("code"); $("aCode").focus();
      } else afterRegister(await api("/api/ext/register", { body: { username: username, password: password } }));
    } catch (e) { say($("aMsg"), e.message, "bad"); }
    $("aGo").disabled = false;
  });
  $("codeForm").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    try { afterRegister(await api("/api/signup/verify", { body: { email: $("aMail").value.trim(), code: $("aCode").value.trim(), ext: true } })); }
    catch (e) { say($("aMsg"), e.message, "bad"); }
  });
  $("codeBack").addEventListener("click", () => showAuthStep("form"));
  $("recOk").addEventListener("click", () => { const k = pendingKey; pendingKey = ""; startSession(k); });

  // Google ile giris (yalnizca telefonda): Google imzali bir kimlik belirteci verir, sunucu onu dogrulayip oturum acar.
  function native(plugin, method, options) {
    const c = window.Capacitor;
    if (c && c.Plugins && c.Plugins[plugin] && typeof c.Plugins[plugin][method] === "function") return c.Plugins[plugin][method](options);
    if (c && typeof c.nativePromise === "function") return c.nativePromise(plugin, method, options);
    return Promise.reject(new Error("native"));
  }
  $("gBtn").addEventListener("click", async function () {
    $("gBtn").disabled = true; say($("aMsg"), "");
    try {
      // nonce: her giriste uretilen tek kullanimlik rastgele deger; belirtecin baska bir giris icin kullanilmasini onler
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
      await native("SocialLogin", "initialize", { google: { webClientId: googleId, skipAuthOnlyAuthorizationAfterSignIn: true } });
      const res = await native("SocialLogin", "login", { provider: "google", options: { nonce: nonce } });
      const token = res && res.result && res.result.idToken;
      if (!token) throw new Error(t("eGoogle"));
      startSession((await api("/api/ext/google", { body: { credential: token, nonce: nonce } })).key);
    } catch (e) {
      const m = String((e && e.message) || "");
      if (!/cancel/i.test(m)) say($("aMsg"), m && m !== "native" ? t("eGoogle") + " (" + m.slice(0, 140) + ")" : t("eGoogle"), "bad");
    }
    $("gBtn").disabled = false;
  });

  // ---------------------------------------------------------------- paylasma ve hatirlatma
  // Paylasilan her mesajin sonuna davet baglantisi eklenir (?ref=kullanici: katilan arkadas davet sayisina yazilir).
  function shareUrl() {
    const u = S.home && S.home.username;
    return String(CFG.share || API).replace(/\/+$/, "") + (u ? "/?ref=" + encodeURIComponent(u) : "");
  }
  // Telefonun paylasma penceresini acar; yoksa metni panoya kopyalar.
  async function share(text, url) {
    url = url || shareUrl();
    const full = text + "\n" + url;
    if (isNative()) {
      try { await native("Share", "share", { text: text, url: url, dialogTitle: "CineVocab" }); return; }
      catch (e) { if (/cancel/i.test(String((e && e.message) || ""))) return; }
    }
    try { if (navigator.share) { await navigator.share({ text: full }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(full); toast(t("copied")); } catch (e) { toast(full); }
  }
  // Aksam hatirlatmasi: bildirim telefonda kurulur (sunucu yok). Bugun oynandiysa yarina, oynanmadiysa bu aksama.
  const REM_IDS = [{ id: 71 }, { id: 72 }];
  async function planReminder() {
    if (!isNative() || store.get("remind") !== "1" || !S.home) return;
    try {
      const at = new Date(); at.setHours(19, 30, 0, 0);
      if (S.home.xp_today > 0 || at.getTime() - Date.now() < 60000) at.setDate(at.getDate() + 1);
      const later = new Date(at.getTime() + 2 * 864e5);       // iki gun sonra: uzaklasan kullaniciya ikinci bir hatirlatma
      await native("LocalNotifications", "cancel", { notifications: REM_IDS }).catch(() => {});
      await native("LocalNotifications", "schedule", { notifications: [
        { id: 71, title: "CineVocab", body: S.home.streak > 0 ? t("remStreak", S.home.streak) : t("remPlain"), schedule: { at: at.toISOString(), allowWhileIdle: true } },
        { id: 72, title: "CineVocab", body: t("remBack"), schedule: { at: later.toISOString(), allowWhileIdle: true } },
      ] });
    } catch (e) {}
  }
  async function setReminder(on) {
    if (!on) { store.set("remind", "0"); try { await native("LocalNotifications", "cancel", { notifications: REM_IDS }); } catch (e) {} return true; }
    let ok = false;
    try {
      let p = await native("LocalNotifications", "checkPermissions");
      if (!p || p.display !== "granted") p = await native("LocalNotifications", "requestPermissions");
      ok = !!p && p.display === "granted";
    } catch (e) {}
    if (!ok) { store.set("remind", "0"); toast(t("remFail")); return false; }
    store.set("remind", "1"); await planReminder(); toast(t("remOn")); return true;
  }
  $("remYes").addEventListener("click", () => { $("rRemind").hidden = true; notch($("v-result")); setReminder(true); });
  $("remNo").addEventListener("click", () => { $("rRemind").hidden = true; notch($("v-result")); store.set("remind", "0"); });

  // ---------------------------------------------------------------- ana sayfa
  // Sunucudan ozet (seri, XP, tekrar sayisi) ve gunluk meydan okuma durumunu alir.
  async function refresh() {
    const res = await Promise.all([api("/api/ext/home" + pairQ()), api("/api/daily" + pairQ()).catch(() => null), api("/api/puzzle" + pairQ()).catch(() => null)]);
    S.home = res[0]; S.daily = res[1]; S.puzzle = res[2];
    planReminder();
    const h = S.home, prevStreak = Number(store.get("streak")) || 0, prevLvl = Number(store.get("lvl")) || 0;
    $("streakN").textContent = h.streak; $("streak").hidden = false;
    if (h.streak > prevStreak && prevStreak) { $("streak").classList.remove("pop"); void $("streak").offsetWidth; $("streak").classList.add("pop"); }
    store.set("streak", h.streak);
    if (prevLvl && h.level > prevLvl) {
      confetti(120);
      toast(t("levelUp", h.level) + (rankOf(h.level) > rankOf(prevLvl) ? "\n" + t("rankUp", t("rk" + rankOf(h.level))) : ""));
    }
    store.set("lvl", h.level);
    checkBadges(h);
    if (h.xp_today >= S.goal && !flags().goal) { setFlag("goal"); bonusCard(h); }
    return h;
  }
  // Gunluk hedef bitince sade bir kart: sayi sayarak yukselir, dokununca ya da 4 sn sonra kapanir.
  let bonusTimer = 0;
  function bonusCard(h) {
    const b = $("bonus"); $("bonusH").textContent = t("bonusH"); $("bonusS").textContent = t("bonusS", h.streak || 1);
    b.classList.remove("out"); b.hidden = false; sfx("tap"); try { if (navigator.vibrate) navigator.vibrate(14); } catch (e) {}
    countUp($("bonusN"), h.xp_today);
    clearTimeout(bonusTimer);
    const close = function () { clearTimeout(bonusTimer); b.classList.add("out"); setTimeout(function () { b.hidden = true; }, calm() ? 0 : 300); };
    b.onclick = close; bonusTimer = setTimeout(close, 4000);
  }
  async function loadHome() {
    if (S.home) renderHome();
    try { await refresh(); if (curView === "v-home") renderHome(); } catch (e) { if (S.key) toast(e.message); }
    loadFeed();
  }
  // Oduller: kelime, seri, duello ve ustalik esikleri. Kazanilanlar telefonda da saklanir (seri bozulsa bile odul kalir).
  function badgeList(h) {
    let have = [];
    try { have = JSON.parse(store.get("badges") || "[]"); } catch (e) {}
    const out = [];
    const add = (pre, n, val, label, cls) => out.push({ id: pre + n, n: n, label: label, cls: cls, on: val >= n || have.includes(pre + n) });
    for (const n of [10, 50, 100, 250, 500]) add("w", n, h.words, t("bWords"), "");
    for (const n of [3, 7, 14, 30]) add("s", n, h.streak, t("bStreak"), "red");
    for (const n of [1, 10]) add("d", n, h.wins, t("bWins"), "dark");
    add("m", 10, h.mastered || 0, t("bMaster"), "green");
    return out;
  }
  function checkBadges(h) {
    const first = store.get("badges") === null;
    let have = [];
    try { have = JSON.parse(store.get("badges") || "[]"); } catch (e) {}
    const fresh = badgeList(h).filter((b) => b.on && !have.includes(b.id));
    if (!fresh.length && !first) return;
    store.set("badges", JSON.stringify(have.concat(fresh.map((b) => b.id))));
    if (first) return;                      // ilk acilista eldekiler sessizce yazilir
    const top = fresh[fresh.length - 1];
    setTimeout(() => { confetti(90); toast(t("badgeNew", top.n, top.label)); }, 900);
  }
  // Haftalik delgi karti: Pazartesi-Pazar. Seri gunleri delinmis gorunur; bugun oynanmadiysa bugunun deligi atar.
  function renderWeek(h) {
    const box = $("week"), now = new Date(), dow = (now.getDay() + 6) % 7, played = h.xp_today > 0;
    const len = Math.max(Number(h.streak) || 0, played ? 1 : 0), lastOn = played ? dow : dow - 1, firstOn = lastOn - len + 1;
    let fmt = null;
    try { fmt = new Intl.DateTimeFormat(S.ui, { weekday: "narrow" }); } catch (e) {}
    const freshPunch = played && !flags().punched;
    if (freshPunch) setFlag("punched");
    box.textContent = "";
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(now.getDate() - dow + i);
      const on = len > 0 && i >= firstOn && i <= lastOn;
      const cell = el("div", "day" + (on ? " on" : "") + (i === dow ? " today" : "") + (i > dow ? " next" : "") + (on && i === dow && freshPunch ? " fresh" : ""));
      const hole = el("i"); hole.appendChild(icon("check"));
      cell.append(document.createTextNode(fmt ? fmt.format(d) : String(i + 1)), hole); box.appendChild(cell);
    }
    $("weekNote").textContent = played ? t("wkOn", len) : h.streak > 0 ? t("wkRisk", h.streak) : t("wk0");
  }
  // Bugun yapilacaklar, onem sirasiyla. Ilk bitmemis is "bilet" olur, kalanlar altta listelenir.
  function todayItems() {
    const h = S.home, d = S.daily, pz = S.puzzle, f = flags(), out = [];
    const puzzle = pz && pz.ready ? { id: "puzzle", icon: "puzzle", title: t("pzH"), no: pz.num ? "#" + pz.num : "", done: !!pz.done, run: startPuzzle, xp: pz.done ? "" : "+50 XP",
      sub: pz.done && pz.result ? t("pzDone", clock(Number(pz.result.secs) || 0), pz.result.rank || "-", pz.result.players || "-") : t("pzNew", pz.total || 5) } : null;
    const daily = d && d.ready ? { id: "daily", icon: "target", title: t("dailyH"), no: d.num ? "#" + d.num : "", done: !!d.done, run: startDaily,
      sub: d.done && d.result ? t("dailyDone", d.result.score, d.result.rank || "-", d.result.players) : d.started ? t("dailyResume", d.answered, d.total) : t("dailyNew", d.total) } : null;
    const cards = h.pair_words >= 4 ? { id: "cards", icon: "cards", title: h.due > 0 ? t("ctaReview", h.due) : t("cardsH"), done: !!f.practice, run: startCards,
      sub: h.due > 0 || h.new > 0 ? t("pracInfo", h.due, h.new) : t("fcTip2") } : null;
    const add = { id: "add", icon: "plus", title: h.pair_words < 4 ? t("ctaFirst") : t("qAdd"), done: !!f.added, run: () => go("v-add"), sub: t("hFirstS"), btn: t("ctaAdd") };
    if (puzzle) out.push(puzzle);
    if (h.pair_words < 4) out.push(add);
    if (cards && h.due > 0) out.push(cards);
    if (daily) out.push(daily);
    if (cards && !out.includes(cards)) out.push(cards);
    if (!out.includes(add) && (out.length < 3 || h.pair_words < 20)) out.push(add);
    return out;
  }
  function renderHome() {
    const h = S.home;
    $("hello").textContent = t("hello", h.username || "");
    renderWeek(h);
    const items = todayItems(), hero = items.find((x) => !x.done), rest = items.filter((x) => x !== hero);
    // bilet: su an yapilacak en anlamli is (bulmaca kelime listesi istemez: yeni kullanici hemen oynar)
    $("hero").classList.toggle("done", !hero);
    $("heroT").textContent = hero ? hero.title : t("hDoneT");
    $("heroS").textContent = hero ? hero.sub : t("hDoneS");
    $("heroNo").textContent = hero ? hero.no || "" : "";
    $("heroXp").textContent = hero ? hero.xp || "" : "";
    $("cta").textContent = hero ? hero.btn || t("playBtn") : t("ctaDuel");
    $("cta").onclick = hero ? hero.run : () => go("v-duel");
    notch($("hero"));
    const ul = $("quests"); ul.textContent = "";
    for (const q of rest) {
      const li = el("li", q.done ? "done" : ""), pi = el("span", "pi"), pt = el("span", "pt");
      pi.appendChild(icon(q.icon)); pt.append(el("b", "", q.title), el("em", "", q.sub));
      li.append(pi, pt);
      if (q.done) li.appendChild(el("span", "stamp", t("stamp"))); else { const g = el("span", "go"); g.appendChild(icon("chev")); li.appendChild(g); }
      if (!q.done || q.id === "puzzle" || q.id === "daily") li.addEventListener("click", q.run);     // bitmis bulmaca/gunluk: sonucu gosterir
      ul.appendChild(li);
    }
    $("progH").hidden = !rest.length;
    // gunluk XP hedefi ve seviye
    const done = h.xp_today >= S.goal;
    document.querySelector(".meter").classList.toggle("done", done);
    $("knowNum").textContent = t("knowNum", h.mastered || 0); $("knowSub").textContent = t("knowSub", h.pair_words != null ? h.pair_words : h.words);
    $("guestBar").hidden = !S.guest; $("guestBar").textContent = t("guestBar");
    $("goalNum").textContent = t("goalNum", h.xp_today, S.goal);
    $("goalSub").textContent = done ? t("goalDone") : t("goalLeft", S.goal - h.xp_today);
    $("goalFill").style.width = Math.round(Math.min(1, h.xp_today / S.goal) * 100) + "%";
    $("lvlName").textContent = t("lvlName", h.level) + " · " + t("rk" + rankOf(h.level));
    $("lvlLeft").textContent = t("lvlLeft", h.xp_level - h.xp_into, h.level + 1);
    $("lvlFill").style.width = Math.round(h.xp_into / h.xp_level * 100) + "%";
  }
  // Video akisi: kelime eklenen videolar, kapak gorseliyle.
  async function loadFeed() {
    try { S.videos = await api("/api/videos" + pairQ()); } catch (e) { return; }
    if (curView !== "v-home") return;
    const box = $("feed"); box.textContent = "";
    const list = (S.videos || []).slice(0, 12);
    for (const v of list) {
      const b = el("button", "post"), th = el("div", "thumb"), body = el("div", "body");
      b.type = "button"; th.appendChild(icon("film"));
      if (typeof v.thumb === "string" && /^https:\/\//.test(v.thumb)) {
        const img = new Image(); img.alt = ""; img.loading = "lazy"; img.referrerPolicy = "no-referrer";
        img.addEventListener("error", () => img.remove()); img.src = v.thumb; th.appendChild(img);
      }
      body.append(el("b", "", v.episode || t("noVideo")), el("span", "n", t("wordsCount", v.count)));
      b.append(th, body);
      b.addEventListener("click", () => { S.filterEp = v.episode || ""; go("v-words"); });
      box.appendChild(b);
    }
    $("feedEmpty").textContent = t("feedEmpty"); $("feedEmpty").hidden = list.length > 0;
  }

  // ---------------------------------------------------------------- kelimeler
  const PAGE = 100;
  let shown = PAGE;
  async function loadVocab() {
    if (!S.vocab) {
      const d = await api("/api/vocab" + pairQ());
      const seen = new Set(), list = [];
      S.vocabRaw = d.words.map((w) => ({ w: w.tr, t: w.eng, ep: w.episode || "", s: w.sentence || "" }));
      for (const x of S.vocabRaw) { if (!seen.has(x.w)) { seen.add(x.w); list.push(x); } }
      S.vocab = list;
    }
    return S.vocab;
  }
  async function showWords() {
    $("wordsSub").textContent = ""; $("wEmpty").hidden = true;
    try { await loadVocab(); } catch (e) { $("wl").textContent = ""; $("wEmpty").textContent = e.message; $("wEmpty").hidden = false; return; }
    shown = PAGE; renderWords();
  }
  function renderWords() {
    let all = S.vocab || [];
    const fb = $("wFilter");
    if (S.filterEp !== null) {       // ana sayfadaki bir videoya dokunulduysa yalnizca o videonun kelimeleri
      const seen = new Set();
      all = (S.vocabRaw || []).filter((x) => x.ep === S.filterEp && !seen.has(x.w) && seen.add(x.w));
      fb.textContent = ""; fb.append(el("span", "", S.filterEp || t("noVideo")), icon("x")); fb.hidden = false;
    } else fb.hidden = true;
    const qv = $("wq").value.trim().toLowerCase();
    const list = qv ? all.filter((x) => x.w.toLowerCase().includes(qv) || String(x.t).toLowerCase().includes(qv)) : all;
    $("wordsSub").textContent = t("wordsSub", all.length, langName(S.src), langName(S.dst));
    const ul = $("wl"); ul.textContent = "";
    for (const x of list.slice(0, shown)) {
      const li = el("li"), box = el("div", "w"), k = el("button", "", t("know"));
      box.append(el("b", "", x.w), el("span", "", x.t)); k.type = "button";
      k.addEventListener("click", async function () {
        k.disabled = true;
        try {
          await api("/api/known", { body: { src: S.src, words: [x.w], known: true } });
          S.vocab = S.vocab.filter((y) => y.w !== x.w); S.vocabRaw = S.vocabRaw.filter((y) => y.w !== x.w);
          renderWords(); toast(t("markedKnown"));
        } catch (e) { k.disabled = false; toast(e.message); }
      });
      li.append(box, k); ul.appendChild(li);
    }
    $("wMore").hidden = list.length <= shown;
    $("wEmpty").textContent = all.length ? t("wNoMatch") : t("wEmpty");
    $("wEmpty").hidden = list.length > 0;
  }
  $("wq").addEventListener("input", () => { shown = PAGE; renderWords(); });
  $("wMore").addEventListener("click", () => { shown += PAGE; renderWords(); });
  $("wFilter").addEventListener("click", () => { S.filterEp = null; shown = PAGE; renderWords(); });

  // ---------------------------------------------------------------- ekle: dil cifti, videodan kelime, hazir paketler
  function setPair(src, dst) {
    S.src = src; S.dst = dst; S.home = S.daily = S.puzzle = S.videos = S.vocab = S.vocabRaw = null; S.filterEp = null;
    store.set("src", src); store.set("dst", dst);
    $("src").value = src; $("dst").value = dst;
    $("plan").hidden = true;
    loadPacks();
  }
  $("src").addEventListener("change", () => setPair($("src").value, S.dst));
  $("dst").addEventListener("change", () => setPair(S.src, $("dst").value));
  $("swap").addEventListener("click", () => setPair(S.dst, S.src));

  let plan = null;     // { title, thumb, words: [secilen kelimeler] }
  $("go").addEventListener("click", async function () {
    const msg = $("msg"), text = $("text").value;
    if (!text.trim()) return say(msg, t("eText"), "bad");
    if (S.src === S.dst) return say(msg, t("eSame"), "bad");
    $("go").disabled = true; $("plan").hidden = true;
    try {
      say(msg, t("reading"));
      const words = CVTEXT.tokenize(CVTEXT.linesFrom(text), S.src);          // 1) kelimeler telefonda ayiklanir; metin sunucuya gitmez
      if (!words.length) say(msg, t("eNoWords"), "bad");
      else {
        say(msg, t("planning"));
        const p = await api("/api/import/plan", { body: { src: S.src, dst: S.dst, words: words, n: Number($("count").value) } });  // 2) yeni kelimeleri sunucu secer
        const day = new Date().toLocaleDateString(S.ui === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "short" });
        say(msg, ""); showPlan({ title: ($("srcTitle").value.trim() || t("myText") + " · " + day).slice(0, 80), thumb: "", auto: false }, p);
      }
    } catch (e) { say(msg, e.message, "bad"); }
    $("go").disabled = false;
  });
  // Dosya secici: .srt / .vtt / .txt. Dosya yalnizca telefonda okunur, metin kutusuna konur.
  $("pick").addEventListener("click", () => $("file").click());
  $("file").addEventListener("change", function () {
    const f = $("file").files && $("file").files[0], msg = $("msg");
    $("file").value = "";
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return say(msg, t("eBig"), "bad");
    const r = new FileReader();
    r.onerror = () => say(msg, t("eFile"), "bad");
    r.onload = function () {
      const lines = CVTEXT.linesFrom(String(r.result || ""));
      if (!lines.length) return say(msg, t("eFile"), "bad");
      $("text").value = lines.join("\n").slice(0, CVTEXT.MAX_CHARS);
      if (!$("srcTitle").value.trim()) $("srcTitle").value = String(f.name || "").replace(/\.[a-z0-9]{1,5}$/i, "").slice(0, 60);
      say(msg, "");
    };
    r.readAsText(f);
  });
  function showPlan(tr, p) {
    plan = { title: tr.title, thumb: tr.thumb, words: p.pick.slice() };
    $("planTitle").textContent = tr.title + (tr.auto ? " (" + t("autoSub") + ")" : "");
    const box = $("planWords"), none = !p.pick.length; box.textContent = "";
    $("planSum").textContent = none ? t("planNone", p.total) : t("planSum", p.total, p.known + p.saved, p.fresh);
    for (const w of p.pick) {
      const b = el("button", "chip", w);
      b.type = "button"; b.setAttribute("aria-pressed", "true");
      b.addEventListener("click", function () {      // dokununca kelimeyi listeden cikar / geri al
        const on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", on);
        plan.words = on ? plan.words.concat(w) : plan.words.filter((x) => x !== w);
        updateAddBtn();
      });
      box.appendChild(b);
    }
    $("planHint").hidden = none;
    $("addBtn").hidden = none; $("addBtn").dataset.done = "";
    $("addBar").hidden = true; say($("addMsg"), "");
    updateAddBtn();
    $("plan").hidden = false; $("plan").scrollIntoView({ block: "nearest" });
  }
  function updateAddBtn() { $("addBtn").textContent = t("addN", plan.words.length); $("addBtn").disabled = !plan.words.length; }
  // 3) Secilen kelimeleri 30'ar 30'ar cevirtip hesaba kaydeder (eklentinin kullandigi ayni uc nokta).
  $("addBtn").addEventListener("click", async function () {
    if ($("addBtn").dataset.done) { S.filterEp = plan.title; go("v-words"); return; }
    const words = plan.words.slice(), total = words.length;
    let done = 0;
    $("addBtn").disabled = true; $("addBar").hidden = false; $("addFill").style.width = "0";
    document.querySelectorAll("#planWords .chip").forEach((c) => { c.disabled = true; });
    try {
      for (let i = 0; i < total; i += 30) {
        say($("addMsg"), t("adding", done, total));
        await api("/translate-words", { timeout: 45000, body: { words: words.slice(i, i + 30), src: S.src, dst: S.dst, gen: 0,
          lookup_only: false, sentence: "", episode: plan.title, thumb: plan.thumb } });
        done = Math.min(i + 30, total);
        $("addFill").style.width = Math.round(done / total * 100) + "%";
      }
      S.vocab = S.vocabRaw = S.videos = S.home = null; setFlag("added");
      say($("addMsg"), t("added", total), "ok"); confetti(60); buzz(true);
      $("addBtn").textContent = t("seeWords"); $("addBtn").dataset.done = "1";
    } catch (e) {
      if (done) { S.vocab = S.vocabRaw = S.videos = S.home = null; }
      say($("addMsg"), t("eAdd", e.message), "bad");
    }
    $("addBtn").disabled = false;
  });
  // Hazir paketler: videosu olmayan yeni kullanici hemen baslayabilsin.
  async function loadPacks() {
    const box = $("packs"); box.textContent = "";
    $("packBox").hidden = true;
    if (S.src === "tr" && S.dst === "en") return;         // bu cift icin paket yok
    let d;
    try { d = await api("/api/packs?src=" + S.src); } catch (e) { return; }
    for (const p of (d && d.packs) || []) {
      const b = el("button", "tile"), txt = el("span"), sub = el("em", "", t("wordsCount", p.count));
      b.type = "button";
      txt.append(el("b", "", (p.title && (p.title[S.ui] || p.title.en)) || p.id), sub);
      const pic = el("i"); pic.appendChild(icon("box")); b.append(pic, txt);
      b.addEventListener("click", async function () {
        b.disabled = true;
        try {
          const r = await api("/api/pack-add", { timeout: 60000, body: { src: S.src, dst: S.dst, pack: p.id } });
          S.vocab = S.vocabRaw = S.videos = S.home = null; setFlag("added");
          sub.textContent = t("packAdded"); toast(t("added", r.added)); confetti(60);
        } catch (e) { b.disabled = false; toast(e.message); }
      });
      box.appendChild(b);
    }
    $("packBox").hidden = !box.childElementCount;
  }

  // ---------------------------------------------------------------- oyna: ortak soru ekrani
  const Q = { timer: 0, locked: true, t0: 0 };
  function stopQuiz() { clearTimeout(Q.timer); Q.locked = true; }
  // o: { count, score, word, options, seconds (sureli ise), progress (suresiz ise 0..1), onAnswer(secim, gecenMs) }
  function ask(o) {
    $("qCount").textContent = o.count; $("qScore").textContent = o.score || ""; $("qWord").textContent = o.word; say($("qInfo"), "");
    if (o.first) combo(false, $("qCombo"));
    const box = $("qOpts"), bar = $("qFill"); box.textContent = "";
    clearTimeout(Q.timer); Q.locked = false; Q.t0 = performance.now();
    const fire = function (choice, b) {
      if (Q.locked) return;
      Q.locked = true; clearTimeout(Q.timer);
      if (b) b.classList.add("picked");
      box.querySelectorAll("button").forEach((x) => { x.disabled = true; });
      if (o.seconds) { bar.style.width = getComputedStyle(bar).width; bar.style.transition = "none"; }
      o.onAnswer(choice, Math.round(performance.now() - Q.t0));
    };
    for (const text of o.options) { const b = el("button", "opt", text); b.type = "button"; b.addEventListener("click", () => fire(text, b)); box.appendChild(b); }
    if (o.seconds) {           // sure cubugu: dolu baslar, sure boyunca bosalir; sure biterse bos cevap gider
      bar.classList.add("timed"); bar.style.transition = "none"; bar.style.width = "100%"; void bar.offsetWidth;
      bar.style.transition = "width " + o.seconds + "s linear"; bar.style.width = "0%";
      Q.timer = setTimeout(() => fire("", null), o.seconds * 1000);
    } else { bar.classList.remove("timed"); bar.style.transition = ""; bar.style.width = Math.round((o.progress || 0) * 100) + "%"; }
  }
  function reveal(correct, picked) {
    $("qOpts").querySelectorAll("button").forEach((x) => {
      if (x.textContent === correct) x.classList.add("right"); else if (x.textContent === picked) x.classList.add("wrong");
    });
  }
  // o: { emoji, big, line1, line2, grid, again, onAgain, party, share (paylasilacak metin) }
  function showResult(o) {
    $("rIcon").setAttribute("href", "#i-" + (o.icon || "star")); $("rLine1").textContent = o.line1 || ""; $("rLine2").textContent = o.line2 || "";
    marksInto($("rGrid"), Array.isArray(o.grid) ? o.grid.join("") : o.grid);
    $("rAgain").hidden = !o.again; $("rAgain").textContent = o.again || ""; $("rAgain").onclick = o.onAgain || null;
    $("rShare").hidden = !o.share; $("rShare").onclick = o.share ? () => share(o.share) : null;
    $("rAgain").className = o.share ? "btn ghost" : "btn";                 // paylas varsa ana dugme odur
    $("rRemind").hidden = !(isNative() && store.get("remind") === null);    // hatirlatma teklifi: yalnizca henuz sorulmadiysa
    showView("v-result");
    if (typeof o.big === "number") countUp($("rBig"), o.big); else $("rBig").textContent = o.big;
    notch($("v-result"));
    if (o.party) confetti(110);
    refresh().catch(() => {});
  }
  $("rHome").addEventListener("click", () => go("v-home"));

  // Pratik: aralikli tekrar. Sunucu hangi kelimelerin zamani geldigini bilir; cevaplar sunucuya bildirilir.
  async function startPractice() {
    let d, all;
    try { d = await api("/api/srs/session" + pairQ() + "&n=10"); all = await loadVocab(); } catch (e) { return toast(e.message); }
    if (d.words.length < 4) return toast(t("pNeed"));
    const items = d.words.map((x) => ({ w: x.tr, t: x.eng })), results = [];
    const pool = Array.from(new Set(all.map((x) => x.t).concat(items.map((x) => x.t))));
    let i = 0, right = 0;
    showView("v-quiz");
    const next = function () {
      const it = items[i];
      ask({ first: i === 0, count: t("qCount", i + 1, items.length), word: it.w, progress: i / items.length,
        options: shuffle(shuffle(pool.filter((x) => x !== it.t)).slice(0, 3).concat(it.t)),
        onAnswer: function (choice) {
          const ok = choice === it.t;
          if (ok) right++; else say($("qInfo"), t("dWrong", it.t), "bad");
          results.push({ w: it.w, ok: ok }); reveal(it.t, choice); buzz(ok); combo(ok, $("qCombo"));
          Q.timer = setTimeout(function () { if (curView !== "v-quiz") return; i++; if (i < items.length) next(); else finish(); }, ok ? 600 : 1500);
        } });
    };
    const finish = async function () {
      setFlag("practice");
      let xp = 0;
      try { xp = (await api("/api/srs/report", { body: { src: S.src, dst: S.dst, items: results } })).xp || 0; } catch (e) {}
      const good = right >= items.length * .8;
      showResult({ icon: good ? "star" : "quiz", big: right + " / " + items.length, line1: xp ? t("xpGain", xp) : "", again: t("again"), onAgain: startPractice, party: good });
    };
    next();
  }

  // Altyaziyi tamamla: cumleden kelime cikarilir, 3 sikkli (cumlesi olan kelimeler kullanilir).
  async function startCloze() {
    let all; try { all = await loadVocab(); } catch (e) { return toast(e.message); }
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const items = shuffle((S.vocabRaw || []).filter((x) => x.s && new RegExp("(^|[^\\p{L}])" + esc(x.w) + "(?![\\p{L}])", "iu").test(x.s))).slice(0, 10);
    if (items.length < 4) return toast(t("clozeNeed"));
    const words = Array.from(new Set(all.map((x) => x.w))), results = [];
    let i = 0, right = 0;
    showView("v-quiz");
    const next = function () {
      const it = items[i];
      const line = it.s.replace(new RegExp("(^|[^\\p{L}])" + esc(it.w) + "(?![\\p{L}])", "iu"), function (m, p) { return p + "_____"; });
      ask({ first: i === 0, count: t("qCount", i + 1, items.length), word: line, progress: i / items.length,
        options: shuffle(shuffle(words.filter((x) => x.toLowerCase() !== it.w.toLowerCase())).slice(0, 2).concat(it.w)),
        onAnswer: function (choice) {
          const ok = choice === it.w;
          if (ok) right++; else say($("qInfo"), t("dWrong", it.w), "bad");
          $("qWord").textContent = it.s;
          results.push({ w: it.w, ok: ok }); reveal(it.w, choice); buzz(ok); combo(ok, $("qCombo"));
          Q.timer = setTimeout(function () { if (curView !== "v-quiz") return; i++; if (i < items.length) next(); else finish(); }, ok ? 900 : 1700);
        } });
    };
    const finish = async function () {
      let xp = 0;
      try { xp = (await api("/api/srs/report", { body: { src: S.src, dst: S.dst, items: results } })).xp || 0; } catch (e) {}
      showResult({ icon: right >= items.length * .8 ? "star" : "quiz", big: right + " / " + items.length, line1: xp ? t("xpGain", xp) : "", again: t("again"), onAgain: startCloze, party: right >= items.length * .8 });
    };
    next();
  }

  // Gunluk meydan okuma: herkese ayni 10 soru, soru basina sure; puani sunucu hesaplar.
  function dailyResult(r, fresh) {
    const g = Array.isArray(r.grid) ? r.grid.join("") : String(r.grid || "");
    showResult({ icon: "target", big: r.score, line1: t("dailyRes", r.correct, r.total), line2: r.rank ? t("dailyRank", r.rank, r.players) : "", grid: g, party: fresh && r.correct >= 7,
      share: t("shDaily", r.num || (S.daily && S.daily.num) || "", langName(S.src), g, r.score) });
  }
  async function startDaily() {
    const d0 = S.daily;
    if (d0 && d0.done && d0.result) return dailyResult(d0.result, false);
    if (!d0 || !d0.ready) return toast(t("dailyNo"));
    let d;
    try { d = await api("/api/daily/start", { body: { src: S.src, dst: S.dst } }); } catch (e) { toast(e.message); refresh().catch(() => {}); return; }
    const qs = d.questions || [];
    let i = (d.progress || []).length, score = d.score || 0;
    if (i >= qs.length) return refresh().then(() => S.daily && S.daily.result && dailyResult(S.daily.result, false)).catch(() => {});
    showView("v-quiz");
    let firstQ = true;
    const next = function () {
      const q = qs[i];
      ask({ first: firstQ, count: t("qCount", i + 1, qs.length), score: score + " " + t("pts"), word: q.tr, options: q.options, seconds: d.seconds || 12,
        onAnswer: async function (choice, ms) {
          let r;
          try { r = await api("/api/daily/answer", { body: { src: S.src, dst: S.dst, idx: i, choice: choice, ms: ms } }); }
          catch (e) { toast(e.message); S.daily = null; if (curView === "v-quiz") go("v-play"); return; }
          firstQ = false; reveal(r.correct, choice); buzz(r.ok); combo(!!r.ok, $("qCombo")); score = r.score;
          $("qScore").textContent = score + " " + t("pts");
          say($("qInfo"), r.ok ? "+" + r.delta : t("dWrong", r.correct), r.ok ? "ok" : "bad");
          Q.timer = setTimeout(function () {
            if (curView !== "v-quiz") return;
            if (r.done) { S.daily = null; dailyResult(r.result, true); } else { i++; next(); }
          }, 1000);
        } });
    };
    next();
  }

  // ---------------------------------------------------------------- bulmaca: karisik harfleri diz
  // Gunun bulmacasi herkese ayni 5 kelimedir (sunucu secer); bittikten sonra kisi kendi kelimeleriyle sinirsiz oynar.
  // Her kelimenin sonucu: 🟩 ipucusuz ve hatasiz, 🟨 ipucu ya da yanlis dizilimle, 🟥 gecildi.
  const PZ = { timer: 0, wait: 0, t0: 0, words: [], i: 0, marks: [], known: [], daily: false, busy: true, cur: null };
  const letters = (s) => { try { return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s), (x) => x.segment); } catch (e) { return Array.from(s); } };
  const clock = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  function stopPuzzle() { clearInterval(PZ.timer); clearTimeout(PZ.wait); PZ.busy = true; }
  async function startPuzzle() {
    const p = S.puzzle;
    if (p && p.ready && p.done && p.result) return puzzleResult(p.result, false);
    if (p && p.ready && Array.isArray(p.words) && p.words.length) return runPuzzle(p.words.map((x) => ({ w: String(x.w), hint: String(x.hint) })), true);
    return startOwnPuzzle();
  }
  async function startOwnPuzzle() {
    let all;
    try { all = await loadVocab(); } catch (e) { return toast(e.message); }
    const fit = all.filter(function (x) { const g = letters(x.w); return g.length >= 4 && g.length <= 8 && !/[\s\d'’.\-]/.test(x.w) && new Set(g).size >= 3; });
    if (fit.length < 5) return toast(t("pzNeed"));
    runPuzzle(shuffle(fit.slice()).slice(0, 5).map((x) => ({ w: x.w.toLocaleLowerCase(S.src), hint: x.t, orig: x.w }))
      .sort((a, b) => letters(a.w).length - letters(b.w).length), false);
  }
  function runPuzzle(words, daily) {
    stopPuzzle();
    PZ.words = words; PZ.daily = daily; PZ.i = 0; PZ.marks = []; PZ.known = []; PZ.t0 = Date.now();
    showView("v-puzzle");
    const tick = () => { $("pzTime").textContent = clock(Math.floor((Date.now() - PZ.t0) / 1000)); };
    tick(); PZ.timer = setInterval(tick, 500);
    puzzleWord();
  }
  function puzzleWord() {
    const it = PZ.words[PZ.i], ls = letters(it.w), order = ls.map((_, i) => i);
    for (let k = 0; k < 12; k++) { shuffle(order); if (order.map((i) => ls[i]).join("") !== it.w) break; }   // karisik hali kelimenin kendisi olmasin
    // slots[kutu] = o kutudaki harfin sirasi (bos ise null); locked: ipucuyla acilan kutular
    PZ.cur = { ls: ls, order: order, slots: ls.map(() => null), locked: ls.map(() => false), hinted: false, wrong: 0 };
    PZ.busy = false;
    $("pzCount").textContent = t("qCount", PZ.i + 1, PZ.words.length);
    $("pzFill").style.width = Math.round(PZ.i / PZ.words.length * 100) + "%";
    $("pzHint").textContent = it.hint; marksInto($("pzMarks"), PZ.marks.join("")); say($("pzInfo"), "");
    drawPuzzle();
  }
  function drawPuzzle(state) {
    const c = PZ.cur, sl = $("pzSlots"), tl = $("pzTiles");
    sl.textContent = ""; tl.textContent = ""; sl.className = "slots" + (state ? " " + state : "");
    c.slots.forEach(function (ti, pos) {
      const b = el("button", "slot" + (ti === null ? "" : " full") + (c.locked[pos] ? " lock" : ""), ti === null ? "" : c.ls[ti]);
      b.type = "button"; b.disabled = ti === null || c.locked[pos];
      b.addEventListener("click", function () { if (PZ.busy || c.locked[pos]) return; c.slots[pos] = null; drawPuzzle(); });   // kutuya dokun: harfi geri al
      sl.appendChild(b);
    });
    for (const ti of c.order) {
      const used = c.slots.includes(ti), b = el("button", "tilebtn" + (used ? " used" : ""), c.ls[ti]);
      b.type = "button"; b.disabled = used;
      b.addEventListener("click", function () {
        const pos = c.slots.indexOf(null);
        if (PZ.busy || pos < 0) return;
        c.slots[pos] = ti; sfx("tap"); try { if (navigator.vibrate) navigator.vibrate(6); } catch (e) {}
        drawPuzzle(); checkPuzzle();
      });
      tl.appendChild(b);
    }
  }
  function checkPuzzle() {
    const c = PZ.cur, it = PZ.words[PZ.i];
    if (c.slots.includes(null)) return;
    if (c.slots.map((i) => c.ls[i]).join("") === it.w) return puzzleNext(c.hinted || c.wrong ? "🟨" : "🟩");
    c.wrong++; PZ.busy = true; buzz(false); drawPuzzle("bad");
    PZ.wait = setTimeout(function () {
      if (curView !== "v-puzzle") return;
      c.slots = c.slots.map((v, p) => (c.locked[p] ? v : null)); PZ.busy = false; drawPuzzle();
    }, 550);
  }
  function puzzleNext(mark) {
    const it = PZ.words[PZ.i], c = PZ.cur;
    PZ.busy = true; PZ.marks.push(mark); PZ.known.push(mark !== "🟥" && !c.hinted);
    marksInto($("pzMarks"), PZ.marks.join(""));
    if (mark === "🟥") { say($("pzInfo"), t("pzAnswer", it.w), "bad"); buzz(false); } else { buzz(true); drawPuzzle("good"); }
    PZ.wait = setTimeout(function () {
      if (curView !== "v-puzzle") return;
      PZ.i++; if (PZ.i < PZ.words.length) puzzleWord(); else puzzleFinish();
    }, mark === "🟥" ? 1500 : 750);
  }
  // Ipucu: soldan ilk bos ya da yanlis kutuya dogru harfi koyar ve kilitler.
  $("pzHelp").addEventListener("click", function () {
    const c = PZ.cur;
    if (PZ.busy || !c) return;
    let pos = -1;
    for (let p = 0; p < c.ls.length; p++) if (!c.locked[p] && (c.slots[p] === null || c.ls[c.slots[p]] !== c.ls[p])) { pos = p; break; }
    if (pos < 0) return;
    const lockedTiles = new Set(c.slots.filter((v, p) => c.locked[p]));
    const cand = c.ls.map((_, i) => i).filter((i) => c.ls[i] === c.ls[pos] && !lockedTiles.has(i));
    // once bosta duran, yoksa yanlis kutuda duran, o da yoksa baska bir kutudaki ayni harf
    const at = (i) => c.slots.indexOf(i);
    cand.sort((a, b) => rankTile(a) - rankTile(b));
    function rankTile(i) { const q = at(i); return q < 0 ? 0 : (c.ls[q] !== c.ls[i] ? 1 : 2); }
    const ti = cand[0];
    if (ti === undefined) return;
    if (at(ti) >= 0) c.slots[at(ti)] = null;
    c.slots[pos] = ti; c.locked[pos] = true; c.hinted = true;
    drawPuzzle(); checkPuzzle();
  });
  $("pzSkip").addEventListener("click", function () { if (!PZ.busy && PZ.cur) puzzleNext("🟥"); });
  async function puzzleFinish() {
    clearInterval(PZ.timer);
    const secs = Math.max(1, Math.round((Date.now() - PZ.t0) / 1000)), grid = PZ.marks.join(""), n = PZ.words.length;
    const greens = PZ.marks.filter((m) => m === "🟩").length;
    setFlag("puzzle");
    if (PZ.daily) {
      const num = S.puzzle && S.puzzle.num;
      let r;
      try { r = await api("/api/puzzle/done", { body: { src: S.src, dst: S.dst, secs: secs, grid: grid } }); }
      catch (e) { toast(e.message); r = { secs: secs, grid: grid, num: num, xp: 0 }; }
      S.puzzle = null;
      puzzleResult(r, true);
    } else {
      let xp = 0;        // kendi kelimelerinle oyun: sonuclar aralikli tekrara islenir, XP oradan gelir
      try { xp = (await api("/api/srs/report", { body: { src: S.src, dst: S.dst, items: PZ.words.map((x, i) => ({ w: x.orig || x.w, ok: !!PZ.known[i] })) } })).xp || 0; } catch (e) {}
      showResult({ icon: "puzzle", big: clock(secs), line1: (xp ? t("xpGain", xp) + " · " : "") + t("pzClean", greens, n), grid: grid,
        again: t("again"), onAgain: startOwnPuzzle, party: greens >= n - 1 });
    }
  }
  function puzzleResult(r, fresh) {
    const g = String(r.grid || ""), n = Array.from(g).length || 5, greens = Array.from(g).filter((m) => m === "🟩").length, secs = Number(r.secs) || 0;
    showResult({ icon: "puzzle", big: clock(secs), line1: (r.xp ? t("xpGain", r.xp) + " · " : "") + t("pzClean", greens, n),
      line2: r.rank ? t("pzRank", r.rank, r.players) : "", grid: g, party: fresh && greens >= n - 1,
      share: t("shPuzzle", r.num || "", langName(S.src), g, clock(secs)), again: t("pzOwnAgain"), onAgain: startOwnPuzzle });
  }

  // ---------------------------------------------------------------- kartlar: cevir ve kaydir
  // Aralikli tekrarin kart hali: kelimeyi gor, anlamini hatirla, karti cevir; bildiysen saga, bilemediysen sola kaydir.
  // Kelimeleri ve sonuclari pratikle ayni sunucu uclari tutar (/api/srs/session, /api/srs/report).
  const C = { items: [], i: 0, results: [], right: 0, busy: true, open: false, x0: 0, dx: 0, drag: false, moved: false };
  async function startCards() {
    let d;
    try { d = await api("/api/srs/session" + pairQ() + "&n=10"); } catch (e) { return toast(e.message); }
    if (!d.words || d.words.length < 4) return toast(t("pNeed"));
    C.items = d.words.map((x) => ({ w: x.tr, t: x.eng })); C.i = 0; C.results = []; C.right = 0;
    combo(false, $("cCombo"));
    showView("v-cards"); cardShow();
  }
  function cardShow() {
    const it = C.items[C.i], card = $("fcard");
    C.busy = false; C.open = false;
    card.className = "fcard"; card.style.transform = ""; card.style.opacity = "";
    $("fcWord").textContent = it.w; $("fcTr").textContent = it.t; $("fcTr").hidden = true; $("fcTip").textContent = t("fcTip");
    $("cCount").textContent = t("qCount", C.i + 1, C.items.length); $("cScore").textContent = "";
    $("cFill").style.width = Math.round(C.i / C.items.length * 100) + "%";
  }
  function cardFlip() { if (C.busy || C.open) return; C.open = true; $("fcTr").hidden = false; $("fcTip").textContent = t("fcTip2"); sfx("tap"); }
  function cardAnswer(ok) {
    if (C.busy) return;
    const it = C.items[C.i], card = $("fcard");
    C.busy = true; $("fcTr").hidden = false;           // cevrilmeden cevaplandiysa anlami yine de goster
    C.results.push({ w: it.w, ok: ok }); if (ok) C.right++;
    buzz(ok); combo(ok, $("cCombo"));
    card.classList.add("anim", ok ? "yes" : "no");
    card.style.transform = "translateX(" + (ok ? 130 : -130) + "%) rotate(" + (ok ? 18 : -18) + "deg)"; card.style.opacity = "0";
    setTimeout(function () {
      if (curView !== "v-cards") return;
      C.i++; if (C.i < C.items.length) cardShow(); else cardsFinish();
    }, C.open ? 240 : 700);
  }
  async function cardsFinish() {
    setFlag("practice");
    let xp = 0;
    try { xp = (await api("/api/srs/report", { body: { src: S.src, dst: S.dst, items: C.results } })).xp || 0; } catch (e) {}
    const n = C.items.length, good = C.right >= n * .8;
    showResult({ icon: "cards", big: C.right + " / " + n, line1: (xp ? t("xpGain", xp) + " · " : "") + t("cardsRes", C.right, n), again: t("again"), onAgain: startCards, party: good });
  }
  (function () {      // parmakla surukleme
    const card = $("fcard");
    card.addEventListener("pointerdown", function (ev) { if (C.busy) return; C.drag = true; C.moved = false; C.x0 = ev.clientX; C.dx = 0; card.classList.remove("anim"); try { card.setPointerCapture(ev.pointerId); } catch (e) {} });
    card.addEventListener("pointermove", function (ev) {
      if (!C.drag || C.busy) return;
      C.dx = ev.clientX - C.x0; if (Math.abs(C.dx) > 8) C.moved = true;
      if (C.moved) { card.style.transform = "translateX(" + C.dx + "px) rotate(" + (C.dx / 18) + "deg)"; card.classList.toggle("yes", C.dx > 60); card.classList.toggle("no", C.dx < -60); }
    });
    const up = function () {
      if (!C.drag) return;
      C.drag = false;
      if (C.busy) return;
      if (C.moved && Math.abs(C.dx) > 90) return cardAnswer(C.dx > 0);
      card.classList.add("anim"); card.classList.remove("yes", "no"); card.style.transform = "";
      if (!C.moved) cardFlip();
    };
    card.addEventListener("pointerup", up); card.addEventListener("pointercancel", up);
    card.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); cardFlip(); } });
    $("cYes").addEventListener("click", () => cardAnswer(true));
    $("cNo").addEventListener("click", () => cardAnswer(false));
  })();


  // ---------------------------------------------------------------- ses + kelime akisi
  const VOICE = { en: "en-US", tr: "tr-TR", de: "de-DE", fr: "fr-FR", es: "es-ES", it: "it-IT", pt: "pt-BR", ru: "ru-RU", ar: "ar-SA", ro: "ro-RO", ja: "ja-JP", hi: "hi-IN", id: "id-ID", pl: "pl-PL", nl: "nl-NL", ko: "ko-KR" };
  let sayWarned = false;
  function stopSay() { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} }
  // Telefonun kendi sesiyle okur (ucretsiz, internet gerekmez). Ses yoksa bir kez haber verir.
  function say2(text, btn) {
    try {
      const ss = window.speechSynthesis;
      if (!ss || !text) throw new Error("nosay");
      ss.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = VOICE[S.src] || S.src; u.rate = .92;
      if (btn) { btn.classList.add("talk"); u.onend = u.onerror = function () { btn.classList.remove("talk"); }; }
      ss.speak(u);
    } catch (e) { if (!sayWarned) { sayWarned = true; toast(t("noVoice")); } }
  }
  const F = { items: [], i: 0, res: [], sent: 0, xp: 0, ok: 0, run: 0, busy: true, rv: 0, voice: store.get("voice") !== "0", drag: false, y0: 0, dy: 0, moved: false };
  function flowPaint() { $("flVoice").setAttribute("aria-pressed", F.voice ? "true" : "false"); }
  async function flowFill() {
    let list = await loadVocab();
    if (!list.length && S.key) {             // yeni hesap: ilk paketi kendimiz ekleyelim, kullanici bir sey yazmasin
      try {
        const d = await api("/api/packs?src=" + S.src), p = d && d.packs && d.packs[0];
        if (p) { await api("/api/pack-add", { timeout: 60000, body: { src: S.src, dst: S.dst, pack: p.id } }); S.vocab = S.vocabRaw = S.videos = S.home = null; list = await loadVocab(); }
      } catch (e) {}
    }
    return list;
  }
  async function startFlow() {
    let list;
    try { list = await flowFill(); } catch (e) { return toast(e.message); }
    if (!list || !list.length) { toast(t("flowEmpty")); return go("v-add"); }
    F.pool = list; F.items = shuffle(list.slice()); F.i = 0; F.res = []; F.sent = 0; F.xp = 0; F.ok = 0; F.run = 0;
    showView("v-flow"); flowPaint(); flowShow();
  }
  function flowShow() {
    if (F.i >= F.items.length) { F.items = shuffle(F.pool.slice()); F.i = 0; }      // bitmez akis: deste bitince yeniden karilir
    const it = F.items[F.i], card = $("flCard");
    F.busy = false; clearTimeout(F.rv);
    card.className = "fl-card"; card.style.transform = ""; card.style.opacity = ""; void card.offsetWidth; card.classList.add("in");
    $("flWord").textContent = it.w; $("flTr").textContent = it.t; $("flTr").classList.remove("on");
    $("flStage").style.setProperty("--run", Math.min(F.run, 10));
    $("flCount").textContent = F.run >= 2 ? t("flowRun", F.run) : (F.ok ? F.xp + " XP" : "");
    F.rv = setTimeout(function () { if (curView === "v-flow") $("flTr").classList.add("on"); }, 650);
    if (F.voice) setTimeout(function () { if (curView === "v-flow" && F.items[F.i] === it) say2(it.w, $("flSay")); }, 220);
  }
  function flowPop(text, big) {
    const p = $("flPop"); p.textContent = text; p.className = "fl-pop" + (big ? " big" : ""); void p.offsetWidth; p.className += " go";
  }
  async function flowFlush() {
    const batch = F.res.slice(F.sent); if (!batch.length) return; F.sent = F.res.length;
    try { await api("/api/srs/report", { body: { src: S.src, dst: S.dst, items: batch } }); S.home = null; } catch (e) {}
  }
  function flowAnswer(ok) {
    if (F.busy) return;
    const it = F.items[F.i], card = $("flCard");
    F.busy = true; clearTimeout(F.rv); $("flTr").classList.add("on");
    F.res.push({ w: it.w, ok: ok }); buzz(ok);
    if (ok) {
      F.ok++; F.xp += 10; F.run++; flowPop(t("flowXp", 10));
      if (F.ok === 25 || F.ok === 50 || F.ok === 100) { confetti(F.ok >= 50 ? 90 : 60); flowPop(F.ok + "!", true); }
      else if (F.ok === 5 || F.ok === 10) { sfx("combo"); flowPop(F.ok + "!", true); }
      else if (F.run % 5 === 0) sfx("combo");
    } else F.run = 0;
    if (F.res.length - F.sent >= 10) flowFlush();
    card.classList.remove("in"); card.classList.add(ok ? "up" : "down");
    setTimeout(function () { if (curView !== "v-flow") return; F.i++; flowShow(); }, calm() ? 0 : 230);
  }
  function flowStop() {
    clearTimeout(F.rv); F.busy = true; stopSay();
    flowFlush(); if (F.xp) { const xp = F.xp; F.xp = 0; toast(t("flowBye", xp)); }
  }
  (function () {
    const st = $("flStage");
    st.addEventListener("pointerdown", function (ev) { if (F.busy) return; F.drag = true; F.moved = false; F.y0 = ev.clientY; F.dy = 0; $("flCard").classList.remove("in"); try { st.setPointerCapture(ev.pointerId); } catch (e) {} });
    st.addEventListener("pointermove", function (ev) {
      if (!F.drag || F.busy) return;
      F.dy = ev.clientY - F.y0; if (Math.abs(F.dy) > 8) F.moved = true;
      if (F.moved) { $("flCard").style.transform = "translateY(" + F.dy + "px) rotate(" + (F.dy / 60) + "deg)"; }
    });
    const up = function () {
      if (!F.drag) return; F.drag = false; if (F.busy) return;
      const card = $("flCard");
      if (F.moved && Math.abs(F.dy) > 80) return flowAnswer(F.dy < 0);
      card.style.transform = "";
      if (!F.moved) { $("flTr").classList.add("on"); say2(F.items[F.i].w, $("flSay")); }     // dokun: anlami hemen goster + oku
    };
    st.addEventListener("pointerup", up); st.addEventListener("pointercancel", up);
    $("flKnow").addEventListener("click", () => flowAnswer(true));
    $("flAgain").addEventListener("click", () => flowAnswer(false));
    $("flClose").addEventListener("click", () => go("v-play"));
    $("flSay").addEventListener("pointerdown", (ev) => ev.stopPropagation());
    $("flSay").addEventListener("click", () => { if (F.items[F.i]) say2(F.items[F.i].w, $("flSay")); });
    $("flVoice").addEventListener("click", function () { F.voice = !F.voice; store.set("voice", F.voice ? "1" : "0"); flowPaint(); if (!F.voice) stopSay(); else if (F.items[F.i]) say2(F.items[F.i].w, $("flSay")); });
    $("fcSay").addEventListener("click", function () { if (C.items && C.items[C.i]) say2(C.items[C.i].w, $("fcSay")); });
    $("tFlow").addEventListener("click", startFlow);
  })();

  // Oyna sekmesi: buyuk dugmeler ve durumlari.
  function renderPlay() {
    const h = S.home, d = S.daily, pz = S.puzzle;
    const pzDaily = !!(pz && pz.ready);
    $("tPuzzleT").textContent = pzDaily ? t("pzH") + (pz.num ? " #" + pz.num : "") : t("pzOwn");
    $("tPuzzleS").textContent = !pzDaily ? t("pzOwnS")
      : pz.done && pz.result ? t("pzDone", clock(Number(pz.result.secs) || 0), pz.result.rank || "-", pz.result.players || "-") : t("pzNew", pz.total || 5);
    $("tPuzzle").classList.toggle("hot", pzDaily && !pz.done);
    $("tDailyT").textContent = t("dailyH") + (d && d.num ? " #" + d.num : "");
    $("tDailyS").textContent = !d || !d.ready ? t("dailyNo")
      : d.done && d.result ? t("dailyDone", d.result.score, d.result.rank || "-", d.result.players)
      : d.started ? t("dailyResume", d.answered, d.total) : t("dailyNew", d.total);
    $("tDaily").classList.toggle("hot", !!(d && d.ready && !d.done));
    $("tCardsS").textContent = h ? t("pracInfo", h.due, h.new) : "";
    $("tCards").classList.toggle("hot", !!(h && h.due > 0));
    $("tPracticeS").textContent = t("tQuizS");
  }
  async function loadPlay() {
    renderPlay();
    try { await refresh(); if (curView === "v-play") renderPlay(); } catch (e) { if (S.key) toast(e.message); }
  }
  $("tPuzzle").addEventListener("click", startPuzzle);
  $("tDaily").addEventListener("click", startDaily);
  $("tCards").addEventListener("click", startCards);
  $("tPractice").addEventListener("click", startPractice);
  $("tCloze").addEventListener("click", startCloze);
  $("tDuel").addEventListener("click", () => go("v-duel"));
  $("tLeague").addEventListener("click", () => go("v-leagues"));

  // ---------------------------------------------------------------- duello (canli, uygulama icinde)
  // Sitedeki duelloyla ayni oyun sunucusuna WebSocket ile baglanir; mobil ve site oyunculari ayni odada oynayabilir.
  // Sunucudan gelen mesajlar: me, room, countdown, question, answered, reveal, end, error, closed.
  const WS_URL = API.replace(/^http/, "ws") + "/ws";
  let sock = null;
  const D = { me: "", room: null, part: "home", picked: null, answered: 0, tick: 0 };
  function duelPart(p) {
    D.part = p;
    for (const id of ["Home", "Room", "Count", "Q", "End"]) $("d" + id).hidden = id.toLowerCase() !== p;
    main.scrollTop = 0;
  }
  function duelSend(m) { if (sock && sock.readyState === 1) sock.send(JSON.stringify(m)); }
  function duelClose() {
    clearInterval(D.tick);
    const s = sock; sock = null;
    if (s) { s.onclose = null; s.onmessage = null; s.onerror = null; try { s.close(); } catch (e) {} }
    D.room = null; D.me = "";
    $("dCreate").disabled = false; $("dJoin").disabled = false;
    duelPart("home");
  }
  // Baglanir ve ilk mesaji (oda kur / odaya katil) oturum anahtariyla birlikte yollar. Anahtar adrese yazilmaz.
  function duelConnect(first) {
    duelClose(); say($("dMsg"), "");
    $("dCreate").disabled = true; $("dJoin").disabled = true;
    const s = sock = new WebSocket(WS_URL);
    s.onopen = () => s.send(JSON.stringify(Object.assign({ key: S.key }, first)));
    s.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m && typeof m === "object") onDuel(m); };
    s.onerror = () => { if (sock === s && !D.room) { duelClose(); say($("dMsg"), t("eNet"), "bad"); } };
    s.onclose = () => { if (sock === s) { const had = D.room; duelClose(); if (had) toast(t("dLost")); } };
  }
  function playerRow(p, right) {
    const li = el("li", p.id === D.me ? "me" : ""), box = el("div", "w");
    box.appendChild(el("b", "", p.name + (p.id === D.me ? " (" + t("you") + ")" : "")));
    li.append(box, el("span", "pts", right)); return li;
  }
  function renderRoom() {
    const r = D.room, host = r.host === D.me;
    $("dRoomCode").textContent = r.code;
    const ul = $("dPlayers"); ul.textContent = "";
    for (const p of r.players || []) ul.appendChild(playerRow(p, p.id === r.host ? t("dHost") : ""));
    $("dStart").hidden = !host; $("dWait").hidden = host;
    $("dAgain").hidden = !host; $("dWait2").hidden = host;
  }
  function onDuel(m) {
    if (m.t === "me") D.me = m.id;
    else if (m.t === "room") { D.room = m; renderRoom(); if (D.part === "home") duelPart("room"); }
    else if (m.t === "error") { if (!D.room) { duelClose(); say($("dMsg"), m.msg, "bad"); } else toast(m.msg); }
    else if (m.t === "closed") { duelClose(); toast(t("dLost")); }
    else if (m.t === "countdown") {
      let n = m.seconds || 3;
      $("dCountN").textContent = n; duelPart("count");
      clearInterval(D.tick);
      D.tick = setInterval(() => { n--; if (n > 0) $("dCountN").textContent = n; else clearInterval(D.tick); }, 1000);
    } else if (m.t === "question") {
      clearInterval(D.tick);
      D.picked = null; D.answered = 0;
      $("dProg").textContent = t("qCount", m.idx + 1, m.total);
      $("dWord").textContent = m.tr; say($("dInfo"), "");
      const box = $("dOpts"); box.textContent = "";
      for (const text of m.options || []) {
        const b = el("button", "opt", text); b.type = "button";
        b.addEventListener("click", function () {
          if (D.picked !== null) return;
          D.picked = text; b.classList.add("picked");
          box.querySelectorAll("button").forEach((x) => { x.disabled = true; });
          duelSend({ t: "answer", choice: text });
        });
        box.appendChild(b);
      }
      duelPart("q");     // once gorunur yap: gizli bir ogede animasyon baslamaz
      const bar = $("dTime");
      bar.style.transition = "none"; bar.style.width = "100%"; void bar.offsetWidth;
      bar.style.transition = "width " + (m.seconds || 12) + "s linear"; bar.style.width = "0%";
    } else if (m.t === "answered") {
      D.answered++;
      if (D.room) say($("dInfo"), t("dAnswered", D.answered, (D.room.players || []).length));
    } else if (m.t === "reveal") {
      const bar = $("dTime"); bar.style.width = getComputedStyle(bar).width; bar.style.transition = "none";
      $("dOpts").querySelectorAll("button").forEach((x) => {
        x.disabled = true;
        if (x.textContent === m.correct) x.classList.add("right"); else if (x.textContent === D.picked) x.classList.add("wrong");
      });
      const mine = (m.results || []).find((r) => r.id === D.me);
      buzz(!!(mine && mine.ok));
      if (mine && mine.ok) say($("dInfo"), t("dRight", mine.delta, mine.score), "ok"); else say($("dInfo"), t("dWrong", m.correct), "bad");
    } else if (m.t === "end") {
      const ul = $("dScores"), scores = m.scores || []; ul.textContent = "";
      scores.forEach((p, i) => ul.appendChild(playerRow({ id: p.id, name: (i + 1) + ". " + p.name }, p.score)));
      if (D.room) renderRoom();
      duelPart("end");
      if (scores.length > 1 && scores[0].id === D.me) confetti(130);
      refresh().catch(() => {});
    }
  }
  $("dCreate").addEventListener("click", () => duelConnect({ t: "create", src: S.src, dst: S.dst, episode: "", n: 10, seconds: 12,
    password: "", mode: "choice", screen: false, learn: "dst" }));
  $("dJoin").addEventListener("click", function () {
    const code = $("dCode").value.trim();
    if (!/^\d{4}$/.test(code)) return say($("dMsg"), t("dCodeHint"), "bad");
    duelConnect({ t: "join", code: code, password: "" });
  });
  $("dStart").addEventListener("click", () => duelSend({ t: "start" }));
  $("dAgain").addEventListener("click", () => duelSend({ t: "start" }));
  $("dInvite").addEventListener("click", function () {
    const code = D.room && String(D.room.code);
    if (code && /^\d{4}$/.test(code)) share(t("shDuel", code), API + "/join/" + code);
  });
  $("dLeave").addEventListener("click", duelClose);
  $("dLeave2").addEventListener("click", duelClose);

  // ---------------------------------------------------------------- ligler
  let league = null;
  function leaguePart(detail) { $("lHome").hidden = detail; $("lDetail").hidden = !detail; main.scrollTop = 0; }
  async function loadLeagues() {
    leaguePart(false); say($("lMsg"), ""); say($("lEmpty"), "");
    const ul = $("lList"); ul.textContent = "";
    try {
      const list = await api("/api/leagues");
      if (!list.length) say($("lEmpty"), t("lNone"));
      for (const l of list) {
        const li = el("li"), box = el("div", "w");
        box.append(el("b", "", l.name), el("span", "", t("lRow", l.members, l.rank || "-")));
        li.append(box, el("span", "pts", l.pts)); li.addEventListener("click", () => openLeague(l.id)); ul.appendChild(li);
      }
    } catch (e) { say($("lEmpty"), e.message, "bad"); }
  }
  async function openLeague(id) {
    try {
      league = await api("/api/leagues/" + encodeURIComponent(id) + "?period=week");
      $("lTitle").textContent = league.name; $("lInfo").textContent = t("lInfo", league.code);
      const ul = $("lBoard"); ul.textContent = "";
      (league.rows || []).forEach(function (r, i) {
        const li = el("li", r.me ? "me" : ""), box = el("div", "w");
        box.appendChild(el("b", "", (i + 1) + ". " + r.username + (r.me ? " (" + t("you") + ")" : "")));
        li.append(box, el("span", "pts", r.pts)); ul.appendChild(li);
      });
      $("lLeave").hidden = !!league.owner;
      leaguePart(true);
      try { history.pushState({ v: "v-leagues" }, ""); } catch (e) {}     // geri tusu lig listesine donsun
    } catch (e) { toast(e.message); }
  }
  $("lCreate").addEventListener("click", async function () {
    const name = $("lName").value.trim();
    if (name.length < 2) return say($("lMsg"), t("lNameHint"), "bad");
    try { const d = await api("/api/leagues", { body: { name: name } }); $("lName").value = ""; await loadLeagues(); openLeague(d.id); }
    catch (e) { say($("lMsg"), e.message, "bad"); }
  });
  $("lJoin").addEventListener("click", async function () {
    const code = $("lCode").value.trim();
    if (!code) return say($("lMsg"), t("lCodeHint"), "bad");
    try { const d = await api("/api/leagues/join", { body: { code: code } }); $("lCode").value = ""; await loadLeagues(); openLeague(d.id); }
    catch (e) { say($("lMsg"), e.message, "bad"); }
  });
  $("lShare").addEventListener("click", () => { if (league) share(t("shLeague", league.name, league.code)); });
  $("lLeave").addEventListener("click", async function () {
    if (!league) return;
    try { await api("/api/leagues/leave", { body: { id: league.id } }); loadLeagues(); } catch (e) { toast(e.message); }
  });

  // ---------------------------------------------------------------- ben (profil)
  function showMe() {
    const h = S.home;
    if (h) {
      $("meAvatar").textContent = String(h.username || "?").charAt(0).toLocaleUpperCase();
      $("meName").textContent = h.username;
      $("meLevel").textContent = t("rk" + rankOf(h.level)) + " · " + t("level", h.level) + " · " + h.xp + " XP";
      const list = badgeList(h), box = $("badges"); box.textContent = "";
      $("badgeSub").textContent = t("badgeSub", list.filter((b) => b.on).length, list.length);
      for (const b of list) {
        const btn = el("button", "bdg" + (b.on ? " on " + b.cls : "")), dot = el("i", "", b.n);
        btn.type = "button"; btn.append(dot, document.createTextNode(b.label));
        btn.addEventListener("click", () => toast(t(b.on ? "badgeHave" : "badgeNeed", b.n, b.label)));
        box.appendChild(btn);
      }
      $("meWords").textContent = h.words; $("meStreak").textContent = h.streak; $("meWins").textContent = h.wins;
    }
    if (!h) refresh().then(() => { if (curView === "v-me") showMe(); }).catch(() => {});
    $("remRow").hidden = !isNative(); $("remTgl").checked = store.get("remind") === "1";
    $("sndTgl").checked = store.get("snd") !== "0";
    $("delBox").hidden = true; $("delOpen").hidden = false; $("delPw").value = ""; say($("delMsg"), "");
    $("invSub").textContent = t("invSub0");
    api("/api/invite").then((d) => { if (d && d.count > 0) $("invSub").textContent = t("invSubN", d.count); }).catch(() => {});
  }
  $("invBtn").addEventListener("click", () => share(t("shInvite")));
  $("sndTgl").addEventListener("change", () => { store.set("snd", $("sndTgl").checked ? "1" : "0"); sfx("ok"); });
  $("remTgl").addEventListener("change", async function () {
    const want = $("remTgl").checked;
    if (!(await setReminder(want)) && want) $("remTgl").checked = false;
  });
  // Hesabi silme (Google Play sarti): parolayla, Google ile acilan hesapta kullanici adiyla onaylanir. Sunucu butun veriyi siler.
  $("delOpen").addEventListener("click", async function () {
    let hasPw = true;
    try { hasPw = (await api("/api/me")).has_password !== false; } catch (e) {}
    $("delLbl").textContent = t(hasPw ? "delPwLbl" : "delNameLbl"); $("delPw").type = hasPw ? "password" : "text";
    $("delOpen").hidden = true; $("delBox").hidden = false; $("delBox").scrollIntoView({ block: "nearest" });
  });
  $("delCancel").addEventListener("click", () => { $("delBox").hidden = true; $("delOpen").hidden = false; });
  $("delGo").addEventListener("click", async function () {
    const typed = $("delPw").value;
    if (!typed) return say($("delMsg"), t("eFill"), "bad");
    $("delGo").disabled = true; say($("delMsg"), "");
    try {
      await api("/api/delete-account", { soft: true, body: { password: typed } });
      await setReminder(false);
      for (const k of ["streak", "lvl", "day", "remind", "goal", "badges", "src", "dst", "snd"]) store.del(k);      // telefondaki kisisel izleri de sil
      endSession(); toast(t("delDone"));
    } catch (e) { say($("delMsg"), e.message, "bad"); }
    $("delGo").disabled = false; $("delPw").value = "";
  });
  $("goalSel").addEventListener("change", () => { S.goal = Number($("goalSel").value) || 50; store.set("goal", S.goal); });
  $("uiLang").addEventListener("change", function () { S.ui = $("uiLang").value; store.set("ui", S.ui); applyTexts(); showMe(); });
  $("logout").addEventListener("click", async function () {
    try { await api("/api/ext/logout", { body: {} }); } catch (e) {}
    endSession();
  });

  // ---------------------------------------------------------------- acilis
  function enterApp() {
    try { history.replaceState({ v: "v-home" }, ""); } catch (e) {}
    if (store.get("src") === null) {            // bu telefonda ilk giris: hangi dili ogreniyorsun?
      for (const id of ["oSrc", "oDst"]) { const sel = $(id); sel.textContent = ""; for (const code of LANGS) sel.add(new Option(langName(code), code)); }
      $("oSrc").value = S.src; $("oDst").value = S.dst; say($("oMsg"), "");
      return showView("v-start", false);
    }
    go("v-home", false);
  }
  $("oGo").addEventListener("click", function () {
    if ($("oSrc").value === $("oDst").value) return say($("oMsg"), t("eSame"), "bad");
    setPair($("oSrc").value, $("oDst").value);
    if (S.guest) fitDemoPair(true);
    if (store.get("how") === null) return showView("v-how", false);      // ilk kez: nasil baslamak istersin?
    go("v-home", false);
  });
  $("aQuick").addEventListener("click", startFlow);
  $("aPaste").addEventListener("click", () => addMode(true));
  $("aDuel").addEventListener("click", () => go("v-duel"));
  $("addBack").addEventListener("click", () => addMode(false));
  function howDone(next) { store.set("how", "1"); next(); }
  $("hQuick").addEventListener("click", () => howDone(function () { history.replaceState({ v: "v-home" }, ""); startFlow(); }));
  $("hPaste").addEventListener("click", () => howDone(function () { go("v-add", false); }));
  $("hDuel").addEventListener("click", () => howDone(function () { go("v-duel", false); }));
  $("hSkip").addEventListener("click", () => howDone(function () { go("v-home", false); }));
  // Misafir icin: secilen dil ciftinde deneme destesi yoksa en yakin cifte gecer.
  function fitDemoPair(tell) {
    const p = CVDEMO.pair(S.src, S.dst, S.ui);
    if (p[0] === S.src && p[1] === S.dst) return;
    setPair(p[0], p[1]);
    if (tell) toast(t("demoPair", langName(p[0]), langName(p[1])));
  }
  function paintTry() { $("tryBtn").textContent = t(S.guest ? "tryBack" : "tryFirst"); }
  $("tryBtn").addEventListener("click", function () {
    S.guest = true; store.set("guest", "1");
    S.home = S.daily = S.puzzle = S.videos = S.vocab = S.vocabRaw = null;
    paintTry(); say($("aMsg"), "");
    if (store.get("src") !== null) fitDemoPair(false);
    enterApp();
  });
  $("guestBar").addEventListener("click", askAccount);
  applyTexts();
  paintTry();
  if (S.key) enterApp(); else if (S.guest) { if (store.get("src") !== null) fitDemoPair(false); enterApp(); } else showView("v-auth", false);
  // Sunucu ayarlari: e-posta dogrulamasi acik mi, Google istemci kimligi ne? (ikisi de gizli degil)
  fetch(API + "/api/ext/config").then((r) => r.json()).then(function (c) {
    mailOn = !!(c && c.mail); googleId = (c && typeof c.google === "string" && c.google) || "";
    setAuthMode(authMode);
    $("gBox").hidden = authStep !== "form" || !googleId || !isNative();
    const mail = c && typeof c.contact === "string" && /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(c.contact) ? c.contact : "";
    if (mail) { $("lnkReport").href = "mailto:" + mail + "?subject=CineVocab"; $("lnkReport").hidden = false; }
  }).catch(() => {});
})();
