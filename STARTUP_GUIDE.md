# Chess Game - Quick Start Guide

## 🚀 How to Run the Game

### Method 1: Simple File Opening
1. **Download** all files to a folder
2. **Double-click** `index.html` 
3. The game will open in your default browser

### Method 2: Local Server (Recommended for Multiplayer Testing)
1. **Open terminal/command prompt** in the game folder
2. **Run a local server**:
   - **Python**: `python -m http.server 8000`
   - **Node.js**: `npx http-server -p 8000`
   - **PHP**: `php -S localhost:8000`
3. **Open browser** and go to `http://localhost:8000`

## 🎮 First Time Setup

1. **Register Account**
   - Enter a username (3+ characters)
   - Enter a password (4+ characters)
   - Click "Register"

2. **Login**
   - Use your credentials to login
   - You'll start with 1200 ELO rating

## 🎯 Game Modes

### 🤖 Play vs AI
- **Easy**: Random moves with basic strategy
- **Medium**: Smart AI (depth 3)
- **Hard**: Advanced AI (depth 4)
- Your ELO updates based on results

### 🌐 Play Online
- **Random Matchmaking**: Finds another player (demo mode)
- **Private Rooms**: Create/join with room codes
- **Cross-device**: Share room codes to play with friends

### 👥 Social Features
- **Friends**: Add friends by username
- **Leaderboard**: See top players
- **Chat**: Talk during multiplayer games

## 🏰 Special Features

### Pawn Promotion
- When pawn reaches end rank, choose piece
- Options: Queen, Rook, Bishop, Knight

### Draw Offers
- Click "Offer Draw" in multiplayer games
- Opponent can accept/decline

### Game Controls
- **Resign**: Give up current game
- **Back to Menu**: Resign and return to main menu
- **New Game**: Start fresh game (AI mode)

## 🔧 Troubleshooting

### Buttons Not Working
- Make sure JavaScript is enabled
- Try refreshing the page
- Check browser console for errors

### Board Not Showing
- Try different browser (Chrome, Firefox, Safari)
- Clear browser cache
- Ensure all files are in same folder

### Multiplayer Not Working
- Use local server method (Method 2 above)
- Share the exact URL with room code
- Both players need same server address

### Cross-Device Multiplayer
1. **Player 1**: Start local server, create room
2. **Player 2**: Go to `http://[Player1-IP]:8000`, join room
3. **Find IP**: Use `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

## 📱 Mobile Support
- Game works on mobile browsers
- Touch controls for piece movement
- Responsive design adapts to screen size

## 🎮 Demo Features
- **Mock multiplayer**: Works without real server
- **Sample players**: Pre-populated leaderboard
- **Local storage**: All data saved in browser
- **Offline capable**: AI games work without internet

## 🆘 Common Issues

**"Room not found"**
- Room codes expire after 1 hour
- Make sure both players use same server
- Try creating new room

**"Game not updating"**
- Refresh both browsers
- Check if both players are on same server
- Try different room code

**"Board pieces missing"**
- Browser doesn't support Unicode chess symbols
- Try different browser
- Symbols should show as ♔♕♖♗♘♙

## 🎯 Tips for Best Experience

1. **Use Chrome or Firefox** for best compatibility
2. **Local server** for multiplayer testing
3. **Share room codes** via text/email for friends
4. **Register unique usernames** to avoid conflicts
5. **Check leaderboard** to see your ranking

## 🔮 What's Working

✅ **Complete chess engine** with all rules
✅ **AI opponents** with 3 difficulty levels  
✅ **Pawn promotion choice** (Queen/Rook/Bishop/Knight)
✅ **User accounts** with ELO ratings
✅ **Friends system** and leaderboard
✅ **Cross-device multiplayer** via room codes
✅ **In-game chat** for multiplayer
✅ **Draw offers** and resignation
✅ **Responsive design** for all devices
✅ **Persistent data** (localStorage)

The game is fully functional and ready to play! 🎉