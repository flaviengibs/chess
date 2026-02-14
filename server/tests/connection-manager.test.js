/**
 * Unit tests for ConnectionManager
 * Tests connection handling, disconnection, and reconnection logic
 */

const ConnectionManager = require('../connection-manager');
const RoomManager = require('../room-manager');

describe('ConnectionManager', () => {
  let connectionManager;
  let roomManager;
  let mockSocket;
  let mockSocket2;

  beforeEach(() => {
    roomManager = new RoomManager();
    connectionManager = new ConnectionManager(roomManager);
    
    // Create mock sockets
    mockSocket = {
      id: 'socket-123',
      emit: jest.fn(),
      on: jest.fn()
    };
    
    mockSocket2 = {
      id: 'socket-456',
      emit: jest.fn(),
      on: jest.fn()
    };
  });

  afterEach(() => {
    // Clear any pending timeouts
    jest.clearAllTimers();
  });

  describe('handleConnection', () => {
    test('should handle new socket connection', () => {
      connectionManager.handleConnection(mockSocket);
      // Connection is logged but no associations are made yet
      expect(mockSocket.id).toBe('socket-123');
    });
  });

  describe('associateSocketWithPlayer', () => {
    test('should associate socket with player ID', () => {
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      
      expect(connectionManager.getPlayerIdFromSocket(mockSocket)).toBe('player1');
      expect(connectionManager.getSocketIdFromPlayer('player1')).toBe('socket-123');
    });

    test('should replace existing socket for same player', () => {
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      connectionManager.associateSocketWithPlayer(mockSocket2, 'player1');
      
      expect(connectionManager.getPlayerIdFromSocket(mockSocket)).toBeNull();
      expect(connectionManager.getPlayerIdFromSocket(mockSocket2)).toBe('player1');
      expect(connectionManager.getSocketIdFromPlayer('player1')).toBe('socket-456');
    });

    test('should replace existing player for same socket', () => {
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      connectionManager.associateSocketWithPlayer(mockSocket, 'player2');
      
      expect(connectionManager.getPlayerIdFromSocket(mockSocket)).toBe('player2');
      expect(connectionManager.getSocketIdFromPlayer('player1')).toBeNull();
      expect(connectionManager.getSocketIdFromPlayer('player2')).toBe('socket-123');
    });
  });

  describe('getPlayerIdFromSocket', () => {
    test('should return player ID for associated socket', () => {
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      expect(connectionManager.getPlayerIdFromSocket(mockSocket)).toBe('player1');
    });

    test('should return null for unassociated socket', () => {
      expect(connectionManager.getPlayerIdFromSocket(mockSocket)).toBeNull();
    });
  });

  describe('getSocketIdFromPlayer', () => {
    test('should return socket ID for associated player', () => {
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      expect(connectionManager.getSocketIdFromPlayer('player1')).toBe('socket-123');
    });

    test('should return null for unassociated player', () => {
      expect(connectionManager.getSocketIdFromPlayer('player1')).toBeNull();
    });
  });

  describe('handleDisconnection', () => {
    test('should handle disconnection for unassociated socket', () => {
      connectionManager.handleDisconnection(mockSocket);
      // Should not throw error
      expect(connectionManager.getPlayerIdFromSocket(mockSocket)).toBeNull();
    });

    test('should handle disconnection for player not in game', () => {
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      connectionManager.handleDisconnection(mockSocket);
      
      expect(connectionManager.getPlayerIdFromSocket(mockSocket)).toBeNull();
      expect(connectionManager.isPlayerDisconnected('player1')).toBe(false);
    });

    test('should store disconnection data for player in active game', () => {
      jest.useFakeTimers();
      
      // Create a room with two players
      const roomCode = roomManager.createRoom('player1', { username: 'Alice', elo: 1200 });
      roomManager.joinRoom(roomCode, 'player2', { username: 'Bob', elo: 1300 });
      
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      
      const onTimeout = jest.fn();
      connectionManager.handleDisconnection(mockSocket, onTimeout);
      
      expect(connectionManager.isPlayerDisconnected('player1')).toBe(true);
      expect(connectionManager.getPlayerIdFromSocket(mockSocket)).toBeNull();
      
      const disconnectionData = connectionManager.getDisconnectionData('player1');
      expect(disconnectionData).toBeTruthy();
      expect(disconnectionData.roomCode).toBe(roomCode);
      expect(disconnectionData.playerColor).toBe('white');
      
      jest.clearAllTimers();
    });

    test('should call timeout callback after 60 seconds', () => {
      jest.useFakeTimers();
      
      // Create a room with two players
      const roomCode = roomManager.createRoom('player1', { username: 'Alice', elo: 1200 });
      roomManager.joinRoom(roomCode, 'player2', { username: 'Bob', elo: 1300 });
      
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      
      const onTimeout = jest.fn();
      connectionManager.handleDisconnection(mockSocket, onTimeout);
      
      // Fast-forward time by 60 seconds
      jest.advanceTimersByTime(60000);
      
      expect(onTimeout).toHaveBeenCalledWith(roomCode, 'player1', 'white');
      expect(connectionManager.isPlayerDisconnected('player1')).toBe(false);
      
      jest.useRealTimers();
    });

    test('should identify correct player color on disconnection', () => {
      jest.useFakeTimers();
      
      // Create a room with two players
      const roomCode = roomManager.createRoom('player1', { username: 'Alice', elo: 1200 });
      roomManager.joinRoom(roomCode, 'player2', { username: 'Bob', elo: 1300 });
      
      connectionManager.associateSocketWithPlayer(mockSocket2, 'player2');
      
      const onTimeout = jest.fn();
      connectionManager.handleDisconnection(mockSocket2, onTimeout);
      
      const disconnectionData = connectionManager.getDisconnectionData('player2');
      expect(disconnectionData.playerColor).toBe('black');
      
      jest.clearAllTimers();
    });

    test('should remove player from matchmaking queue on disconnection', () => {
      roomManager.addToMatchmaking('player1', { username: 'Alice', elo: 1200 }, mockSocket);
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      
      expect(roomManager.matchmakingQueue.length).toBe(1);
      
      connectionManager.handleDisconnection(mockSocket);
      
      expect(roomManager.matchmakingQueue.length).toBe(0);
    });
  });

  describe('handleReconnection', () => {
    test('should fail reconnection if no disconnection data exists', () => {
      const result = connectionManager.handleReconnection(mockSocket, 'player1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No active game session found');
    });

    test('should fail reconnection if room no longer exists', () => {
      jest.useFakeTimers();
      
      // Create a room and disconnect player
      const roomCode = roomManager.createRoom('player1', { username: 'Alice', elo: 1200 });
      roomManager.joinRoom(roomCode, 'player2', { username: 'Bob', elo: 1300 });
      
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      connectionManager.handleDisconnection(mockSocket);
      
      // Remove the room
      roomManager.removeRoom(roomCode);
      
      // Try to reconnect
      const result = connectionManager.handleReconnection(mockSocket2, 'player1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Game session no longer exists');
      
      jest.clearAllTimers();
    });

    test('should successfully reconnect player within timeout', () => {
      jest.useFakeTimers();
      
      // Create a room and disconnect player
      const roomCode = roomManager.createRoom('player1', { username: 'Alice', elo: 1200 });
      roomManager.joinRoom(roomCode, 'player2', { username: 'Bob', elo: 1300 });
      
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      
      const onTimeout = jest.fn();
      connectionManager.handleDisconnection(mockSocket, onTimeout);
      
      // Reconnect with new socket
      const result = connectionManager.handleReconnection(mockSocket2, 'player1');
      
      expect(result.success).toBe(true);
      expect(result.room.code).toBe(roomCode);
      expect(result.playerColor).toBe('white');
      expect(connectionManager.isPlayerDisconnected('player1')).toBe(false);
      expect(connectionManager.getPlayerIdFromSocket(mockSocket2)).toBe('player1');
      
      // Timeout should not fire
      jest.advanceTimersByTime(60000);
      expect(onTimeout).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    test('should update socket in room on reconnection', () => {
      jest.useFakeTimers();
      
      // Create a room and disconnect player
      const roomCode = roomManager.createRoom('player1', { username: 'Alice', elo: 1200 });
      roomManager.joinRoom(roomCode, 'player2', { username: 'Bob', elo: 1300 });
      
      const room = roomManager.getRoom(roomCode);
      room.whitePlayer.socket = mockSocket;
      
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      connectionManager.handleDisconnection(mockSocket);
      
      // Reconnect with new socket
      connectionManager.handleReconnection(mockSocket2, 'player1');
      
      const updatedRoom = roomManager.getRoom(roomCode);
      expect(updatedRoom.whitePlayer.socket).toBe(mockSocket2);
      
      jest.clearAllTimers();
    });

    test('should handle black player reconnection', () => {
      jest.useFakeTimers();
      
      // Create a room and disconnect black player
      const roomCode = roomManager.createRoom('player1', { username: 'Alice', elo: 1200 });
      roomManager.joinRoom(roomCode, 'player2', { username: 'Bob', elo: 1300 });
      
      const room = roomManager.getRoom(roomCode);
      room.blackPlayer.socket = mockSocket;
      
      connectionManager.associateSocketWithPlayer(mockSocket, 'player2');
      connectionManager.handleDisconnection(mockSocket);
      
      // Reconnect with new socket
      const result = connectionManager.handleReconnection(mockSocket2, 'player2');
      
      expect(result.success).toBe(true);
      expect(result.playerColor).toBe('black');
      
      const updatedRoom = roomManager.getRoom(roomCode);
      expect(updatedRoom.blackPlayer.socket).toBe(mockSocket2);
      
      jest.clearAllTimers();
    });
  });

  describe('getActiveGame', () => {
    test('should return null if player not in any game', () => {
      expect(connectionManager.getActiveGame('player1')).toBeNull();
    });

    test('should return room for white player', () => {
      const roomCode = roomManager.createRoom('player1', { username: 'Alice', elo: 1200 });
      const room = connectionManager.getActiveGame('player1');
      
      expect(room).toBeTruthy();
      expect(room.code).toBe(roomCode);
    });

    test('should return room for black player', () => {
      const roomCode = roomManager.createRoom('player1', { username: 'Alice', elo: 1200 });
      roomManager.joinRoom(roomCode, 'player2', { username: 'Bob', elo: 1300 });
      
      const room = connectionManager.getActiveGame('player2');
      
      expect(room).toBeTruthy();
      expect(room.code).toBe(roomCode);
    });
  });

  describe('isPlayerDisconnected', () => {
    test('should return false for connected player', () => {
      expect(connectionManager.isPlayerDisconnected('player1')).toBe(false);
    });

    test('should return true for disconnected player', () => {
      jest.useFakeTimers();
      
      const roomCode = roomManager.createRoom('player1', { username: 'Alice', elo: 1200 });
      roomManager.joinRoom(roomCode, 'player2', { username: 'Bob', elo: 1300 });
      
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      connectionManager.handleDisconnection(mockSocket);
      
      expect(connectionManager.isPlayerDisconnected('player1')).toBe(true);
      
      jest.clearAllTimers();
    });
  });

  describe('cleanupPlayer', () => {
    test('should clean up all player data', () => {
      jest.useFakeTimers();
      
      const roomCode = roomManager.createRoom('player1', { username: 'Alice', elo: 1200 });
      roomManager.joinRoom(roomCode, 'player2', { username: 'Bob', elo: 1300 });
      
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      
      const onTimeout = jest.fn();
      connectionManager.handleDisconnection(mockSocket, onTimeout);
      
      expect(connectionManager.isPlayerDisconnected('player1')).toBe(true);
      
      connectionManager.cleanupPlayer('player1');
      
      expect(connectionManager.isPlayerDisconnected('player1')).toBe(false);
      expect(connectionManager.getSocketIdFromPlayer('player1')).toBeNull();
      
      // Timeout should not fire after cleanup
      jest.advanceTimersByTime(60000);
      expect(onTimeout).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('cleanupRoom', () => {
    test('should clean up all players in room', () => {
      jest.useFakeTimers();
      
      const roomCode = roomManager.createRoom('player1', { username: 'Alice', elo: 1200 });
      roomManager.joinRoom(roomCode, 'player2', { username: 'Bob', elo: 1300 });
      
      connectionManager.associateSocketWithPlayer(mockSocket, 'player1');
      connectionManager.associateSocketWithPlayer(mockSocket2, 'player2');
      
      connectionManager.cleanupRoom(roomCode);
      
      expect(connectionManager.getSocketIdFromPlayer('player1')).toBeNull();
      expect(connectionManager.getSocketIdFromPlayer('player2')).toBeNull();
      
      jest.clearAllTimers();
    });

    test('should handle cleanup for non-existent room', () => {
      connectionManager.cleanupRoom('INVALID');
      // Should not throw error
    });
  });
});
