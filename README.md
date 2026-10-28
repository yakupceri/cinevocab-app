<p align="center">
  <img src="docs/store/icon-128x128.png" width="96" alt="CineVocab icon">
</p>

<h1 align="center">CineVocab</h1>
<p align="center"><b>Learn a language from the shows you already watch.</b></p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/glhogfbfbjifiihgffjpjgijkjplebkl"><b>Install the Chrome extension</b></a> ·
  <a href="https://cinevocab.up.railway.app"><b>Open the web app</b></a>
</p>

<p align="center">
  <img src="docs/store/promo-marquee-1400x560.png" alt="CineVocab" width="100%">
</p>

CineVocab is a **Chrome extension plus a web app**. The extension reads the subtitles on **Prime Video, YouTube and Udemy** and shows every word with its translation, right on the video. The words you meet are saved to your account, where you can practise them in quick quizzes or race your friends in live duels.

## How it works
| 1. Pick a language pair | 2. Watch anything | 3. Words are saved | 4. Practise and compete |
|---|---|---|---|
| Choose it in the extension popup (for example French → English) and switch it on. | Each subtitle line appears as words with translations, with the full sentence below. | Grouped by video, series and platform, automatically. | Quizzes, streaks, levels and live duels on the website. |

## Features

### 1. Live subtitle translation
Every subtitle word is shown with its translation above the video, and the whole sentence is translated underneath. It works with any language pair and has a single on/off switch. A **language guard** pauses translation when the subtitles are not in the language you picked, and foreign words mixed into a line are skipped. Words you marked as known are dimmed.

<img src="docs/store/1-subtitles.png" alt="Subtitle overlay" width="100%">

### 2. Your videos, organised automatically
Every video you watch is added to your library, grouped by platform (Prime Video, YouTube, Udemy). Series are grouped into seasons and episodes, with thumbnails or posters. Open the word list of one video, start a duel from it, or select videos to delete them.

<img src="docs/store/2-videos.png" alt="Videos" width="100%">

### 3. Quick quizzes from your own words
Multiple-choice practice built from the words you collected. Pick a mode: **Classic** (no timer), **Speed** (8 seconds per question) or **Survival** (3 lives). Combos, timers, sound effects and confetti keep it fun.

<img src="docs/store/3-practice.png" alt="Quiz" width="100%">

### 4. Levels, streaks and daily goals
Earn XP, level up, keep your daily streak alive and hit your daily goal. A results screen shows stars, XP gained and your personal best.

<img src="docs/store/4-progress.png" alt="Progress" width="100%">

### 5. Live duels
Create a room, share the 4-digit code and race your friends on the words you collected. Choose the question count and time per question, add an optional password. A 3-2-1 countdown starts the game, players see live "answered" indicators, and scoring rewards speed and streaks. A podium ends the game, and a global leaderboard (weekly, monthly, yearly, all time; people and countries) keeps score.

<img src="docs/store/5-duel.png" alt="Duel" width="100%">

### And more
- Accounts with repeated-password sign-up, a strength meter and a **recovery code** for password reset
- Known-words list, word and video delete panels
- Interface in **Turkish, English, French, Italian, German and Spanish**, with light and dark themes
- Admin panel (ban, rename, reset score or password)

## Tech
| Part | Stack |
|---|---|
| Backend | Python, FastAPI, WebSockets, PostgreSQL (psycopg2) |
| Frontend | Vanilla JS, CSS variables, no framework |
| Extension | Chrome Manifest V3: content script, service worker, popup |
| Translation | Google Cloud Translation (optional key) with a free fallback |
| Hosting | Railway |

## Architecture
```
Chrome extension ──(HTTPS, API key)──► FastAPI ◄──► PostgreSQL
 content script: subtitle → words         │
 lang.js: language detection              ├── REST: words, videos, progress, auth
                                          └── WebSocket: duel rooms (Room, run_game, broadcast)
Browser (site) ───────────────────────────┘
```
Key files: `main.py` (app, duel rooms), `accounts.py` (auth, progress), `vocab.py` (word lists), `multilang.py` (translation), `admin.py`, `extension/`.

## Run locally
```bash
pip install -r requirements.txt
export DATABASE_URL=postgresql://user:pass@localhost:5432/cinevocab
uvicorn main:app --reload
```
Optional environment variables: see `.env.example`.
Load the extension: `chrome://extensions` → Developer mode → Load unpacked → `extension/`.

## Design notes
- Passwords are hashed with PBKDF2, sessions store hashed tokens, and login and settings are rate limited.
- Password reset uses a one-time recovery code instead of email, to avoid running mail infrastructure.
- Subtitle language is detected with stopword sets, diacritic hints and script detection, with a short verdict history to avoid flicker.
- Subtitle text is sent to the server only to be translated; what gets saved to your account is the words (and their video), not the subtitles.

## Limitations
- The free translation fallback depends on an unofficial endpoint and can be rate limited; set `GOOGLE_TRANSLATE_API_KEY` for production.
- Reading subtitles depends on each site's page structure and may need updates when they change.
- Duels filter by single episode, not by whole series.

## License
All rights reserved, see `LICENSE`. The code is public for viewing only. This project is not affiliated with Amazon, Google or Udemy.
