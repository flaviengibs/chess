/**
 * Unit tests for RoomManager
 * Tests room creation, joining, matchmaking queue, and room code generation
 */

const RoomManager = require('../room-manager');

describe('RoomManager', () => {
  let roomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe('Constructor', () => {
    test('should initialize with empty rooms Map', () => {
      expect(roomManager.rooms).toBeInstanceOf(Map);
      expect(roomManager.rooms.size).toBe(0);
    });

    test('should initialize with empty matchmaking queue Array', () => {
      expect(Array.isArray(roomManager.matchmakingQueue)).toBe(true);
      expect(roomManager.matchmakingQueue.length).toBe(0);
    });
  });

  describe('generateRoomCode', () => {
    test('should generate a 6-character alphanumeric code', () => {
      const code = roomManager.generateRoomCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    test('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(roomManager.generateRoomCode());
      }
      // All 100 codes should be unique
      expect(codes.size).toBe(100);
    });

    test('should only use uppercase letters and numbers', () => {
      const code = roomManager.generateRoomCode();
      const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for (const char of code) {
        expect(validChars).toContain(char);
      }
    });

    test('should avoid collision by regenerating if code exists', () => {
      // Create a room to occupy a code
      const firstCode = roomManager.createRoom('player1', { username: 'Test', elo: 1200 });
      
      // Mock Math.random to return same value initially
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = jest.fn(() => {
        callCount++;
        // First call returns same pattern, second call returns different
        return callCount === 1 ? 0 : 0.5;
      });
      
      // This should detect collision and regenerate
      const secondCode = roomManager.generateRoomCode();
      
      // Restore Math.random
      Math.random = originalRandom;
      
      // Codes should be different
      expect(secondCode).not.toBe(firstCode);
    });
  });

  describe('createRoom', () => {
    test('should create a room with generated code', () => {
      const playerId = 'player123';
      const playerInfo = { username: 'Alice', elo: 1500 };
      
      const roomCode = roomManager.createRoom(playerId, playerInfo);
      
      expect(roomCode).toHaveLength(6);
      expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
    });

    test('should store room in rooms Map', () => {
      const playerId = 'player123';
      const playerInfo = { username: 'Alice', elo: 1500 };
      
      const roomCode = roomManager.createRoom(playerId, playerInfo);
      
      expect(roomManager.rooms.has(roomCode)).toBe(true);
    });

    test('should assign creator as white player', () => {
      const playerId = 'player123';
      const playerInfo = { username: 'Alice', elo: 1500 };
      
      const roomCode = roomManager.createRoom(playerId, playerInfo);
      const room = roomManager.rooms.get(roomCode);
      
      expect(room.whitePlayer).toEqual({
        id: playerId,
        username: playerInfo.username,
        elo: playerInfo.elo,
        socket: null
      });
    });

    test('should initialize blackPlayer as null', () => {
      const playerId = 'player123';
      const playerInfo = { username: 'Alice', elo: 1500 };
      
      const roomCode = roomManager.createRoom(playerId, playerInfo);
      const room = roomManager.rooms.get(roomCode);
      
      expect(room.blackPlayer).toBeNull();
    });

    test('should set room code in room object', () => {
      const playerId = 'player123';
      const playerInfo = { username: 'Alice', elo: 1500 };
      
      const roomCode = roomManager.createRoom(playerId, playerInfo);
      const room = roomManager.rooms.get(roomCode);
      
      expect(room.code).toBe(roomCode);
    });

    test('should initialize gameState as null', () => {
      const playerId = 'player123';
      const playerInfo = { username: 'Alice', elo: 1500 };
      
      const roomCode = roomManager.createRoom(playerId, playerInfo);
      const room = roomManager.rooms.get(roomCode);
      
      expect(room.gameState).toBeNull();
    });

    test('should set createdAt timestamp', () => {
      const playerId = 'player123';
      const playerInfo = { username: 'Alice', elo: 1500 };
      
      const before = Date.now();
      const roomCode = roomManager.createRoom(playerId, playerInfo);
      const after = Date.now();
      const room = roomManager.rooms.get(roomCode);
      
      expect(room.createdAt).toBeGreaterThanOrEqual(before);
      expect(room.createdAt).toBeLessThanOrEqual(after);
    });

    test('should set lastActivity timestamp', () => {
      const playerId = 'player123';
      const playerInfo = { username: 'Alice', elo: 1500 };
      
      const before = Date.now();
      const roomCode = roomManager.createRoom(playerId, playerInfo);
      const after = Date.now();
      const room = roomManager.rooms.get(roomCode);
      
      expect(room.lastActivity).toBeGreaterThanOrEqual(before);
      expect(room.lastActivity).toBeLessThanOrEqual(after);
    });
  });

  describe('getRoom', () => {
    test('should return room if it exists', () => {
      const playerId = 'player123';
      const playerInfo = { username: 'Alice', elo: 1500 };
      const roomCode = roomManager.createRoom(playerId, playerInfo);
      
      const room = roomManager.getRoom(roomCode);
      
      expect(room).not.toBeNull();
      expect(room.code).toBe(roomCode);
    });

    test('should return null if room does not exist', () => {
      const room = roomManager.getRoom('NONEXISTENT');
      
      expect(room).toBeNull();
    });
  });

  describe('removeRoom', () => {
    test('should remove room from storage', () => {
      const playerId = 'player123';
      const playerInfo = { username: 'Alice', elo: 1500 };
      const roomCode = roomManager.createRoom(playerId, playerInfo);
      
      expect(roomManager.rooms.has(roomCode)).toBe(true);
      
      roomManager.removeRoom(roomCode);
      
      expect(roomManager.rooms.has(roomCode)).toBe(false);
    });

    test('should not throw error if room does not exist', () => {
      expect(() => {
        roomManager.removeRoom('NONEXISTENT');
      }).not.toThrow();
    });
  });

  describe('joinRoom', () => {
    test('should return error if room does not exist', () => {
      const result = roomManager.joinRoom('NONEXISTENT', 'player456', { username: 'Bob', elo: 1400 });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });

    test('should return error if room is full', () => {
      const roomCode = roomManager.createRoom('player123', { username: 'Alice', elo: 1500 });
      roomManager.joinRoom(roomCode, 'player456', { username: 'Bob', elo: 1400 });
      
      const result = roomManager.joinRoom(roomCode, 'player789', { username: 'Charlie', elo: 1300 });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room is full');
    });

    test('should return error if player tries to join own room', () => {
      const playerId = 'player123';
      const roomCode = roomManager.createRoom(playerId, { username: 'Alice', elo: 1500 });
      
      const result = roomManager.joinRoom(roomCode, playerId, { username: 'Alice', elo: 1500 });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot join your own room');
    });

    test('should successfully add player as black player', () => {
      const roomCode = roomManager.createRoom('player123', { username: 'Alice', elo: 1500 });
      const playerId = 'player456';
      const playerInfo = { username: 'Bob', elo: 1400 };
      
      const result = roomManager.joinRoom(roomCode, playerId, playerInfo);
      
      expect(result.success).toBe(true);
      expect(result.room).toBeDefined();
      expect(result.room.blackPlayer).toEqual({
        id: playerId,
        username: playerInfo.username,
        elo: playerInfo.elo,
        socket: null
      });
    });

    test('should update lastActivity timestamp on join', () => {
      const roomCode = roomManager.createRoom('player123', { username: 'Alice', elo: 1500 });
      const room = roomManager.getRoom(roomCode);
      const originalActivity = room.lastActivity;
      
      // Wait a bit to ensure timestamp changes
      const before = Date.now();
      const result = roomManager.joinRoom(roomCode, 'player456', { username: 'Bob', elo: 1400 });
      const after = Date.now();
      
      expect(result.room.lastActivity).toBeGreaterThanOrEqual(before);
      expect(result.room.lastActivity).toBeLessThanOrEqual(after);
      expect(result.room.lastActivity).toBeGreaterThanOrEqual(originalActivity);
    });
  });

  describe('addToMatchmaking', () => {
    test('should add player to matchmaking queue', () => {
      const playerId = 'player123';
      const playerInfo = { username: 'Alice', elo: 1500 };
      const socket = { id: 'socket123' };
      
      roomManager.addToMatchmaking(playerId, playerInfo, socket);
      
      expect(roomManager.matchmakingQueue.length).toBe(1);
      expect(roomManager.matchmakingQueue[0]).toEqual({
        playerId,
        playerInfo,
        socket,
        timestamp: expect.any(Number)
      });
    });

    test('should update existing entry if player already in queue', () => {
      const playerId = 'player123';
      const playerInfo1 = { username: 'Alice', elo: 1500 };
      const playerInfo2 = { username: 'Alice', elo: 1600 };
      const socket1 = { id: 'socket123' };
      const socket2 = { id: 'socket456' };
      
      roomManager.addToMatchmaking(playerId, playerInfo1, socket1);
      roomManager.addToMatchmaking(playerId, playerInfo2, socket2);
      
      expect(roomManager.matchmakingQueue.length).toBe(1);
      expect(roomManager.matchmakingQueue[0].playerInfo.elo).toBe(1600);
      expect(roomManager.matchmakingQueue[0].socket.id).toBe('socket456');
    });

    test('should set timestamp when adding to queue', () => {
      const playerId = 'player123';
      const playerInfo = { username: 'Alice', elo: 1500 };
      const socket = { id: 'socket123' };
      
      const before = Date.now();
      roomManager.addToMatchmaking(playerId, playerInfo, socket);
      const after = Date.now();
      
      expect(roomManager.matchmakingQueue[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(roomManager.matchmakingQueue[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('removeFromMatchmaking', () => {
    test('should remove player from matchmaking queue', () => {
      const playerId = 'player123';
      const playerInfo = { username: 'Alice', elo: 1500 };
      const socket = { id: 'socket123' };
      
      roomManager.addToMatchmaking(playerId, playerInfo, socket);
      expect(roomManager.matchmakingQueue.length).toBe(1);
      
      roomManager.removeFromMatchmaking(playerId);
      expect(roomManager.matchmakingQueue.length).toBe(0);
    });

    test('should not affect other players in queue', () => {
      roomManager.addToMatchmaking('player1', { username: 'Alice', elo: 1500 }, { id: 'socket1' });
      roomManager.addToMatchmaking('player2', { username: 'Bob', elo: 1400 }, { id: 'socket2' });
      roomManager.addToMatchmaking('player3', { username: 'Charlie', elo: 1300 }, { id: 'socket3' });
      
      roomManager.removeFromMatchmaking('player2');
      
      expect(roomManager.matchmakingQueue.length).toBe(2);
      expect(roomManager.matchmakingQueue[0].playerId).toBe('player1');
      expect(roomManager.matchmakingQueue[1].playerId).toBe('player3');
    });

    test('should not throw error if player not in queue', () => {
      expect(() => {
        roomManager.removeFromMatchmaking('nonexistent');
      }).not.toThrow();
    });
  });

  describe('findMatch', () => {
    test('should return null if less than 2 players in queue', () => {
      roomManager.addToMatchmaking('player1', { username: 'Alice', elo: 1500 }, { id: 'socket1' });
      
      const match = roomManager.findMatch();
      
      expect(match).toBeNull();
    });

    test('should return null if queue is empty', () => {
      const match = roomManager.findMatch();
      
      expect(match).toBeNull();
    });

    test('should match first two players in queue', () => {
      roomManager.addToMatchmaking('player1', { username: 'Alice', elo: 1500 }, { id: 'socket1' });
      roomManager.addToMatchmaking('player2', { username: 'Bob', elo: 1400 }, { id: 'socket2' });
      roomManager.addToMatchmaking('player3', { username: 'Charlie', elo: 1300 }, { id: 'socket3' });
      
      const match = roomManager.findMatch();
      
      expect(match).not.toBeNull();
      expect(match.player1.playerId).toBe('player1');
      expect(match.player2.playerId).toBe('player2');
    });

    test('should remove matched players from queue', () => {
      roomManager.addToMatchmaking('player1', { username: 'Alice', elo: 1500 }, { id: 'socket1' });
      roomManager.addToMatchmaking('player2', { username: 'Bob', elo: 1400 }, { id: 'socket2' });
      roomManager.addToMatchmaking('player3', { username: 'Charlie', elo: 1300 }, { id: 'socket3' });
      
      roomManager.findMatch();
      
      expect(roomManager.matchmakingQueue.length).toBe(1);
      expect(roomManager.matchmakingQueue[0].playerId).toBe('player3');
    });

    test('should create a room for the match', () => {
      roomManager.addToMatchmaking('player1', { username: 'Alice', elo: 1500 }, { id: 'socket1' });
      roomManager.addToMatchmaking('player2', { username: 'Bob', elo: 1400 }, { id: 'socket2' });
      
      const match = roomManager.findMatch();
      
      expect(match.roomCode).toBeDefined();
      expect(match.roomCode).toHaveLength(6);
      expect(roomManager.rooms.has(match.roomCode)).toBe(true);
    });

    test('should assign player1 as white and player2 as black', () => {
      roomManager.addToMatchmaking('player1', { username: 'Alice', elo: 1500 }, { id: 'socket1' });
      roomManager.addToMatchmaking('player2', { username: 'Bob', elo: 1400 }, { id: 'socket2' });
      
      const match = roomManager.findMatch();
      const room = roomManager.getRoom(match.roomCode);
      
      expect(room.whitePlayer.id).toBe('player1');
      expect(room.whitePlayer.username).toBe('Alice');
      expect(room.blackPlayer.id).toBe('player2');
      expect(room.blackPlayer.username).toBe('Bob');
    });

    test('should include room in match result', () => {
      roomManager.addToMatchmaking('player1', { username: 'Alice', elo: 1500 }, { id: 'socket1' });
      roomManager.addToMatchmaking('player2', { username: 'Bob', elo: 1400 }, { id: 'socket2' });
      
      const match = roomManager.findMatch();
      
      expect(match.room).toBeDefined();
      expect(match.room.code).toBe(match.roomCode);
      expect(match.room.whitePlayer.id).toBe('player1');
      expect(match.room.blackPlayer.id).toBe('player2');
    });
  });
});
