/* CineVocab mobil ayarlari. Burada gizli bir sey YOK ve olmamali:
   bu dosya uygulamayla birlikte herkesin telefonuna gider. API anahtarlari, parolalar ve
   veritabani adresi yalnizca sunucuda (Railway ortam degiskenlerinde) durur. */
window.CV_CONFIG = {
  api: "https://cinevocab.up.railway.app",   // sunucunun herkese acik adresi
  share: "https://cinevocab.up.railway.app", // paylasilan mesajlardaki adres (Play Store'a cikinca magaza adresiyle degistir)
  dailyGoals: [30, 50, 100],                 // secilebilir gunluk XP hedefleri
  defaultGoal: 50
};
