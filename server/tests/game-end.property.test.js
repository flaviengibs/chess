/**
 * Property-Based Tests for Game End
 * 
 * Feature: real-multiplayer-socketio
 * Property 31: ELO persistence
 * Property 32: ELO update notification
 * 
 * **Validates: Requirements 7.5, 7.6**
 * 
 * These tests verify that when a game ends, ELO ratings are correctly
 * updated in the server's room object and both clients receive the
 * ELO change notifications.
 */

const fc = require('fast-check');
const { io: ioClient } = require('socket.io-client');
const { server, io } = require('../index');

describe('Game End - Property-Based Tests', () => {
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
     * Property 31: ELO persistence
     * 
     * This property verifies that for any ELO update, the server persists
     * the new ratings. Since the server updates ELO in-memory in the room
     * object and includes them in the game-ended event, we verify that:
     * 1. The server correctly calculates ELO changes
     * 2. The server includes the new ELO values in the game-ended event
     * 3. The ELO changes are consistent with the game result
     * 
     * **Validates: Requirements 7.5**
     */
    describe('Property 31: ELO persistence', () => {
        test('should persist ELO updates in game-ended event for resignation', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        player1Elo: fc.integer({ min: 800, max: 2800 }),
                        player2Elo: fc.integer({ min: 800, max: 2800 }),
                        resigningPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ player1Elo, player2Elo, resigningPlayer }) => {
                        const { socket1, socket2, roomCode, p1Info, p2Info } = await createGameRoom(
                            { username: 'Player1', elo: player1Elo },
                            { username: 'Player2', elo: player2Elo }
                        );

                        const resigningSocket = resigningPlayer === 'player1' ? socket1 : socket2;

                        // Resign
                        resigningSocket.emit('resign', { roomCode });

                        // Both players should receive game-ended event with ELO data
                        const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                        const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                        const [gameEnd1, gameEnd2] = await Promise.all([gameEnd1Promise, gameEnd2Promise]);

                        // Verify ELO changes are present
                        if (!gameEnd1.eloChanges || !gameEnd2.eloChanges) return false;
                        if (!gameEnd1.newElos || !gameEnd2.newElos) return false;

                        // Verify ELO changes are numbers
                        if (typeof gameEnd1.eloChanges.white !== 'number') return false;
                        if (typeof gameEnd1.eloChanges.black !== 'number') return false;
                        if (typeof gameEnd1.newElos.white !== 'number') return false;
                        if (typeof gameEnd1.newElos.black !== 'number') return false;

                        // Verify new ELOs are calculated correctly
                        const expectedWhiteElo = player1Elo + gameEnd1.eloChanges.white;
                        const expectedBlackElo = player2Elo + gameEnd1.eloChanges.black;

                        if (gameEnd1.newElos.white !== expectedWhiteElo) return false;
                        if (gameEnd1.newElos.black !== expectedBlackElo) return false;

                        // Verify both players receive the same ELO data
                        if (gameEnd1.eloChanges.white !== gameEnd2.eloChanges.white) return false;
                        if (gameEnd1.eloChanges.black !== gameEnd2.eloChanges.black) return false;
                        if (gameEnd1.newElos.white !== gameEnd2.newElos.white) return false;
                        if (gameEnd1.newElos.black !== gameEnd2.newElos.black) return false;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should persist ELO updates for draw scenarios', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        player1Elo: fc.integer({ min: 800, max: 2800 }),
                        player2Elo: fc.integer({ min: 800, max: 2800 })
                    }),
                    async ({ player1Elo, player2Elo }) => {
                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: 'Player1', elo: player1Elo },
                            { username: 'Player2', elo: player2Elo }
                        );

                        // Offer and accept draw
                        socket1.emit('offer-draw', { roomCode });
                        await waitForEvent(socket2, 'draw-offered');
                        socket2.emit('respond-draw', { roomCode, accept: true });

                        // Both players should receive game-ended event
                        const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                        const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                        const [gameEnd1, gameEnd2] = await Promise.all([gameEnd1Promise, gameEnd2Promise]);

                        // Verify game ended as draw
                        if (gameEnd1.reason !== 'draw') return false;
                        if (gameEnd1.winner !== null) return false;

                        // Verify ELO changes are present
                        if (!gameEnd1.eloChanges || !gameEnd1.newElos) return false;

                        // Verify new ELOs are calculated correctly
                        const expectedWhiteElo = player1Elo + gameEnd1.eloChanges.white;
                        const expectedBlackElo = player2Elo + gameEnd1.eloChanges.black;

                        if (gameEnd1.newElos.white !== expectedWhiteElo) return false;
                        if (gameEnd1.newElos.black !== expectedBlackElo) return false;

                        // For draws, if ratings are equal, ELO changes should be 0
                        if (player1Elo === player2Elo) {
                            if (gameEnd1.eloChanges.white !== 0) return false;
                            if (gameEnd1.eloChanges.black !== 0) return false;
                        }

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should persist correct ELO changes based on rating differences', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        lowerElo: fc.integer({ min: 800, max: 2400 }),
                        eloDifference: fc.integer({ min: 100, max: 400 }),
                        resigningPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ lowerElo, eloDifference, resigningPlayer }) => {
                        const higherElo = lowerElo + eloDifference;
                        
                        // Player 1 has higher ELO
                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: 'Player1', elo: higherElo },
                            { username: 'Player2', elo: lowerElo }
                        );

                        const resigningSocket = resigningPlayer === 'player1' ? socket1 : socket2;

                        // Resign
                        resigningSocket.emit('resign', { roomCode });

                        // Get game end data
                        const gameEnd = await waitForEvent(socket1, 'game-ended');

                        // Verify ELO changes are present
                        if (!gameEnd.eloChanges || !gameEnd.newElos) return false;

                        const whiteChange = gameEnd.eloChanges.white;
                        const blackChange = gameEnd.eloChanges.black;

                        // Verify ELO changes are reasonable (bounded by K-factor of 32)
                        if (Math.abs(whiteChange) > 32) return false;
                        if (Math.abs(blackChange) > 32) return false;

                        // Verify winner gains ELO and loser loses ELO
                        const winner = resigningPlayer === 'player1' ? 'black' : 'white';
                        if (winner === 'white') {
                            if (whiteChange < 0) return false; // Winner should gain (positive or zero)
                            if (blackChange > 0) return false; // Loser should lose (negative or zero)
                        } else {
                            if (blackChange < 0) return false; // Winner should gain (positive or zero)
                            if (whiteChange > 0) return false; // Loser should lose (negative or zero)
                        }

                        // Verify new ELOs are calculated correctly
                        const expectedWhiteElo = higherElo + whiteChange;
                        const expectedBlackElo = lowerElo + blackChange;

                        if (gameEnd.newElos.white !== expectedWhiteElo) return false;
                        if (gameEnd.newElos.black !== expectedBlackElo) return false;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });
    });

    /**
     * Property 32: ELO update notification
     * 
     * This property verifies that for any ELO update, the server sends
     * the ELO change to both clients. Both players should receive:
     * 1. The game-ended event
     * 2. ELO changes for both players
     * 3. New ELO values for both players
     * 4. The same data (consistency check)
     * 
     * **Validates: Requirements 7.6**
     */
    describe('Property 32: ELO update notification', () => {
        test('should notify both clients of ELO updates on resignation', async () => {
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

                        // Resign
                        resigningSocket.emit('resign', { roomCode });

                        // Both players should receive game-ended event
                        const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                        const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                        const [gameEnd1, gameEnd2] = await Promise.all([gameEnd1Promise, gameEnd2Promise]);

                        // Verify both received the event
                        if (!gameEnd1 || !gameEnd2) return false;

                        // Verify both have ELO data
                        if (!gameEnd1.eloChanges || !gameEnd2.eloChanges) return false;
                        if (!gameEnd1.newElos || !gameEnd2.newElos) return false;

                        // Verify both received the same ELO changes
                        if (gameEnd1.eloChanges.white !== gameEnd2.eloChanges.white) return false;
                        if (gameEnd1.eloChanges.black !== gameEnd2.eloChanges.black) return false;

                        // Verify both received the same new ELOs
                        if (gameEnd1.newElos.white !== gameEnd2.newElos.white) return false;
                        if (gameEnd1.newElos.black !== gameEnd2.newElos.black) return false;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should notify both clients of ELO updates on draw', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        player1Elo: fc.integer({ min: 800, max: 2800 }),
                        player2Elo: fc.integer({ min: 800, max: 2800 })
                    }),
                    async ({ player1Elo, player2Elo }) => {
                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: 'Player1', elo: player1Elo },
                            { username: 'Player2', elo: player2Elo }
                        );

                        // Offer and accept draw
                        socket1.emit('offer-draw', { roomCode });
                        await waitForEvent(socket2, 'draw-offered');
                        socket2.emit('respond-draw', { roomCode, accept: true });

                        // Both players should receive game-ended event
                        const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                        const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                        const [gameEnd1, gameEnd2] = await Promise.all([gameEnd1Promise, gameEnd2Promise]);

                        // Verify both received the event
                        if (!gameEnd1 || !gameEnd2) return false;

                        // Verify both have ELO data
                        if (!gameEnd1.eloChanges || !gameEnd2.eloChanges) return false;
                        if (!gameEnd1.newElos || !gameEnd2.newElos) return false;

                        // Verify both received the same ELO changes
                        if (gameEnd1.eloChanges.white !== gameEnd2.eloChanges.white) return false;
                        if (gameEnd1.eloChanges.black !== gameEnd2.eloChanges.black) return false;

                        // Verify both received the same new ELOs
                        if (gameEnd1.newElos.white !== gameEnd2.newElos.white) return false;
                        if (gameEnd1.newElos.black !== gameEnd2.newElos.black) return false;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should notify both clients simultaneously', async () => {
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

                        // Both should have ELO data
                        if (!gameEnd1.eloChanges || !gameEnd2.eloChanges) return false;
                        if (!gameEnd1.newElos || !gameEnd2.newElos) return false;

                        // Both should receive identical data
                        if (gameEnd1.eloChanges.white !== gameEnd2.eloChanges.white) return false;
                        if (gameEnd1.eloChanges.black !== gameEnd2.eloChanges.black) return false;
                        if (gameEnd1.newElos.white !== gameEnd2.newElos.white) return false;
                        if (gameEnd1.newElos.black !== gameEnd2.newElos.black) return false;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should notify both clients with various ELO differences', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        lowerElo: fc.integer({ min: 800, max: 2400 }),
                        eloDifference: fc.integer({ min: 50, max: 500 }),
                        resigningPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ lowerElo, eloDifference, resigningPlayer }) => {
                        const higherElo = lowerElo + eloDifference;
                        
                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: 'Player1', elo: higherElo },
                            { username: 'Player2', elo: lowerElo }
                        );

                        const resigningSocket = resigningPlayer === 'player1' ? socket1 : socket2;

                        // Resign
                        resigningSocket.emit('resign', { roomCode });

                        // Both players should receive game-ended event
                        const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                        const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                        const [gameEnd1, gameEnd2] = await Promise.all([gameEnd1Promise, gameEnd2Promise]);

                        // Verify both received the event with ELO data
                        if (!gameEnd1 || !gameEnd2) return false;
                        if (!gameEnd1.eloChanges || !gameEnd2.eloChanges) return false;
                        if (!gameEnd1.newElos || !gameEnd2.newElos) return false;

                        // Verify consistency between both clients
                        if (gameEnd1.eloChanges.white !== gameEnd2.eloChanges.white) return false;
                        if (gameEnd1.eloChanges.black !== gameEnd2.eloChanges.black) return false;
                        if (gameEnd1.newElos.white !== gameEnd2.newElos.white) return false;
                        if (gameEnd1.newElos.black !== gameEnd2.newElos.black) return false;

                        // Verify ELO changes are reasonable
                        if (Math.abs(gameEnd1.eloChanges.white) > 32) return false;
                        if (Math.abs(gameEnd1.eloChanges.black) > 32) return false;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });
    });

    /**
     * Combined property test: Verify both properties together
     * 
     * This test generates random game end scenarios to verify that both
     * Property 31 (ELO persistence) and Property 32 (ELO update notification)
     * hold simultaneously.
     */
    describe('Combined game end properties', () => {
        test('should handle various game end scenarios with correct ELO updates', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        player1Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player2Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player1Elo: fc.integer({ min: 800, max: 2800 }),
                        player2Elo: fc.integer({ min: 800, max: 2800 }),
                        endType: fc.constantFrom('resignation', 'draw'),
                        resigningPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ player1Name, player2Name, player1Elo, player2Elo, endType, resigningPlayer }) => {
                        // Skip if player names are just whitespace
                        fc.pre(player1Name.trim().length > 0 && player2Name.trim().length > 0);

                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: player1Name, elo: player1Elo },
                            { username: player2Name, elo: player2Elo }
                        );

                        // End the game based on endType
                        if (endType === 'resignation') {
                            const resigningSocket = resigningPlayer === 'player1' ? socket1 : socket2;
                            resigningSocket.emit('resign', { roomCode });
                        } else {
                            // Draw
                            socket1.emit('offer-draw', { roomCode });
                            await waitForEvent(socket2, 'draw-offered');
                            socket2.emit('respond-draw', { roomCode, accept: true });
                        }

                        // Both players should receive game-ended event
                        const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                        const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                        const [gameEnd1, gameEnd2] = await Promise.all([gameEnd1Promise, gameEnd2Promise]);

                        // Property 31: ELO persistence
                        // Verify ELO changes and new ELOs are present
                        if (!gameEnd1.eloChanges || !gameEnd1.newElos) return false;
                        if (!gameEnd2.eloChanges || !gameEnd2.newElos) return false;

                        // Verify new ELOs are calculated correctly
                        const expectedWhiteElo = player1Elo + gameEnd1.eloChanges.white;
                        const expectedBlackElo = player2Elo + gameEnd1.eloChanges.black;
                        if (gameEnd1.newElos.white !== expectedWhiteElo) return false;
                        if (gameEnd1.newElos.black !== expectedBlackElo) return false;

                        // Property 32: ELO update notification
                        // Verify both clients received the same data
                        if (gameEnd1.eloChanges.white !== gameEnd2.eloChanges.white) return false;
                        if (gameEnd1.eloChanges.black !== gameEnd2.eloChanges.black) return false;
                        if (gameEnd1.newElos.white !== gameEnd2.newElos.white) return false;
                        if (gameEnd1.newElos.black !== gameEnd2.newElos.black) return false;

                        // Verify game end reason matches
                        if (gameEnd1.reason !== gameEnd2.reason) return false;
                        if (gameEnd1.reason !== endType) return false;

                        // Verify winner is correct
                        if (endType === 'resignation') {
                            const expectedWinner = resigningPlayer === 'player1' ? 'black' : 'white';
                            if (gameEnd1.winner !== expectedWinner) return false;
                            if (gameEnd2.winner !== expectedWinner) return false;
                        } else {
                            // Draw
                            if (gameEnd1.winner !== null) return false;
                            if (gameEnd2.winner !== null) return false;
                        }

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 20000 }
            );
        });
    });
});
