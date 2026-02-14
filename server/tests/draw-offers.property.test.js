/**
 * Property-Based Tests for Draw Offers
 * 
 * Feature: real-multiplayer-socketio
 * Property 26: Draw offer transmission
 * Property 28: Draw acceptance handling
 * Property 29: Draw rejection handling
 * 
 * **Validates: Requirements 6.1, 6.2, 6.6, 6.7**
 * 
 * These tests verify that draw offers are transmitted correctly, acceptance ends the game,
 * and rejection notifies the offering player.
 */

const fc = require('fast-check');
const { io: ioClient } = require('socket.io-client');
const { server, io } = require('../index');

describe('Draw Offers - Property-Based Tests', () => {
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
     * Property 26: Draw offer transmission
     * 
     * This property verifies that for any draw offer, the client emits the offer to the server,
     * the server forwards it to the opponent, and the opponent's client receives a draw-offered event.
     * 
     * **Validates: Requirements 6.1, 6.2**
     */
    describe('Property 26: Draw offer transmission', () => {
        test('should transmit draw offers from any player to their opponent', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        player1Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player2Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player1Elo: fc.integer({ min: 800, max: 2800 }),
                        player2Elo: fc.integer({ min: 800, max: 2800 }),
                        offeringPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ player1Name, player2Name, player1Elo, player2Elo, offeringPlayer }) => {
                        // Skip if player names are just whitespace
                        fc.pre(player1Name.trim().length > 0 && player2Name.trim().length > 0);

                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: player1Name, elo: player1Elo },
                            { username: player2Name, elo: player2Elo }
                        );

                        const offeringSocket = offeringPlayer === 'player1' ? socket1 : socket2;
                        const receivingSocket = offeringPlayer === 'player1' ? socket2 : socket1;

                        // Offer draw
                        offeringSocket.emit('offer-draw', { roomCode });

                        // Verify opponent receives draw-offered event
                        try {
                            await waitForEvent(receivingSocket, 'draw-offered');
                            return true;
                        } catch (error) {
                            // If timeout, the event was not received
                            return false;
                        }
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should handle multiple draw offers in sequence', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.constantFrom('player1', 'player2'),
                        { minLength: 1, maxLength: 5 }
                    ),
                    async (offerSequence) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        for (const offeringPlayer of offerSequence) {
                            const offeringSocket = offeringPlayer === 'player1' ? socket1 : socket2;
                            const receivingSocket = offeringPlayer === 'player1' ? socket2 : socket1;

                            // Offer draw
                            const drawOfferedPromise = waitForEvent(receivingSocket, 'draw-offered');
                            offeringSocket.emit('offer-draw', { roomCode });

                            // Verify opponent receives draw-offered event
                            await drawOfferedPromise;

                            // Decline the draw to continue the game
                            const drawDeclinedPromise = waitForEvent(offeringSocket, 'draw-declined');
                            receivingSocket.emit('respond-draw', { roomCode, accept: false });
                            await drawDeclinedPromise;
                        }

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 20000 }
            );
        });

        test('should transmit draw offers with different player ELO ratings', async () => {
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

                        // Player 1 offers draw
                        socket1.emit('offer-draw', { roomCode });

                        // Verify player 2 receives draw-offered event
                        await waitForEvent(socket2, 'draw-offered');

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });
    });

    /**
     * Property 28: Draw acceptance handling
     * 
     * This property verifies that for any accepted draw offer, the server ends the game
     * with a draw result and notifies both clients.
     * 
     * **Validates: Requirements 6.6**
     */
    describe('Property 28: Draw acceptance handling', () => {
        test('should end game as draw when any player accepts draw offer', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        player1Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player2Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player1Elo: fc.integer({ min: 800, max: 2800 }),
                        player2Elo: fc.integer({ min: 800, max: 2800 }),
                        offeringPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ player1Name, player2Name, player1Elo, player2Elo, offeringPlayer }) => {
                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: player1Name, elo: player1Elo },
                            { username: player2Name, elo: player2Elo }
                        );

                        const offeringSocket = offeringPlayer === 'player1' ? socket1 : socket2;
                        const receivingSocket = offeringPlayer === 'player1' ? socket2 : socket1;

                        // Offer draw
                        offeringSocket.emit('offer-draw', { roomCode });
                        await waitForEvent(receivingSocket, 'draw-offered');

                        // Accept draw
                        const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                        const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                        receivingSocket.emit('respond-draw', { roomCode, accept: true });

                        // Both players should receive game-ended event
                        const [gameEnd1, gameEnd2] = await Promise.all([gameEnd1Promise, gameEnd2Promise]);

                        // Verify game ended as draw
                        if (gameEnd1.reason !== 'draw') return false;
                        if (gameEnd2.reason !== 'draw') return false;

                        // Verify no winner (draw)
                        if (gameEnd1.winner !== null) return false;
                        if (gameEnd2.winner !== null) return false;

                        // Verify ELO changes are present
                        if (!gameEnd1.eloChanges) return false;
                        if (!gameEnd2.eloChanges) return false;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should calculate ELO changes correctly for draws', async () => {
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

                        const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                        const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                        socket2.emit('respond-draw', { roomCode, accept: true });

                        const [gameEnd1, gameEnd2] = await Promise.all([gameEnd1Promise, gameEnd2Promise]);

                        // Verify ELO changes exist
                        if (!gameEnd1.eloChanges || !gameEnd2.eloChanges) return false;

                        // Verify ELO changes are numbers
                        if (typeof gameEnd1.eloChanges.white !== 'number') return false;
                        if (typeof gameEnd1.eloChanges.black !== 'number') return false;

                        // For a draw, the sum of ELO changes should be approximately zero
                        // (allowing for rounding differences)
                        const totalChange = gameEnd1.eloChanges.white + gameEnd1.eloChanges.black;
                        if (Math.abs(totalChange) > 1) return false;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should notify both players simultaneously when draw is accepted', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('player1', 'player2'),
                    async (offeringPlayer) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        const offeringSocket = offeringPlayer === 'player1' ? socket1 : socket2;
                        const receivingSocket = offeringPlayer === 'player1' ? socket2 : socket1;

                        // Offer draw
                        offeringSocket.emit('offer-draw', { roomCode });
                        await waitForEvent(receivingSocket, 'draw-offered');

                        // Accept draw and measure timing
                        const startTime = Date.now();
                        const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                        const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                        receivingSocket.emit('respond-draw', { roomCode, accept: true });

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
    });

    /**
     * Property 29: Draw rejection handling
     * 
     * This property verifies that for any declined draw offer, the server notifies
     * the offering player.
     * 
     * **Validates: Requirements 6.7**
     */
    describe('Property 29: Draw rejection handling', () => {
        test('should notify offering player when draw is declined', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        player1Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player2Name: fc.string({ minLength: 3, maxLength: 15 }),
                        player1Elo: fc.integer({ min: 800, max: 2800 }),
                        player2Elo: fc.integer({ min: 800, max: 2800 }),
                        offeringPlayer: fc.constantFrom('player1', 'player2')
                    }),
                    async ({ player1Name, player2Name, player1Elo, player2Elo, offeringPlayer }) => {
                        const { socket1, socket2, roomCode } = await createGameRoom(
                            { username: player1Name, elo: player1Elo },
                            { username: player2Name, elo: player2Elo }
                        );

                        const offeringSocket = offeringPlayer === 'player1' ? socket1 : socket2;
                        const receivingSocket = offeringPlayer === 'player1' ? socket2 : socket1;

                        // Offer draw
                        offeringSocket.emit('offer-draw', { roomCode });
                        await waitForEvent(receivingSocket, 'draw-offered');

                        // Decline draw
                        const drawDeclinedPromise = waitForEvent(offeringSocket, 'draw-declined');
                        receivingSocket.emit('respond-draw', { roomCode, accept: false });

                        // Offering player should receive draw-declined event
                        await drawDeclinedPromise;

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should not end game when draw is declined', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('player1', 'player2'),
                    async (offeringPlayer) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        const offeringSocket = offeringPlayer === 'player1' ? socket1 : socket2;
                        const receivingSocket = offeringPlayer === 'player1' ? socket2 : socket1;

                        // Offer draw
                        offeringSocket.emit('offer-draw', { roomCode });
                        await waitForEvent(receivingSocket, 'draw-offered');

                        // Set up listener for game-ended (should not fire)
                        let gameEnded = false;
                        socket1.once('game-ended', () => { gameEnded = true; });
                        socket2.once('game-ended', () => { gameEnded = true; });

                        // Decline draw
                        const drawDeclinedPromise = waitForEvent(offeringSocket, 'draw-declined');
                        receivingSocket.emit('respond-draw', { roomCode, accept: false });
                        await drawDeclinedPromise;

                        // Wait a bit to ensure no game-ended event
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // Game should not have ended
                        return !gameEnded;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should allow multiple draw offers after rejection', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 2, max: 5 }),
                    async (numOffers) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        for (let i = 0; i < numOffers; i++) {
                            // Alternate who offers the draw
                            const offeringSocket = i % 2 === 0 ? socket1 : socket2;
                            const receivingSocket = i % 2 === 0 ? socket2 : socket1;

                            // Offer draw
                            const drawOfferedPromise = waitForEvent(receivingSocket, 'draw-offered');
                            offeringSocket.emit('offer-draw', { roomCode });
                            await drawOfferedPromise;

                            // Decline draw
                            const drawDeclinedPromise = waitForEvent(offeringSocket, 'draw-declined');
                            receivingSocket.emit('respond-draw', { roomCode, accept: false });
                            await drawDeclinedPromise;
                        }

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 20000 }
            );
        });
    });

    /**
     * Combined property test: Verify all draw offer properties together
     * 
     * This test generates random draw offer scenarios to verify that all three
     * properties hold simultaneously.
     */
    describe('Combined draw offer properties', () => {
        test('should handle various draw offer scenarios correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            offeringPlayer: fc.constantFrom('player1', 'player2'),
                            accept: fc.boolean()
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    async (drawScenarios) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        for (const { offeringPlayer, accept } of drawScenarios) {
                            const offeringSocket = offeringPlayer === 'player1' ? socket1 : socket2;
                            const receivingSocket = offeringPlayer === 'player1' ? socket2 : socket1;

                            // Offer draw
                            const drawOfferedPromise = waitForEvent(receivingSocket, 'draw-offered');
                            offeringSocket.emit('offer-draw', { roomCode });
                            await drawOfferedPromise;

                            if (accept) {
                                // Accept draw - game should end
                                const gameEnd1Promise = waitForEvent(socket1, 'game-ended');
                                const gameEnd2Promise = waitForEvent(socket2, 'game-ended');
                                receivingSocket.emit('respond-draw', { roomCode, accept: true });

                                const [gameEnd1, gameEnd2] = await Promise.all([gameEnd1Promise, gameEnd2Promise]);

                                // Verify draw
                                if (gameEnd1.reason !== 'draw') return false;
                                if (gameEnd2.reason !== 'draw') return false;
                                if (gameEnd1.winner !== null) return false;
                                if (gameEnd2.winner !== null) return false;

                                // Game ended, stop testing
                                return true;
                            } else {
                                // Decline draw - game should continue
                                const drawDeclinedPromise = waitForEvent(offeringSocket, 'draw-declined');
                                receivingSocket.emit('respond-draw', { roomCode, accept: false });
                                await drawDeclinedPromise;

                                // Continue to next scenario
                            }
                        }

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 25000 }
            );
        });
    });
});
