# chess game

a full-featured online chess game with real-time multiplayer, AI opponent, and secure authentication.

## how to play online
go on https://chess-o3ub.onrender.com/
- create an account with username + password 
- click register
- enter the same username and password combination
- click login
- then click play online (this will wait for an opponent, but as no one sees my projects, no one will probably ever play so...)
- OR click create private room and share the code with someone you want to play with

## what's this?

this is a complete chess game you can play in your browser. play against the computer, challenge your friends online, or find random opponents through matchmaking. everything runs in real-time with WebSockets, and your account data is securely stored on the server.

## features

### game modes
- **play vs AI** - three difficulty levels (easy, medium, hard)
- **online multiplayer** - real-time games with other players
- **private rooms** - create a room and share the code with friends
- **matchmaking** - find random opponents automatically

### chess stuff
- full chess rules (castling, en passant, pawn promotion, etc.)
- move validation and legal move highlighting
- check and checkmate detection
- draw offers and resignation
- in-game chat

### account system
- secure authentication with bcrypt password hashing
- ELO rating system (starts at 1200)
- win/loss/draw statistics
- cross-device login (play from any browser)
- persistent data storage

### social features
- friend system (send/accept requests, to see new friends and friend requests, refresh the friends menu popup by closing it and reopening it)
- global leaderboard (top 50 players)
- player profiles with stats
- invite friends to private games

## how to run locally

### prerequisites
- Node.js 14+ installed
- a modern web browser

### setup

1. clone this repo:
```bash
git clone https://github.com/yourusername/chess-game.git
cd chess-game
```

2. install server dependencies:
```bash
cd server
npm install
```

3. start the server:
```bash
npm start
```

4. open your browser and go to:
```
http://localhost:3000
```

5. create an account and start playing!

## how to deploy

check out `DEPLOYMENT_GUIDE.md` for detailed instructions on deploying to:
- GitHub Pages (frontend)
- Render.com (backend server)

both are free and take about 5 minutes to set up.

## tech stack

**frontend:**
- vanilla JavaScript (no frameworks)
- HTML5 canvas for the board
- CSS3 for styling
- Socket.IO client for real-time communication

**backend:**
- Node.js + Express
- Socket.IO for WebSocket connections
- bcrypt for password hashing
- JSON file storage (easily upgradeable to a database)

## project structure

```
chess-game/
├── index.html              # main page
├── styles.css              # all the styles
├── js/                     # frontend code
│   ├── config.js          # server URL config
│   ├── app.js             # main app logic
│   ├── auth.js            # authentication
│   ├── game.js            # game UI
│   ├── chess-engine.js    # chess rules
│   ├── ai.js              # AI opponent
│   ├── multiplayer.js     # multiplayer client
│   └── social.js          # friends & leaderboard
├── server/                 # backend code
│   ├── index.js           # main server
│   ├── user-manager.js    # user authentication
│   ├── room-manager.js    # game rooms
│   ├── chess-validator.js # move validation
│   ├── elo-calculator.js  # rating system
│   └── friends-manager.js # friend system
└── README.md              # you are here
```

## security

passwords are hashed with bcrypt (10 salt rounds) and stored securely on the server. user data is saved in `server/users.json` which is excluded from git.

for production deployment, consider:
- using HTTPS (Render.com provides this automatically)
- adding rate limiting for login attempts
- upgrading to a proper database (MongoDB, PostgreSQL)
- implementing JWT tokens for session management

see `SECURE_AUTH_IMPLEMENTATION.md` for more details.

## how to play

1. **register** an account (or login if you already have one)
2. **choose a game mode:**
   - play vs AI for practice
   - play online for multiplayer
3. **make moves** by clicking pieces and target squares
4. **chat** with your opponent during online games
5. **offer draws** or resign if needed
6. **check the leaderboard** to see top players

## game rules

standard chess rules apply:
- all pieces move according to chess rules
- castling is available when conditions are met
- en passant capture is supported
- pawns can promote to any piece
- check must be resolved
- checkmate ends the game
- stalemate results in a draw

## ELO rating

- starting ELO: 1200
- win against higher rated player: gain more ELO
- win against lower rated player: gain less ELO
- losses and draws adjust your rating accordingly
- your rating is saved permanently on the server

## contributing

feel free to open issues or submit pull requests. this is a learning project so all contributions are welcome!

## license

MIT license - do whatever you want with this code.

## credits

built with ♟️ by a chess enthusiast, flaviengibs

special thanks to Socket.IO for making real-time multiplayer easy.

---

enjoy the game! if you find any bugs or have suggestions, open an issue on GitHub.
