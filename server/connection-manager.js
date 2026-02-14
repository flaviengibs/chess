/**
 * ConnectionManager - Manages socket connections and reconnection logic
 * 
 * Responsibilities:
 * - Handle socket connections and disconnections
 * - Store disconnected player data for reconnection
 * - Implement timeout logic for abandoned games
 * - Manage reconnection within 60-second window
 * 
 * Requirements: 1.4, 9.2, 9.3, 9.6
 */

class ConnectionManager {
  constructor(roomManager) {
    this.roomManager = roomManager;
    
    // Map of playerId to disconnection data
    // { playerId: { roomCode, disconnectedAt, timeout, playerColor } }
    this.disconnectedPlayers = new Map();
    
    // Map of socketId to playerId for tracking active connections
    this.socketToPlayer = new Map();
    
    // Map of playerId to socketId for reverse lookup
    this.playerToSocket = new Map();
    
    // Timeout duration in milliseconds (60 seconds)
    this.DISCONNECT_TIMEOUT = 60000;
  }

  /**
   * Handle a new socket connection
   * @param {object} socket - The Socket.IO socket object
   */
  handleConnection(socket) {
    console.log(`[${new Date().toISOString()}] ConnectionManager: New connection ${socket.id}`);
    
    // Socket will be associated with a player when they join/create a room
    // or when they reconnect with a playerId
  }

  /**
   * Associate a socket with a player ID
   * @param {object} socket - The Socket.IO socket object
   * @param {string} playerId - The player's ID
   */
  associateSocketWithPlayer(socket, playerId) {
    // Remove any existing associations for this socket
    const existingPlayerId = this.socketToPlayer.get(socket.id);
    if (existingPlayerId) {
      this.playerToSocket.delete(existingPlayerId);
    }
    
    // Remove any existing socket for this player
    const existingSocketId = this.playerToSocket.get(playerId);
    if (existingSocketId) {
      this.socketToPlayer.delete(existingSocketId);
    }
    
    // Create new associations
    this.socketToPlayer.set(socket.id, playerId);
    this.playerToSocket.set(playerId, socket.id);
    
    console.log(`[${new Date().toISOString()}] ConnectionManager: Associated socket ${socket.id} with player ${playerId}`);
  }

  /**
   * Get the player ID associated with a socket
   * @param {object} socket - The Socket.IO socket object
   * @returns {string|null} The player ID or null if not found
   */
  getPlayerIdFromSocket(socket) {
    return this.socketToPlayer.get(socket.id) || null;
  }

  /**
   * Get the socket ID associated with a player
   * @param {string} playerId - The player's ID
   * @returns {string|null} The socket ID or null if not found
   */
  getSocketIdFromPlayer(playerId) {
    return this.playerToSocket.get(playerId) || null;
  }

  /**
   * Handle socket disconnection
   * Stores player data for 60 seconds to allow reconnection
   * @param {object} socket - The Socket.IO socket object
   * @param {function} onTimeout - Callback function when timeout expires (roomCode, disconnectedPlayerId)
   */
  handleDisconnection(socket, onTimeout) {
    const playerId = this.getPlayerIdFromSocket(socket);
    
    if (!playerId) {
      console.log(`[${new Date().toISOString()}] ConnectionManager: Disconnection for unassociated socket ${socket.id}`);
      return;
    }
    
    console.log(`[${new Date().toISOString()}] ConnectionManager: Player ${playerId} disconnected (socket ${socket.id})`);
    
    // Find the room this player is in
    const room = this.getActiveGame(playerId);
    
    if (!room) {
      console.log(`[${new Date().toISOString()}] ConnectionManager: Player ${playerId} not in any active game`);
      // Clean up associations
      this.socketToPlayer.delete(socket.id);
      this.playerToSocket.delete(playerId);
      
      // Remove from matchmaking queue if present
      this.roomManager.removeFromMatchmaking(playerId);
      return;
    }
    
    // Determine player color
    const playerColor = room.whitePlayer.id === playerId ? 'white' : 'black';
    
    // Store disconnection data
    const disconnectionData = {
      roomCode: room.code,
      disconnectedAt: Date.now(),
      playerColor: playerColor,
      timeout: null
    };
    
    // Set timeout for 60 seconds
    disconnectionData.timeout = setTimeout(() => {
      console.log(`[${new Date().toISOString()}] ConnectionManager: Timeout expired for player ${playerId} in room ${room.code}`);
      
      // Remove from disconnected players
      this.disconnectedPlayers.delete(playerId);
      
      // Call the timeout callback
      if (onTimeout) {
        onTimeout(room.code, playerId, playerColor);
      }
    }, this.DISCONNECT_TIMEOUT);
    
    this.disconnectedPlayers.set(playerId, disconnectionData);
    
    // Clean up socket associations
    this.socketToPlayer.delete(socket.id);
    this.playerToSocket.delete(playerId);
    
    console.log(`[${new Date().toISOString()}] ConnectionManager: Stored disconnection data for player ${playerId}, timeout in ${this.DISCONNECT_TIMEOUT}ms`);
  }

  /**
   * Handle player reconnection
   * Restores game session if within timeout window
   * @param {object} socket - The Socket.IO socket object
   * @param {string} playerId - The player's ID
   * @returns {object|null} { success: boolean, room?: object, error?: string }
   */
  handleReconnection(socket, playerId) {
    console.log(`[${new Date().toISOString()}] ConnectionManager: Reconnection attempt for player ${playerId} (socket ${socket.id})`);
    
    const disconnectionData = this.disconnectedPlayers.get(playerId);
    
    if (!disconnectionData) {
      console.log(`[${new Date().toISOString()}] ConnectionManager: No disconnection data found for player ${playerId}`);
      return { success: false, error: 'No active game session found' };
    }
    
    // Clear the timeout
    if (disconnectionData.timeout) {
      clearTimeout(disconnectionData.timeout);
    }
    
    // Remove from disconnected players
    this.disconnectedPlayers.delete(playerId);
    
    // Get the room
    const room = this.roomManager.getRoom(disconnectionData.roomCode);
    
    if (!room) {
      console.log(`[${new Date().toISOString()}] ConnectionManager: Room ${disconnectionData.roomCode} no longer exists`);
      return { success: false, error: 'Game session no longer exists' };
    }
    
    // Update the socket in the room
    if (disconnectionData.playerColor === 'white') {
      room.whitePlayer.socket = socket;
    } else {
      room.blackPlayer.socket = socket;
    }
    
    // Associate socket with player
    this.associateSocketWithPlayer(socket, playerId);
    
    console.log(`[${new Date().toISOString()}] ConnectionManager: Player ${playerId} successfully reconnected to room ${room.code}`);
    
    return { success: true, room: room, playerColor: disconnectionData.playerColor };
  }

  /**
   * Get the active game for a player
   * @param {string} playerId - The player's ID
   * @returns {object|null} The room object or null if not found
   */
  getActiveGame(playerId) {
    // Search through all rooms to find the one containing this player
    for (const room of this.roomManager.rooms.values()) {
      if (room.whitePlayer && room.whitePlayer.id === playerId) {
        return room;
      }
      if (room.blackPlayer && room.blackPlayer.id === playerId) {
        return room;
      }
    }
    return null;
  }

  /**
   * Check if a player is currently disconnected
   * @param {string} playerId - The player's ID
   * @returns {boolean} True if player is disconnected
   */
  isPlayerDisconnected(playerId) {
    return this.disconnectedPlayers.has(playerId);
  }

  /**
   * Get disconnection data for a player
   * @param {string} playerId - The player's ID
   * @returns {object|null} Disconnection data or null
   */
  getDisconnectionData(playerId) {
    return this.disconnectedPlayers.get(playerId) || null;
  }

  /**
   * Clean up all data for a player
   * @param {string} playerId - The player's ID
   */
  cleanupPlayer(playerId) {
    // Clear any timeout
    const disconnectionData = this.disconnectedPlayers.get(playerId);
    if (disconnectionData && disconnectionData.timeout) {
      clearTimeout(disconnectionData.timeout);
    }
    
    // Remove from disconnected players
    this.disconnectedPlayers.delete(playerId);
    
    // Remove socket associations
    const socketId = this.playerToSocket.get(playerId);
    if (socketId) {
      this.socketToPlayer.delete(socketId);
    }
    this.playerToSocket.delete(playerId);
    
    console.log(`[${new Date().toISOString()}] ConnectionManager: Cleaned up all data for player ${playerId}`);
  }

  /**
   * Clean up all data for a room
   * @param {string} roomCode - The room code
   */
  cleanupRoom(roomCode) {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) {
      return;
    }
    
    // Clean up both players
    if (room.whitePlayer) {
      this.cleanupPlayer(room.whitePlayer.id);
    }
    if (room.blackPlayer) {
      this.cleanupPlayer(room.blackPlayer.id);
    }
    
    console.log(`[${new Date().toISOString()}] ConnectionManager: Cleaned up all data for room ${roomCode}`);
  }
}

module.exports = ConnectionManager;
