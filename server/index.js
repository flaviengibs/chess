const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const RoomManager = require('./room-manager');
const ConnectionManager = require('./connection-manager');
const ChessValidator = require('./chess-validator');
const EloCalculator = require('./elo-calculator');
const ChessEngine = require('./chess-engine');
const FriendsManager = require('./friends-manager');
const UserManager = require('./user-manager');
const ServerTournamentManager = require('./tournament-manager');

// Configuration
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Serve static files from the root directory (parent of server/)
app.use(express.static(path.join(__dirname, '..')));

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize managers
const roomManager = new RoomManager();
const connectionManager = new ConnectionManager(roomManager);
const chessValidator = new ChessValidator();
const eloCalculator = new EloCalculator();
const friendsManager = new FriendsManager();
const userManager = new UserManager();
const tournamentManager = new ServerTournamentManager();

/**
 * REST API Endpoints for Authentication
 */

// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`[API] Register request: ${username}`);
    
    const result = await userManager.register(username, password);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[API] Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`[API] Login request: ${username}`);
    
    const result = await userManager.login(username, password);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('[API] Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all users (public data only)
app.get('/api/users', (req, res) => {
  try {
    const users = userManager.getAllUsersPublicData();
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('[API] Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const leaderboard = userManager.getLeaderboard(limit);
    res.status(200).json({ success: true, leaderboard });
  } catch (error) {
    console.error('[API] Get leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user profile
app.get('/api/user/:username', (req, res) => {
  try {
    const { username } = req.params;
    const user = userManager.getUserPublicData(username);
    
    if (user) {
      res.status(200).json({ success: true, user });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('[API] Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Initialize a new game state
 */
function initializeGameState() {
  const engine = new ChessEngine();
  return {
    board: engine.board,
    currentPlayer: engine.currentPlayer,
    moveHistory: [],
    capturedPieces: { white: [], black: [] },
    castlingRights: {
      white: { kingside: true, queenside: true },
      black: { kingside: true, queenside: true }
    },
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    gameStatus: 'playing'
  };
}

/**
 * Handle game end and ELO updates
 */
function handleGameEnd(room, reason, winner) {
  console.log(`[${new Date().toISOString()}] Game ended in room ${room.code}: ${reason}, winner: ${winner || 'draw'}`);
  
  // Check if both players exist
  if (!room.whitePlayer || !room.blackPlayer) {
    console.error(`[${new Date().toISOString()}] Cannot end game - missing player data`);
    return;
  }
  
  // Calculate ELO changes
  let whiteResult, blackResult;
  if (winner === 'white') {
    whiteResult = 1.0;
    blackResult = 0.0;
  } else if (winner === 'black') {
    whiteResult = 0.0;
    blackResult = 1.0;
  } else {
    // Draw
    whiteResult = 0.5;
    blackResult = 0.5;
  }
  
  const whiteEloChange = eloCalculator.calculateEloChange(
    room.whitePlayer.elo,
    room.blackPlayer.elo,
    whiteResult
  );
  
  const blackEloChange = eloCalculator.calculateEloChange(
    room.blackPlayer.elo,
    room.whitePlayer.elo,
    blackResult
  );
  
  // Update ELO ratings
  room.whitePlayer.elo += whiteEloChange;
  room.blackPlayer.elo += blackEloChange;
  
  // Save to server database
  const whiteResultStr = whiteResult === 1.0 ? 'win' : whiteResult === 0.0 ? 'loss' : 'draw';
  const blackResultStr = blackResult === 1.0 ? 'win' : blackResult === 0.0 ? 'loss' : 'draw';
  
  userManager.updateUserStats(room.whitePlayer.username, whiteResultStr, room.whitePlayer.elo);
  userManager.updateUserStats(room.blackPlayer.username, blackResultStr, room.blackPlayer.elo);
  
  // Check if this is a tournament game
  let tournamentResult = null;
  if (room.tournamentGameId) {
    const gameResult = whiteResult === 1.0 ? '1-0' : whiteResult === 0.0 ? '0-1' : '1/2-1/2';
    tournamentResult = tournamentManager.recordGameResult(
      room.tournamentId,
      room.tournamentGameId,
      gameResult
    );
    
    if (tournamentResult.success) {
      console.log(`[${new Date().toISOString()}] Tournament game result recorded: ${room.tournamentGameId}`);
      
      // Notify all clients about tournament update
      io.emit('tournament-updated', {
        tournamentId: room.tournamentId,
        tournament: tournamentResult.tournament
      });
      
      // If round is complete, notify players
      if (tournamentResult.roundComplete) {
        io.emit('tournament-round-complete', {
          tournamentId: room.tournamentId,
          round: tournamentResult.tournament.currentRound,
          standings: tournamentResult.tournament.standings
        });
      }
      
      // If tournament is complete, notify players
      if (tournamentResult.tournamentComplete) {
        io.emit('tournament-complete', {
          tournamentId: room.tournamentId,
          winner: tournamentResult.winner,
          standings: tournamentResult.tournament.standings
        });
      }
    }
  }
  
  // Emit game-ended event to both players
  const gameEndData = {
    reason,
    winner,
    eloChanges: {
      white: whiteEloChange,
      black: blackEloChange
    },
    newElos: {
      white: room.whitePlayer.elo,
      black: room.blackPlayer.elo
    },
    tournamentResult: tournamentResult
  };
  
  if (room.whitePlayer.socket) {
    room.whitePlayer.socket.emit('game-ended', gameEndData);
  }
  if (room.blackPlayer.socket) {
    room.blackPlayer.socket.emit('game-ended', gameEndData);
  }
  
  // Clean up
  connectionManager.cleanupRoom(room.code);
  roomManager.removeRoom(room.code);
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Client connected: ${socket.id}`);
  
  connectionManager.handleConnection(socket);

  // Handle room creation
  socket.on('create-room', (data) => {
    try {
      const { playerInfo } = data;
      const playerId = data.playerId || socket.id;
      
      console.log(`[${new Date().toISOString()}] Player ${playerId} creating room`);
      
      const roomCode = roomManager.createRoom(playerId, playerInfo);
      const room = roomManager.getRoom(roomCode);
      room.whitePlayer.socket = socket;
      
      // Associate socket with player
      connectionManager.associateSocketWithPlayer(socket, playerId);
      
      // Join socket.io room
      socket.join(roomCode);
      
      socket.emit('room-created', { roomCode });
      console.log(`[${new Date().toISOString()}] Room ${roomCode} created by ${playerId}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating room:`, error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  // Handle room joining
  socket.on('join-room', (data) => {
    try {
      const { roomCode, playerInfo } = data;
      const playerId = data.playerId || socket.id;
      
      console.log(`[${new Date().toISOString()}] Player ${playerId} joining room ${roomCode}`);
      
      const result = roomManager.joinRoom(roomCode, playerId, playerInfo);
      
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }
      
      const room = result.room;
      room.blackPlayer.socket = socket;
      
      // Associate socket with player
      connectionManager.associateSocketWithPlayer(socket, playerId);
      
      // Join socket.io room
      socket.join(roomCode);
      
      // Initialize game state
      room.gameState = initializeGameState();
      
      // Notify both players that game has started
      const gameStartData = {
        roomCode,
        whitePlayer: {
          username: room.whitePlayer.username,
          elo: room.whitePlayer.elo
        },
        blackPlayer: {
          username: room.blackPlayer.username,
          elo: room.blackPlayer.elo
        },
        gameState: room.gameState
      };
      
      room.whitePlayer.socket.emit('game-started', {
        ...gameStartData,
        playerColor: 'white'
      });
      
      room.blackPlayer.socket.emit('game-started', {
        ...gameStartData,
        playerColor: 'black'
      });
      
      console.log(`[${new Date().toISOString()}] Game started in room ${roomCode}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error joining room:`, error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle matchmaking
  socket.on('find-match', (data) => {
    try {
      const { playerInfo } = data;
      const playerId = data.playerId || socket.id;
      
      console.log(`[${new Date().toISOString()}] Player ${playerId} looking for match`);
      
      // Add to matchmaking queue
      roomManager.addToMatchmaking(playerId, playerInfo, socket);
      
      // Associate socket with player
      connectionManager.associateSocketWithPlayer(socket, playerId);
      
      // Try to find a match
      const match = roomManager.findMatch();
      
      if (match) {
        const { room } = match;
        
        // Join both players to socket.io room
        room.whitePlayer.socket.join(room.code);
        room.blackPlayer.socket.join(room.code);
        
        // Initialize game state
        room.gameState = initializeGameState();
        
        // Notify both players
        const gameStartData = {
          roomCode: room.code,
          whitePlayer: {
            username: room.whitePlayer.username,
            elo: room.whitePlayer.elo
          },
          blackPlayer: {
            username: room.blackPlayer.username,
            elo: room.blackPlayer.elo
          },
          gameState: room.gameState
        };
        
        room.whitePlayer.socket.emit('match-found', {
          ...gameStartData,
          playerColor: 'white'
        });
        
        room.blackPlayer.socket.emit('match-found', {
          ...gameStartData,
          playerColor: 'black'
        });
        
        console.log(`[${new Date().toISOString()}] Match found, game started in room ${room.code}`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in matchmaking:`, error);
      socket.emit('error', { message: 'Failed to find match' });
    }
  });

  // Friend Management Events
  socket.on('send-friend-request', (data) => {
    try {
      const { fromUsername, toUsername } = data;
      console.log(`[${new Date().toISOString()}] Friend request: ${fromUsername} -> ${toUsername}`);
      
      // Validate both users exist (check in authSystem/localStorage)
      // For now, just send the request
      const result = friendsManager.sendFriendRequest(fromUsername, toUsername);
      socket.emit('friend-request-response', result);
      
      if (result.success) {
        // Notify the recipient if they're online
        const recipientSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.data && s.data.username === toUsername);
        if (recipientSocket) {
          recipientSocket.emit('friend-request-received', { 
            from: fromUsername
          });
          // Tell them to reload their requests
          recipientSocket.emit('friends-updated');
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error sending friend request:`, error);
      socket.emit('friend-request-response', { success: false, message: 'Failed to send request' });
    }
  });

  socket.on('accept-friend-request', (data) => {
    try {
      const { username, requesterUsername } = data;
      console.log(`[${new Date().toISOString()}] Accept friend request: ${username} accepts ${requesterUsername}`);
      
      const result = friendsManager.acceptFriendRequest(username, requesterUsername);
      console.log(`[${new Date().toISOString()}] Accept result:`, result);
      
      socket.emit('friend-request-accepted-response', result);
      
      if (result.success) {
        // Log the updated friends lists
        console.log(`[${new Date().toISOString()}] ${username}'s friends:`, friendsManager.getFriends(username));
        console.log(`[${new Date().toISOString()}] ${requesterUsername}'s friends:`, friendsManager.getFriends(requesterUsername));
        
        // Notify both users to reload their friends data
        socket.emit('friends-updated');
        
        const friendSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.data && s.data.username === requesterUsername);
        if (friendSocket) {
          friendSocket.emit('friend-request-accepted', { by: username });
          friendSocket.emit('friends-updated');
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error accepting friend request:`, error);
      socket.emit('friend-request-accepted-response', { success: false, message: 'Failed to accept request' });
    }
  });

  socket.on('decline-friend-request', (data) => {
    try {
      const { username, requesterUsername } = data;
      console.log(`[${new Date().toISOString()}] Decline friend request: ${username} declines ${requesterUsername}`);
      
      const result = friendsManager.declineFriendRequest(username, requesterUsername);
      socket.emit('friend-request-declined-response', result);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error declining friend request:`, error);
      socket.emit('friend-request-declined-response', { success: false, message: 'Failed to decline request' });
    }
  });

  socket.on('remove-friend', (data) => {
    try {
      const { username, friendUsername } = data;
      console.log(`[${new Date().toISOString()}] Remove friend: ${username} removes ${friendUsername}`);
      
      const result = friendsManager.removeFriend(username, friendUsername);
      socket.emit('friend-removed-response', result);
      
      if (result.success) {
        // Notify both users to reload their friends data
        socket.emit('friends-updated');
        
        const friendSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.data && s.data.username === friendUsername);
        if (friendSocket) {
          friendSocket.emit('friends-updated');
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error removing friend:`, error);
      socket.emit('friend-removed-response', { success: false, message: 'Failed to remove friend' });
    }
  });

  socket.on('get-friends', (data) => {
    try {
      const { username } = data;
      const friendUsernames = friendsManager.getFriends(username);
      const requestUsernames = friendsManager.getFriendRequests(username);
      
      console.log(`[${new Date().toISOString()}] Raw friend usernames for ${username}:`, friendUsernames);
      console.log(`[${new Date().toISOString()}] Raw request usernames for ${username}:`, requestUsernames);
      
      // Get full user data from authSystem (we need to implement a user store)
      // For now, send usernames with placeholder data
      // Filter out any null/undefined values
      const friends = friendUsernames
        .filter(name => name != null)
        .map(name => ({
          username: name,
          elo: 1200, // Placeholder - in production, get from database
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0
        }));
      
      const requests = requestUsernames
        .filter(name => name != null)
        .map(name => ({
          username: name,
          elo: 1200, // Placeholder - in production, get from database
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0
        }));
      
      console.log(`[${new Date().toISOString()}] Sending friends data to ${username}:`, { friends, requests });
      socket.emit('friends-data', { friends, requests });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error getting friends:`, error);
      socket.emit('error', { message: 'Failed to get friends' });
    }
  });

  // Tournament Management Events
  socket.on('tournament-create', (data) => {
    try {
      const { config, creatorUsername, creatorElo } = data;
      console.log(`[${new Date().toISOString()}] Creating tournament: ${config.name} by ${creatorUsername}`);
      
      const result = tournamentManager.createTournament(
        { ...config, creatorElo },
        creatorUsername
      );
      
      socket.emit('tournament-created', result);
      
      if (result.success) {
        // Broadcast to all clients that a new tournament is available
        io.emit('tournament-list-updated', {
          tournaments: tournamentManager.getAllTournaments()
        });
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating tournament:`, error);
      socket.emit('tournament-created', { success: false, error: error.message });
    }
  });

  socket.on('tournament-join', (data) => {
    try {
      const { tournamentId, playerInfo } = data;
      console.log(`[${new Date().toISOString()}] Player ${playerInfo.username} joining tournament ${tournamentId}`);
      
      const result = tournamentManager.joinTournament(tournamentId, playerInfo);
      
      socket.emit('tournament-joined', result);
      
      if (result.success) {
        // Notify all players in the tournament
        const tournament = tournamentManager.getTournament(tournamentId);
        if (tournament) {
          io.emit('tournament-updated', {
            tournamentId,
            tournament: tournament.getTournamentState()
          });
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error joining tournament:`, error);
      socket.emit('tournament-joined', { success: false, error: error.message });
    }
  });

  socket.on('tournament-leave', (data) => {
    try {
      const { tournamentId, username } = data;
      console.log(`[${new Date().toISOString()}] Player ${username} leaving tournament ${tournamentId}`);
      
      const result = tournamentManager.leaveTournament(tournamentId, username);
      
      socket.emit('tournament-left', result);
      
      if (result.success) {
        // Notify all players in the tournament
        io.emit('tournament-updated', {
          tournamentId,
          tournament: result.tournament
        });
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error leaving tournament:`, error);
      socket.emit('tournament-left', { success: false, error: error.message });
    }
  });

  socket.on('tournament-start', (data) => {
    try {
      const { tournamentId } = data;
      console.log(`[${new Date().toISOString()}] Starting tournament ${tournamentId}`);
      
      const result = tournamentManager.startTournament(tournamentId);
      
      socket.emit('tournament-started', result);
      
      if (result.success) {
        // Notify all players in the tournament
        io.emit('tournament-updated', {
          tournamentId,
          tournament: result.tournament
        });
        
        // Notify players about their pairings
        const tournament = tournamentManager.getTournament(tournamentId);
        if (tournament) {
          const pairings = tournament.getCurrentRoundPairings();
          io.emit('tournament-round-started', {
            tournamentId,
            round: tournament.currentRound,
            pairings
          });
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error starting tournament:`, error);
      socket.emit('tournament-started', { success: false, error: error.message });
    }
  });

  socket.on('tournament-get-state', (data) => {
    try {
      const { tournamentId } = data;
      const state = tournamentManager.getTournamentState(tournamentId);
      
      if (state) {
        socket.emit('tournament-state', { success: true, tournament: state });
      } else {
        socket.emit('tournament-state', { success: false, error: 'Tournament not found' });
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error getting tournament state:`, error);
      socket.emit('tournament-state', { success: false, error: error.message });
    }
  });

  socket.on('tournament-get-all', () => {
    try {
      const tournaments = tournamentManager.getAllTournaments();
      socket.emit('tournament-list', { success: true, tournaments });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error getting tournaments:`, error);
      socket.emit('tournament-list', { success: false, error: error.message });
    }
  });

  socket.on('tournament-get-player-tournaments', (data) => {
    try {
      const { username } = data;
      const tournaments = tournamentManager.getPlayerTournaments(username);
      socket.emit('player-tournaments', { success: true, tournaments });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error getting player tournaments:`, error);
      socket.emit('player-tournaments', { success: false, error: error.message });
    }
  });

  socket.on('tournament-advance-round', (data) => {
    try {
      const { tournamentId } = data;
      console.log(`[${new Date().toISOString()}] Advancing round in tournament ${tournamentId}`);
      
      const result = tournamentManager.advanceRound(tournamentId);
      
      socket.emit('tournament-round-advanced', result);
      
      if (result.success) {
        // Notify all players in the tournament
        io.emit('tournament-updated', {
          tournamentId,
          tournament: result.tournament
        });
        
        // Notify players about new round pairings
        io.emit('tournament-round-started', {
          tournamentId,
          round: result.tournament.currentRound,
          pairings: result.pairings
        });
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error advancing round:`, error);
      socket.emit('tournament-round-advanced', { success: false, error: error.message });
    }
  });

  socket.on('tournament-game-start', (data) => {
    try {
      const { tournamentId, gameId, roomCode } = data;
      console.log(`[${new Date().toISOString()}] Tournament game starting: ${gameId} in room ${roomCode}`);
      
      tournamentManager.associateGame(gameId, tournamentId, roomCode);
      
      socket.emit('tournament-game-started', { success: true, gameId, roomCode });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error starting tournament game:`, error);
      socket.emit('tournament-game-started', { success: false, error: error.message });
    }
  });

  socket.on('tournament-game-result', (data) => {
    try {
      const { tournamentId, gameId, result } = data;
      console.log(`[${new Date().toISOString()}] Recording tournament game result: ${gameId} = ${result}`);
      
      const recordResult = tournamentManager.recordGameResult(tournamentId, gameId, result);
      
      socket.emit('tournament-game-result-recorded', recordResult);
      
      if (recordResult.success) {
        // Notify all players in the tournament
        io.emit('tournament-updated', {
          tournamentId,
          tournament: recordResult.tournament
        });
        
        // If round is complete, notify players
        if (recordResult.roundComplete) {
          io.emit('tournament-round-complete', {
            tournamentId,
            round: recordResult.tournament.currentRound,
            standings: recordResult.tournament.standings
          });
        }
        
        // If tournament is complete, notify players
        if (recordResult.tournamentComplete) {
          io.emit('tournament-complete', {
            tournamentId,
            winner: recordResult.winner,
            standings: recordResult.tournament.standings
          });
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error recording game result:`, error);
      socket.emit('tournament-game-result-recorded', { success: false, error: error.message });
    }
  });

  socket.on('tournament-create-game', (data) => {
    try {
      const { tournamentId, gameId, whitePlayer, blackPlayer } = data;
      console.log(`[${new Date().toISOString()}] Creating tournament game: ${gameId}`);
      
      // Create a room for the tournament game
      const roomCode = roomManager.createRoom(whitePlayer.id, whitePlayer);
      const room = roomManager.getRoom(roomCode);
      
      // Set up the room for tournament play
      room.tournamentId = tournamentId;
      room.tournamentGameId = gameId;
      room.whitePlayer.socket = socket;
      
      // Associate socket with player
      connectionManager.associateSocketWithPlayer(socket, whitePlayer.id);
      
      // Join socket.io room
      socket.join(roomCode);
      
      // Associate game with tournament
      tournamentManager.associateGame(gameId, tournamentId, roomCode);
      
      socket.emit('tournament-game-created', {
        success: true,
        roomCode,
        gameId,
        tournamentId
      });
      
      console.log(`[${new Date().toISOString()}] Tournament game room ${roomCode} created for game ${gameId}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating tournament game:`, error);
      socket.emit('tournament-game-created', { success: false, error: error.message });
    }
  });

  socket.on('tournament-join-game', (data) => {
    try {
      const { roomCode, tournamentId, gameId, playerInfo } = data;
      const playerId = data.playerId || socket.id;
      
      console.log(`[${new Date().toISOString()}] Player ${playerId} joining tournament game ${gameId}`);
      
      const result = roomManager.joinRoom(roomCode, playerId, playerInfo);
      
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }
      
      const room = result.room;
      room.blackPlayer.socket = socket;
      room.tournamentId = tournamentId;
      room.tournamentGameId = gameId;
      
      // Associate socket with player
      connectionManager.associateSocketWithPlayer(socket, playerId);
      
      // Join socket.io room
      socket.join(roomCode);
      
      // Initialize game state
      room.gameState = initializeGameState();
      
      // Notify both players that game has started
      const gameStartData = {
        roomCode,
        tournamentId,
        gameId,
        whitePlayer: {
          username: room.whitePlayer.username,
          elo: room.whitePlayer.elo
        },
        blackPlayer: {
          username: room.blackPlayer.username,
          elo: room.blackPlayer.elo
        },
        gameState: room.gameState
      };
      
      room.whitePlayer.socket.emit('tournament-game-started', {
        ...gameStartData,
        playerColor: 'white'
      });
      
      room.blackPlayer.socket.emit('tournament-game-started', {
        ...gameStartData,
        playerColor: 'black'
      });
      
      console.log(`[${new Date().toISOString()}] Tournament game started in room ${roomCode}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error joining tournament game:`, error);
      socket.emit('error', { message: 'Failed to join tournament game' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`[${new Date().toISOString()}] Client disconnected: ${socket.id}, reason: ${reason}`);
    
    connectionManager.handleDisconnection(socket, (roomCode, disconnectedPlayerId, playerColor) => {
      // Timeout callback - award victory to connected player
      const room = roomManager.getRoom(roomCode);
      if (room) {
        const winner = playerColor === 'white' ? 'black' : 'white';
        
        // Check if this is a tournament game
        if (room.tournamentGameId) {
          const disconnectedUsername = playerColor === 'white' 
            ? room.whitePlayer.username 
            : room.blackPlayer.username;
          
          const disconnectResult = tournamentManager.handlePlayerDisconnection(
            disconnectedUsername,
            room.tournamentGameId
          );
          
          if (disconnectResult.isTournamentGame && disconnectResult.handled) {
            console.log(`[${new Date().toISOString()}] Tournament game ${room.tournamentGameId} ended due to disconnection`);
            
            // Notify all clients about tournament update
            io.emit('tournament-updated', {
              tournamentId: room.tournamentId,
              tournament: disconnectResult.tournament
            });
          }
        }
        
        handleGameEnd(room, 'timeout', winner);
      }
    });
    
    // Notify opponent if in a game
    const playerId = connectionManager.getPlayerIdFromSocket(socket);
    if (playerId) {
      const room = connectionManager.getActiveGame(playerId);
      if (room) {
        const opponentSocket = room.whitePlayer.id === playerId 
          ? room.blackPlayer.socket 
          : room.whitePlayer.socket;
        
        if (opponentSocket) {
          opponentSocket.emit('opponent-disconnected');
        }
      }
    }
  });

  // Log any errors
  socket.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Socket error for ${socket.id}:`, error);
  });

  // Handle make-move
  socket.on('make-move', (data) => {
    try {
      const { roomCode, from, to, promotion } = data;
      const playerId = connectionManager.getPlayerIdFromSocket(socket);
      
      if (!playerId) {
        socket.emit('error', { message: 'Player not identified' });
        return;
      }
      
      const room = roomManager.getRoom(roomCode);
      if (!room || !room.gameState) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      // Determine player color
      const playerColor = room.whitePlayer.id === playerId ? 'white' : 'black';
      
      // Check if it's the player's turn
      if (room.gameState.currentPlayer !== playerColor) {
        socket.emit('move-invalid', { error: 'Not your turn' });
        return;
      }
      
      // Validate the move
      const validation = chessValidator.validateMove(room.gameState, from, to, promotion);
      
      if (!validation.valid) {
        socket.emit('move-invalid', { error: validation.error });
        return;
      }
      
      // Apply the move using chess engine
      const engine = new ChessEngine();
      engine.board = room.gameState.board.map(row => [...row]);
      engine.currentPlayer = room.gameState.currentPlayer;
      engine.gameState = room.gameState.gameStatus;
      engine.moveHistory = room.gameState.moveHistory;
      engine.capturedPieces = room.gameState.capturedPieces;
      engine.enPassantTarget = room.gameState.enPassantTarget;
      engine.castlingRights = room.gameState.castlingRights;
      engine.halfMoveClock = room.gameState.halfMoveClock;
      engine.fullMoveNumber = room.gameState.fullMoveNumber;
      
      // Make the move
      const moveResult = engine.makeMove(from.row, from.col, to.row, to.col, promotion);
      
      if (!moveResult) {
        socket.emit('move-invalid', { error: 'Failed to apply move' });
        return;
      }
      
      // Update game state
      room.gameState.board = engine.board;
      room.gameState.currentPlayer = engine.currentPlayer;
      room.gameState.moveHistory = engine.moveHistory;
      room.gameState.capturedPieces = engine.capturedPieces;
      room.gameState.enPassantTarget = engine.enPassantTarget;
      room.gameState.castlingRights = engine.castlingRights;
      room.gameState.halfMoveClock = engine.halfMoveClock;
      room.gameState.fullMoveNumber = engine.fullMoveNumber;
      room.gameState.gameStatus = engine.gameState;
      room.lastActivity = Date.now();
      
      // Create move object
      const move = {
        from,
        to,
        piece: moveResult.piece,
        capturedPiece: moveResult.capturedPiece || null,
        promotion: promotion || null,
        type: moveResult.type || 'normal',
        timestamp: Date.now()
      };
      
      // Emit move to opponent
      const opponentSocket = playerColor === 'white' 
        ? room.blackPlayer.socket 
        : room.whitePlayer.socket;
      
      if (opponentSocket) {
        opponentSocket.emit('move-made', {
          move,
          gameState: room.gameState
        });
      }
      
      // Confirm move to sender
      socket.emit('move-made', {
        move,
        gameState: room.gameState
      });
      
      // Check for game end
      const gameStatus = chessValidator.getGameStatus(room.gameState);
      if (gameStatus !== 'playing') {
        let winner = null;
        if (gameStatus === 'checkmate') {
          winner = playerColor; // Current player made the winning move
        }
        handleGameEnd(room, gameStatus, winner);
      }
      
      console.log(`[${new Date().toISOString()}] Move made in room ${roomCode} by ${playerColor}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error making move:`, error);
      socket.emit('error', { message: 'Failed to make move' });
    }
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    try {
      const { roomCode, message } = data;
      const playerId = connectionManager.getPlayerIdFromSocket(socket);
      
      if (!playerId) {
        socket.emit('error', { message: 'Player not identified' });
        return;
      }
      
      // Validate message length
      if (!message || message.length === 0) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }
      
      if (message.length > 500) {
        socket.emit('error', { message: 'Message too long (max 500 characters)' });
        return;
      }
      
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      // Determine sender info
      const isWhite = room.whitePlayer.id === playerId;
      const sender = isWhite ? room.whitePlayer.username : room.blackPlayer.username;
      
      // Broadcast to opponent
      const opponentSocket = isWhite ? room.blackPlayer.socket : room.whitePlayer.socket;
      
      const chatData = {
        sender,
        message,
        timestamp: Date.now()
      };
      
      if (opponentSocket) {
        opponentSocket.emit('chat-message', chatData);
      }
      
      // Echo back to sender for confirmation
      socket.emit('chat-message', chatData);
      
      console.log(`[${new Date().toISOString()}] Chat message in room ${roomCode} from ${sender}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error sending chat message:`, error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle draw offers
  socket.on('offer-draw', (data) => {
    try {
      const { roomCode } = data;
      const playerId = connectionManager.getPlayerIdFromSocket(socket);
      
      if (!playerId) {
        socket.emit('error', { message: 'Player not identified' });
        return;
      }
      
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      // Forward to opponent
      const isWhite = room.whitePlayer.id === playerId;
      const opponentSocket = isWhite ? room.blackPlayer.socket : room.whitePlayer.socket;
      
      if (opponentSocket) {
        opponentSocket.emit('draw-offered');
      }
      
      console.log(`[${new Date().toISOString()}] Draw offered in room ${roomCode}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error offering draw:`, error);
      socket.emit('error', { message: 'Failed to offer draw' });
    }
  });

  // Handle draw responses
  socket.on('respond-draw', (data) => {
    try {
      const { roomCode, accept } = data;
      const playerId = connectionManager.getPlayerIdFromSocket(socket);
      
      if (!playerId) {
        socket.emit('error', { message: 'Player not identified' });
        return;
      }
      
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      const isWhite = room.whitePlayer.id === playerId;
      const opponentSocket = isWhite ? room.blackPlayer.socket : room.whitePlayer.socket;
      
      if (accept) {
        // End game as draw
        handleGameEnd(room, 'draw', null);
      } else {
        // Notify offering player that draw was declined
        if (opponentSocket) {
          opponentSocket.emit('draw-declined');
        }
      }
      
      console.log(`[${new Date().toISOString()}] Draw ${accept ? 'accepted' : 'declined'} in room ${roomCode}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error responding to draw:`, error);
      socket.emit('error', { message: 'Failed to respond to draw' });
    }
  });

  // Handle resignation
  socket.on('resign', (data) => {
    try {
      const { roomCode } = data;
      const playerId = connectionManager.getPlayerIdFromSocket(socket);
      
      if (!playerId) {
        socket.emit('error', { message: 'Player not identified' });
        return;
      }
      
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      // Determine winner (opposite of resigning player)
      const isWhite = room.whitePlayer.id === playerId;
      const winner = isWhite ? 'black' : 'white';
      
      handleGameEnd(room, 'resignation', winner);
      
      console.log(`[${new Date().toISOString()}] Player resigned in room ${roomCode}, winner: ${winner}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error handling resignation:`, error);
      socket.emit('error', { message: 'Failed to resign' });
    }
  });

  // Handle reconnection
  socket.on('reconnect-game', (data) => {
    try {
      const { playerId } = data;
      
      console.log(`[${new Date().toISOString()}] Reconnection attempt for player ${playerId}`);
      
      const result = connectionManager.handleReconnection(socket, playerId);
      
      if (result.success) {
        const { room, playerColor } = result;
        
        // Join socket.io room
        socket.join(room.code);
        
        // Send current game state
        socket.emit('game-restored', {
          roomCode: room.code,
          playerColor,
          gameState: room.gameState,
          whitePlayer: {
            username: room.whitePlayer.username,
            elo: room.whitePlayer.elo
          },
          blackPlayer: {
            username: room.blackPlayer.username,
            elo: room.blackPlayer.elo
          }
        });
        
        // Notify opponent of reconnection
        const opponentSocket = playerColor === 'white' 
          ? room.blackPlayer.socket 
          : room.whitePlayer.socket;
        
        if (opponentSocket) {
          opponentSocket.emit('opponent-reconnected');
        }
        
        console.log(`[${new Date().toISOString()}] Player ${playerId} reconnected to room ${room.code}`);
      } else {
        socket.emit('error', { message: result.error });
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error handling reconnection:`, error);
      socket.emit('error', { message: 'Failed to reconnect' });
    }
  });
});

// Start server only if not being imported for testing
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Chess multiplayer server running on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] Serving static files from: ${path.join(__dirname, '..')}`);
    console.log(`[${new Date().toISOString()}] Client URL: ${CLIENT_URL}`);
  });
} else {
  // For testing, start on a random port
  server.listen(0);
}

// Export for testing
module.exports = { app, server, io };
