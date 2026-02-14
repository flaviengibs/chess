const fc = require('fast-check');
const RoomManager = require('../room-manager');

/**
 * Property-Based Tests for RoomManager
 * 
 * Feature: real-multiplayer-socketio
 * Property 4: Room code uniqueness
 * 
 * **Validates: Requirements 2.1**
 * 
 * These tests verify that room codes are always unique across all room creation requests.
 */

describe('RoomManager - Property-Based Tests', () => {
    let roomManager;

    beforeEach(() => {
        roomManager = new RoomManager();
    });

    /**
     * Property 4: Room code uniqueness
     * 
     * This property verifies that for any N room creation requests,
     * all generated room codes are distinct.
     * 
     * **Validates: Requirements 2.1**
     */
    describe('Property 4: Room code uniqueness', () => {
        test('should generate unique room codes for multiple room creation requests', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            playerId: fc.string({ minLength: 1, maxLength: 20 }),
                            username: fc.string({ minLength: 1, maxLength: 20 }),
                            elo: fc.integer({ min: 0, max: 3000 })
                        }),
                        { minLength: 1, maxLength: 100 }
                    ),
                    (players) => {
                        const roomCodes = new Set();
                        
                        // Create rooms for all players
                        for (const player of players) {
                            const roomCode = roomManager.createRoom(
                                player.playerId,
                                { username: player.username, elo: player.elo }
                            );
                            
                            // Verify room code is 6 characters
                            if (roomCode.length !== 6) {
                                return false;
                            }
                            
                            // Verify room code is alphanumeric uppercase
                            if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
                                return false;
                            }
                            
                            // Check for uniqueness
                            if (roomCodes.has(roomCode)) {
                                return false; // Duplicate found!
                            }
                            
                            roomCodes.add(roomCode);
                        }
                        
                        // All room codes should be unique
                        return roomCodes.size === players.length;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should generate unique codes even with many concurrent room creations', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 10, max: 200 }),
                    (numRooms) => {
                        const roomCodes = new Set();
                        
                        // Create many rooms
                        for (let i = 0; i < numRooms; i++) {
                            const roomCode = roomManager.createRoom(
                                `player${i}`,
                                { username: `Player${i}`, elo: 1200 }
                            );
                            
                            roomCodes.add(roomCode);
                        }
                        
                        // All codes should be unique
                        return roomCodes.size === numRooms;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should never reuse room codes from deleted rooms', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            playerId: fc.string({ minLength: 1, maxLength: 20 }),
                            username: fc.string({ minLength: 1, maxLength: 20 }),
                            elo: fc.integer({ min: 0, max: 3000 })
                        }),
                        { minLength: 2, maxLength: 50 }
                    ),
                    (players) => {
                        const allRoomCodes = new Set();
                        
                        // Create rooms, delete some, create more
                        for (let i = 0; i < players.length; i++) {
                            const player = players[i];
                            const roomCode = roomManager.createRoom(
                                player.playerId,
                                { username: player.username, elo: player.elo }
                            );
                            
                            // Check uniqueness against all previously generated codes
                            if (allRoomCodes.has(roomCode)) {
                                return false; // Duplicate found!
                            }
                            
                            allRoomCodes.add(roomCode);
                            
                            // Delete every other room
                            if (i % 2 === 0) {
                                roomManager.removeRoom(roomCode);
                            }
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should maintain uniqueness across matchmaking room creation', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.tuple(
                            fc.record({
                                playerId: fc.string({ minLength: 1, maxLength: 20 }),
                                username: fc.string({ minLength: 1, maxLength: 20 }),
                                elo: fc.integer({ min: 0, max: 3000 })
                            }),
                            fc.record({
                                playerId: fc.string({ minLength: 1, maxLength: 20 }),
                                username: fc.string({ minLength: 1, maxLength: 20 }),
                                elo: fc.integer({ min: 0, max: 3000 })
                            })
                        ),
                        { minLength: 1, maxLength: 50 }
                    ),
                    (playerPairs) => {
                        const roomCodes = new Set();
                        
                        // Create rooms through matchmaking
                        for (const [player1, player2] of playerPairs) {
                            // Ensure different player IDs
                            if (player1.playerId === player2.playerId) {
                                player2.playerId = player2.playerId + '_2';
                            }
                            
                            // Add both players to matchmaking queue
                            roomManager.addToMatchmaking(
                                player1.playerId,
                                { username: player1.username, elo: player1.elo },
                                { id: `socket_${player1.playerId}` }
                            );
                            
                            roomManager.addToMatchmaking(
                                player2.playerId,
                                { username: player2.username, elo: player2.elo },
                                { id: `socket_${player2.playerId}` }
                            );
                            
                            // Find match (creates a room)
                            const match = roomManager.findMatch();
                            
                            if (match) {
                                // Check for uniqueness
                                if (roomCodes.has(match.roomCode)) {
                                    return false; // Duplicate found!
                                }
                                
                                roomCodes.add(match.roomCode);
                            }
                        }
                        
                        // All room codes should be unique
                        return roomCodes.size === playerPairs.length;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should generate unique codes when mixing private rooms and matchmaking', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            type: fc.oneof(fc.constant('private'), fc.constant('matchmaking')),
                            playerId: fc.string({ minLength: 1, maxLength: 20 }),
                            username: fc.string({ minLength: 1, maxLength: 20 }),
                            elo: fc.integer({ min: 0, max: 3000 })
                        }),
                        { minLength: 2, maxLength: 100 }
                    ),
                    (requests) => {
                        const roomCodes = new Set();
                        const matchmakingPlayers = [];
                        
                        for (const request of requests) {
                            if (request.type === 'private') {
                                // Create private room
                                const roomCode = roomManager.createRoom(
                                    request.playerId,
                                    { username: request.username, elo: request.elo }
                                );
                                
                                if (roomCodes.has(roomCode)) {
                                    return false; // Duplicate found!
                                }
                                
                                roomCodes.add(roomCode);
                            } else {
                                // Add to matchmaking
                                matchmakingPlayers.push(request);
                                roomManager.addToMatchmaking(
                                    request.playerId,
                                    { username: request.username, elo: request.elo },
                                    { id: `socket_${request.playerId}` }
                                );
                                
                                // Try to find a match
                                const match = roomManager.findMatch();
                                if (match) {
                                    if (roomCodes.has(match.roomCode)) {
                                        return false; // Duplicate found!
                                    }
                                    
                                    roomCodes.add(match.roomCode);
                                }
                            }
                        }
                        
                        // All generated room codes should be unique
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should handle collision detection correctly', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 100 }),
                    (numRooms) => {
                        const roomCodes = [];
                        
                        // Generate room codes
                        for (let i = 0; i < numRooms; i++) {
                            const roomCode = roomManager.createRoom(
                                `player${i}`,
                                { username: `Player${i}`, elo: 1200 }
                            );
                            roomCodes.push(roomCode);
                        }
                        
                        // Verify all codes are 6 characters
                        const allCorrectLength = roomCodes.every(code => code.length === 6);
                        if (!allCorrectLength) {
                            return false;
                        }
                        
                        // Verify all codes are alphanumeric uppercase
                        const allValidFormat = roomCodes.every(code => /^[A-Z0-9]{6}$/.test(code));
                        if (!allValidFormat) {
                            return false;
                        }
                        
                        // Verify uniqueness
                        const uniqueCodes = new Set(roomCodes);
                        return uniqueCodes.size === roomCodes.length;
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    /**
     * Property 6: Joiner color assignment
     * Property 7: Full room rejection
     * Property 8: Self-join rejection
     * 
     * These properties verify that room joining behaves correctly:
     * - Joining players are assigned the black player role
     * - Full rooms reject additional join attempts
     * - Players cannot join their own rooms
     * 
     * **Validates: Requirements 2.4, 2.5, 2.6**
     */
    describe('Property 6, 7, 8: Room joining behavior', () => {
        /**
         * Property 6: Joiner color assignment
         * 
         * This property verifies that for any valid room join request,
         * the joining player is assigned the black player role.
         * 
         * **Validates: Requirements 2.4**
         */
        test('Property 6: joining player should always be assigned black color', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        creator: fc.record({
                            playerId: fc.string({ minLength: 1, maxLength: 20 }),
                            username: fc.string({ minLength: 1, maxLength: 20 }),
                            elo: fc.integer({ min: 0, max: 3000 })
                        }),
                        joiner: fc.record({
                            playerId: fc.string({ minLength: 1, maxLength: 20 }),
                            username: fc.string({ minLength: 1, maxLength: 20 }),
                            elo: fc.integer({ min: 0, max: 3000 })
                        })
                    }),
                    ({ creator, joiner }) => {
                        // Ensure different player IDs
                        if (creator.playerId === joiner.playerId) {
                            joiner.playerId = joiner.playerId + '_joiner';
                        }
                        
                        // Create room with creator
                        const roomCode = roomManager.createRoom(
                            creator.playerId,
                            { username: creator.username, elo: creator.elo }
                        );
                        
                        // Join room with joiner
                        const result = roomManager.joinRoom(
                            roomCode,
                            joiner.playerId,
                            { username: joiner.username, elo: joiner.elo }
                        );
                        
                        // Verify join was successful
                        if (!result.success) {
                            return false;
                        }
                        
                        // Verify creator is white player
                        if (result.room.whitePlayer.id !== creator.playerId) {
                            return false;
                        }
                        
                        // Verify joiner is black player
                        if (result.room.blackPlayer.id !== joiner.playerId) {
                            return false;
                        }
                        
                        // Verify joiner has correct info
                        if (result.room.blackPlayer.username !== joiner.username) {
                            return false;
                        }
                        
                        if (result.room.blackPlayer.elo !== joiner.elo) {
                            return false;
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        /**
         * Property 7: Full room rejection
         * 
         * This property verifies that for any room that already has two players,
         * additional join attempts are rejected with an error.
         * 
         * **Validates: Requirements 2.5**
         */
        test('Property 7: full rooms should reject additional join attempts', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        creator: fc.record({
                            playerId: fc.string({ minLength: 1, maxLength: 20 }),
                            username: fc.string({ minLength: 1, maxLength: 20 }),
                            elo: fc.integer({ min: 0, max: 3000 })
                        }),
                        joiner1: fc.record({
                            playerId: fc.string({ minLength: 1, maxLength: 20 }),
                            username: fc.string({ minLength: 1, maxLength: 20 }),
                            elo: fc.integer({ min: 0, max: 3000 })
                        }),
                        joiner2: fc.record({
                            playerId: fc.string({ minLength: 1, maxLength: 20 }),
                            username: fc.string({ minLength: 1, maxLength: 20 }),
                            elo: fc.integer({ min: 0, max: 3000 })
                        })
                    }),
                    ({ creator, joiner1, joiner2 }) => {
                        // Ensure all different player IDs
                        if (creator.playerId === joiner1.playerId) {
                            joiner1.playerId = joiner1.playerId + '_j1';
                        }
                        if (creator.playerId === joiner2.playerId || joiner1.playerId === joiner2.playerId) {
                            joiner2.playerId = joiner2.playerId + '_j2';
                        }
                        
                        // Create room with creator
                        const roomCode = roomManager.createRoom(
                            creator.playerId,
                            { username: creator.username, elo: creator.elo }
                        );
                        
                        // First joiner should succeed
                        const result1 = roomManager.joinRoom(
                            roomCode,
                            joiner1.playerId,
                            { username: joiner1.username, elo: joiner1.elo }
                        );
                        
                        if (!result1.success) {
                            return false; // First join should succeed
                        }
                        
                        // Second joiner should be rejected (room is full)
                        const result2 = roomManager.joinRoom(
                            roomCode,
                            joiner2.playerId,
                            { username: joiner2.username, elo: joiner2.elo }
                        );
                        
                        // Verify rejection
                        if (result2.success) {
                            return false; // Should have been rejected
                        }
                        
                        // Verify error message
                        if (result2.error !== 'Room is full') {
                            return false;
                        }
                        
                        // Verify room still has only 2 players
                        const room = roomManager.getRoom(roomCode);
                        if (!room.whitePlayer || !room.blackPlayer) {
                            return false;
                        }
                        
                        // Verify the correct players are in the room
                        if (room.whitePlayer.id !== creator.playerId) {
                            return false;
                        }
                        
                        if (room.blackPlayer.id !== joiner1.playerId) {
                            return false;
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        /**
         * Property 8: Self-join rejection
         * 
         * This property verifies that for any player attempting to join
         * a room they created, the request is rejected with an error.
         * 
         * **Validates: Requirements 2.6**
         */
        test('Property 8: players should not be able to join their own rooms', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        playerId: fc.string({ minLength: 1, maxLength: 20 }),
                        username: fc.string({ minLength: 1, maxLength: 20 }),
                        elo: fc.integer({ min: 0, max: 3000 })
                    }),
                    (player) => {
                        // Create room with player
                        const roomCode = roomManager.createRoom(
                            player.playerId,
                            { username: player.username, elo: player.elo }
                        );
                        
                        // Try to join own room
                        const result = roomManager.joinRoom(
                            roomCode,
                            player.playerId,
                            { username: player.username, elo: player.elo }
                        );
                        
                        // Verify rejection
                        if (result.success) {
                            return false; // Should have been rejected
                        }
                        
                        // Verify error message
                        if (result.error !== 'Cannot join your own room') {
                            return false;
                        }
                        
                        // Verify room still has only creator (no black player)
                        const room = roomManager.getRoom(roomCode);
                        if (!room.whitePlayer || room.blackPlayer !== null) {
                            return false;
                        }
                        
                        // Verify creator is still white player
                        if (room.whitePlayer.id !== player.playerId) {
                            return false;
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        /**
         * Combined property test: Verify all room joining behaviors together
         * 
         * This test generates random room states and join attempts to verify
         * that all three properties hold simultaneously.
         */
        test('should handle various room joining scenarios correctly', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            action: fc.oneof(
                                fc.constant('create-and-join'),
                                fc.constant('create-and-self-join'),
                                fc.constant('create-fill-and-join')
                            ),
                            playerId: fc.string({ minLength: 1, maxLength: 20 }),
                            username: fc.string({ minLength: 1, maxLength: 20 }),
                            elo: fc.integer({ min: 0, max: 3000 })
                        }),
                        { minLength: 1, maxLength: 50 }
                    ),
                    (actions) => {
                        for (const action of actions) {
                            if (action.action === 'create-and-join') {
                                // Test Property 6: Joiner color assignment
                                const roomCode = roomManager.createRoom(
                                    action.playerId,
                                    { username: action.username, elo: action.elo }
                                );
                                
                                const joinerId = action.playerId + '_joiner';
                                const result = roomManager.joinRoom(
                                    roomCode,
                                    joinerId,
                                    { username: action.username + '_joiner', elo: action.elo }
                                );
                                
                                // Should succeed
                                if (!result.success) {
                                    return false;
                                }
                                
                                // Verify joiner is black player
                                const room = roomManager.getRoom(roomCode);
                                if (room.blackPlayer.id !== joinerId) {
                                    return false;
                                }
                                if (room.whitePlayer.id !== action.playerId) {
                                    return false;
                                }
                                
                            } else if (action.action === 'create-and-self-join') {
                                // Test Property 8: Self-join rejection
                                const roomCode = roomManager.createRoom(
                                    action.playerId,
                                    { username: action.username, elo: action.elo }
                                );
                                
                                const result = roomManager.joinRoom(
                                    roomCode,
                                    action.playerId,
                                    { username: action.username, elo: action.elo }
                                );
                                
                                // Should fail
                                if (result.success) {
                                    return false;
                                }
                                if (result.error !== 'Cannot join your own room') {
                                    return false;
                                }
                                
                                // Room should still have only creator
                                const room = roomManager.getRoom(roomCode);
                                if (room.blackPlayer !== null) {
                                    return false;
                                }
                                
                            } else if (action.action === 'create-fill-and-join') {
                                // Test Property 7: Full room rejection
                                const roomCode = roomManager.createRoom(
                                    action.playerId,
                                    { username: action.username, elo: action.elo }
                                );
                                
                                // Fill the room
                                const joiner1Id = action.playerId + '_joiner1';
                                roomManager.joinRoom(
                                    roomCode,
                                    joiner1Id,
                                    { username: action.username + '_joiner1', elo: action.elo }
                                );
                                
                                // Try to join full room
                                const joiner2Id = action.playerId + '_joiner2';
                                const result = roomManager.joinRoom(
                                    roomCode,
                                    joiner2Id,
                                    { username: action.username + '_joiner2', elo: action.elo }
                                );
                                
                                // Should fail
                                if (result.success) {
                                    return false;
                                }
                                if (result.error !== 'Room is full') {
                                    return false;
                                }
                                
                                // Room should still have only 2 players
                                const room = roomManager.getRoom(roomCode);
                                if (room.whitePlayer.id !== action.playerId) {
                                    return false;
                                }
                                if (room.blackPlayer.id !== joiner1Id) {
                                    return false;
                                }
                            }
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        /**
         * Edge case: Verify room not found error
         */
        test('should reject joins to non-existent rooms', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        roomCode: fc.string({ minLength: 6, maxLength: 6 }),
                        playerId: fc.string({ minLength: 1, maxLength: 20 }),
                        username: fc.string({ minLength: 1, maxLength: 20 }),
                        elo: fc.integer({ min: 0, max: 3000 })
                    }),
                    ({ roomCode, playerId, username, elo }) => {
                        // Try to join a room that doesn't exist
                        const result = roomManager.joinRoom(
                            roomCode,
                            playerId,
                            { username, elo }
                        );
                        
                        // Should fail
                        if (result.success) {
                            return false;
                        }
                        
                        // Should have appropriate error
                        if (result.error !== 'Room not found') {
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
     * Property 10: Matchmaking queue addition
     * Property 11: Automatic matching
     * Property 12: Queue cleanup on match
     * Property 13: Queue cleanup on disconnection
     * 
     * These properties verify that matchmaking behaves correctly:
     * - Players are added to the matchmaking queue
     * - Two players in queue are automatically matched
     * - Matched players are removed from the queue
     * - Disconnected players are removed from the queue
     * 
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
     */
    describe('Property 10, 11, 12, 13: Matchmaking behavior', () => {
        /**
         * Property 10: Matchmaking queue addition
         * 
         * This property verifies that for any matchmaking request,
         * the player is added to the matchmaking queue.
         * 
         * **Validates: Requirements 3.1**
         */
        test('Property 10: players should be added to matchmaking queue', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            playerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                            username: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                            elo: fc.integer({ min: 0, max: 3000 })
                        }),
                        { minLength: 1, maxLength: 50 }
                    ),
                    (players) => {
                        // Create fresh RoomManager for each property test iteration
                        const testRoomManager = new RoomManager();
                        
                        // Add all players to matchmaking queue
                        for (const player of players) {
                            testRoomManager.addToMatchmaking(
                                player.playerId,
                                { username: player.username, elo: player.elo },
                                { id: `socket_${player.playerId}` }
                            );
                        }
                        
                        // Verify queue has correct number of players
                        // (accounting for potential duplicates by playerId)
                        const uniquePlayerIds = new Set(players.map(p => p.playerId));
                        const queueSize = testRoomManager.matchmakingQueue.length;
                        
                        // Queue size should equal unique player count
                        return queueSize === uniquePlayerIds.size;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('Property 10: duplicate player additions should update existing entry', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        playerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                        username: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                        elo: fc.integer({ min: 0, max: 3000 }),
                        numAdditions: fc.integer({ min: 2, max: 10 })
                    }),
                    ({ playerId, username, elo, numAdditions }) => {
                        // Create fresh RoomManager for each property test iteration
                        const testRoomManager = new RoomManager();
                        
                        // Add same player multiple times
                        for (let i = 0; i < numAdditions; i++) {
                            testRoomManager.addToMatchmaking(
                                playerId,
                                { username, elo },
                                { id: `socket_${playerId}_${i}` }
                            );
                        }
                        
                        // Queue should only have one entry for this player
                        const queueSize = testRoomManager.matchmakingQueue.length;
                        if (queueSize !== 1) {
                            return false;
                        }
                        
                        // Verify the entry has correct player ID
                        const entry = testRoomManager.matchmakingQueue[0];
                        return entry.playerId === playerId;
                    }
                ),
                { numRuns: 5 }
            );
        });

        /**
         * Property 11: Automatic matching
         * 
         * This property verifies that for any state where the matchmaking queue
         * contains two or more players, the server creates a room and assigns
         * them as opponents.
         * 
         * **Validates: Requirements 3.2**
         */
        test('Property 11: two players in queue should be automatically matched', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            playerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                            username: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                            elo: fc.integer({ min: 0, max: 3000 })
                        }),
                        { minLength: 2, maxLength: 100 }
                    ),
                    (players) => {
                        // Create fresh RoomManager for each property test iteration
                        const testRoomManager = new RoomManager();
                        
                        // Ensure all players have unique IDs
                        const uniquePlayers = [];
                        const seenIds = new Set();
                        for (const player of players) {
                            if (!seenIds.has(player.playerId)) {
                                uniquePlayers.push(player);
                                seenIds.add(player.playerId);
                            }
                        }
                        
                        if (uniquePlayers.length < 2) {
                            return true; // Skip if not enough unique players
                        }
                        
                        // Add all players to matchmaking queue
                        for (const player of uniquePlayers) {
                            testRoomManager.addToMatchmaking(
                                player.playerId,
                                { username: player.username, elo: player.elo },
                                { id: `socket_${player.playerId}` }
                            );
                        }
                        
                        // Find matches until queue has less than 2 players
                        const matches = [];
                        let match;
                        while ((match = testRoomManager.findMatch()) !== null) {
                            matches.push(match);
                        }
                        
                        // Verify correct number of matches
                        const expectedMatches = Math.floor(uniquePlayers.length / 2);
                        if (matches.length !== expectedMatches) {
                            return false;
                        }
                        
                        // Verify each match has two different players
                        for (const match of matches) {
                            if (!match.player1 || !match.player2) {
                                return false;
                            }
                            
                            if (match.player1.playerId === match.player2.playerId) {
                                return false;
                            }
                            
                            // Verify room was created
                            if (!match.roomCode || !match.room) {
                                return false;
                            }
                            
                            // Verify room has both players
                            const room = testRoomManager.getRoom(match.roomCode);
                            if (!room) {
                                return false;
                            }
                            
                            if (!room.whitePlayer || !room.blackPlayer) {
                                return false;
                            }
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('Property 11: findMatch should return null when queue has less than 2 players', () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.constant([]), // Empty queue
                        fc.array(
                            fc.record({
                                playerId: fc.string({ minLength: 1, maxLength: 20 }),
                                username: fc.string({ minLength: 1, maxLength: 20 }),
                                elo: fc.integer({ min: 0, max: 3000 })
                            }),
                            { minLength: 1, maxLength: 1 } // Single player
                        )
                    ),
                    (players) => {
                        // Create fresh RoomManager for each property test iteration
                        const testRoomManager = new RoomManager();
                        
                        // Add players to queue
                        for (const player of players) {
                            testRoomManager.addToMatchmaking(
                                player.playerId,
                                { username: player.username, elo: player.elo },
                                { id: `socket_${player.playerId}` }
                            );
                        }
                        
                        // Try to find match
                        const match = testRoomManager.findMatch();
                        
                        // Should return null
                        return match === null;
                    }
                ),
                { numRuns: 5 }
            );
        });

        /**
         * Property 12: Queue cleanup on match
         * 
         * This property verifies that for any successful match,
         * both matched players are removed from the matchmaking queue.
         * 
         * **Validates: Requirements 3.3, 3.4**
         */
        test('Property 12: matched players should be removed from queue', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            playerId: fc.string({ minLength: 1, maxLength: 20 }),
                            username: fc.string({ minLength: 1, maxLength: 20 }),
                            elo: fc.integer({ min: 0, max: 3000 })
                        }),
                        { minLength: 2, maxLength: 100 }
                    ),
                    (players) => {
                        // Ensure all players have unique IDs
                        const uniquePlayers = [];
                        const seenIds = new Set();
                        for (const player of players) {
                            if (!seenIds.has(player.playerId)) {
                                uniquePlayers.push(player);
                                seenIds.add(player.playerId);
                            }
                        }
                        
                        if (uniquePlayers.length < 2) {
                            return true; // Skip if not enough unique players
                        }
                        
                        // Add all players to matchmaking queue
                        for (const player of uniquePlayers) {
                            roomManager.addToMatchmaking(
                                player.playerId,
                                { username: player.username, elo: player.elo },
                                { id: `socket_${player.playerId}` }
                            );
                        }
                        
                        const initialQueueSize = roomManager.matchmakingQueue.length;
                        
                        // Find one match
                        const match = roomManager.findMatch();
                        
                        if (!match) {
                            return false; // Should have found a match
                        }
                        
                        // Verify queue size decreased by 2
                        const newQueueSize = roomManager.matchmakingQueue.length;
                        if (newQueueSize !== initialQueueSize - 2) {
                            return false;
                        }
                        
                        // Verify matched players are not in queue
                        const remainingPlayerIds = roomManager.matchmakingQueue.map(
                            entry => entry.playerId
                        );
                        
                        if (remainingPlayerIds.includes(match.player1.playerId)) {
                            return false;
                        }
                        
                        if (remainingPlayerIds.includes(match.player2.playerId)) {
                            return false;
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('Property 12: multiple matches should clean up queue correctly', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 4, max: 100 }),
                    (numPlayers) => {
                        // Create fresh RoomManager for each property test iteration
                        const testRoomManager = new RoomManager();
                        
                        // Add players to queue
                        for (let i = 0; i < numPlayers; i++) {
                            testRoomManager.addToMatchmaking(
                                `player${i}`,
                                { username: `Player${i}`, elo: 1200 },
                                { id: `socket_${i}` }
                            );
                        }
                        
                        // Find all possible matches
                        const matchedPlayerIds = new Set();
                        let match;
                        while ((match = testRoomManager.findMatch()) !== null) {
                            matchedPlayerIds.add(match.player1.playerId);
                            matchedPlayerIds.add(match.player2.playerId);
                        }
                        
                        // Verify remaining queue size
                        const expectedRemaining = numPlayers % 2;
                        const actualRemaining = testRoomManager.matchmakingQueue.length;
                        
                        if (actualRemaining !== expectedRemaining) {
                            return false;
                        }
                        
                        // Verify no matched players remain in queue
                        for (const entry of testRoomManager.matchmakingQueue) {
                            if (matchedPlayerIds.has(entry.playerId)) {
                                return false;
                            }
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        /**
         * Property 13: Queue cleanup on disconnection
         * 
         * This property verifies that for any player disconnection while
         * in the matchmaking queue, that player is removed from the queue.
         * 
         * **Validates: Requirements 3.5**
         */
        test('Property 13: disconnected players should be removed from queue', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        players: fc.array(
                            fc.record({
                                playerId: fc.string({ minLength: 1, maxLength: 20 }),
                                username: fc.string({ minLength: 1, maxLength: 20 }),
                                elo: fc.integer({ min: 0, max: 3000 })
                            }),
                            { minLength: 1, maxLength: 50 }
                        ),
                        disconnectIndices: fc.array(
                            fc.integer({ min: 0, max: 49 }),
                            { minLength: 0, maxLength: 25 }
                        )
                    }),
                    ({ players, disconnectIndices }) => {
                        // Create fresh RoomManager for each property test iteration
                        const testRoomManager = new RoomManager();
                        
                        // Ensure all players have unique IDs
                        const uniquePlayers = [];
                        const seenIds = new Set();
                        for (const player of players) {
                            if (!seenIds.has(player.playerId)) {
                                uniquePlayers.push(player);
                                seenIds.add(player.playerId);
                            }
                        }
                        
                        if (uniquePlayers.length === 0) {
                            return true; // Skip empty case
                        }
                        
                        // Add all players to matchmaking queue
                        for (const player of uniquePlayers) {
                            testRoomManager.addToMatchmaking(
                                player.playerId,
                                { username: player.username, elo: player.elo },
                                { id: `socket_${player.playerId}` }
                            );
                        }
                        
                        // Disconnect some players
                        const disconnectedPlayerIds = new Set();
                        for (const index of disconnectIndices) {
                            if (index < uniquePlayers.length) {
                                const player = uniquePlayers[index];
                                testRoomManager.removeFromMatchmaking(player.playerId);
                                disconnectedPlayerIds.add(player.playerId);
                            }
                        }
                        
                        // Verify disconnected players are not in queue
                        const remainingPlayerIds = testRoomManager.matchmakingQueue.map(
                            entry => entry.playerId
                        );
                        
                        for (const disconnectedId of disconnectedPlayerIds) {
                            if (remainingPlayerIds.includes(disconnectedId)) {
                                return false;
                            }
                        }
                        
                        // Verify only non-disconnected players remain
                        const expectedRemaining = uniquePlayers.filter(
                            p => !disconnectedPlayerIds.has(p.playerId)
                        ).length;
                        
                        if (testRoomManager.matchmakingQueue.length !== expectedRemaining) {
                            return false;
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('Property 13: removing non-existent player should not affect queue', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        players: fc.array(
                            fc.record({
                                playerId: fc.string({ minLength: 1, maxLength: 20 }),
                                username: fc.string({ minLength: 1, maxLength: 20 }),
                                elo: fc.integer({ min: 0, max: 3000 })
                            }),
                            { minLength: 1, maxLength: 50 }
                        ),
                        nonExistentPlayerId: fc.string({ minLength: 1, maxLength: 20 })
                    }),
                    ({ players, nonExistentPlayerId }) => {
                        // Create fresh RoomManager for each property test iteration
                        const testRoomManager = new RoomManager();
                        
                        // Ensure all players have unique IDs
                        const uniquePlayers = [];
                        const seenIds = new Set();
                        for (const player of players) {
                            if (!seenIds.has(player.playerId)) {
                                uniquePlayers.push(player);
                                seenIds.add(player.playerId);
                            }
                        }
                        
                        // Ensure nonExistentPlayerId is actually not in the list
                        if (seenIds.has(nonExistentPlayerId)) {
                            nonExistentPlayerId = nonExistentPlayerId + '_nonexistent';
                        }
                        
                        // Add all players to matchmaking queue
                        for (const player of uniquePlayers) {
                            testRoomManager.addToMatchmaking(
                                player.playerId,
                                { username: player.username, elo: player.elo },
                                { id: `socket_${player.playerId}` }
                            );
                        }
                        
                        const initialQueueSize = testRoomManager.matchmakingQueue.length;
                        
                        // Try to remove non-existent player
                        testRoomManager.removeFromMatchmaking(nonExistentPlayerId);
                        
                        // Queue size should remain the same
                        const newQueueSize = testRoomManager.matchmakingQueue.length;
                        if (newQueueSize !== initialQueueSize) {
                            return false;
                        }
                        
                        // All original players should still be in queue
                        const remainingPlayerIds = testRoomManager.matchmakingQueue.map(
                            entry => entry.playerId
                        );
                        
                        for (const player of uniquePlayers) {
                            if (!remainingPlayerIds.includes(player.playerId)) {
                                return false;
                            }
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        /**
         * Combined property test: Verify all matchmaking behaviors together
         * 
         * This test generates random matchmaking scenarios to verify
         * that all four properties hold simultaneously.
         */
        test('should handle complex matchmaking scenarios correctly', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            action: fc.oneof(
                                fc.constant('add'),
                                fc.constant('remove'),
                                fc.constant('match')
                            ),
                            playerId: fc.string({ minLength: 1, maxLength: 20 }),
                            username: fc.string({ minLength: 1, maxLength: 20 }),
                            elo: fc.integer({ min: 0, max: 3000 })
                        }),
                        { minLength: 1, maxLength: 100 }
                    ),
                    (actions) => {
                        // Create fresh RoomManager for each property test iteration
                        const testRoomManager = new RoomManager();
                        const addedPlayers = new Set();
                        const matchedPlayers = new Set();
                        
                        for (const action of actions) {
                            if (action.action === 'add') {
                                // Add player to queue
                                testRoomManager.addToMatchmaking(
                                    action.playerId,
                                    { username: action.username, elo: action.elo },
                                    { id: `socket_${action.playerId}` }
                                );
                                addedPlayers.add(action.playerId);
                                
                            } else if (action.action === 'remove') {
                                // Remove player from queue
                                testRoomManager.removeFromMatchmaking(action.playerId);
                                addedPlayers.delete(action.playerId);
                                
                            } else if (action.action === 'match') {
                                // Try to find a match
                                const match = testRoomManager.findMatch();
                                
                                if (match) {
                                    // Verify match has two different players
                                    if (match.player1.playerId === match.player2.playerId) {
                                        return false;
                                    }
                                    
                                    // Track matched players
                                    matchedPlayers.add(match.player1.playerId);
                                    matchedPlayers.add(match.player2.playerId);
                                    addedPlayers.delete(match.player1.playerId);
                                    addedPlayers.delete(match.player2.playerId);
                                    
                                    // Verify room was created
                                    const room = testRoomManager.getRoom(match.roomCode);
                                    if (!room || !room.whitePlayer || !room.blackPlayer) {
                                        return false;
                                    }
                                }
                            }
                        }
                        
                        // Verify queue contains only non-matched, added players
                        const queuePlayerIds = testRoomManager.matchmakingQueue.map(
                            entry => entry.playerId
                        );
                        
                        // No matched players should be in queue
                        for (const matchedId of matchedPlayers) {
                            if (queuePlayerIds.includes(matchedId)) {
                                return false;
                            }
                        }
                        
                        // All queue players should be in addedPlayers
                        for (const queueId of queuePlayerIds) {
                            if (!addedPlayers.has(queueId)) {
                                return false;
                            }
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        /**
         * Invariant test: Queue should never contain matched players
         */
        test('queue should maintain invariant: no matched players in queue', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            playerId: fc.string({ minLength: 1, maxLength: 20 }),
                            username: fc.string({ minLength: 1, maxLength: 20 }),
                            elo: fc.integer({ min: 0, max: 3000 })
                        }),
                        { minLength: 2, maxLength: 100 }
                    ),
                    (players) => {
                        // Create fresh RoomManager for each property test iteration
                        const testRoomManager = new RoomManager();
                        
                        // Ensure all players have unique IDs
                        const uniquePlayers = [];
                        const seenIds = new Set();
                        for (const player of players) {
                            if (!seenIds.has(player.playerId)) {
                                uniquePlayers.push(player);
                                seenIds.add(player.playerId);
                            }
                        }
                        
                        if (uniquePlayers.length < 2) {
                            return true; // Skip if not enough unique players
                        }
                        
                        // Add all players to matchmaking queue
                        for (const player of uniquePlayers) {
                            testRoomManager.addToMatchmaking(
                                player.playerId,
                                { username: player.username, elo: player.elo },
                                { id: `socket_${player.playerId}` }
                            );
                        }
                        
                        // Find matches and verify invariant after each match
                        const allMatchedPlayers = new Set();
                        let match;
                        
                        while ((match = testRoomManager.findMatch()) !== null) {
                            allMatchedPlayers.add(match.player1.playerId);
                            allMatchedPlayers.add(match.player2.playerId);
                            
                            // Verify invariant: no matched players in queue
                            const queuePlayerIds = testRoomManager.matchmakingQueue.map(
                                entry => entry.playerId
                            );
                            
                            for (const matchedId of allMatchedPlayers) {
                                if (queuePlayerIds.includes(matchedId)) {
                                    return false; // Invariant violated!
                                }
                            }
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });
    });
});
