chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "addWord") {
    fetch("http://127.0.0.1:8000/add-word", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eng: request.eng }),
    })
      .then((response) => response.json())
      .then((data) => sendResponse(data))
      .catch((error) => {
        console.error("API Hatası:", error);
        sendResponse({ status: "error" });
      });
    return true; // Asenkron yanıt için gerekli
  }
});