# Chess game

A full-featured online chess game with real-time multiplayer, AI opponent, puzzles, themes, sounds, and more.

**Live:** https://chess.gibbons.fr

---

## What's new in 2.0.0

- **Daily puzzles** – 30 real puzzles from the Lichess open database, rated by difficulty
- **Board themes** – Classic, Blue, Green, Purple + dark mode
- **Sound effects** – Move, capture, check, castle, game end (Web Audio API)
- **Animations** – Last-move highlight, check pulse, configurable speed
- **Game analysis** – Post-game move classification (best / good / inaccuracy / mistake / blunder)
- **PGN export** – Copy your game to clipboard in standard notation
- **Time controls** – 1, 3, 5, 10 minute options
- **Tournament system** – Swiss-pairing server-side tournaments
- **Settings panel** – All preferences in one place, persisted to localStorage

---

## Features

### Game modes
- **Play vs AI** – Three difficulty levels (easy, medium, hard)
- **Online multiplayer** – Real-time games via Socket.IO
- **Private rooms** – Create a room and share the code with a friend
- **Matchmaking** – Find random opponents automatically
- **Local 2-player** – Pass-and-play on the same device (board flips)

### Chess rules
- Full rule set: castling, en passant, pawn promotion, fifty-move rule, threefold repetition
- Legal move highlighting
- Check, checkmate and stalemate detection
- Draw offers and resignation

### Puzzles
- 30 real puzzles sourced from the Lichess open puzzle database (CC0)
- Beginner (≤1200), intermediate (1200–1600), advanced (1600–2000)
- Daily puzzle rotation, hint system, solution reveal
- Personal rating and solve history

### Account system
- Secure authentication (bcrypt, 10 salt rounds)
- ELO rating system starting at 1200
- Win / loss / draw statistics
- Cross-device login

### Social features
- Friend system (send / accept requests)
- Global leaderboard (top 50 players)
- Player profiles with stats
- In-game chat

### Customisation
- 4 board colour themes
- Dark mode
- Sound on/off + volume
- Animation speed (fast / normal / slow)

---

## How to run locally

### Prerequisites
- Node.js 14+
- A modern browser

### Setup

```bash
git clone https://github.com/flaviengibs/chess.git
cd chess/server
npm install
npm start
```

Then open `http://localhost:3000` in your browser.

---

## Project structure

```
chess/
├── index.html              # Main page
├── puzzles.html            # Puzzle trainer
├── styles.css              # All styles
├── js/
│   ├── config.js           # Server URL config
│   ├── app.js              # App initialisation & event wiring
│   ├── auth.js             # Authentication client
│   ├── game.js             # Game UI & logic
│   ├── chess-engine.js     # Chess rules engine (+ FEN loader)
│   ├── ai.js               # Minimax AI
│   ├── enhancements.js     # Themes, sounds, animations, analysis, puzzles
│   ├── puzzle_data.js      # 30 Lichess puzzles (auto-generated)
│   ├── multiplayer.js      # Socket.IO multiplayer client
│   └── social.js           # Friends & leaderboard
└── server/
    ├── index.js            # Express + Socket.IO server
    ├── user-manager.js     # User auth & stats
    ├── room-manager.js     # Game rooms
    ├── chess-validator.js  # Server-side move validation
    ├── elo-calculator.js   # ELO rating
    ├── friends-manager.js  # Friend system
    ├── tournament-manager.js # Swiss tournament system
    └── connection-manager.js # Socket connection tracking
```

---

## Tech stack

**Frontend:** Vanilla JavaScript, HTML5, CSS3, Socket.IO client

**Backend:** Node.js, Express, Socket.IO, bcrypt, JSON file storage

---

## Security

- Passwords hashed with bcrypt (10 salt rounds)
- `server/users.json` excluded from git
- HTTPS provided by Render.com in production

---

## Puzzle data

Puzzles are sourced from the [Lichess open puzzle database](https://database.lichess.org/#puzzles) under the CC0 licence. The extraction script (`extract_puzzles.js`) reads the CSV and outputs `js/puzzle_data.js`.

---

## Licence

MIT – do whatever you want with this code.

Built with ♟️ by flaviengibs.
