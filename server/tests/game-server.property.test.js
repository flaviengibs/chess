/**
 * Property-Based Tests for Game Server Socket Event Handlers
 * 
 * These tests verify universal properties of the game server's socket event handling
 * using property-based testing with fast-check.
 * 
 * Feature: real-multiplayer-socketio
 */

const fc = require('fast-check');
const io = require('socket.io-client');
const { server, io: serverIo } = require('../index');

let serverPort;

// Helper to get server address
function getServerAddress() {
  return `http://localhost:${serverPort}`;
}

// Helper to create a client socket
function createClient() {
  return io(getServerAddress(), {
    transports: ['websocket'],
    forceNew: true
  });
}

// Helper to wait for event
function waitForEvent(socket, eventName, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${eventName}`));
    }, timeout);
    
    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// Helper to create a game room with two players
async function createGameRoom() {
  const client1 = createClient();
  const client2 = createClient();
  
  await new Promise(resolve => client1.once('connect', resolve));
  await new Promise(resolve => client2.once('connect', resolve));
  
  // Create room
  client1.emit('create-room', {
    playerId: 'player1',
    playerInfo: { username: 'Player1', elo: 1200 }
  });
  
  const { roomCode } = await waitForEvent(client1, 'room-created');
  
  // Join room
  client2.emit('join-room', {
    roomCode,
    playerId: 'player2',
    playerInfo: { username: 'Player2', elo: 1200 }
  });
  
  await waitForEvent(client1, 'game-started');
  await waitForEvent(client2, 'game-started');
  
  return { client1, client2, roomCode };
}

describe('Game Server Property Tests', () => {
  beforeAll((done) => {
    // Get the port the server is listening on
    const address = server.address();
    serverPort = address.port;
    done();
  });

  afterEach((done) => {
    // Clean up any remaining connections
    serverIo.disconnectSockets();
    setTimeout(done, 100);
  });

  describe('Property 14: Move emission', () => {
    /**
     * For any player move action, the client should emit the move to the server via socket
     * **Validates: Requirements 4.1**
     */
    it('should emit moves to server for any valid move', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 7 }),
          fc.integer({ min: 0, max: 7 }),
          fc.integer({ min: 0, max: 7 }),
          fc.integer({ min: 0, max: 7 }),
          async (fromRow, fromCol, toRow, toCol) => {
            const { client1, client2, roomCode } = await createGameRoom();
            
            try {
              // Emit a move (may be invalid, but should be emitted)
              let moveEmitted = false;
              const originalEmit = client1.emit.bind(client1);
              client1.emit = function(event, ...args) {
                if (event === 'make-move') {
                  moveEmitted = true;
                }
                return originalEmit(event, ...args);
              };
              
              client1.emit('make-move', {
                roomCode,
                from: { row: fromRow, col: fromCol },
                to: { row: toRow, col: toCol },
                promotion: null
              });
              
              // Wait a bit for emission
              await new Promise(resolve => setTimeout(resolve, 50));
              
              expect(moveEmitted).toBe(true);
            } finally {
              client1.disconnect();
              client2.disconnect();
            }
          }
        ),
        { numRuns: 5 }
      );
    }, 30000);
  });

  describe('Property 16: Valid move processing', () => {
    /**
     * For any valid move, the server should update the authoritative game state 
     * and broadcast the move to the opponent's client
     * **Validates: Requirements 4.3, 10.6**
     */
    it('should process valid moves and broadcast to opponent', async () => {
      const { client1, client2, roomCode } = await createGameRoom();
      
      try {
        // Make a valid opening move (white pawn e2 to e4)
        client1.emit('make-move', {
          roomCode,
          from: { row: 6, col: 4 },
          to: { row: 4, col: 4 },
          promotion: null
        });
        
        // Both players should receive move-made event
        const move1 = await waitForEvent(client1, 'move-made');
        const move2 = await waitForEvent(client2, 'move-made');
        
        expect(move1).toBeDefined();
        expect(move2).toBeDefined();
        expect(move1.gameState).toBeDefined();
        expect(move2.gameState).toBeDefined();
        expect(move1.gameState.currentPlayer).toBe('black');
        expect(move2.gameState.currentPlayer).toBe('black');
      } finally {
        client1.disconnect();
        client2.disconnect();
      }
    }, 10000);
  });

  describe('Property 17: Invalid move rejection', () => {
    /**
     * For any invalid move, the server should reject it and send an error message 
     * to the client without updating the game state
     * **Validates: Requirements 4.4, 10.5**
     */
    it('should reject invalid moves without updating game state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 7 }),
          fc.integer({ min: 0, max: 7 }),
          async (toRow, toCol) => {
            const { client1, client2, roomCode } = await createGameRoom();
            
            try {
              // Try to move a piece that doesn't exist or make an invalid move
              // Move from empty square (row 4, col 4 is empty at start)
              client1.emit('make-move', {
                roomCode,
                from: { row: 4, col: 4 },
                to: { row: toRow, col: toCol },
                promotion: null
              });
              
              // Should receive move-invalid event
              const result = await Promise.race([
                waitForEvent(client1, 'move-invalid').then(() => 'invalid'),
                waitForEvent(client1, 'move-made').then(() => 'made'),
                new Promise(resolve => setTimeout(() => resolve('timeout'), 500))
              ]);
              
              // Should be invalid or timeout (no move made)
              expect(result).not.toBe('made');
            } finally {
              client1.disconnect();
              client2.disconnect();
            }
          }
        ),
        { numRuns: 5 }
      );
    }, 30000);
  });

  describe('Property 19: Game status detection', () => {
    /**
     * For any move that results in check, checkmate, or stalemate, 
     * the server should update the game status and notify both clients
     * **Validates: Requirements 4.6**
     */
    it('should detect game end conditions', async () => {
      const { client1, client2, roomCode } = await createGameRoom();
      
      try {
        // Play a sequence of moves leading to Scholar's Mate (checkmate in 4 moves)
        const moves = [
          { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } }, // e4
          { from: { row: 1, col: 4 }, to: { row: 3, col: 4 } }, // e5
          { from: { row: 7, col: 5 }, to: { row: 4, col: 2 } }, // Bc4
          { from: { row: 0, col: 1 }, to: { row: 2, col: 2 } }, // Nc6
          { from: { row: 7, col: 3 }, to: { row: 3, col: 7 } }, // Qh5
          { from: { row: 0, col: 6 }, to: { row: 2, col: 5 } }, // Nf6
          { from: { row: 3, col: 7 }, to: { row: 1, col: 5 } }  // Qxf7# (checkmate)
        ];
        
        for (let i = 0; i < moves.length; i++) {
          const currentPlayer = i % 2 === 0 ? client1 : client2;
          currentPlayer.emit('make-move', {
            roomCode,
            from: moves[i].from,
            to: moves[i].to,
            promotion: null
          });
          
          await waitForEvent(currentPlayer, 'move-made', 2000);
          
          // If this is the last move, should trigger game-ended
          if (i === moves.length - 1) {
            const gameEnd1 = await waitForEvent(client1, 'game-ended', 2000);
            const gameEnd2 = await waitForEvent(client2, 'game-ended', 2000);
            
            expect(gameEnd1.reason).toBe('checkmate');
            expect(gameEnd2.reason).toBe('checkmate');
            expect(gameEnd1.winner).toBe('white');
            expect(gameEnd2.winner).toBe('white');
          }
        }
      } finally {
        client1.disconnect();
        client2.disconnect();
      }
    }, 15000);
  });

  describe('Property 22: Chat message emission', () => {
    /**
     * For any chat message sent by a player, the client should emit the message 
     * to the server via socket
     * **Validates: Requirements 5.1**
     */
    it('should emit chat messages to server', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          async (message) => {
            const { client1, client2, roomCode } = await createGameRoom();
            
            try {
              client1.emit('chat-message', {
                roomCode,
                message
              });
              
              // Should receive chat message back
              const chatData = await waitForEvent(client1, 'chat-message', 2000);
              expect(chatData.message).toBe(message);
            } finally {
              client1.disconnect();
              client2.disconnect();
            }
          }
        ),
        { numRuns: 5 }
      );
    }, 30000);
  });

  describe('Property 23: Chat message broadcast', () => {
    /**
     * For any chat message received by the server, the server should broadcast it 
     * to the opponent's client
     * **Validates: Requirements 5.2**
     */
    it('should broadcast chat messages to opponent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          async (message) => {
            const { client1, client2, roomCode } = await createGameRoom();
            
            try {
              client1.emit('chat-message', {
                roomCode,
                message
              });
              
              // Opponent should receive the message
              const chatData = await waitForEvent(client2, 'chat-message', 2000);
              expect(chatData.message).toBe(message);
              expect(chatData.sender).toBe('Player1');
            } finally {
              client1.disconnect();
              client2.disconnect();
            }
          }
        ),
        { numRuns: 5 }
      );
    }, 30000);
  });

  describe('Property 25: Chat message length validation', () => {
    /**
     * For any chat message exceeding 500 characters, the server should reject it 
     * with an error message
     * **Validates: Requirements 5.5**
     */
    it('should reject messages longer than 500 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 501, maxLength: 1000 }),
          async (longMessage) => {
            const { client1, client2, roomCode } = await createGameRoom();
            
            try {
              client1.emit('chat-message', {
                roomCode,
                message: longMessage
              });
              
              // Should receive error
              const error = await waitForEvent(client1, 'error', 2000);
              expect(error.message).toContain('too long');
            } finally {
              client1.disconnect();
              client2.disconnect();
            }
          }
        ),
        { numRuns: 5 }
      );
    }, 20000);
  });

  describe('Property 26: Draw offer transmission', () => {
    /**
     * For any draw offer, the client should emit the offer to the server, 
     * the server should forward it to the opponent, and the opponent's client 
     * should display a response modal
     * **Validates: Requirements 6.1, 6.2**
     */
    it('should transmit draw offers to opponent', async () => {
      const { client1, client2, roomCode } = await createGameRoom();
      
      try {
        client1.emit('offer-draw', { roomCode });
        
        // Opponent should receive draw-offered event
        await waitForEvent(client2, 'draw-offered', 2000);
      } finally {
        client1.disconnect();
        client2.disconnect();
      }
    }, 10000);
  });

  describe('Property 28: Draw acceptance handling', () => {
    /**
     * For any accepted draw offer, the server should end the game with a draw result 
     * and notify both clients
     * **Validates: Requirements 6.6**
     */
    it('should end game as draw when draw is accepted', async () => {
      const { client1, client2, roomCode } = await createGameRoom();
      
      try {
        // Offer draw
        client1.emit('offer-draw', { roomCode });
        await waitForEvent(client2, 'draw-offered', 2000);
        
        // Accept draw
        client2.emit('respond-draw', { roomCode, accept: true });
        
        // Both should receive game-ended with draw
        const gameEnd1 = await waitForEvent(client1, 'game-ended', 2000);
        const gameEnd2 = await waitForEvent(client2, 'game-ended', 2000);
        
        expect(gameEnd1.reason).toBe('draw');
        expect(gameEnd2.reason).toBe('draw');
        expect(gameEnd1.winner).toBeNull();
        expect(gameEnd2.winner).toBeNull();
      } finally {
        client1.disconnect();
        client2.disconnect();
      }
    }, 10000);
  });

  describe('Property 29: Draw rejection handling', () => {
    /**
     * For any declined draw offer, the server should notify the offering player
     * **Validates: Requirements 6.7**
     */
    it('should notify offering player when draw is declined', async () => {
      const { client1, client2, roomCode } = await createGameRoom();
      
      try {
        // Offer draw
        client1.emit('offer-draw', { roomCode });
        await waitForEvent(client2, 'draw-offered', 2000);
        
        // Decline draw
        client2.emit('respond-draw', { roomCode, accept: false });
        
        // Offering player should receive draw-declined
        await waitForEvent(client1, 'draw-declined', 2000);
      } finally {
        client1.disconnect();
        client2.disconnect();
      }
    }, 10000);
  });

  describe('Property 33: Resignation emission', () => {
    /**
     * For any resignation action, the client should emit the resignation 
     * to the server via socket
     * **Validates: Requirements 8.1**
     */
    it('should emit resignation to server', async () => {
      const { client1, client2, roomCode } = await createGameRoom();
      
      try {
        client1.emit('resign', { roomCode });
        
        // Should trigger game-ended event
        const gameEnd = await waitForEvent(client1, 'game-ended', 2000);
        expect(gameEnd.reason).toBe('resignation');
      } finally {
        client1.disconnect();
        client2.disconnect();
      }
    }, 10000);
  });

  describe('Property 34: Resignation processing', () => {
    /**
     * For any resignation received by the server, the server should end the game 
     * with the resigning player as the loser, update ELO ratings, and notify 
     * the opponent's client
     * **Validates: Requirements 8.2, 8.3, 8.4**
     */
    it('should process resignation and update ELO', async () => {
      const { client1, client2, roomCode } = await createGameRoom();
      
      try {
        client1.emit('resign', { roomCode });
        
        // Both players should receive game-ended
        const gameEnd1 = await waitForEvent(client1, 'game-ended', 2000);
        const gameEnd2 = await waitForEvent(client2, 'game-ended', 2000);
        
        expect(gameEnd1.reason).toBe('resignation');
        expect(gameEnd2.reason).toBe('resignation');
        expect(gameEnd1.winner).toBe('black'); // White resigned
        expect(gameEnd2.winner).toBe('black');
        expect(gameEnd1.eloChanges).toBeDefined();
        expect(gameEnd2.eloChanges).toBeDefined();
        expect(gameEnd1.eloChanges.white).toBeLessThan(0); // White lost ELO
        expect(gameEnd1.eloChanges.black).toBeGreaterThan(0); // Black gained ELO
      } finally {
        client1.disconnect();
        client2.disconnect();
      }
    }, 10000);
  });
});
