/**
 * Property-based tests for ConnectionManager
 * Tests universal properties that should hold across all scenarios
 * 
 * Feature: real-multiplayer-socketio
 * Requirements: 1.4, 9.2, 9.3, 9.6
 */

const fc = require('fast-check');
const ConnectionManager = require('../connection-manager');
const RoomManager = require('../room-manager');

describe('ConnectionManager - Property-Based Tests', () => {
  let connectionManager;
  let roomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
    connectionManager = new ConnectionManager(roomManager);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  /**
   * Feature: real-multiplayer-socketio, Property 35: Game state preservation on disconnection
   * 
   * For any player disconnection during an active game, the server should preserve 
   * the game state for 60 seconds
   * 
   * **Validates: Requirements 9.2**
   */
  describe('Property 35: Game state preservation on disconnection', () => {
    test('should preserve game state for 60 seconds after any player disconnection', () => {
      jest.useFakeTimers();

      fc.assert(
        fc.property(
          // Generate player IDs and usernames
          fc.record({
            player1Id: fc.string({ minLength: 5, maxLength: 20 }),
            player2Id: fc.string({ minLength: 5, maxLength: 20 }),
            player1Name: fc.string({ minLength: 3, maxLength: 15 }),
            player2Name: fc.string({ minLength: 3, maxLength: 15 }),
            player1Elo: fc.integer({ min: 800, max: 2800 }),
            player2Elo: fc.integer({ min: 800, max: 2800 }),
            disconnectPlayer: fc.constantFrom('white', 'black'),
            timeBeforeCheck: fc.integer({ min: 0, max: 59999 }) // Time less than 60 seconds
          }),
          ({ player1Id, player2Id, player1Name, player2Name, player1Elo, player2Elo, disconnectPlayer, timeBeforeCheck }) => {
            // Skip if player IDs are the same
            fc.pre(player1Id !== player2Id);

            // Create a room with two players
            const roomCode = roomManager.createRoom(player1Id, { username: player1Name, elo: player1Elo });
            roomManager.joinRoom(roomCode, player2Id, { username: player2Name, elo: player2Elo });

            // Create mock sockets
            const socket1 = { id: `socket-${player1Id}`, emit: jest.fn() };
            const socket2 = { id: `socket-${player2Id}`, emit: jest.fn() };

            // Associate sockets with players
            connectionManager.associateSocketWithPlayer(socket1, player1Id);
            connectionManager.associateSocketWithPlayer(socket2, player2Id);

            // Disconnect the specified player
            const disconnectingPlayerId = disconnectPlayer === 'white' ? player1Id : player2Id;
            const disconnectingSocket = disconnectPlayer === 'white' ? socket1 : socket2;

            const onTimeout = jest.fn();
            connectionManager.handleDisconnection(disconnectingSocket, onTimeout);

            // Verify disconnection data is stored
            expect(connectionManager.isPlayerDisconnected(disconnectingPlayerId)).toBe(true);
            const disconnectionData = connectionManager.getDisconnectionData(disconnectingPlayerId);
            expect(disconnectionData).toBeTruthy();
            expect(disconnectionData.roomCode).toBe(roomCode);

            // Advance time but stay within 60 seconds
            jest.advanceTimersByTime(timeBeforeCheck);

            // Game state should still be preserved
            expect(connectionManager.isPlayerDisconnected(disconnectingPlayerId)).toBe(true);
            expect(connectionManager.getDisconnectionData(disconnectingPlayerId)).toBeTruthy();
            expect(roomManager.getRoom(roomCode)).toBeTruthy();

            // Timeout callback should not have been called yet
            expect(onTimeout).not.toHaveBeenCalled();

            jest.clearAllTimers();
          }
        ),
        { numRuns: 5 }
      );

      jest.useRealTimers();
    });
  });

  /**
   * Feature: real-multiplayer-socketio, Property 36: Timeout victory
   * 
   * For any player who does not reconnect within 60 seconds, the server should 
   * end the game and award victory to the connected player
   * 
   * **Validates: Requirements 9.6**
   */
  describe('Property 36: Timeout victory', () => {
    test('should call timeout callback after 60 seconds for any disconnected player', () => {
      jest.useFakeTimers();

      fc.assert(
        fc.property(
          // Generate player IDs and usernames
          fc.record({
            player1Id: fc.string({ minLength: 5, maxLength: 20 }),
            player2Id: fc.string({ minLength: 5, maxLength: 20 }),
            player1Name: fc.string({ minLength: 3, maxLength: 15 }),
            player2Name: fc.string({ minLength: 3, maxLength: 15 }),
            player1Elo: fc.integer({ min: 800, max: 2800 }),
            player2Elo: fc.integer({ min: 800, max: 2800 }),
            disconnectPlayer: fc.constantFrom('white', 'black')
          }),
          ({ player1Id, player2Id, player1Name, player2Name, player1Elo, player2Elo, disconnectPlayer }) => {
            // Skip if player IDs are the same
            fc.pre(player1Id !== player2Id);

            // Create a room with two players
            const roomCode = roomManager.createRoom(player1Id, { username: player1Name, elo: player1Elo });
            roomManager.joinRoom(roomCode, player2Id, { username: player2Name, elo: player2Elo });

            // Create mock sockets
            const socket1 = { id: `socket-${player1Id}`, emit: jest.fn() };
            const socket2 = { id: `socket-${player2Id}`, emit: jest.fn() };

            // Associate sockets with players
            connectionManager.associateSocketWithPlayer(socket1, player1Id);
            connectionManager.associateSocketWithPlayer(socket2, player2Id);

            // Disconnect the specified player
            const disconnectingPlayerId = disconnectPlayer === 'white' ? player1Id : player2Id;
            const disconnectingSocket = disconnectPlayer === 'white' ? socket1 : socket2;
            const expectedColor = disconnectPlayer;

            const onTimeout = jest.fn();
            connectionManager.handleDisconnection(disconnectingSocket, onTimeout);

            // Advance time by exactly 60 seconds
            jest.advanceTimersByTime(60000);

            // Timeout callback should have been called with correct parameters
            expect(onTimeout).toHaveBeenCalledTimes(1);
            expect(onTimeout).toHaveBeenCalledWith(roomCode, disconnectingPlayerId, expectedColor);

            // Disconnection data should be cleaned up
            expect(connectionManager.isPlayerDisconnected(disconnectingPlayerId)).toBe(false);

            jest.clearAllTimers();
          }
        ),
        { numRuns: 5 }
      );

      jest.useRealTimers();
    });

    test('should not call timeout if player reconnects before 60 seconds', () => {
      jest.useFakeTimers();

      fc.assert(
        fc.property(
          // Generate player IDs and usernames
          fc.record({
            player1Id: fc.string({ minLength: 5, maxLength: 20 }),
            player2Id: fc.string({ minLength: 5, maxLength: 20 }),
            player1Name: fc.string({ minLength: 3, maxLength: 15 }),
            player2Name: fc.string({ minLength: 3, maxLength: 15 }),
            player1Elo: fc.integer({ min: 800, max: 2800 }),
            player2Elo: fc.integer({ min: 800, max: 2800 }),
            disconnectPlayer: fc.constantFrom('white', 'black'),
            reconnectTime: fc.integer({ min: 0, max: 59999 }) // Reconnect before 60 seconds
          }),
          ({ player1Id, player2Id, player1Name, player2Name, player1Elo, player2Elo, disconnectPlayer, reconnectTime }) => {
            // Skip if player IDs are the same
            fc.pre(player1Id !== player2Id);

            // Create a room with two players
            const roomCode = roomManager.createRoom(player1Id, { username: player1Name, elo: player1Elo });
            roomManager.joinRoom(roomCode, player2Id, { username: player2Name, elo: player2Elo });

            // Create mock sockets
            const socket1 = { id: `socket-${player1Id}`, emit: jest.fn() };
            const socket2 = { id: `socket-${player2Id}`, emit: jest.fn() };
            const newSocket = { id: `socket-new-${player1Id}`, emit: jest.fn() };

            // Associate sockets with players
            connectionManager.associateSocketWithPlayer(socket1, player1Id);
            connectionManager.associateSocketWithPlayer(socket2, player2Id);

            // Disconnect the specified player
            const disconnectingPlayerId = disconnectPlayer === 'white' ? player1Id : player2Id;
            const disconnectingSocket = disconnectPlayer === 'white' ? socket1 : socket2;

            const onTimeout = jest.fn();
            connectionManager.handleDisconnection(disconnectingSocket, onTimeout);

            // Advance time but stay within 60 seconds
            jest.advanceTimersByTime(reconnectTime);

            // Reconnect the player
            const result = connectionManager.handleReconnection(newSocket, disconnectingPlayerId);
            expect(result.success).toBe(true);

            // Advance time past 60 seconds total
            jest.advanceTimersByTime(60000 - reconnectTime + 1000);

            // Timeout callback should NOT have been called
            expect(onTimeout).not.toHaveBeenCalled();

            jest.clearAllTimers();
          }
        ),
        { numRuns: 5 }
      );

      jest.useRealTimers();
    });
  });

  /**
   * Feature: real-multiplayer-socketio, Property 2: Game session restoration on reconnection
   * 
   * For any active game session, if the player reconnects within the timeout period, 
   * the client should restore the complete game state including board position, turn, 
   * and player information
   * 
   * **Validates: Requirements 1.5, 9.3, 9.4, 9.5**
   */
  describe('Property 2: Game session restoration on reconnection', () => {
    test('should restore game session for any player reconnecting within timeout', () => {
      jest.useFakeTimers();

      fc.assert(
        fc.property(
          // Generate player IDs and usernames
          fc.record({
            player1Id: fc.string({ minLength: 5, maxLength: 20 }),
            player2Id: fc.string({ minLength: 5, maxLength: 20 }),
            player1Name: fc.string({ minLength: 3, maxLength: 15 }),
            player2Name: fc.string({ minLength: 3, maxLength: 15 }),
            player1Elo: fc.integer({ min: 800, max: 2800 }),
            player2Elo: fc.integer({ min: 800, max: 2800 }),
            disconnectPlayer: fc.constantFrom('white', 'black'),
            reconnectTime: fc.integer({ min: 0, max: 59999 }) // Reconnect before 60 seconds
          }),
          ({ player1Id, player2Id, player1Name, player2Name, player1Elo, player2Elo, disconnectPlayer, reconnectTime }) => {
            // Skip if player IDs are the same
            fc.pre(player1Id !== player2Id);

            // Create a room with two players
            const roomCode = roomManager.createRoom(player1Id, { username: player1Name, elo: player1Elo });
            roomManager.joinRoom(roomCode, player2Id, { username: player2Name, elo: player2Elo });

            // Get the room to verify game state
            const originalRoom = roomManager.getRoom(roomCode);
            expect(originalRoom).toBeTruthy();

            // Create mock sockets
            const socket1 = { id: `socket-${player1Id}`, emit: jest.fn() };
            const socket2 = { id: `socket-${player2Id}`, emit: jest.fn() };
            const newSocket = { id: `socket-new-${player1Id}`, emit: jest.fn() };

            // Associate sockets with players
            connectionManager.associateSocketWithPlayer(socket1, player1Id);
            connectionManager.associateSocketWithPlayer(socket2, player2Id);

            // Disconnect the specified player
            const disconnectingPlayerId = disconnectPlayer === 'white' ? player1Id : player2Id;
            const disconnectingSocket = disconnectPlayer === 'white' ? socket1 : socket2;
            const expectedColor = disconnectPlayer;

            connectionManager.handleDisconnection(disconnectingSocket);

            // Advance time but stay within 60 seconds
            jest.advanceTimersByTime(reconnectTime);

            // Reconnect the player
            const result = connectionManager.handleReconnection(newSocket, disconnectingPlayerId);

            // Verify successful reconnection
            expect(result.success).toBe(true);
            expect(result.room).toBeTruthy();
            expect(result.room.code).toBe(roomCode);
            expect(result.playerColor).toBe(expectedColor);

            // Verify game state is preserved
            expect(result.room.whitePlayer.id).toBe(player1Id);
            expect(result.room.whitePlayer.username).toBe(player1Name);
            expect(result.room.whitePlayer.elo).toBe(player1Elo);
            expect(result.room.blackPlayer.id).toBe(player2Id);
            expect(result.room.blackPlayer.username).toBe(player2Name);
            expect(result.room.blackPlayer.elo).toBe(player2Elo);

            // Verify socket is updated in the room
            if (expectedColor === 'white') {
              expect(result.room.whitePlayer.socket).toBe(newSocket);
            } else {
              expect(result.room.blackPlayer.socket).toBe(newSocket);
            }

            // Verify player is no longer marked as disconnected
            expect(connectionManager.isPlayerDisconnected(disconnectingPlayerId)).toBe(false);

            // Verify socket associations are updated
            expect(connectionManager.getPlayerIdFromSocket(newSocket)).toBe(disconnectingPlayerId);
            expect(connectionManager.getSocketIdFromPlayer(disconnectingPlayerId)).toBe(newSocket.id);

            jest.clearAllTimers();
          }
        ),
        { numRuns: 5 }
      );

      jest.useRealTimers();
    });

    test('should fail to restore session if reconnecting after timeout', () => {
      jest.useFakeTimers();

      fc.assert(
        fc.property(
          // Generate player IDs and usernames
          fc.record({
            player1Id: fc.string({ minLength: 5, maxLength: 20 }),
            player2Id: fc.string({ minLength: 5, maxLength: 20 }),
            player1Name: fc.string({ minLength: 3, maxLength: 15 }),
            player2Name: fc.string({ minLength: 3, maxLength: 15 }),
            player1Elo: fc.integer({ min: 800, max: 2800 }),
            player2Elo: fc.integer({ min: 800, max: 2800 }),
            disconnectPlayer: fc.constantFrom('white', 'black')
          }),
          ({ player1Id, player2Id, player1Name, player2Name, player1Elo, player2Elo, disconnectPlayer }) => {
            // Skip if player IDs are the same
            fc.pre(player1Id !== player2Id);

            // Create a room with two players
            const roomCode = roomManager.createRoom(player1Id, { username: player1Name, elo: player1Elo });
            roomManager.joinRoom(roomCode, player2Id, { username: player2Name, elo: player2Elo });

            // Create mock sockets
            const socket1 = { id: `socket-${player1Id}`, emit: jest.fn() };
            const socket2 = { id: `socket-${player2Id}`, emit: jest.fn() };
            const newSocket = { id: `socket-new-${player1Id}`, emit: jest.fn() };

            // Associate sockets with players
            connectionManager.associateSocketWithPlayer(socket1, player1Id);
            connectionManager.associateSocketWithPlayer(socket2, player2Id);

            // Disconnect the specified player
            const disconnectingPlayerId = disconnectPlayer === 'white' ? player1Id : player2Id;
            const disconnectingSocket = disconnectPlayer === 'white' ? socket1 : socket2;

            connectionManager.handleDisconnection(disconnectingSocket);

            // Advance time past 60 seconds
            jest.advanceTimersByTime(60000);

            // Try to reconnect after timeout
            const result = connectionManager.handleReconnection(newSocket, disconnectingPlayerId);

            // Reconnection should fail
            expect(result.success).toBe(false);
            expect(result.error).toBeTruthy();

            jest.clearAllTimers();
          }
        ),
        { numRuns: 5 }
      );

      jest.useRealTimers();
    });
  });

  /**
   * Feature: real-multiplayer-socketio, Property 1: Automatic reconnection on disconnection
   * 
   * For any socket disconnection event, the client should attempt to reconnect automatically
   * 
   * Note: This property tests the server-side handling that enables reconnection.
   * The actual client-side reconnection behavior is tested in client tests.
   * 
   * **Validates: Requirements 1.4**
   */
  describe('Property 1: Automatic reconnection on disconnection (server-side support)', () => {
    test('should maintain reconnection capability for any disconnected player', () => {
      jest.useFakeTimers();

      fc.assert(
        fc.property(
          // Generate player IDs and usernames
          fc.record({
            player1Id: fc.string({ minLength: 5, maxLength: 20 }),
            player2Id: fc.string({ minLength: 5, maxLength: 20 }),
            player1Name: fc.string({ minLength: 3, maxLength: 15 }),
            player2Name: fc.string({ minLength: 3, maxLength: 15 }),
            player1Elo: fc.integer({ min: 800, max: 2800 }),
            player2Elo: fc.integer({ min: 800, max: 2800 }),
            disconnectPlayer: fc.constantFrom('white', 'black')
          }),
          ({ player1Id, player2Id, player1Name, player2Name, player1Elo, player2Elo, disconnectPlayer }) => {
            // Skip if player IDs are the same
            fc.pre(player1Id !== player2Id);

            // Create a room with two players
            const roomCode = roomManager.createRoom(player1Id, { username: player1Name, elo: player1Elo });
            roomManager.joinRoom(roomCode, player2Id, { username: player2Name, elo: player2Elo });

            // Create mock sockets
            const socket1 = { id: `socket-${player1Id}`, emit: jest.fn() };
            const socket2 = { id: `socket-${player2Id}`, emit: jest.fn() };

            // Associate sockets with players
            connectionManager.associateSocketWithPlayer(socket1, player1Id);
            connectionManager.associateSocketWithPlayer(socket2, player2Id);

            // Disconnect the specified player
            const disconnectingPlayerId = disconnectPlayer === 'white' ? player1Id : player2Id;
            const disconnectingSocket = disconnectPlayer === 'white' ? socket1 : socket2;

            connectionManager.handleDisconnection(disconnectingSocket);

            // Verify server maintains reconnection capability
            // 1. Disconnection data is stored
            expect(connectionManager.isPlayerDisconnected(disconnectingPlayerId)).toBe(true);
            
            // 2. Disconnection data contains room information
            const disconnectionData = connectionManager.getDisconnectionData(disconnectingPlayerId);
            expect(disconnectionData).toBeTruthy();
            expect(disconnectionData.roomCode).toBe(roomCode);
            expect(disconnectionData.playerColor).toBe(disconnectPlayer);
            
            // 3. Room still exists (game state preserved)
            expect(roomManager.getRoom(roomCode)).toBeTruthy();
            
            // 4. Reconnection is possible (tested by attempting reconnection)
            const newSocket = { id: `socket-new-${disconnectingPlayerId}`, emit: jest.fn() };
            const result = connectionManager.handleReconnection(newSocket, disconnectingPlayerId);
            expect(result.success).toBe(true);

            jest.clearAllTimers();
          }
        ),
        { numRuns: 5 }
      );

      jest.useRealTimers();
    });
  });

  /**
   * Additional property: Socket association consistency
   * 
   * Verifies that socket-player associations remain consistent through 
   * disconnection and reconnection cycles
   */
  describe('Socket association consistency', () => {
    test('should maintain consistent socket-player associations', () => {
      fc.assert(
        fc.property(
          fc.record({
            playerId: fc.string({ minLength: 5, maxLength: 20 }),
            socketId1: fc.string({ minLength: 5, maxLength: 20 }),
            socketId2: fc.string({ minLength: 5, maxLength: 20 })
          }),
          ({ playerId, socketId1, socketId2 }) => {
            // Skip if socket IDs are the same
            fc.pre(socketId1 !== socketId2);

            const socket1 = { id: socketId1, emit: jest.fn() };
            const socket2 = { id: socketId2, emit: jest.fn() };

            // Associate first socket
            connectionManager.associateSocketWithPlayer(socket1, playerId);
            expect(connectionManager.getPlayerIdFromSocket(socket1)).toBe(playerId);
            expect(connectionManager.getSocketIdFromPlayer(playerId)).toBe(socketId1);

            // Associate second socket (simulating reconnection)
            connectionManager.associateSocketWithPlayer(socket2, playerId);
            
            // Old socket should no longer be associated
            expect(connectionManager.getPlayerIdFromSocket(socket1)).toBeNull();
            
            // New socket should be associated
            expect(connectionManager.getPlayerIdFromSocket(socket2)).toBe(playerId);
            expect(connectionManager.getSocketIdFromPlayer(playerId)).toBe(socketId2);
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
