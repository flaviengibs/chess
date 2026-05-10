# Changelog

All notable changes to this project are documented here.

## [2.0.0] – 2026-05-10

### Added
- **Daily puzzles** (`puzzles.html`) – 30 real puzzles from the Lichess open puzzle database, categorised by difficulty (beginner / intermediate / advanced), with hints, solution reveal, personal rating, and solve history
- **FEN loader** – `ChessEngine.loadFEN()` method to load any standard chess position
- **Board themes** – Classic, Blue, Green, Purple colour schemes, persisted to localStorage
- **Dark mode** – Full dark theme toggle
- **Sound effects** – Move, capture, check, castle, game-end sounds via Web Audio API; volume control and mute
- **Animations** – Last-move highlight, check pulse animation, configurable speed (fast / normal / slow)
- **Game analysis** – Post-game move-by-move classification: best, good, inaccuracy, mistake, blunder
- **PGN export** – Copy game to clipboard in standard PGN notation
- **Time controls** – 1, 3, 5, 10 minute options selectable before each game
- **Settings panel** – Unified settings modal for theme, sound, and animation preferences
- **Tournament manager** (`server/tournament-manager.js`) – Swiss-pairing server-side tournament system with standings, round progression, and bye handling
- **`js/enhancements.js`** – `TimeControlManager`, `SoundManager`, `ThemeManager`, `AnimationManager`, `AnalysisEngine`, `PuzzleManager`
- **`js/puzzle_data.js`** – Auto-generated puzzle dataset (30 puzzles, CC0)

### Changed
- `js/game.js` – AI now only triggers when it is actually the AI's turn (fixed infinite loop); `handleGameEnd` no longer crashes when `updateElo` is absent; sounds and last-move highlight integrated
- `js/app.js` – Settings, analysis, and PGN export wired up; removed duplicate event listeners and console noise
- `index.html` – Added settings modal, time control selector, analysis panel, export/analyse buttons, puzzles link in main menu
- `styles.css` – CSS variables for board themes, dark mode, timer, analysis panel, settings modal
- `server/package.json` – Version bumped to 2.0.0
- `README.md` – Fully rewritten for v2.0.0
- `QUICK_START.md` – Updated with new features and keyboard shortcuts

### Fixed
- `SoundManager is not defined` crash on game start
- `isCastlingMove is not a function` crash on castling moves
- `updateElo is not a function` crash on game end
- AI playing against itself in an infinite loop
- Puzzle board squares too small / pieces not clickable
- `getLegalMoves` → `getValidMoves` (correct method name)
- Duplicate `const piece` declaration in `executeMove`
- Analysis engine crash when `moveData.color` was undefined

### Removed
- Hand-crafted (incorrect) puzzle positions replaced by real Lichess data
- Redundant test/status markdown files (moved to `.gitignore`)

---

## [1.0.0] – 2025

### Added
- Core chess engine with full rule set
- Minimax AI (easy / medium / hard)
- Real-time multiplayer via Socket.IO
- Private room codes
- Random matchmaking
- Local 2-player mode (board flip)
- User authentication with bcrypt
- ELO rating system
- Friend system
- Global leaderboard
- In-game chat
- Pawn promotion modal
- Draw offers and resignation
