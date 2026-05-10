# Quick start

## Play online (no setup needed)

Go to **https://chess.gibbons.fr**

1. Register with a username and password (6+ characters)
2. Login
3. Pick a mode:
   - **Play vs AI** – practice against the computer
   - **Play online** – random matchmaking
   - **Create room** – share the code with a friend
   - **Join room** – enter a friend's code
   - **Daily puzzles** – solve a tactical puzzle

Your account and ELO rating are saved on the server and work from any device.

---

## Run locally

```bash
git clone https://github.com/flaviengibs/chess.git
cd chess/server
npm install
npm start
```

Open `http://localhost:3000`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Failed to connect to server" | Make sure `npm start` is running in the `server/` folder |
| Server slow to respond | Render free tier sleeps after 15 min – wait 30–60 s |
| Board not showing | Hard refresh (Ctrl+F5), check console (F12) |
| Moves not working | Check it's your turn; only your pieces are movable |
| "Invalid username or password" | Passwords are case-sensitive; try registering again |

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| Click piece → click square | Move |
| Escape | Deselect piece |
| Ctrl+N | New game |

---

## Notes

- The online server (Render free tier) may take 30–60 s to wake up on first visit.
- Puzzle data is from the [Lichess open puzzle database](https://database.lichess.org/#puzzles) (CC0).
