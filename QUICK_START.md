# quick start guide

## play online now (no setup required)

just go to: **https://chess-o3ub.onrender.com**

1. create an account (username + password, minimum 6 characters)
2. login with your credentials
3. choose a game mode:
   - **play vs AI** - practice against the computer
   - **play online** - find a random opponent
   - **create room** - play with a friend (share the room code)
   - **join room** - enter a friend's room code

that's it! your account and ELO rating are saved on the server, so you can login from any device.

## run locally (for development)

### prerequisites
- Node.js 14+ installed
- git installed

### setup (5 minutes)

1. **clone the repo:**
```bash
git clone https://github.com/yourusername/chess-game.git
cd chess-game
```

2. **install dependencies:**
```bash
cd server
npm install
```

3. **start the server:**
```bash
npm start
```

you should see:
```
[UserManager] No existing users file, starting fresh
Chess multiplayer server running on port 3000
```

4. **open the game:**

open your browser and go to: `http://localhost:3000`

5. **create an account and play!**

### first time playing?

1. **register** - create a username (no spaces) and password (6+ chars)
2. **login** - use the same credentials
3. **play vs AI** - good for learning the interface
4. **play online** - when you're ready for multiplayer

## game modes explained

### play vs AI
- three difficulty levels: easy, medium, hard
- you play as white, AI plays as black
- good for practice and learning
- your ELO changes based on results

### play online (matchmaking)
- finds you a random opponent
- whoever clicks first gets white pieces
- real-time gameplay with chat
- both players' ELO updates after the game

### create room
- generates a 4-letter room code
- share the code with a friend
- first player to join gets white
- private game, no one else can join

### join room
- enter a friend's room code
- you'll play as black
- starts immediately when you join

## tips

### account tips
- use a simple username (no spaces recommended)
- password must be 6+ characters
- your data is saved on the server
- you can login from any browser/device

### gameplay tips
- click a piece to see legal moves (highlighted)
- click the target square to move
- use the chat to talk to your opponent
- you can offer a draw or resign anytime
- game ends automatically on checkmate/stalemate

### ELO rating
- everyone starts at 1200
- win against higher rated players: gain more ELO
- win against lower rated players: gain less ELO
- your rating is permanent and cross-device

## troubleshooting

### "failed to connect to server"
- **local:** make sure the server is running (`npm start` in server folder)
- **online:** the Render server might be sleeping (wait 30-60 seconds and try again)

### "invalid username or password"
- make sure you're typing the exact same credentials you registered with
- passwords are case-sensitive
- try registering a new account if you forgot your password

### "room not found"
- room codes expire after the game ends
- make sure you're entering the code correctly (case-sensitive)
- ask your friend to create a new room

### board not showing
- refresh the page (Ctrl+F5 to clear cache)
- check browser console for errors (F12)
- make sure JavaScript is enabled

### moves not working
- make sure it's your turn (check the turn indicator)
- you can only move your own pieces
- some moves might be illegal (in check, etc.)

## server status

the online server at `https://chess-o3ub.onrender.com` is hosted on Render's free tier:
- **first connection:** may take 30-60 seconds (server waking up)
- **after that:** instant response
- **sleeps after:** 15 minutes of inactivity
- **uptime:** 750 hours/month (plenty for casual use)

## need help?

- check the full README.md for detailed info
- open an issue on GitHub
- check the browser console (F12) for error messages

---

enjoy the game! ♟️
