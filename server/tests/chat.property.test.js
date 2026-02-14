const fc = require('fast-check');
const { io: ioClient } = require('socket.io-client');
const { server, io } = require('../index');
const RoomManager = require('../room-manager');

/**
 * Property-Based Tests for Chat Functionality
 * 
 * Feature: real-multiplayer-socketio
 * Property 22: Chat message emission
 * Property 23: Chat message broadcast
 * Property 25: Chat message length validation
 * 
 * **Validates: Requirements 5.1, 5.2, 5.5**
 * 
 * These tests verify that chat messages are emitted, broadcast, and validated correctly.
 */

describe('Chat - Property-Based Tests', () => {
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
    async function createGameRoom() {
        const socket1 = createClientSocket();
        const socket2 = createClientSocket();

        await new Promise(resolve => socket1.on('connect', resolve));
        await new Promise(resolve => socket2.on('connect', resolve));

        // Create room with player 1
        socket1.emit('create-room', {
            playerId: 'player1',
            playerInfo: { username: 'Player1', elo: 1200 }
        });

        const roomCreated = await waitForEvent(socket1, 'room-created');
        const roomCode = roomCreated.roomCode;

        // Join room with player 2
        socket2.emit('join-room', {
            roomCode,
            playerId: 'player2',
            playerInfo: { username: 'Player2', elo: 1200 }
        });

        await waitForEvent(socket1, 'game-started');
        await waitForEvent(socket2, 'game-started');

        return { socket1, socket2, roomCode };
    }

    /**
     * Property 22: Chat message emission
     * 
     * This property verifies that for any chat message sent by a player,
     * the client emits the message to the server via socket.
     * 
     * **Validates: Requirements 5.1**
     */
    describe('Property 22: Chat message emission', () => {
        test('should emit chat messages to server', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.string({ minLength: 1, maxLength: 500 }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    async (messages) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        // Send each message from player 1
                        for (const message of messages) {
                            // Set up listeners before emitting
                            const receivedPromise = waitForEvent(socket2, 'chat-message');
                            const echoPromise = waitForEvent(socket1, 'chat-message');
                            
                            socket1.emit('chat-message', { roomCode, message });
                            
                            // Wait for both the echo and the broadcast
                            const [received, echo] = await Promise.all([receivedPromise, echoPromise]);
                            
                            // Verify message was emitted and received
                            if (received.message !== message) {
                                return false;
                            }
                        }

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should emit messages from both players', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            sender: fc.oneof(fc.constant('player1'), fc.constant('player2')),
                            message: fc.string({ minLength: 1, maxLength: 500 })
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    async (messageSequence) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        for (const { sender, message } of messageSequence) {
                            const senderSocket = sender === 'player1' ? socket1 : socket2;
                            const receiverSocket = sender === 'player1' ? socket2 : socket1;

                            // Set up listeners before emitting
                            const receivedPromise = waitForEvent(receiverSocket, 'chat-message');
                            const echoPromise = waitForEvent(senderSocket, 'chat-message');
                            
                            senderSocket.emit('chat-message', { roomCode, message });
                            
                            // Wait for both the echo and the broadcast
                            const [received] = await Promise.all([receivedPromise, echoPromise]);
                            
                            if (received.message !== message) {
                                return false;
                            }
                        }

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });
    });

    /**
     * Property 23: Chat message broadcast
     * 
     * This property verifies that for any chat message received by the server,
     * the server broadcasts it to the opponent's client.
     * 
     * **Validates: Requirements 5.2**
     */
    describe('Property 23: Chat message broadcast', () => {
        test('should broadcast messages to opponent', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.string({ minLength: 1, maxLength: 500 }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    async (messages) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        for (const message of messages) {
                            // Send message from player 1
                            socket1.emit('chat-message', { roomCode, message });
                            
                            // Verify player 2 receives the broadcast
                            const received = await waitForEvent(socket2, 'chat-message');
                            
                            // Verify message content
                            if (received.message !== message) {
                                return false;
                            }
                            
                            // Verify sender information
                            if (received.sender !== 'Player1') {
                                return false;
                            }
                            
                            // Verify timestamp exists
                            if (!received.timestamp || typeof received.timestamp !== 'number') {
                                return false;
                            }
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should broadcast messages with correct sender info', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            sender: fc.oneof(fc.constant('player1'), fc.constant('player2')),
                            message: fc.string({ minLength: 1, maxLength: 500 })
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    async (messageSequence) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        for (const { sender, message } of messageSequence) {
                            const senderSocket = sender === 'player1' ? socket1 : socket2;
                            const receiverSocket = sender === 'player1' ? socket2 : socket1;
                            const expectedSender = sender === 'player1' ? 'Player1' : 'Player2';

                            // Set up listeners before emitting
                            const receivedPromise = waitForEvent(receiverSocket, 'chat-message');
                            const echoPromise = waitForEvent(senderSocket, 'chat-message');
                            
                            senderSocket.emit('chat-message', { roomCode, message });
                            
                            // Wait for both the echo and the broadcast
                            const [received] = await Promise.all([receivedPromise, echoPromise]);
                            
                            // Verify sender name
                            if (received.sender !== expectedSender) {
                                return false;
                            }
                            
                            // Verify message content
                            if (received.message !== message) {
                                return false;
                            }
                        }

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });

        test('should echo message back to sender', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 500 }),
                    async (message) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        // Send message from player 1
                        socket1.emit('chat-message', { roomCode, message });
                        
                        // Verify player 1 also receives the message (echo)
                        const echo = await waitForEvent(socket1, 'chat-message');
                        
                        // Verify echo content
                        if (echo.message !== message) {
                            return false;
                        }
                        
                        // Verify sender information
                        if (echo.sender !== 'Player1') {
                            return false;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    /**
     * Property 25: Chat message length validation
     * 
     * This property verifies that for any chat message exceeding 500 characters,
     * the server rejects it with an error message.
     * 
     * **Validates: Requirements 5.5**
     */
    describe('Property 25: Chat message length validation', () => {
        test('should reject messages exceeding 500 characters', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 501, maxLength: 1000 }),
                    async (longMessage) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        // Send long message from player 1
                        socket1.emit('chat-message', { roomCode, message: longMessage });
                        
                        // Verify player 1 receives an error
                        const error = await waitForEvent(socket1, 'error');
                        
                        // Verify error message
                        if (!error.message || !error.message.includes('too long')) {
                            return false;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should accept messages at exactly 500 characters', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 500, maxLength: 500 }),
                    async (message) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        // Send 500-character message from player 1
                        socket1.emit('chat-message', { roomCode, message });
                        
                        // Verify player 2 receives the message (not rejected)
                        const received = await waitForEvent(socket2, 'chat-message');
                        
                        // Verify message was accepted
                        if (received.message !== message) {
                            return false;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should reject empty messages', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constant(''),
                    async (emptyMessage) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        // Send empty message from player 1
                        socket1.emit('chat-message', { roomCode, message: emptyMessage });
                        
                        // Verify player 1 receives an error
                        const error = await waitForEvent(socket1, 'error');
                        
                        // Verify error message
                        if (!error.message || !error.message.includes('empty')) {
                            return false;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should accept messages of various valid lengths', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.string({ minLength: 1, maxLength: 500 }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    async (messages) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        for (const message of messages) {
                            // Send message from player 1
                            socket1.emit('chat-message', { roomCode, message });
                            
                            // Verify player 2 receives the message
                            const received = await waitForEvent(socket2, 'chat-message');
                            
                            // Verify message was accepted and matches
                            if (received.message !== message) {
                                return false;
                            }
                            
                            // Verify message length is within bounds
                            if (message.length > 500) {
                                return false;
                            }
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    /**
     * Combined property test: Verify all chat properties together
     * 
     * This test generates random chat scenarios to verify that all three
     * properties hold simultaneously.
     */
    describe('Combined chat properties', () => {
        test('should handle various chat scenarios correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            sender: fc.oneof(fc.constant('player1'), fc.constant('player2')),
                            message: fc.string({ minLength: 1, maxLength: 600 })
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    async (messageSequence) => {
                        const { socket1, socket2, roomCode } = await createGameRoom();

                        for (const { sender, message } of messageSequence) {
                            const senderSocket = sender === 'player1' ? socket1 : socket2;
                            const receiverSocket = sender === 'player1' ? socket2 : socket1;
                            const expectedSender = sender === 'player1' ? 'Player1' : 'Player2';

                            if (message.length > 500) {
                                // Should receive error
                                const errorPromise = waitForEvent(senderSocket, 'error');
                                senderSocket.emit('chat-message', { roomCode, message });
                                
                                const error = await errorPromise;
                                if (!error.message || !error.message.includes('too long')) {
                                    return false;
                                }
                            } else {
                                // Should be broadcast to opponent
                                const receivedPromise = waitForEvent(receiverSocket, 'chat-message');
                                const echoPromise = waitForEvent(senderSocket, 'chat-message');
                                
                                senderSocket.emit('chat-message', { roomCode, message });
                                
                                const [received] = await Promise.all([receivedPromise, echoPromise]);
                                
                                if (received.message !== message) {
                                    return false;
                                }
                                
                                if (received.sender !== expectedSender) {
                                    return false;
                                }
                            }
                        }

                        return true;
                    }
                ),
                { numRuns: 5, timeout: 15000 }
            );
        });
    });
});
