# CineVocab

Learn a language from the shows you already watch. A Chrome extension turns the subtitles on **Prime Video, YouTube and Udemy** into word-by-word translations, and a web app turns the words you collect into practice sessions and live duels.

> Live site: _add your Railway URL_ · Extension: _add your Chrome Web Store link_

![Subtitle overlay](docs/overlay.png)
![Practice](docs/practice.png)

## What it does
- **Extension (Chrome, Manifest V3):** reads the current subtitle line, shows each word with its translation, and saves the words you meet to your account. Any language pair, one on/off switch.
- **Subtitle-language guard:** if the subtitles are not in the language you picked, translation pauses instead of producing nonsense. It also skips foreign words mixed into a line.
- **Word lists:** grouped by platform and series, with thumbnails; mark words as known, delete words or videos.
- **Practice:** three modes (classic, speed, survival), XP and levels, daily streak and goal, combos, sound and confetti.
- **Duel:** real-time rooms over WebSocket with countdown, speed + streak scoring, live "answered" indicators, podium, leaderboard.
- **Accounts:** register/login, recovery code for password reset, admin panel (ban, rename, reset).
- **UI languages:** Turkish, English, French, Italian, German, Spanish; light and dark theme.

## Tech
| Part | Stack |
|---|---|
| Backend | Python, FastAPI, WebSockets, PostgreSQL (psycopg2) |
| Frontend | Vanilla JS, CSS variables, no framework |
| Extension | Chrome MV3: content script, service worker, popup |
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
- Passwords are hashed with PBKDF2; sessions use hashed tokens; login and settings are rate limited.
- The password reset uses a one-time recovery code instead of email, to avoid running mail infrastructure.
- Subtitle language is detected with stopword sets, diacritic hints and script detection, with a short verdict history to avoid flicker.
- Only the words are stored, not the subtitle text.

## Limitations
- The free translation fallback depends on an unofficial endpoint and can be rate limited; set `GOOGLE_TRANSLATE_API_KEY` for production.
- Subtitle reading depends on each site's page structure and may need updates when they change.
- Duels filter by single episode, not by whole series.

## License
All rights reserved, see `LICENSE`. The code is public for viewing only. This project is not affiliated with Amazon, Google or Udemy.
