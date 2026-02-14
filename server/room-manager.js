/**
 * RoomManager - Manages game rooms and matchmaking queue
 * 
 * Responsibilities:
 * - Create and manage private game rooms
 * - Generate unique room codes
 * - Handle matchmaking queue for random games
 * - Track active rooms and players
 */

class RoomManager {
  constructor() {
    // Map of room codes to Room objects
    this.rooms = new Map();
    
    // Array of players waiting for matchmaking
    // Each entry: { playerId, playerInfo: { username, elo }, socket, timestamp }
    this.matchmakingQueue = [];
  }

  /**
   * Generate a unique 6-character alphanumeric room code
   * @returns {string} Room code (e.g., "A3X9K2")
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Generate 6 random alphanumeric characters
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }
    
    // Ensure uniqueness (extremely rare collision, but handle it)
    if (this.rooms.has(code)) {
      return this.generateRoomCode(); // Recursively generate new code
    }
    
    return code;
  }

  /**
   * Create a new private room
   * @param {string} playerId - The creator's player ID
   * @param {object} playerInfo - Player information { username, elo }
   * @returns {string} The generated room code
   */
  createRoom(playerId, playerInfo) {
    const roomCode = this.generateRoomCode();
    
    const room = {
      code: roomCode,
      whitePlayer: {
        id: playerId,
        username: playerInfo.username,
        elo: playerInfo.elo,
        socket: null // Will be set when socket is provided
      },
      blackPlayer: null,
      gameState: null, // Will be initialized when game starts
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    this.rooms.set(roomCode, room);
    return roomCode;
  }

  /**
   * Get a room by its code
   * @param {string} roomCode - The room code
   * @returns {object|null} The room object or null if not found
   */
  getRoom(roomCode) {
    return this.rooms.get(roomCode) || null;
  }

  /**
   * Remove a room from storage
   * @param {string} roomCode - The room code to remove
   */
  removeRoom(roomCode) {
    this.rooms.delete(roomCode);
  }

  /**
   * Join an existing room
   * @param {string} roomCode - The room code to join
   * @param {string} playerId - The joining player's ID
   * @param {object} playerInfo - Player information { username, elo }
   * @returns {object} { success: boolean, error?: string, room?: object }
   */
  joinRoom(roomCode, playerId, playerInfo) {
    const room = this.getRoom(roomCode);
    
    // Validate room exists
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    
    // Validate room not full
    if (room.blackPlayer !== null) {
      return { success: false, error: 'Room is full' };
    }
    
    // Validate player not joining own room
    if (room.whitePlayer.id === playerId) {
      return { success: false, error: 'Cannot join your own room' };
    }
    
    // Add player as black player
    room.blackPlayer = {
      id: playerId,
      username: playerInfo.username,
      elo: playerInfo.elo,
      socket: null // Will be set when socket is provided
    };
    
    room.lastActivity = Date.now();
    
    return { success: true, room };
  }

  /**
   * Add a player to the matchmaking queue
   * @param {string} playerId - The player's ID
   * @param {object} playerInfo - Player information { username, elo }
   * @param {object} socket - The player's socket connection
   */
  addToMatchmaking(playerId, playerInfo, socket) {
    // Check if player is already in queue
    const existingIndex = this.matchmakingQueue.findIndex(
      entry => entry.playerId === playerId
    );
    
    if (existingIndex !== -1) {
      // Update existing entry
      this.matchmakingQueue[existingIndex] = {
        playerId,
        playerInfo,
        socket,
        timestamp: Date.now()
      };
    } else {
      // Add new entry
      this.matchmakingQueue.push({
        playerId,
        playerInfo,
        socket,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Remove a player from the matchmaking queue
   * @param {string} playerId - The player's ID to remove
   */
  removeFromMatchmaking(playerId) {
    this.matchmakingQueue = this.matchmakingQueue.filter(
      entry => entry.playerId !== playerId
    );
  }

  /**
   * Find a match from the matchmaking queue
   * Creates a room and assigns both players
   * @returns {object|null} { player1, player2, roomCode } or null if no match available
   */
  findMatch() {
    // Need at least 2 players in queue
    if (this.matchmakingQueue.length < 2) {
      return null;
    }
    
    // Take first two players from queue
    const player1 = this.matchmakingQueue.shift();
    const player2 = this.matchmakingQueue.shift();
    
    // Create a room for the match
    const roomCode = this.generateRoomCode();
    
    const room = {
      code: roomCode,
      whitePlayer: {
        id: player1.playerId,
        username: player1.playerInfo.username,
        elo: player1.playerInfo.elo,
        socket: player1.socket
      },
      blackPlayer: {
        id: player2.playerId,
        username: player2.playerInfo.username,
        elo: player2.playerInfo.elo,
        socket: player2.socket
      },
      gameState: null, // Will be initialized when game starts
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    this.rooms.set(roomCode, room);
    
    return {
      player1: player1,
      player2: player2,
      roomCode: roomCode,
      room: room
    };
  }
}

module.exports = RoomManager;
