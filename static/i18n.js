/* CineVocab arayüz çevirisi (tr, en, fr, it, de, es) + tema. <head> içinde, eşzamanlı yüklenir. */
(function () {
  var D = {};
  D.en = {
    login: "Log in", register: "Sign up", logout: "Log out", username: "Username", password: "Password", pwHint: "Password (at least 6 characters)",
    createAccount: "Create account", authTitle: "Your words, from every subtitle", authSub: "Log in to see the words you collected while watching.",
    authDemo: "The extension shows the translation under every subtitle word.",
    nav_words: "Words", nav_videos: "Videos", nav_known: "Known", nav_practice: "Practice", nav_duel: "Duel", nav_settings: "Settings",
    learning: "I'm learning", translateTo: "Translate to", uiLang: "Site language", theme: "Switch theme",
    wordsSub: "{0} words from {1} subtitles", statWords: "Words", statVideos: "Videos", statKnown: "Known", statWins: "Duel wins",
    search: "Search words…", allVideos: "All videos", selectShown: "Select shown", selectAll: "Select all", clear: "Clear", selected: "{0} selected",
    iKnow: "I know these", del: "Delete", cancel: "Cancel", showMore: "Show {0} more", noMatch: "No words match.", noVideo: "Untitled video",
    emptyWords: "No words in this language pair yet", emptyWordsText: "Turn on the extension and watch something with {0} subtitles. {1} translations appear here automatically.",
    markedKnown: "{0} words marked as known", movedBack: "{0} words moved back to your list", deleted: "{0} deleted",
    confirmDelWords: "Delete {0} words?", confirmDelWordsText: "They disappear from every video. They will come back if you meet them again while watching.",
    confirmDelVideos: "Delete {0} videos?", confirmDelVideosText: "All words collected from these videos are removed from your list.",
    videosSub: "Every video you watch with the extension is added here by itself.", viewWords: "Words", wordsN: "{0} words",
    autoNote: "Videos are added automatically. Select the ones you don't need and delete them.",
    emptyVideos: "No videos yet", emptyVideosText: "They show up here as soon as you watch with the extension turned on.",
    knownSub: "Words you already know are hidden from subtitles, lists and duels.", addKnown: "Add words you already know", addKnownPh: "One per line or separated by commas", add: "Add",
    moveBack: "Move back to learning", emptyKnown: "Nothing here yet", emptyKnownText: "Select words in your list and press “I know these”, or add them above.",
    practiceSub: "Quick multiple-choice quiz from your own words.", needWords: "Not enough words yet", needWordsText: "You need at least 4 words with different translations.",
    source: "Words from", allWords: "All words", questions: "Questions", nQuestions: "{0} questions", start: "Start", qOf: "{0} / {1}",
    result: "{0} of {1} correct", retryWrong: "Retry the {0} you missed", again: "New quiz",
    duelSub: "Race friends on the words you collected. Create a room or join with a code.", joinRoom: "Join a room", joinSub: "Enter the 4-digit code your friend shared.",
    join: "Join", roomPwJoin: "Room password (if any)", codeHint: "Enter the 4-digit code.", createRoom: "Create a room", createSub: "Questions come from your {0} → {1} words.",
    seconds: "Seconds per question", roomPwCreateLabel: "Room password (optional)", roomPwCreate: "Leave empty for an open room",
    leaderboard: "Leaderboard", week: "Week", month: "Month", year: "Year", all: "All time", people: "People", countries: "Countries", noScores: "No games played yet.",
    you: "you", playersN: "{0} players", winsN: "{0} wins",
    profile: "Profile", country: "Country", save: "Save", saved: "Saved",
    extension: "Browser extension", extSub: "Create a key and paste it into the extension so your words land in this account.", genKey: "Create key", copy: "Copy", copied: "Copied", keyHint: "Your key will appear here.",
    ext1: "Install the CineVocab extension and open its popup.", ext2: "Paste the key and choose your language pair.", ext3: "Turn the switch on, then watch with subtitles.",
    account: "Account", accountSub: "Log out of this browser or delete your account and all its data.", deleteAccount: "Delete account", deleteAccountSub: "This permanently deletes your account, words and scores. Enter your password to confirm.", accountDeleted: "Account deleted.",
    gameTitle: "Word duel", gameSub: "Answer faster than everyone else.", backToPanel: "Back to panel", createInPanel: "Want to host? Create a room in your panel.",
    room: "Room code", shareCode: "Share this code with the other players.", copyCode: "Copy code", leave: "Leave", startGame: "Start game", waitHost: "Waiting for the host to start…", host: "host",
    locked: "password", secShort: "s", fastBonus: "Faster answer = bonus points", gameOver: "Game over", tie: "It's a tie!", winner: "{0} wins", playAgain: "Play again", hostRestarts: "The host can start a new game.", connLost: "Connection lost.",
    eNet: "Can't reach the server.", eLogin: "Please log in first.", eBanned: "You can't join game rooms.", ePair: "Invalid language pair.", eNeed4: "You need at least 4 words (you have {0}).",
    eNoRoom: "Room not found or the game already started.", ePw: "Wrong room password.", eRate: "Too many attempts. Try again in a moment.", eUser: "Username must be 3–16 characters (letters, digits, _).",
    ePass6: "Password must be at least 6 characters.", eTaken: "That username is taken.", eCreds: "Wrong username or password.", eSusp: "Your account is suspended.", eWrongPw: "Wrong password.", eCountry: "Invalid country.", eBig: "Data too large.",
    landH1: "Turn every subtitle into vocabulary.", landLead: "CineVocab shows the translation under each subtitle word while you watch, in any language pair, and keeps the words for you to practise.",
    landCta: "Create a free account", landHow: "How it works", landSites: "Works on Prime Video, YouTube and Udemy.",
    landS1T: "Install the extension", landS1: "Add it to Chrome, paste your key and pick the subtitle language and your language.",
    landS2T: "Switch it on and watch", landS2: "It only runs when you turn it on, and only when the subtitles are in the language you chose.",
    landS3T: "Practise your words", landS3: "Clean up your list, hide what you know, take a quiz or challenge a friend.",
    landF1: "Search, filter and delete the words you collected.", landF2: "Every video is saved by itself. Remove the ones you don't want.", landF3: "Words you know never show up again.", landF4: "Race friends in rooms with your own settings.",
    landAccount: "My account", landPrivacy: "Privacy policy", landDisclaimer: "CineVocab is not affiliated with Amazon, Prime Video, Google, YouTube or Udemy."
  };
  D.tr = {
    login: "Giriş yap", register: "Kayıt ol", logout: "Çıkış yap", username: "Kullanıcı adı", password: "Parola", pwHint: "Parola (en az 6 karakter)",
    createAccount: "Hesap oluştur", authTitle: "Her altyazıdan kelime kazan", authSub: "İzlerken topladığın kelimeleri görmek için giriş yap.",
    authDemo: "Eklenti, altyazıdaki her kelimenin altında çevirisini gösterir.",
    nav_words: "Kelimeler", nav_videos: "Videolar", nav_known: "Bildiklerim", nav_practice: "Pratik", nav_duel: "Düello", nav_settings: "Ayarlar",
    learning: "Öğrendiğim dil", translateTo: "Çeviri dili", uiLang: "Site dili", theme: "Temayı değiştir",
    wordsSub: "{1} altyazılarından {0} kelime", statWords: "Kelime", statVideos: "Video", statKnown: "Bildiğim", statWins: "Düello zaferi",
    search: "Kelime ara…", allVideos: "Tüm videolar", selectShown: "Görünenleri seç", selectAll: "Hepsini seç", clear: "Temizle", selected: "{0} seçili",
    iKnow: "Bunları biliyorum", del: "Sil", cancel: "Vazgeç", showMore: "{0} tane daha göster", noMatch: "Eşleşen kelime yok.", noVideo: "Adsız video",
    emptyWords: "Bu dil çiftinde henüz kelime yok", emptyWordsText: "Eklentiyi aç ve {0} altyazılı bir şey izle. {1} çevirileri burada kendiliğinden birikir.",
    markedKnown: "{0} kelime bildiklerine eklendi", movedBack: "{0} kelime listene geri döndü", deleted: "{0} silindi",
    confirmDelWords: "{0} kelime silinsin mi?", confirmDelWordsText: "Tüm videolardan kalkarlar. İzlerken tekrar karşılaşırsan yeniden eklenirler.",
    confirmDelVideos: "{0} video silinsin mi?", confirmDelVideosText: "Bu videolardan toplanan tüm kelimeler listenden çıkar.",
    videosSub: "Eklentiyle izlediğin her video buraya kendiliğinden eklenir.", viewWords: "Kelimeler", wordsN: "{0} kelime",
    autoNote: "Videolar otomatik eklenir. İstemediklerini seçip sil.",
    emptyVideos: "Henüz video yok", emptyVideosText: "Eklenti açıkken bir şey izlediğinde burada görünür.",
    knownSub: "Bildiğin kelimeler altyazıda, listelerde ve düellolarda gösterilmez.", addKnown: "Bildiğin kelimeleri ekle", addKnownPh: "Her satıra bir kelime ya da virgülle ayır", add: "Ekle",
    moveBack: "Öğrenme listesine geri al", emptyKnown: "Henüz boş", emptyKnownText: "Listeden kelime seçip “Bunları biliyorum”a bas ya da yukarıdan ekle.",
    practiceSub: "Kendi kelimelerinden hızlı çoktan seçmeli quiz.", needWords: "Henüz yeterli kelime yok", needWordsText: "Farklı çevirileri olan en az 4 kelime gerekiyor.",
    source: "Kelimeler", allWords: "Tüm kelimeler", questions: "Soru", nQuestions: "{0} soru", start: "Başla", qOf: "{0} / {1}",
    result: "{1} sorudan {0} doğru", retryWrong: "Yanlış yaptığın {0} soruyu tekrarla", again: "Yeni quiz",
    duelSub: "Topladığın kelimelerle arkadaşlarınla yarış. Oda kur ya da kodla katıl.", joinRoom: "Odaya katıl", joinSub: "Arkadaşının verdiği 4 haneli kodu gir.",
    join: "Katıl", roomPwJoin: "Oda şifresi (varsa)", codeHint: "4 haneli kodu gir.", createRoom: "Oda kur", createSub: "Sorular {0} → {1} kelimelerinden gelir.",
    seconds: "Soru başına süre (sn)", roomPwCreateLabel: "Oda şifresi (isteğe bağlı)", roomPwCreate: "Boş bırakırsan oda herkese açık",
    leaderboard: "Sıralama", week: "Hafta", month: "Ay", year: "Yıl", all: "Tümü", people: "Kişiler", countries: "Ülkeler", noScores: "Henüz oynanan oyun yok.",
    you: "sen", playersN: "{0} oyuncu", winsN: "{0} galibiyet",
    profile: "Profil", country: "Ülke", save: "Kaydet", saved: "Kaydedildi",
    extension: "Tarayıcı eklentisi", extSub: "Bir anahtar oluştur, eklentiye yapıştır; kelimelerin bu hesaba düşsün.", genKey: "Anahtar oluştur", copy: "Kopyala", copied: "Kopyalandı", keyHint: "Anahtarın burada görünecek.",
    ext1: "CineVocab eklentisini kur ve açılır penceresini aç.", ext2: "Anahtarı yapıştır, dil çiftini seç.", ext3: "Anahtarı aç, sonra altyazılı izle.",
    account: "Hesap", accountSub: "Bu tarayıcıdan çık ya da hesabını ve tüm verilerini sil.", deleteAccount: "Hesabı sil", deleteAccountSub: "Hesabın, kelimelerin ve puanların kalıcı olarak silinir. Onaylamak için parolanı gir.", accountDeleted: "Hesap silindi.",
    gameTitle: "Kelime düellosu", gameSub: "Herkesten hızlı cevapla.", backToPanel: "Panele dön", createInPanel: "Oda kurmak mı istiyorsun? Panelden kur.",
    room: "Oda kodu", shareCode: "Bu kodu diğer oyunculara ver.", copyCode: "Kodu kopyala", leave: "Çık", startGame: "Oyunu başlat", waitHost: "Oda sahibinin başlatması bekleniyor…", host: "oda sahibi",
    locked: "şifreli", secShort: "sn", fastBonus: "Hızlı cevap = bonus puan", gameOver: "Oyun bitti", tie: "Berabere!", winner: "{0} kazandı", playAgain: "Tekrar oyna", hostRestarts: "Yeni oyunu oda sahibi başlatabilir.", connLost: "Bağlantı koptu.",
    eNet: "Sunucuya ulaşılamıyor.", eLogin: "Önce giriş yapmalısın.", eBanned: "Oyun odalarına girişin kısıtlandı.", ePair: "Dil çifti geçersiz.", eNeed4: "En az 4 kelime gerekiyor (şu an {0}).",
    eNoRoom: "Oda bulunamadı veya oyun başlamış.", ePw: "Oda şifresi yanlış.", eRate: "Çok fazla deneme. Biraz sonra tekrar dene.", eUser: "Kullanıcı adı 3-16 karakter olmalı (harf, rakam, _).",
    ePass6: "Parola en az 6 karakter olmalı.", eTaken: "Bu kullanıcı adı alınmış.", eCreds: "Kullanıcı adı ya da parola hatalı.", eSusp: "Hesabın askıya alındı.", eWrongPw: "Parola hatalı.", eCountry: "Ülke geçersiz.", eBig: "Veri çok büyük.",
    landH1: "Her altyazıyı kelime dağarcığına çevir.", landLead: "CineVocab, izlerken her altyazı kelimesinin altında çevirisini gösterir; hangi dil çifti olursa olsun. Kelimeler pratik yapman için saklanır.",
    landCta: "Ücretsiz hesap oluştur", landHow: "Nasıl çalışır", landSites: "Prime Video, YouTube ve Udemy'de çalışır.",
    landS1T: "Eklentiyi kur", landS1: "Chrome'a ekle, anahtarını yapıştır; altyazı dilini ve kendi dilini seç.",
    landS2T: "Aç ve izle", landS2: "Yalnızca sen açınca çalışır ve yalnızca altyazı seçtiğin dildeyse çevirir.",
    landS3T: "Kelimelerini çalış", landS3: "Listeni temizle, bildiklerini gizle, quiz çöz ya da arkadaşına meydan oku.",
    landF1: "Topladığın kelimeleri ara, süz ve sil.", landF2: "Her video kendiliğinden kaydolur. İstemediğini kaldır.", landF3: "Bildiğin kelimeler bir daha çıkmaz.", landF4: "Kendi ayarlarınla odalarda arkadaşlarınla yarış.",
    landAccount: "Hesabım", landPrivacy: "Gizlilik politikası", landDisclaimer: "CineVocab; Amazon, Prime Video, Google, YouTube ve Udemy ile bağlantılı değildir."
  };
  D.fr = {
    login: "Se connecter", register: "S'inscrire", logout: "Se déconnecter", username: "Nom d'utilisateur", password: "Mot de passe", pwHint: "Mot de passe (6 caractères min.)",
    createAccount: "Créer un compte", authTitle: "Tes mots, tirés de chaque sous-titre", authSub: "Connecte-toi pour retrouver les mots collectés en regardant.",
    authDemo: "L'extension affiche la traduction sous chaque mot du sous-titre.",
    nav_words: "Mots", nav_videos: "Vidéos", nav_known: "Connus", nav_practice: "Entraînement", nav_duel: "Duel", nav_settings: "Réglages",
    learning: "J'apprends", translateTo: "Traduire en", uiLang: "Langue du site", theme: "Changer de thème",
    wordsSub: "{0} mots issus de sous-titres en {1}", statWords: "Mots", statVideos: "Vidéos", statKnown: "Connus", statWins: "Victoires",
    search: "Rechercher un mot…", allVideos: "Toutes les vidéos", selectShown: "Sélectionner l'affichage", selectAll: "Tout sélectionner", clear: "Effacer", selected: "{0} sélectionné(s)",
    iKnow: "Je connais", del: "Supprimer", cancel: "Annuler", showMore: "Afficher {0} de plus", noMatch: "Aucun mot ne correspond.", noVideo: "Vidéo sans titre",
    emptyWords: "Aucun mot pour cette paire de langues", emptyWordsText: "Active l'extension et regarde un contenu sous-titré en {0}. Les traductions en {1} s'accumulent ici.",
    markedKnown: "{0} mots marqués comme connus", movedBack: "{0} mots remis dans ta liste", deleted: "{0} supprimé(s)",
    confirmDelWords: "Supprimer {0} mots ?", confirmDelWordsText: "Ils disparaissent de toutes les vidéos. Ils reviendront si tu les recroises.",
    confirmDelVideos: "Supprimer {0} vidéos ?", confirmDelVideosText: "Tous les mots collectés dans ces vidéos sont retirés de ta liste.",
    videosSub: "Chaque vidéo regardée avec l'extension est ajoutée automatiquement.", viewWords: "Mots", wordsN: "{0} mots",
    autoNote: "Les vidéos sont ajoutées automatiquement. Sélectionne celles dont tu n'as pas besoin pour les supprimer.",
    emptyVideos: "Aucune vidéo pour l'instant", emptyVideosText: "Elles apparaissent dès que tu regardes avec l'extension activée.",
    knownSub: "Les mots que tu connais sont masqués des sous-titres, listes et duels.", addKnown: "Ajouter des mots que tu connais", addKnownPh: "Un par ligne ou séparés par des virgules", add: "Ajouter",
    moveBack: "Remettre à apprendre", emptyKnown: "Rien ici pour l'instant", emptyKnownText: "Sélectionne des mots et appuie sur « Je connais », ou ajoute-les ci-dessus.",
    practiceSub: "Un quiz à choix multiples rapide avec tes propres mots.", needWords: "Pas encore assez de mots", needWordsText: "Il faut au moins 4 mots avec des traductions différentes.",
    source: "Mots de", allWords: "Tous les mots", questions: "Questions", nQuestions: "{0} questions", start: "Commencer", qOf: "{0} / {1}",
    result: "{0} bonnes réponses sur {1}", retryWrong: "Refaire les {0} erreurs", again: "Nouveau quiz",
    duelSub: "Affronte tes amis avec les mots collectés. Crée une salle ou rejoins-en une avec un code.", joinRoom: "Rejoindre une salle", joinSub: "Saisis le code à 4 chiffres de ton ami.",
    join: "Rejoindre", roomPwJoin: "Mot de passe de la salle (si besoin)", codeHint: "Saisis le code à 4 chiffres.", createRoom: "Créer une salle", createSub: "Les questions viennent de tes mots {0} → {1}.",
    seconds: "Secondes par question", roomPwCreateLabel: "Mot de passe de la salle (facultatif)", roomPwCreate: "Vide = salle ouverte",
    leaderboard: "Classement", week: "Semaine", month: "Mois", year: "Année", all: "Tout", people: "Joueurs", countries: "Pays", noScores: "Aucune partie jouée.",
    you: "toi", playersN: "{0} joueurs", winsN: "{0} victoires",
    profile: "Profil", country: "Pays", save: "Enregistrer", saved: "Enregistré",
    extension: "Extension de navigateur", extSub: "Crée une clé et colle-la dans l'extension pour que tes mots arrivent sur ce compte.", genKey: "Créer une clé", copy: "Copier", copied: "Copié", keyHint: "Ta clé apparaîtra ici.",
    ext1: "Installe l'extension CineVocab et ouvre sa fenêtre.", ext2: "Colle la clé et choisis ta paire de langues.", ext3: "Active l'interrupteur puis regarde avec sous-titres.",
    account: "Compte", accountSub: "Déconnecte-toi de ce navigateur ou supprime ton compte et toutes ses données.", deleteAccount: "Supprimer le compte", deleteAccountSub: "Ton compte, tes mots et tes scores seront supprimés définitivement. Saisis ton mot de passe pour confirmer.", accountDeleted: "Compte supprimé.",
    gameTitle: "Duel de mots", gameSub: "Réponds plus vite que tout le monde.", backToPanel: "Retour au panneau", createInPanel: "Envie d'héberger ? Crée une salle depuis ton panneau.",
    room: "Code de la salle", shareCode: "Donne ce code aux autres joueurs.", copyCode: "Copier le code", leave: "Quitter", startGame: "Lancer la partie", waitHost: "En attente de l'hôte…", host: "hôte",
    locked: "mot de passe", secShort: "s", fastBonus: "Réponse rapide = points bonus", gameOver: "Partie terminée", tie: "Égalité !", winner: "{0} gagne", playAgain: "Rejouer", hostRestarts: "L'hôte peut lancer une nouvelle partie.", connLost: "Connexion perdue.",
    eNet: "Impossible de joindre le serveur.", eLogin: "Connecte-toi d'abord.", eBanned: "Tu ne peux pas rejoindre les salles.", ePair: "Paire de langues invalide.", eNeed4: "Il faut au moins 4 mots (tu en as {0}).",
    eNoRoom: "Salle introuvable ou partie déjà commencée.", ePw: "Mot de passe de la salle incorrect.", eRate: "Trop de tentatives. Réessaie dans un instant.", eUser: "Le nom doit faire 3 à 16 caractères (lettres, chiffres, _).",
    ePass6: "Le mot de passe doit faire au moins 6 caractères.", eTaken: "Ce nom d'utilisateur est pris.", eCreds: "Nom d'utilisateur ou mot de passe incorrect.", eSusp: "Ton compte est suspendu.", eWrongPw: "Mot de passe incorrect.", eCountry: "Pays invalide.", eBig: "Données trop volumineuses.",
    landH1: "Transforme chaque sous-titre en vocabulaire.", landLead: "CineVocab affiche la traduction sous chaque mot du sous-titre pendant que tu regardes, pour n'importe quelle paire de langues, et garde les mots pour t'entraîner.",
    landCta: "Créer un compte gratuit", landHow: "Comment ça marche", landSites: "Fonctionne sur Prime Video, YouTube et Udemy.",
    landS1T: "Installe l'extension", landS1: "Ajoute-la à Chrome, colle ta clé et choisis la langue des sous-titres et la tienne.",
    landS2T: "Active et regarde", landS2: "Elle ne tourne que si tu l'actives, et seulement si les sous-titres sont dans la langue choisie.",
    landS3T: "Révise tes mots", landS3: "Fais le tri, masque ce que tu connais, passe un quiz ou défie un ami.",
    landF1: "Cherche, filtre et supprime les mots collectés.", landF2: "Chaque vidéo est enregistrée seule. Retire celles dont tu ne veux pas.", landF3: "Les mots connus ne reviennent jamais.", landF4: "Affronte tes amis dans des salles à ta façon.",
    landAccount: "Mon compte", landPrivacy: "Politique de confidentialité", landDisclaimer: "CineVocab n'est affilié ni à Amazon, Prime Video, Google, YouTube ni Udemy."
  };
  D.it = {
    login: "Accedi", register: "Registrati", logout: "Esci", username: "Nome utente", password: "Password", pwHint: "Password (almeno 6 caratteri)",
    createAccount: "Crea account", authTitle: "Le tue parole, da ogni sottotitolo", authSub: "Accedi per vedere le parole raccolte mentre guardi.",
    authDemo: "L'estensione mostra la traduzione sotto ogni parola del sottotitolo.",
    nav_words: "Parole", nav_videos: "Video", nav_known: "Conosciute", nav_practice: "Esercizio", nav_duel: "Duello", nav_settings: "Impostazioni",
    learning: "Sto imparando", translateTo: "Traduci in", uiLang: "Lingua del sito", theme: "Cambia tema",
    wordsSub: "{0} parole da sottotitoli in {1}", statWords: "Parole", statVideos: "Video", statKnown: "Conosciute", statWins: "Vittorie",
    search: "Cerca parole…", allVideos: "Tutti i video", selectShown: "Seleziona visibili", selectAll: "Seleziona tutto", clear: "Annulla", selected: "{0} selezionate",
    iKnow: "Le conosco", del: "Elimina", cancel: "Annulla", showMore: "Mostra altre {0}", noMatch: "Nessuna parola corrisponde.", noVideo: "Video senza titolo",
    emptyWords: "Ancora nessuna parola per questa coppia di lingue", emptyWordsText: "Attiva l'estensione e guarda qualcosa con sottotitoli in {0}. Le traduzioni in {1} compaiono qui da sole.",
    markedKnown: "{0} parole segnate come conosciute", movedBack: "{0} parole rimesse nella lista", deleted: "{0} eliminate",
    confirmDelWords: "Eliminare {0} parole?", confirmDelWordsText: "Spariscono da tutti i video. Torneranno se le incontri di nuovo.",
    confirmDelVideos: "Eliminare {0} video?", confirmDelVideosText: "Tutte le parole raccolte da questi video vengono rimosse dalla lista.",
    videosSub: "Ogni video guardato con l'estensione viene aggiunto da solo.", viewWords: "Parole", wordsN: "{0} parole",
    autoNote: "I video si aggiungono automaticamente. Seleziona quelli che non ti servono ed eliminali.",
    emptyVideos: "Ancora nessun video", emptyVideosText: "Compaiono qui appena guardi con l'estensione attiva.",
    knownSub: "Le parole che conosci non compaiono nei sottotitoli, nelle liste e nei duelli.", addKnown: "Aggiungi parole che conosci", addKnownPh: "Una per riga o separate da virgole", add: "Aggiungi",
    moveBack: "Rimetti in studio", emptyKnown: "Ancora vuoto", emptyKnownText: "Seleziona delle parole e premi «Le conosco», oppure aggiungile qui sopra.",
    practiceSub: "Quiz veloce a scelta multipla con le tue parole.", needWords: "Parole insufficienti", needWordsText: "Servono almeno 4 parole con traduzioni diverse.",
    source: "Parole da", allWords: "Tutte le parole", questions: "Domande", nQuestions: "{0} domande", start: "Inizia", qOf: "{0} / {1}",
    result: "{0} corrette su {1}", retryWrong: "Riprova le {0} sbagliate", again: "Nuovo quiz",
    duelSub: "Sfida gli amici con le parole raccolte. Crea una stanza o entra con un codice.", joinRoom: "Entra in una stanza", joinSub: "Inserisci il codice a 4 cifre del tuo amico.",
    join: "Entra", roomPwJoin: "Password della stanza (se c'è)", codeHint: "Inserisci il codice a 4 cifre.", createRoom: "Crea una stanza", createSub: "Le domande arrivano dalle tue parole {0} → {1}.",
    seconds: "Secondi per domanda", roomPwCreateLabel: "Password della stanza (facoltativa)", roomPwCreate: "Vuota = stanza aperta",
    leaderboard: "Classifica", week: "Settimana", month: "Mese", year: "Anno", all: "Sempre", people: "Giocatori", countries: "Paesi", noScores: "Nessuna partita giocata.",
    you: "tu", playersN: "{0} giocatori", winsN: "{0} vittorie",
    profile: "Profilo", country: "Paese", save: "Salva", saved: "Salvato",
    extension: "Estensione del browser", extSub: "Crea una chiave e incollala nell'estensione: le parole arriveranno su questo account.", genKey: "Crea chiave", copy: "Copia", copied: "Copiato", keyHint: "La tua chiave apparirà qui.",
    ext1: "Installa l'estensione CineVocab e apri il suo popup.", ext2: "Incolla la chiave e scegli la coppia di lingue.", ext3: "Attiva l'interruttore e guarda con i sottotitoli.",
    account: "Account", accountSub: "Esci da questo browser o elimina l'account con tutti i dati.", deleteAccount: "Elimina account", deleteAccountSub: "Account, parole e punteggi verranno eliminati per sempre. Inserisci la password per confermare.", accountDeleted: "Account eliminato.",
    gameTitle: "Duello di parole", gameSub: "Rispondi più veloce di tutti.", backToPanel: "Torna al pannello", createInPanel: "Vuoi ospitare? Crea una stanza dal pannello.",
    room: "Codice stanza", shareCode: "Condividi questo codice con gli altri giocatori.", copyCode: "Copia codice", leave: "Esci", startGame: "Avvia partita", waitHost: "In attesa dell'host…", host: "host",
    locked: "password", secShort: "s", fastBonus: "Risposta veloce = punti bonus", gameOver: "Partita finita", tie: "Pareggio!", winner: "Vince {0}", playAgain: "Gioca ancora", hostRestarts: "L'host può avviare una nuova partita.", connLost: "Connessione persa.",
    eNet: "Impossibile raggiungere il server.", eLogin: "Prima devi accedere.", eBanned: "Non puoi entrare nelle stanze di gioco.", ePair: "Coppia di lingue non valida.", eNeed4: "Servono almeno 4 parole (ne hai {0}).",
    eNoRoom: "Stanza non trovata o partita già iniziata.", ePw: "Password della stanza errata.", eRate: "Troppi tentativi. Riprova tra poco.", eUser: "Il nome utente deve avere 3–16 caratteri (lettere, cifre, _).",
    ePass6: "La password deve avere almeno 6 caratteri.", eTaken: "Nome utente già in uso.", eCreds: "Nome utente o password errati.", eSusp: "Il tuo account è sospeso.", eWrongPw: "Password errata.", eCountry: "Paese non valido.", eBig: "Dati troppo grandi.",
    landH1: "Trasforma ogni sottotitolo in vocabolario.", landLead: "CineVocab mostra la traduzione sotto ogni parola del sottotitolo mentre guardi, per qualsiasi coppia di lingue, e conserva le parole per esercitarti.",
    landCta: "Crea un account gratuito", landHow: "Come funziona", landSites: "Funziona su Prime Video, YouTube e Udemy.",
    landS1T: "Installa l'estensione", landS1: "Aggiungila a Chrome, incolla la chiave e scegli la lingua dei sottotitoli e la tua.",
    landS2T: "Attiva e guarda", landS2: "Funziona solo quando la attivi e solo se i sottotitoli sono nella lingua scelta.",
    landS3T: "Esercitati", landS3: "Ripulisci la lista, nascondi ciò che sai, fai un quiz o sfida un amico.",
    landF1: "Cerca, filtra ed elimina le parole raccolte.", landF2: "Ogni video si salva da solo. Rimuovi quelli che non vuoi.", landF3: "Le parole che conosci non tornano più.", landF4: "Sfida gli amici in stanze con le tue regole.",
    landAccount: "Il mio account", landPrivacy: "Informativa sulla privacy", landDisclaimer: "CineVocab non è affiliato ad Amazon, Prime Video, Google, YouTube o Udemy."
  };
  D.de = {
    login: "Anmelden", register: "Registrieren", logout: "Abmelden", username: "Benutzername", password: "Passwort", pwHint: "Passwort (mind. 6 Zeichen)",
    createAccount: "Konto erstellen", authTitle: "Deine Wörter aus jedem Untertitel", authSub: "Melde dich an, um die beim Schauen gesammelten Wörter zu sehen.",
    authDemo: "Die Erweiterung zeigt unter jedem Untertitelwort die Übersetzung.",
    nav_words: "Wörter", nav_videos: "Videos", nav_known: "Bekannt", nav_practice: "Üben", nav_duel: "Duell", nav_settings: "Einstellungen",
    learning: "Ich lerne", translateTo: "Übersetzen nach", uiLang: "Seitensprache", theme: "Design wechseln",
    wordsSub: "{0} Wörter aus {1}-Untertiteln", statWords: "Wörter", statVideos: "Videos", statKnown: "Bekannt", statWins: "Duell-Siege",
    search: "Wörter suchen…", allVideos: "Alle Videos", selectShown: "Angezeigte wählen", selectAll: "Alle wählen", clear: "Leeren", selected: "{0} ausgewählt",
    iKnow: "Kenne ich", del: "Löschen", cancel: "Abbrechen", showMore: "{0} weitere anzeigen", noMatch: "Keine passenden Wörter.", noVideo: "Video ohne Titel",
    emptyWords: "Noch keine Wörter für dieses Sprachpaar", emptyWordsText: "Schalte die Erweiterung ein und sieh etwas mit {0}-Untertiteln. Die {1}-Übersetzungen sammeln sich hier von selbst.",
    markedKnown: "{0} Wörter als bekannt markiert", movedBack: "{0} Wörter zurück in deiner Liste", deleted: "{0} gelöscht",
    confirmDelWords: "{0} Wörter löschen?", confirmDelWordsText: "Sie verschwinden aus allen Videos. Beim erneuten Antreffen kommen sie wieder.",
    confirmDelVideos: "{0} Videos löschen?", confirmDelVideosText: "Alle aus diesen Videos gesammelten Wörter werden aus deiner Liste entfernt.",
    videosSub: "Jedes mit der Erweiterung gesehene Video wird automatisch hinzugefügt.", viewWords: "Wörter", wordsN: "{0} Wörter",
    autoNote: "Videos werden automatisch hinzugefügt. Wähle nicht benötigte aus und lösche sie.",
    emptyVideos: "Noch keine Videos", emptyVideosText: "Sie erscheinen hier, sobald du mit eingeschalteter Erweiterung schaust.",
    knownSub: "Bekannte Wörter werden in Untertiteln, Listen und Duellen ausgeblendet.", addKnown: "Bekannte Wörter hinzufügen", addKnownPh: "Eins pro Zeile oder durch Komma getrennt", add: "Hinzufügen",
    moveBack: "Zurück zum Lernen", emptyKnown: "Noch leer", emptyKnownText: "Wähle Wörter aus und drücke „Kenne ich“, oder füge sie oben hinzu.",
    practiceSub: "Schnelles Multiple-Choice-Quiz mit deinen eigenen Wörtern.", needWords: "Noch nicht genug Wörter", needWordsText: "Du brauchst mindestens 4 Wörter mit verschiedenen Übersetzungen.",
    source: "Wörter aus", allWords: "Alle Wörter", questions: "Fragen", nQuestions: "{0} Fragen", start: "Start", qOf: "{0} / {1}",
    result: "{0} von {1} richtig", retryWrong: "Die {0} Fehler wiederholen", again: "Neues Quiz",
    duelSub: "Tritt mit gesammelten Wörtern gegen Freunde an. Raum erstellen oder per Code beitreten.", joinRoom: "Raum beitreten", joinSub: "Gib den vierstelligen Code deines Freundes ein.",
    join: "Beitreten", roomPwJoin: "Raumpasswort (falls vorhanden)", codeHint: "Gib den vierstelligen Code ein.", createRoom: "Raum erstellen", createSub: "Fragen stammen aus deinen {0} → {1}-Wörtern.",
    seconds: "Sekunden pro Frage", roomPwCreateLabel: "Raumpasswort (optional)", roomPwCreate: "Leer = offener Raum",
    leaderboard: "Rangliste", week: "Woche", month: "Monat", year: "Jahr", all: "Gesamt", people: "Spieler", countries: "Länder", noScores: "Noch keine Spiele.",
    you: "du", playersN: "{0} Spieler", winsN: "{0} Siege",
    profile: "Profil", country: "Land", save: "Speichern", saved: "Gespeichert",
    extension: "Browser-Erweiterung", extSub: "Erstelle einen Schlüssel und füge ihn in die Erweiterung ein, damit deine Wörter in diesem Konto landen.", genKey: "Schlüssel erstellen", copy: "Kopieren", copied: "Kopiert", keyHint: "Dein Schlüssel erscheint hier.",
    ext1: "Installiere die CineVocab-Erweiterung und öffne ihr Popup.", ext2: "Füge den Schlüssel ein und wähle dein Sprachpaar.", ext3: "Schalter einschalten und mit Untertiteln schauen.",
    account: "Konto", accountSub: "Melde dich in diesem Browser ab oder lösche dein Konto samt Daten.", deleteAccount: "Konto löschen", deleteAccountSub: "Konto, Wörter und Punkte werden endgültig gelöscht. Zur Bestätigung Passwort eingeben.", accountDeleted: "Konto gelöscht.",
    gameTitle: "Wortduell", gameSub: "Antworte schneller als alle anderen.", backToPanel: "Zurück zum Panel", createInPanel: "Selbst hosten? Erstelle einen Raum im Panel.",
    room: "Raumcode", shareCode: "Gib diesen Code an die anderen Spieler weiter.", copyCode: "Code kopieren", leave: "Verlassen", startGame: "Spiel starten", waitHost: "Warte auf den Host…", host: "Host",
    locked: "Passwort", secShort: "s", fastBonus: "Schnelle Antwort = Bonuspunkte", gameOver: "Spiel vorbei", tie: "Unentschieden!", winner: "{0} gewinnt", playAgain: "Nochmal spielen", hostRestarts: "Der Host kann ein neues Spiel starten.", connLost: "Verbindung verloren.",
    eNet: "Server nicht erreichbar.", eLogin: "Bitte zuerst anmelden.", eBanned: "Du darfst keinen Spielräumen beitreten.", ePair: "Ungültiges Sprachpaar.", eNeed4: "Mindestens 4 Wörter nötig (du hast {0}).",
    eNoRoom: "Raum nicht gefunden oder Spiel läuft bereits.", ePw: "Falsches Raumpasswort.", eRate: "Zu viele Versuche. Bitte gleich nochmal.", eUser: "Benutzername: 3–16 Zeichen (Buchstaben, Ziffern, _).",
    ePass6: "Das Passwort braucht mindestens 6 Zeichen.", eTaken: "Dieser Benutzername ist vergeben.", eCreds: "Benutzername oder Passwort falsch.", eSusp: "Dein Konto ist gesperrt.", eWrongPw: "Falsches Passwort.", eCountry: "Ungültiges Land.", eBig: "Daten zu groß.",
    landH1: "Mach jeden Untertitel zu Vokabeln.", landLead: "CineVocab zeigt beim Schauen unter jedem Untertitelwort die Übersetzung, für jedes Sprachpaar, und speichert die Wörter zum Üben.",
    landCta: "Kostenloses Konto erstellen", landHow: "So funktioniert's", landSites: "Funktioniert auf Prime Video, YouTube und Udemy.",
    landS1T: "Erweiterung installieren", landS1: "In Chrome hinzufügen, Schlüssel einfügen, Untertitel- und eigene Sprache wählen.",
    landS2T: "Einschalten und schauen", landS2: "Läuft nur, wenn du sie einschaltest, und nur bei Untertiteln in der gewählten Sprache.",
    landS3T: "Wörter üben", landS3: "Liste aufräumen, Bekanntes ausblenden, Quiz lösen oder Freunde herausfordern.",
    landF1: "Gesammelte Wörter suchen, filtern und löschen.", landF2: "Jedes Video wird automatisch gespeichert. Entferne, was du nicht willst.", landF3: "Bekannte Wörter tauchen nie wieder auf.", landF4: "Tritt in Räumen mit eigenen Regeln gegen Freunde an.",
    landAccount: "Mein Konto", landPrivacy: "Datenschutz", landDisclaimer: "CineVocab steht in keiner Verbindung zu Amazon, Prime Video, Google, YouTube oder Udemy."
  };
  D.es = {
    login: "Iniciar sesión", register: "Registrarse", logout: "Cerrar sesión", username: "Usuario", password: "Contraseña", pwHint: "Contraseña (mín. 6 caracteres)",
    createAccount: "Crear cuenta", authTitle: "Tus palabras, de cada subtítulo", authSub: "Inicia sesión para ver las palabras que recogiste mientras mirabas.",
    authDemo: "La extensión muestra la traducción bajo cada palabra del subtítulo.",
    nav_words: "Palabras", nav_videos: "Vídeos", nav_known: "Conocidas", nav_practice: "Práctica", nav_duel: "Duelo", nav_settings: "Ajustes",
    learning: "Estoy aprendiendo", translateTo: "Traducir a", uiLang: "Idioma del sitio", theme: "Cambiar tema",
    wordsSub: "{0} palabras de subtítulos en {1}", statWords: "Palabras", statVideos: "Vídeos", statKnown: "Conocidas", statWins: "Victorias",
    search: "Buscar palabras…", allVideos: "Todos los vídeos", selectShown: "Seleccionar visibles", selectAll: "Seleccionar todo", clear: "Limpiar", selected: "{0} seleccionadas",
    iKnow: "Ya las sé", del: "Eliminar", cancel: "Cancelar", showMore: "Mostrar {0} más", noMatch: "Ninguna palabra coincide.", noVideo: "Vídeo sin título",
    emptyWords: "Aún no hay palabras en este par de idiomas", emptyWordsText: "Activa la extensión y mira algo con subtítulos en {0}. Las traducciones al {1} se acumulan aquí solas.",
    markedKnown: "{0} palabras marcadas como conocidas", movedBack: "{0} palabras devueltas a tu lista", deleted: "{0} eliminadas",
    confirmDelWords: "¿Eliminar {0} palabras?", confirmDelWordsText: "Desaparecen de todos los vídeos. Volverán si te las encuentras otra vez.",
    confirmDelVideos: "¿Eliminar {0} vídeos?", confirmDelVideosText: "Todas las palabras recogidas de estos vídeos se quitan de tu lista.",
    videosSub: "Cada vídeo que ves con la extensión se añade solo.", viewWords: "Palabras", wordsN: "{0} palabras",
    autoNote: "Los vídeos se añaden automáticamente. Selecciona los que no necesites y elimínalos.",
    emptyVideos: "Aún no hay vídeos", emptyVideosText: "Aparecen aquí en cuanto veas algo con la extensión activada.",
    knownSub: "Las palabras que ya sabes se ocultan en subtítulos, listas y duelos.", addKnown: "Añadir palabras que ya sabes", addKnownPh: "Una por línea o separadas por comas", add: "Añadir",
    moveBack: "Volver a aprender", emptyKnown: "Aún vacío", emptyKnownText: "Selecciona palabras y pulsa «Ya las sé», o añádelas arriba.",
    practiceSub: "Test rápido de opción múltiple con tus propias palabras.", needWords: "Aún no hay suficientes palabras", needWordsText: "Necesitas al menos 4 palabras con traducciones distintas.",
    source: "Palabras de", allWords: "Todas las palabras", questions: "Preguntas", nQuestions: "{0} preguntas", start: "Empezar", qOf: "{0} / {1}",
    result: "{0} de {1} correctas", retryWrong: "Repetir las {0} falladas", again: "Nuevo test",
    duelSub: "Compite con amigos usando tus palabras. Crea una sala o únete con un código.", joinRoom: "Unirse a una sala", joinSub: "Introduce el código de 4 dígitos de tu amigo.",
    join: "Unirse", roomPwJoin: "Contraseña de la sala (si hay)", codeHint: "Introduce el código de 4 dígitos.", createRoom: "Crear una sala", createSub: "Las preguntas salen de tus palabras {0} → {1}.",
    seconds: "Segundos por pregunta", roomPwCreateLabel: "Contraseña de la sala (opcional)", roomPwCreate: "Vacío = sala abierta",
    leaderboard: "Clasificación", week: "Semana", month: "Mes", year: "Año", all: "Siempre", people: "Jugadores", countries: "Países", noScores: "Aún no se ha jugado.",
    you: "tú", playersN: "{0} jugadores", winsN: "{0} victorias",
    profile: "Perfil", country: "País", save: "Guardar", saved: "Guardado",
    extension: "Extensión del navegador", extSub: "Crea una clave y pégala en la extensión para que tus palabras lleguen a esta cuenta.", genKey: "Crear clave", copy: "Copiar", copied: "Copiado", keyHint: "Tu clave aparecerá aquí.",
    ext1: "Instala la extensión CineVocab y abre su ventana.", ext2: "Pega la clave y elige tu par de idiomas.", ext3: "Activa el interruptor y mira con subtítulos.",
    account: "Cuenta", accountSub: "Cierra sesión en este navegador o elimina tu cuenta y todos sus datos.", deleteAccount: "Eliminar cuenta", deleteAccountSub: "Tu cuenta, palabras y puntuaciones se borrarán para siempre. Introduce tu contraseña para confirmar.", accountDeleted: "Cuenta eliminada.",
    gameTitle: "Duelo de palabras", gameSub: "Responde más rápido que todos.", backToPanel: "Volver al panel", createInPanel: "¿Quieres ser anfitrión? Crea una sala desde el panel.",
    room: "Código de sala", shareCode: "Comparte este código con los demás jugadores.", copyCode: "Copiar código", leave: "Salir", startGame: "Empezar partida", waitHost: "Esperando al anfitrión…", host: "anfitrión",
    locked: "contraseña", secShort: "s", fastBonus: "Respuesta rápida = puntos extra", gameOver: "Fin de la partida", tie: "¡Empate!", winner: "Gana {0}", playAgain: "Jugar otra vez", hostRestarts: "El anfitrión puede iniciar otra partida.", connLost: "Conexión perdida.",
    eNet: "No se puede conectar con el servidor.", eLogin: "Primero inicia sesión.", eBanned: "No puedes entrar en las salas de juego.", ePair: "Par de idiomas no válido.", eNeed4: "Se necesitan al menos 4 palabras (tienes {0}).",
    eNoRoom: "Sala no encontrada o la partida ya empezó.", ePw: "Contraseña de sala incorrecta.", eRate: "Demasiados intentos. Prueba en un momento.", eUser: "El usuario debe tener 3–16 caracteres (letras, números, _).",
    ePass6: "La contraseña debe tener al menos 6 caracteres.", eTaken: "Ese usuario ya existe.", eCreds: "Usuario o contraseña incorrectos.", eSusp: "Tu cuenta está suspendida.", eWrongPw: "Contraseña incorrecta.", eCountry: "País no válido.", eBig: "Datos demasiado grandes.",
    landH1: "Convierte cada subtítulo en vocabulario.", landLead: "CineVocab muestra la traducción bajo cada palabra del subtítulo mientras ves contenido, en cualquier par de idiomas, y guarda las palabras para practicar.",
    landCta: "Crear cuenta gratis", landHow: "Cómo funciona", landSites: "Funciona en Prime Video, YouTube y Udemy.",
    landS1T: "Instala la extensión", landS1: "Añádela a Chrome, pega tu clave y elige el idioma de los subtítulos y el tuyo.",
    landS2T: "Actívala y mira", landS2: "Solo funciona cuando la activas y solo si los subtítulos están en el idioma elegido.",
    landS3T: "Practica tus palabras", landS3: "Limpia tu lista, oculta lo que sabes, haz un test o reta a un amigo.",
    landF1: "Busca, filtra y elimina las palabras recogidas.", landF2: "Cada vídeo se guarda solo. Quita los que no quieras.", landF3: "Las palabras que sabes no vuelven a salir.", landF4: "Compite con amigos en salas con tus reglas.",
    landAccount: "Mi cuenta", landPrivacy: "Política de privacidad", landDisclaimer: "CineVocab no está afiliado a Amazon, Prime Video, Google, YouTube ni Udemy."
  };

  var LIST = [["tr", "Türkçe"], ["en", "English"], ["fr", "Français"], ["it", "Italiano"], ["de", "Deutsch"], ["es", "Español"]];
  var ERRS = [["Önce giriş", "eLogin"], ["Giriş yapmalısın", "eLogin"], ["Oyun odalarına", "eBanned"], ["Dil çifti", "ePair"], ["En az 4 kelime", "eNeed4"],
    ["Oda bulunamadı", "eNoRoom"], ["Oda şifresi", "ePw"], ["Çok fazla", "eRate"], ["Kullanıcı adı 3-16", "eUser"], ["Parola en az", "ePass6"],
    ["Bu kullanıcı adı", "eTaken"], ["Kullanıcı adı ya da", "eCreds"], ["Hesabın askıya", "eSusp"], ["Parola hatalı", "eWrongPw"], ["Ülke geçersiz", "eCountry"], ["Veri çok", "eBig"]];
  var CB = [];
  function store(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function detect() {
    var s = store("cv-lang");
    if (s && D[s]) return s;
    var n = (navigator.language || "en").slice(0, 2).toLowerCase();
    return D[n] ? n : "en";
  }
  var I = { lang: detect(), list: LIST };
  function tr(key) {
    var s = (D[I.lang] && D[I.lang][key]) || D.en[key] || key;
    for (var i = 1; i < arguments.length; i++) s = s.split("{" + (i - 1) + "}").join(arguments[i]);
    return s;
  }
  I.t = tr;
  I.err = function (msg) {
    msg = String(msg || "");
    for (var i = 0; i < ERRS.length; i++) if (msg.indexOf(ERRS[i][0]) === 0) {
      var m = msg.match(/\d+/g);
      return tr(ERRS[i][1], m ? m[m.length - 1] : "");
    }
    return msg || tr("eNet");
  };
  I.apply = function (root) {
    root = root || document;
    document.documentElement.lang = I.lang;
    [].forEach.call(root.querySelectorAll("[data-i]"), function (n) { n.textContent = tr(n.getAttribute("data-i")); });
    [].forEach.call(root.querySelectorAll("[data-i-ph]"), function (n) { n.placeholder = tr(n.getAttribute("data-i-ph")); });
  };
  I.set = function (l) { if (!D[l]) return; I.lang = l; save("cv-lang", l); I.apply(); CB.forEach(function (f) { f(); }); };
  I.onChange = function (f) { CB.push(f); };
  I.theme = function () { return document.documentElement.getAttribute("data-theme") || "dark"; };
  I.setTheme = function (m) { document.documentElement.setAttribute("data-theme", m); save("cv-theme", m); };
  document.documentElement.setAttribute("data-theme", store("cv-theme") || "dark");
  window.I18N = I; window.t = tr;
  document.addEventListener("DOMContentLoaded", function () { I.apply(); });
})();
