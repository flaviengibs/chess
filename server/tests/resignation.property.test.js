/**
 * Property-Based Tests for Resignation
 * 
 * Feature: real-multiplayer-socketio
 * Property 33: Resignation emission
 * Property 34: Resignation processing
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 * 
 * These tests verify that resignations are emitted correctly, processed properly,
 * end the game with the correct winner, and update ELO ratings.
 */

const fc = require('fast-check');
const { io: ioClient } = require('socket.io-client');
const { server, io } = require('../index');

describe('Resignation - Property-Based Tests', () => {
    let serverPort;
    let clientSockets = [];

    beforeAll((done) => {
        // Get the port the server is listening on
        const address = server.address();
        serverPort = address.port;
        done();
    });

    afterEach((done) => {
        // Disconnect all client sockets
        clientSockets.forEach(socket => {
            if (socket.connected) {
                socket.disconnect();
            }
        });
        clientSockets = [];
        
        // Clear all rooms
        io.sockets.sockets.forEach(socket => {
            socket.disconnect(true);
        });
        
        setTimeout(done, 100);
    });

    afterAll((done) => {
        server.close(done);
    });

    /**
     * Helper function to create a connected client socket
     */
    function createClientSocket() {
        const socket = ioClient(`http://localhost:${serverPort}`, {
            transports: ['websocket'],
            forceNew: true
        });
        clientSockets.push(socket);
        return socket;
    }

    /**
     * Helper function to wait for a socket event
     */
    function waitForEvent(socket, eventName, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Timeout waiting for event: ${eventName}`));
            }, timeout);

            socket.once(eventName, (data) => {
                clearTimeout(timer);
                resolve(data);
            });
        });
    }

    /**
     * Helper function to create a game room with two players
     */
    async function createGameRoom(player1Info = null, player2Info = null) {
        const socket1 = createClientSocket();
        const socket2 = createClientSocket();

        await new Promise(resolve => socket1.on('connect', resolve));
        await new Promise(resolve => socket2.on('connect', resolve));

        const p1Info = player1Info || { username: 'Player1', elo: 1200 };
        const p2Info = player2Info || { username: 'Player2', elo: 1200 };

        // Create room with player 1
        socket1.emit('create-room', {
            playerId: 'player1',
            playerInfo: p1Info
        });

        const roomCreated = await waitForEvent(socket1, 'room-created');
        const roomCode = roomCreated.roomCode;

        // Join room with player 2
        socket2.emit('join-room', {
            roomCode,
            playerId: 'player2',
            playerInfo: p2Info
        });

        await waitForEvent(socket1, 'game-started');
        await waitForEvent(socket2, 'game-started');

        return { socket1, socket2, roomCode, p1Info, p2Info };
    }

    /**
     * Property 33: Resignation emission
     * 
     * This property verifies that for any resignation action, the client emits
     * the resignation to the server via socket.
     * 
     * **Validates: Requirements 8.1**
     */
    describe('Property 33: Resignation emission', () => {
        test('should emit resignation from any player to server', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        player1Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player2Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player1Elo: fc.integer({ min: 800, max: 2800 }),
                        player2Elo: fc.integer({ min: 800, max: 2800 }),
                        resigningPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ player1Name, player2Name, player1Elo, player2Elo, resigningPlayer }) => {
                        // Skip if player names are just whitespace
                        fc.pre(player1Name.trim().length > 0 && player2Name.trim().length > 0);

                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: player1Name, elo: player1Elo },
                            { username: player2Name, elo: player2Elo }
                        );

                        const resigningSocket = resigningPlayer === 'player1' ? socket1 : socket2;

                        // Emit resignation
                        resigningSocket.emit('resign', { roomCode });

                        // Verify server receives and processes resignation (game-ended event)
                        try {
                            const gameEnd = await waitForEvent(resigningSocket, 'game-ended');
                            return gameEnd.reason === 'resignation';
                        } catch (error) {
                            // If timeout, the resignation was not processed
                            return false;
                        }
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should emit resignation at any point during the game', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        numMoves: fc.integer({ min: 0, max: 3 }),
                        resigningPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ numMoves, resigningPlayer }) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        // Make some moves before resigning
                        const validMoves = [
                            { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } }, // e2-e4 (white)
                            { from: { row: 1, col: 4 }, to: { row: 3, col: 4 } }, // e7-e5 (black)
                            { from: { row: 6, col: 3 }, to: { row: 4, col: 3 } }, // d2-d4 (white)
                            { from: { row: 1, col: 3 }, to: { row: 3, col: 3 } }  // d7-d5 (black)
                        ];

                        for (let i = 0; i < numMoves && i < validMoves.length; i++) {
                            const currentPlayer = i % 2 === 0 ? socket1 : socket2;
                            currentPlayer.emit('make-move', {
                                roomCode,
                                from: validMoves[i].from,
                                to: validMoves[i].to,
                                promotion: null
                            });
                            await waitForEvent(currentPlayer, 'move-made');
                        }

                        // Now resign
                        const resigningSocket = resigningPlayer === 'player1' ? socket1 : socket2;
                        resigningSocket.emit('resign', { roomCode });

                        // Verify resignation is processed
                        const gameEnd = await waitForEvent(resigningSocket, 'game-ended');
                        return gameEnd.reason === 'resignation';
                    }
                ),
                { numRuns: 5, timeout: 20000 }
            );
        });

        test('should emit resignation with different player ELO ratings', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        player1Elo: fc.integer({ min: 800, max: 2800 }),
                        player2Elo: fc.integer({ min: 800, max: 2800 }),
                        resigningPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ player1Elo, player2Elo, resigningPlayer }) => {
                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: 'Player1', elo: player1Elo },
                            { username: 'Player2', elo: player2Elo }
                        );

                        const resigningSocket = resigningPlayer === 'player1' ? socket1 : socket2;

                        // Emit resignation
                        resigningSocket.emit('resign', { roomCode });

                        // Verify resignation is processed
                        const gameEnd = await waitForEvent(resigningSocket, 'game-ended');
                        return gameEnd.reason === 'resignation';
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });
    });

    /**
     * Property 34: Resignation processing
     * 
     * This property verifies that for any resignation received by the server,
     * the server ends the game with the resigning player as the loser,
     * updates ELO ratings, and notifies the opponent's client.
     * 
     * **Validates: Requirements 8.2, 8.3, 8.4**
     */
    describe('Property 34: Resignation processing', () => {
        test('should end game with correct winner when any player resigns', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        player1Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player2Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player1Elo: fc.integer({ min: 800, max: 2800 }),
                        player2Elo: fc.integer({ min: 800, max: 2800 }),
                        resigningPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ player1Name, player2Name, player1Elo, player2Elo, resigningPlayer }) => {
                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: player1Name, elo: player1Elo },
                            { username: player2Name, elo: player2Elo }
                        );

                        const resigningSocket = resigningPlayer === 'player1' ? socket1 : socket2;
                        const opponentSocket = resigningPlayer === 'player1' ? socket2 : socket1;
                        const expectedWinner = resigningPlayer === 'player1' ? 'black' : 'white';

                        // Resign
                        resigningSocket.emit('resign', { roomCode });

                        // Both players should receive game-ended event
                        const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                        const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                        const [gameEnd1, gameEnd2] = await Promise.all([gameEnd1Promise, gameEnd2Promise]);

                        // Verify game ended as resignation
                        if (gameEnd1.reason !== 'resignation') return false;
                        if (gameEnd2.reason !== 'resignation') return false;

                        // Verify correct winner (opposite of resigning player)
                        if (gameEnd1.winner !== expectedWinner) return false;
                        if (gameEnd2.winner !== expectedWinner) return false;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should update ELO ratings correctly for resignation', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        player1Elo: fc.integer({ min: 800, max: 2800 }),
                        player2Elo: fc.integer({ min: 800, max: 2800 }),
                        resigningPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ player1Elo, player2Elo, resigningPlayer }) => {
                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: 'Player1', elo: player1Elo },
                            { username: 'Player2', elo: player2Elo }
                        );

                        const resigningSocket = resigningPlayer === 'player1' ? socket1 : socket2;

                        // Resign
                        resigningSocket.emit('resign', { roomCode });

                        // Both players should receive game-ended event with ELO changes
                        const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                        const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                        const [gameEnd1, gameEnd2] = await Promise.all([gameEnd1Promise, gameEnd2Promise]);

                        // Verify ELO changes exist
                        if (!gameEnd1.eloChanges || !gameEnd2.eloChanges) return false;

                        // Verify ELO changes are numbers
                        if (typeof gameEnd1.eloChanges.white !== 'number') return false;
                        if (typeof gameEnd1.eloChanges.black !== 'number') return false;

                        // Verify resigning player loses ELO and opponent gains ELO
                        const whiteChange = gameEnd1.eloChanges.white;
                        const blackChange = gameEnd1.eloChanges.black;

                        if (resigningPlayer === 'player1') {
                            // White resigned, should lose ELO (negative change)
                            if (whiteChange > 0) return false;
                            // Black should gain ELO (positive change)
                            if (blackChange < 0) return false;
                        } else {
                            // Black resigned, should lose ELO (negative change)
                            if (blackChange > 0) return false;
                            // White should gain ELO (positive change)
                            if (whiteChange < 0) return false;
                        }

                        // Verify ELO changes are approximately equal and opposite
                        // (allowing for rounding differences up to 2 points)
                        const totalChange = Math.abs(whiteChange + blackChange);
                        if (totalChange > 2) return false;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should notify opponent when resignation occurs', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        resigningPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ resigningPlayer }) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        const resigningSocket = resigningPlayer === 'player1' ? socket1 : socket2;
                        const opponentSocket = resigningPlayer === 'player1' ? socket2 : socket1;

                        // Resign
                        resigningSocket.emit('resign', { roomCode });

                        // Opponent should receive game-ended notification
                        const opponentGameEnd = await waitForEvent(opponentSocket, 'game-ended');

                        // Verify opponent received correct information
                        if (opponentGameEnd.reason !== 'resignation') return false;

                        // Verify opponent is the winner
                        const expectedWinner = resigningPlayer === 'player1' ? 'black' : 'white';
                        if (opponentGameEnd.winner !== expectedWinner) return false;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should notify both players simultaneously when resignation occurs', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('player1', 'player2'),
                    async (resigningPlayer) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        const resigningSocket = resigningPlayer === 'player1' ? socket1 : socket2;

                        // Resign and measure timing
                        const startTime = Date.now();
                        const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                        const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                        resigningSocket.emit('resign', { roomCode });

                        const [gameEnd1, gameEnd2] = await Promise.all([gameEnd1Promise, gameEnd2Promise]);
                        const endTime = Date.now();

                        // Both should receive the event within a reasonable time (< 1 second)
                        const timeDiff = endTime - startTime;
                        if (timeDiff > 1000) return false;

                        // Both should have the same game end data
                        if (gameEnd1.reason !== gameEnd2.reason) return false;
                        if (gameEnd1.winner !== gameEnd2.winner) return false;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should handle resignation with various ELO differences', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        player1Elo: fc.integer({ min: 800, max: 2800 }),
                        player2Elo: fc.integer({ min: 800, max: 2800 }),
                        resigningPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ player1Elo, player2Elo, resigningPlayer }) => {
                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: 'Player1', elo: player1Elo },
                            { username: 'Player2', elo: player2Elo }
                        );

                        const resigningSocket = resigningPlayer === 'player1' ? socket1 : socket2;

                        // Resign
                        resigningSocket.emit('resign', { roomCode });

                        // Get game end data
                        const gameEnd = await waitForEvent(resigningSocket, 'game-ended');

                        // Verify ELO changes are present
                        if (!gameEnd.eloChanges) return false;

                        const whiteChange = gameEnd.eloChanges.white;
                        const blackChange = gameEnd.eloChanges.black;

                        // Verify ELO changes are reasonable (between -32 and +32 with K-factor of 32)
                        if (Math.abs(whiteChange) > 32) return false;
                        if (Math.abs(blackChange) > 32) return false;

                        // Verify resigning player loses ELO and opponent gains ELO
                        if (resigningPlayer === 'player1') {
                            // White resigned, should lose ELO (negative or zero)
                            if (whiteChange > 0) return false;
                            // Black should gain ELO (positive or zero)
                            if (blackChange < 0) return false;
                        } else {
                            // Black resigned, should lose ELO (negative or zero)
                            if (blackChange > 0) return false;
                            // White should gain ELO (positive or zero)
                            if (whiteChange < 0) return false;
                        }

                        // Verify ELO changes are approximately equal and opposite
                        // (allowing for rounding differences up to 2 points)
                        const totalChange = Math.abs(whiteChange + blackChange);
                        if (totalChange > 2) return false;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        }, 20000); // Increase Jest timeout to 20 seconds
    });

    /**
     * Combined property test: Verify all resignation properties together
     * 
     * This test generates random resignation scenarios to verify that both
     * properties hold simultaneously.
     */
    describe('Combined resignation properties', () => {
        test('should handle various resignation scenarios correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        player1Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player2Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player1Elo: fc.integer({ min: 800, max: 2800 }),
                        player2Elo: fc.integer({ min: 800, max: 2800 }),
                        resigningPlayer: fc.constantFrom('player1', 'player2'),
                        numMovesBefore: fc.integer({ min: 0, max: 4 })
                    }),
                    async ({ player1Name, player2Name, player1Elo, player2Elo, resigningPlayer, numMovesBefore }) => {
                        // Skip if player names are just whitespace
                        fc.pre(player1Name.trim().length > 0 && player2Name.trim().length > 0);

                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: player1Name, elo: player1Elo },
                            { username: player2Name, elo: player2Elo }
                        );

                        // Make some moves before resigning
                        const validMoves = [
                            { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } }, // e2-e4 (white)
                            { from: { row: 1, col: 4 }, to: { row: 3, col: 4 } }, // e7-e5 (black)
                            { from: { row: 6, col: 3 }, to: { row: 4, col: 3 } }, // d2-d4 (white)
                            { from: { row: 1, col: 3 }, to: { row: 3, col: 3 } }, // d7-d5 (black)
                            { from: { row: 7, col: 6 }, to: { row: 5, col: 5 } }, // Nf3 (white)
                            { from: { row: 0, col: 6 }, to: { row: 2, col: 5 } }  // Nf6 (black)
                        ];

                        for (let i = 0; i < numMovesBefore && i < validMoves.length; i++) {
                            const currentPlayer = i % 2 === 0 ? socket1 : socket2;
                            currentPlayer.emit('make-move', {
                                roomCode,
                                from: validMoves[i].from,
                                to: validMoves[i].to,
                                promotion: null
                            });
                            await waitForEvent(currentPlayer, 'move-made');
                        }

                        // Now resign
                        const resigningSocket = resigningPlayer === 'player1' ? socket1 : socket2;
                        const expectedWinner = resigningPlayer === 'player1' ? 'black' : 'white';

                        resigningSocket.emit('resign', { roomCode });

                        // Both players should receive game-ended event
                        const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                        const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                        const [gameEnd1, gameEnd2] = await Promise.all([gameEnd1Promise, gameEnd2Promise]);

                        // Verify all properties
                        // Property 33: Resignation was emitted and processed
                        if (gameEnd1.reason !== 'resignation') return false;
                        if (gameEnd2.reason !== 'resignation') return false;

                        // Property 34: Correct winner
                        if (gameEnd1.winner !== expectedWinner) return false;
                        if (gameEnd2.winner !== expectedWinner) return false;

                        // Property 34: ELO updated
                        if (!gameEnd1.eloChanges || !gameEnd2.eloChanges) return false;

                        // Property 34: Resigning player loses ELO
                        const whiteChange = gameEnd1.eloChanges.white;
                        const blackChange = gameEnd1.eloChanges.black;

                        if (resigningPlayer === 'player1') {
                            if (whiteChange > 0) return false; // White should lose ELO (negative or zero)
                            if (blackChange < 0) return false; // Black should gain ELO (positive or zero)
                        } else {
                            if (blackChange > 0) return false; // Black should lose ELO (negative or zero)
                            if (whiteChange < 0) return false; // White should gain ELO (positive or zero)
                        }

                        // Property 34: Opponent notified
                        // (verified by receiving game-ended event)

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 25000 }
            );
        });
    });
});
