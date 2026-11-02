# CineVocab: Chrome Web Store listing (English, default language)
For extension version 1.8.5. Copy each block into the matching field of the Developer Dashboard.

## Store listing tab

### Name
CineVocab

### Summary (132 characters max; this is the same text as in the extension's manifest)
Translate Prime Video, YouTube & Udemy subtitles word by word. Any language pair, word lists, quizzes and live duels.

### Description
Learn the words you actually meet while watching. CineVocab shows the translation of every subtitle word as you watch, saves the words for you, and turns them into quizzes, daily challenges and live duels against your friends.

HOW IT WORKS
1. Pick your language pair in the popup and switch the extension on.
2. Watch on Prime Video, YouTube or Udemy. Every subtitle word appears with its translation, and the whole sentence is translated underneath.
3. Your words are saved automatically, grouped by platform, show and episode.
4. Practice them on the CineVocab website, or challenge your friends.

GETTING STARTED
1. Install CineVocab and pin it with the puzzle icon in Chrome's toolbar.
2. Create a free account at https://cinevocab.up.railway.app, open Settings and press "Create key".
3. Click the CineVocab icon, paste the key and press "Save key". Translations also work without a key; the key is only needed to save your words.
4. Open a video with subtitles on Prime Video, YouTube or Udemy, pick the subtitle language in the popup and switch it on. On YouTube, turn on captions (CC) first.

WHILE YOU WATCH
- Works with any language pair (for example Spanish to English, French to English, Turkish to English)
- 11 subtitle languages: Turkish, English, French, Italian, German, Spanish, Portuguese, Russian, Arabic, Romanian and Japanese
- On/off switch: nothing is translated until you turn it on
- Language guard: pauses translation when the subtitles are not in the language you chose
- Move the subtitle box to any corner, make it bigger or smaller, and set how transparent it is

AFTER YOU WATCH (on the CineVocab website)
- Word lists by platform, show and episode, with thumbnails
- Quizzes with levels, streaks, daily goals and combos, plus speed and survival modes
- Smart review: words you get wrong come back sooner, words you know come back later
- Listening and speaking practice (speaking is optional and uses your browser's speech recognition)
- Daily challenge: the same 10 words for everyone, once a day
- Friend leagues: create a private league, share the invite link and compare points every week
- Live duels: create a room, share the 4-digit code and race your friends. Afterwards you see the words you missed and can practice them right away
- Leaderboards (people and countries), light and dark theme, interface in 6 languages

PRIVACY
The extension sends the subtitle line it reads, and the words you save, to our server (and from there to Google Translate) to be translated and stored. We never sell your data. You can delete your account and all your data at any time. Full policy: https://cinevocab.up.railway.app/privacy

CineVocab is an independent project. It is not affiliated with or endorsed by Amazon, Prime Video, Google, YouTube or Udemy.

### Other fields
- Category: Education
- Language: English (add Turkish as an extra language with LISTING_TR.md)
- Website: https://cinevocab.up.railway.app
- Support: use your support email or the contact page on the site
- Graphics: screenshots/ (5 images, 1280x800), promo/promo-small-440x280.png (small promo tile), promo/promo-marquee-1400x560.png (marquee), promo/icon-128x128.png (store icon)

## Privacy tab

### Single purpose
Translate the subtitle words of videos on Prime Video, YouTube and Udemy as the user watches, and save them to the user's vocabulary list for practice.

### Permission justifications
- storage: Saves the on/off switch, the chosen language pair, the subtitle box settings and the user's optional extension key in the browser.
- Host permission (https://cinevocab.up.railway.app/*): Sends the subtitle text to the CineVocab server to be translated, and saves the user's words to their account there.
- Content script sites (primevideo.com, youtube.com, udemy.com): Reads the subtitle line that the video player is showing, so each word can be translated and shown in a box on top of the video.

### Remote code
No, I am not using remote code. (All JavaScript is inside the extension package.)

### Data usage
Tick these data types:
- Authentication information (the optional extension key)
- Website content (subtitle text, plus the title and thumbnail address of the video the words came from)

Tick all three statements: I do not sell user data to third parties; I do not use or transfer user data for purposes unrelated to the item's single purpose; I do not use or transfer user data to determine creditworthiness or for lending purposes.

Privacy policy URL: https://cinevocab.up.railway.app/privacy

### Notes for the reviewer (Test instructions field)
Translation works without an account. Open any video with subtitles on YouTube (for example a Spanish-language video with Spanish captions turned on), click the extension icon, switch it on and choose Spanish to English. Each subtitle word then appears with its translation in a box over the video. To save words, create a free account at https://cinevocab.up.railway.app, copy the extension key from Settings and paste it into the extension popup.

## What changed since 1.8.2 (for your own notes; the store has no field for it)
- Subtitle words appear sooner on YouTube (faster caption detection).
- Subtitle box position, size and transparency settings.
- Website: daily challenge, smart review, listening and speaking practice, friend leagues and a big-screen mode for classrooms.
