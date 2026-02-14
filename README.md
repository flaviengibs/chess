# Chess Game - Multiplayer Edition

A complete, feature-rich chess game with online multiplayer, social features, AI opponents, and comprehensive user management.

## 🎮 Features

### Core Chess Engine
- ✅ Complete chess rules implementation
- ✅ All piece movements with special moves (castling, en passant)
- ✅ **Pawn promotion with piece choice** (Queen, Rook, Bishop, Knight)
- ✅ Check, checkmate, and stalemate detection
- ✅ Draw conditions (insufficient material, fifty-move rule)
- ✅ Move validation and legal move generation

### 🤖 AI System (3 Difficulty Levels)
- **Easy**: Random moves with basic strategy
- **Medium**: Minimax algorithm (depth 3) with alpha-beta pruning
- **Hard**: Advanced minimax (depth 4) with position evaluation
- ✅ Performance optimized for smooth gameplay

### 🌐 Online Multiplayer
- ✅ **Real-time multiplayer** with WebSocket communication
- ✅ **Random matchmaking** - find opponents automatically
- ✅ **Private rooms** - create/join rooms with codes
- ✅ **Live game synchronization** - moves update in real-time
- ✅ **Connection status** indicators
- ✅ **Game chat** system for communication

### 👥 Social Features
- ✅ **Friends system** - send/accept friend requests
- ✅ **Friend invitations** to private games
- ✅ **ELO leaderboard** - top 50 players ranking
- ✅ **Player profiles** with statistics
- ✅ **In-game chat** during multiplayer matches

### 🏆 User Account System
- ✅ **User registration/login** with password protection
- ✅ **ELO rating system** (starts at 1200)
- ✅ **Comprehensive statistics** (games played, wins, losses, draws)
- ✅ **Rating updates** based on game results
- ✅ **Persistent data** storage

### 🎨 Enhanced UI/UX
- ✅ **Modern interface** with multiple screens (login, menu, game)
- ✅ **Responsive design** - works on desktop, tablet, mobile
- ✅ **Interactive modals** for promotion, friends, leaderboard
- ✅ **Visual feedback** - move highlighting, animations
- ✅ **Game mode indicators** (AI vs Multiplayer)
- ✅ **Player turn indicators** and active player highlighting

## 🎯 How to Play

### Getting Started
1. **Register/Login** - Create account or use existing credentials
2. **Choose Game Mode**:
   - **Play vs AI** - Single player against computer
   - **Play Online** - Random matchmaking
   - **Create Private Room** - Play with friends
   - **Join Room** - Enter room code to join friend's game

### Game Modes

#### 🤖 AI Mode
- Select difficulty (Easy/Medium/Hard)
- Play as White pieces
- AI responds automatically
- ELO rating updates based on results

#### 🌐 Multiplayer Mode
- Real-time gameplay with other players
- Chat with opponent during game
- Both players' ELO ratings update
- Connection status monitoring

### 🏰 Pawn Promotion
- When pawn reaches end rank, choose promotion piece
- Options: Queen, Rook, Bishop, Knight
- Modal popup for easy selection
- Works in both AI and multiplayer modes

### 👥 Social Features
- **Friends**: Add friends, view their stats, invite to games
- **Leaderboard**: See top players ranked by ELO
- **Profile**: View your statistics and ranking

## 🛠️ Technical Implementation

### Architecture
```
├── Frontend (Pure JavaScript/HTML/CSS)
│   ├── Chess Engine (complete rules)
│   ├── AI System (minimax with pruning)
│   ├── Multiplayer Manager (WebSocket)
│   ├── Social Manager (friends/leaderboard)
│   ├── Authentication System
│   └── Game Controller
└── Mock WebSocket Server (for demo)
```

### Key Components
- **ChessEngine**: Complete chess logic with move validation
- **ChessAI**: Minimax algorithm with position evaluation
- **MultiplayerManager**: Real-time game synchronization
- **SocialManager**: Friends and leaderboard management
- **AuthSystem**: User accounts and ELO ratings

### Files Structure
```
├── index.html              # Main application structure
├── styles.css              # Complete styling + responsive design
├── js/
│   ├── chess-engine.js     # Core chess rules and validation
│   ├── ai.js              # AI with multiple difficulty levels
│   ├── multiplayer.js     # Online multiplayer system
│   ├── social.js          # Friends and leaderboard features
│   ├── auth.js            # User authentication and ELO
│   ├── game.js            # Game controller and UI
│   └── app.js             # Application initialization
└── README.md              # This documentation
```

## 🌟 New Features Added

### 🎯 Pawn Promotion Choice
- Interactive modal when pawn reaches end rank
- Choose between Queen, Rook, Bishop, or Knight
- Visual piece symbols for easy selection
- Works in both single and multiplayer modes

### 🌐 Online Multiplayer
- Real-time WebSocket communication
- Room-based matchmaking system
- Private room creation with shareable codes
- Live move synchronization between players

### 💬 Social System
- Comprehensive friends management
- Send/accept/decline friend requests
- Invite friends to private games
- Real-time chat during multiplayer games

### 🏆 ELO Leaderboard
- Global ranking of all players
- Sortable by ELO rating
- Shows player statistics (games, wins, losses)
- Highlights current user's position

### 📱 Enhanced UI
- Multi-screen navigation (Login → Menu → Game)
- Responsive design for all devices
- Modern modal system for interactions
- Visual game state indicators
- Player turn highlighting

## 🚀 Installation & Setup

### Quick Start
1. **Download** all files to a folder
2. **Open `index.html`** in a modern web browser
3. **Register** a new account
4. **Start playing!**

### No Server Required
- Pure client-side application
- Uses localStorage for data persistence
- Mock WebSocket server for multiplayer demo
- Works offline for AI games

### Browser Compatibility
- Chrome, Firefox, Safari, Edge (modern versions)
- Mobile browsers supported
- Requires JavaScript enabled

## 🔮 Future Enhancements
- Real WebSocket server implementation
- Tournament system
- Game replay/analysis
- Opening book for AI
- Custom board themes
- Sound effects
- Spectator mode
- Game time controls

## 🎮 Demo Features
- Mock multiplayer server for testing
- Pre-populated leaderboard with sample players
- Instant friend system (no real server needed)
- All features work locally

The game now provides a complete chess experience with modern multiplayer features, social interaction, and professional-grade gameplay!