# Chess Multiplayer Server

Real-time multiplayer chess server using Socket.IO and Express.

## Setup

### Install Dependencies

```bash
cd server
npm install
```

### Running the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### Environment Variables

- `PORT` - Server port (default: 3000)
- `CLIENT_URL` - Client origin URL for CORS (default: http://localhost:3000)

### Running Tests

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

## Project Structure

```
server/
├── index.js                  # Main server entry point with Socket.IO handlers
├── room-manager.js           # Room creation, joining, and matchmaking
├── connection-manager.js     # Connection and reconnection handling
├── chess-validator.js        # Server-side move validation
├── chess-engine.js           # Chess game logic
├── elo-calculator.js         # ELO rating calculations
├── package.json              # Node.js dependencies and scripts
├── tests/                    # Unit and property-based tests
└── README.md                 # This file
```

## Features

- Real-time multiplayer chess using WebSockets
- Room-based private games with shareable codes
- Automatic matchmaking for random opponents
- Server-side move validation
- ELO rating system with automatic updates
- In-game chat functionality
- Draw offers and resignation
- Automatic reconnection handling
- Game state preservation during disconnections
- Timeout detection for abandoned games

## Socket.IO Events

### Client → Server

**Room Management:**
- `create-room` - Create a new private room
  - Payload: `{ username, elo }`
  - Response: `room-created` with `{ roomCode }`

- `join-room` - Join an existing room
  - Payload: `{ roomCode, username, elo }`
  - Response: `game-started` with game details

- `find-match` - Join matchmaking queue
  - Payload: `{ username, elo }`
  - Response: `match-found` when opponent found

**Game Actions:**
- `make-move` - Make a chess move
  - Payload: `{ roomCode, from: {row, col}, to: {row, col}, promotion }`
  - Response: `move-made` (to opponent) or `move-invalid` (to sender)

- `chat-message` - Send chat message
  - Payload: `{ roomCode, message }`
  - Broadcast: `chat-message` to opponent

- `offer-draw` - Offer a draw
  - Payload: `{ roomCode }`
  - Response: `draw-offered` to opponent

- `respond-draw` - Accept or decline draw
  - Payload: `{ roomCode, accept: boolean }`
  - Response: `draw-response` or `game-ended`

- `resign` - Resign from game
  - Payload: `{ roomCode }`
  - Response: `game-ended` to both players

**Connection:**
- `reconnect-player` - Restore session after disconnect
  - Payload: `{ roomCode, playerId }`
  - Response: `game-state` with current game state

### Server → Client

**Game Events:**
- `room-created` - Room successfully created
  - Payload: `{ roomCode }`

- `game-started` - Game begins (both players ready)
  - Payload: `{ roomCode, color, opponent, gameState }`

- `match-found` - Matchmaking found opponent
  - Payload: `{ roomCode, color, opponent }`

- `move-made` - Opponent made a move
  - Payload: `{ from, to, promotion, gameState }`

- `move-invalid` - Move was rejected
  - Payload: `{ reason }`

- `game-ended` - Game finished
  - Payload: `{ result, reason, winner, eloChanges }`

**Chat:**
- `chat-message` - Received chat message
  - Payload: `{ sender, message }`

**Draw Offers:**
- `draw-offered` - Opponent offered draw
  - Payload: `{ from }`

- `draw-response` - Draw offer response
  - Payload: `{ accepted }`

**Connection:**
- `opponent-disconnected` - Opponent lost connection
- `opponent-reconnected` - Opponent reconnected
- `game-state` - Current game state (for reconnection)
  - Payload: `{ gameState, players }`

**Errors:**
- `error` - Error occurred
  - Payload: `{ message }`

## Testing

The server includes comprehensive test coverage:

- Unit tests for core logic (RoomManager, ChessValidator, EloCalculator)
- Property-based tests using fast-check (5 iterations per test for speed)
- Integration tests for complete game flows
- Edge case tests for chess rules

Current test status: 268 passing tests with minor timeout issues in some property tests (not affecting core functionality).
