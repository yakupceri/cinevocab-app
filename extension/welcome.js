// Kurulumdan sonra açılan karşılama sayfası: tek ekran, tek ana düğme.
// Düğme hem çeviriyi AÇAR (kullanıcının bilinçli onayı; background.js kurulumda hiçbir şey açmaz) hem altyazılı bir örnek video açar.
// O ana kadar altyazı metni hiçbir yere gönderilmez. Metinler 9 dilde; olmayan dil İngilizce görür.
const T = {
  en: {"title": "Learn from what you already watch.", "sub": "Words in the subtitles get their translation right on the video.", "s1": "Pick a video from the results. If captions are off, press CC in the player.", "s2": "Click a word to keep it. No account needed to start.", "btn": "Find {0} videos with captions", "lSrc": "Subtitles in", "lDst": "Translate to", "fine": "To translate, the subtitle line you are watching is sent to our server and to Google Translate. No subtitle text is sent until you press the button. You can switch CineVocab off any time from the toolbar icon.", "priv": "Privacy policy"},
  tr: {"title": "İzlediğin şeyden öğren.", "sub": "Altyazıdaki kelimelerin çevirisi videonun üstünde çıkar.", "s1": "Sonuçlardan bir video seç. Altyazı kapalıysa oynatıcıda CC'ye bas.", "s2": "Kelimeye tıkla, kaydedilsin. Başlamak için hesap gerekmez.", "btn": "Altyazılı {0} videolar bul", "lSrc": "Altyazı dili", "lDst": "Çeviri dili", "fine": "Çeviri için izlediğin altyazı satırı sunucumuza ve Google Çeviri'ye gönderilir. Düğmeye basana kadar altyazı metni hiçbir yere gönderilmez. CineVocab'ı istediğin an araç çubuğundaki simgeden kapatabilirsin.", "priv": "Gizlilik politikası"},
  es: {"title": "Aprende de lo que ya ves.", "sub": "Las palabras del subtítulo se traducen sobre el vídeo.", "s1": "Elige un vídeo de los resultados. Si los subtítulos están apagados, pulsa CC en el reproductor.", "s2": "Haz clic en una palabra para guardarla. No necesitas cuenta para empezar.", "btn": "Buscar vídeos en {0} con subtítulos", "lSrc": "Subtítulos en", "lDst": "Traducir a", "fine": "Para traducir, la línea de subtítulo que ves se envía a nuestro servidor y a Google Traductor. No se envía ningún texto de subtítulos hasta que pulses el botón. Puedes apagar CineVocab cuando quieras desde el icono de la barra.", "priv": "Política de privacidad"},
  pt: {"title": "Aprenda com o que você já assiste.", "sub": "As palavras da legenda são traduzidas sobre o vídeo.", "s1": "Escolha um vídeo nos resultados. Se as legendas estiverem desligadas, pressione CC no player.", "s2": "Clique em uma palavra para guardá-la. Não precisa de conta para começar.", "btn": "Buscar vídeos em {0} com legendas", "lSrc": "Legendas em", "lDst": "Traduzir para", "fine": "Para traduzir, a linha de legenda que você está vendo é enviada ao nosso servidor e ao Google Tradutor. Nenhum texto de legenda é enviado até você pressionar o botão. Você pode desligar o CineVocab a qualquer momento pelo ícone na barra de ferramentas.", "priv": "Política de privacidade"},
  de: {"title": "Lerne von dem, was du ohnehin schaust.", "sub": "Wörter aus den Untertiteln werden direkt auf dem Video übersetzt.", "s1": "Wähle ein Video aus den Ergebnissen. Sind die Untertitel aus, drücke im Player auf CC.", "s2": "Klicke ein Wort an, um es zu behalten. Zum Start brauchst du kein Konto.", "btn": "Videos auf {0} mit Untertiteln finden", "lSrc": "Untertitel auf", "lDst": "Übersetzen nach", "fine": "Zum Übersetzen wird die Untertitelzeile, die du siehst, an unseren Server und an Google Übersetzer gesendet. Bis du die Schaltfläche drückst, wird kein Untertiteltext gesendet. Du kannst CineVocab jederzeit über das Symbol in der Leiste ausschalten.", "priv": "Datenschutzerklärung"},
  fr: {"title": "Apprends avec ce que tu regardes déjà.", "sub": "Les mots des sous-titres sont traduits directement sur la vidéo.", "s1": "Choisis une vidéo dans les résultats. Si les sous-titres sont coupés, appuie sur CC dans le lecteur.", "s2": "Clique sur un mot pour le garder. Aucun compte n'est nécessaire pour commencer.", "btn": "Trouver des vidéos en {0} avec sous-titres", "lSrc": "Sous-titres en", "lDst": "Traduire en", "fine": "Pour traduire, la ligne de sous-titre que tu regardes est envoyée à notre serveur et à Google Traduction. Aucun texte de sous-titre n'est envoyé avant que tu appuies sur le bouton. Tu peux désactiver CineVocab à tout moment depuis l'icône de la barre d'outils.", "priv": "Politique de confidentialité"},
  it: {"title": "Impara da ciò che già guardi.", "sub": "Le parole dei sottotitoli vengono tradotte direttamente sul video.", "s1": "Scegli un video tra i risultati. Se i sottotitoli sono spenti, premi CC nel player.", "s2": "Clicca una parola per tenerla. Per iniziare non serve un account.", "btn": "Trova video in {0} con sottotitoli", "lSrc": "Sottotitoli in", "lDst": "Traduci in", "fine": "Per tradurre, la riga di sottotitolo che guardi viene inviata al nostro server e a Google Traduttore. Nessun testo dei sottotitoli viene inviato finché non premi il pulsante. Puoi spegnere CineVocab in qualsiasi momento dall'icona nella barra degli strumenti.", "priv": "Informativa sulla privacy"},
  hi: {"title": "जो आप पहले से देखते हैं, उसी से सीखें।", "sub": "सबटाइटल के शब्दों का अनुवाद सीधे वीडियो पर दिखता है।", "s1": "नतीजों में से कोई वीडियो चुनें। सबटाइटल बंद हों तो प्लेयर में CC दबाएँ।", "s2": "शब्द सहेजने के लिए उस पर क्लिक करें। शुरू करने के लिए खाता ज़रूरी नहीं।", "btn": "{0} में सबटाइटल वाले वीडियो खोजें", "lSrc": "सबटाइटल की भाषा", "lDst": "अनुवाद की भाषा", "fine": "अनुवाद के लिए, आप जो सबटाइटल पंक्ति देख रहे हैं वह हमारे सर्वर और Google Translate को भेजी जाती है। बटन दबाने से पहले कोई सबटाइटल टेक्स्ट कहीं नहीं भेजा जाता। आप टूलबार के आइकन से CineVocab को कभी भी बंद कर सकते हैं।", "priv": "गोपनीयता नीति"},
  id: {"title": "Belajar dari yang sudah kamu tonton.", "sub": "Kata-kata subtitle diterjemahkan langsung di atas video.", "s1": "Pilih video dari hasil pencarian. Jika subtitle mati, tekan CC di pemutar.", "s2": "Klik kata untuk menyimpannya. Tidak perlu akun untuk memulai.", "btn": "Cari video berbahasa {0} dengan subtitle", "lSrc": "Subtitle dalam", "lDst": "Terjemahan dalam", "fine": "Untuk menerjemahkan, baris subtitle yang kamu tonton dikirim ke server kami dan ke Google Terjemahan. Tidak ada teks subtitle yang dikirim sebelum kamu menekan tombol. Kamu bisa mematikan CineVocab kapan saja lewat ikon di bilah alat.", "priv": "Kebijakan privasi"},
};
const code = (navigator.language || "en").slice(0, 2).toLowerCase();
const L = T[code] || T.en;
document.documentElement.lang = T[code] ? code : "en";
const $ = (id) => document.getElementById(id);
for (const k of ["title", "sub", "s1", "s2", "fine"]) $(k).textContent = L[k];
$("lSrc").textContent = L.lSrc; $("lDst").textContent = L.lDst; $("priv").textContent = L.priv;
$("swap").setAttribute("aria-label", L.lSrc + " / " + L.lDst);

// Dil çifti: background.js'in kurulumda yazdığı değer, yoksa aynı kuralla hesaplanan varsayılan
let pair = CVL.defaultPair(navigator.language);
const name = (c) => CVL.langName(c).replace(/^./, (x) => x.toLocaleUpperCase());
function fill(sel) { sel.replaceChildren(...CVL.LANG_CODES.map((c) => { const o = document.createElement("option"); o.value = c; o.textContent = name(c); return o; })); }
fill($("src")); fill($("dst"));
function paint() {
  $("src").value = pair.src; $("dst").value = pair.dst;
  $("go").textContent = L.btn.replace("{0}", CVL.langName(pair.src));
}
function setPair(src, dst, changed) { // iki dil hep farklı kalır
  if (src === dst) { const other = CVL.LANG_CODES.find((c) => c !== (changed === "src" ? src : dst)); if (changed === "src") dst = other; else src = other; }
  pair = { src, dst }; paint();
}
$("src").onchange = () => setPair($("src").value, pair.dst, "src");
$("dst").onchange = () => setPair(pair.src, $("dst").value, "dst");
$("swap").onclick = () => setPair(pair.dst, pair.src, "src");
paint();
try { chrome.storage.local.get(["src", "dst"], (r) => { if (r && r.src && r.dst && r.src !== r.dst) { pair = { src: r.src, dst: r.dst }; paint(); } }); } catch (e) {}

// Ana düğme: onay + örnek video. Çeviri bu tıkla açılır.
$("go").onclick = () => {
  const go = () => { location.href = CVL.startUrl(pair.src); };
  try { chrome.storage.local.set({ enabled: true, src: pair.src, dst: pair.dst, startAsk: null }, go); } catch (e) { go(); }
};
