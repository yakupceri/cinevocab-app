console.log("CineVocab eklentisi aktif!");

// Örnek bir kelimeyi veritabanına gönderme fonksiyonu
async function sendWordToBackend(engWord, trWord) {
  try {
    let response = await fetch("http://127.0.0.1:8000/add-word", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ eng: engWord, tr: trWord })
    });
    let data = await response.json();
    console.log("Kelime başarıyla kaydedildi:", data);
  } catch (error) {
    console.error("Kelime kaydedilirken hata oluştu:", error);
  }
}