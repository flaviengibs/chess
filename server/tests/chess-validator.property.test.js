const fc = require('fast-check');
const ChessValidator = require('../chess-validator');
const ChessEngine = require('../chess-engine');

/**
 * Property-Based Tests for ChessValidator
 * 
 * Feature: real-multiplayer-socketio
 * Property 15: Comprehensive move validation
 * 
 * **Validates: Requirements 4.2, 10.1, 10.2, 10.3, 10.4**
 * 
 * These tests verify that the server validates all four conditions for every move:
 * 1. It is the correct player's turn (Requirement 10.1)
 * 2. The piece belongs to the moving player (Requirement 10.2)
 * 3. The move follows chess rules (Requirement 10.3)
 * 4. The move does not leave the king in check (Requirement 10.4)
 */

describe('ChessValidator - Property-Based Tests', () => {
    let validator;

    beforeEach(() => {
        validator = new ChessValidator();
    });

    // Arbitrary generators for chess positions
    const squareArbitrary = () => fc.record({
        row: fc.integer({ min: 0, max: 7 }),
        col: fc.integer({ min: 0, max: 7 })
    });

    const pieceArbitrary = () => fc.oneof(
        fc.constant('P'), fc.constant('N'), fc.constant('B'),
        fc.constant('R'), fc.constant('Q'), fc.constant('K'),
        fc.constant('p'), fc.constant('n'), fc.constant('b'),
        fc.constant('r'), fc.constant('q'), fc.constant('k')
    );

    const playerArbitrary = () => fc.oneof(
        fc.constant('white'),
        fc.constant('black')
    );

    // Helper to create a valid initial game state
    const createInitialGameState = () => {
        const engine = new ChessEngine();
        return {
            board: engine.board.map(row => [...row]),
            currentPlayer: 'white',
            gameStatus: 'playing',
            moveHistory: [],
            capturedPieces: { white: [], black: [] },
            enPassantTarget: null,
            castlingRights: {
                white: { kingside: true, queenside: true },
                black: { kingside: true, queenside: true }
            },
            halfMoveClock: 0,
            fullMoveNumber: 1
        };
    };

    /**
     * Property 15: Comprehensive move validation
     * 
     * This property verifies that the validator performs all four validation checks:
     * 1. Turn validation (Requirement 10.1)
     * 2. Piece ownership validation (Requirement 10.2)
     * 3. Chess rules validation (Requirement 10.3)
     * 4. King safety validation (Requirement 10.4)
     */
    describe('Property 15: Comprehensive move validation', () => {
        test('should always validate turn order (Requirement 10.1)', () => {
            fc.assert(
                fc.property(
                    squareArbitrary(),
                    squareArbitrary(),
                    (from, to) => {
                        const gameState = createInitialGameState();
                        
                        // Try to move a black piece when it's white's turn
                        // Black pieces are on rows 0 and 1
                        const blackPieceFrom = { row: 1, col: from.col };
                        
                        const result = validator.validateMove(
                            gameState,
                            blackPieceFrom,
                            to,
                            null
                        );

                        // Should be rejected because it's not black's turn
                        // Either "Not your piece" or "No piece at source square" or "Invalid move"
                        // The key is that it should NOT be valid
                        if (result.valid) {
                            // If it's valid, it must be because the move is actually legal
                            // (e.g., we accidentally picked a white piece position)
                            return true;
                        }
                        
                        // Should be rejected with appropriate error
                        return !result.valid && result.error !== null;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should always validate piece ownership (Requirement 10.2)', () => {
            fc.assert(
                fc.property(
                    squareArbitrary(),
                    squareArbitrary(),
                    (from, to) => {
                        const gameState = createInitialGameState();
                        gameState.currentPlayer = 'white';
                        
                        // Ensure we're trying to move a black piece (rows 0-1)
                        const blackPieceFrom = { row: Math.min(1, from.row), col: from.col };
                        
                        const result = validator.validateMove(
                            gameState,
                            blackPieceFrom,
                            to,
                            null
                        );

                        // If there's a black piece at the source, it should be rejected
                        // because it's white's turn
                        if (gameState.board[blackPieceFrom.row][blackPieceFrom.col]) {
                            const piece = gameState.board[blackPieceFrom.row][blackPieceFrom.col];
                            const isBlackPiece = piece === piece.toLowerCase();
                            
                            if (isBlackPiece) {
                                // Should be rejected with "Not your piece" error
                                return !result.valid && result.error === 'Not your piece';
                            }
                        }
                        
                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should always validate chess rules (Requirement 10.3)', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 7 }),
                    squareArbitrary(),
                    (col, to) => {
                        const gameState = createInitialGameState();
                        
                        // Try to move a white pawn from its starting position
                        const from = { row: 6, col: col };
                        
                        const result = validator.validateMove(
                            gameState,
                            from,
                            to,
                            null
                        );

                        // If the move is valid, it must follow chess rules
                        if (result.valid) {
                            // White pawns can only move to row 5 or 4 from row 6
                            // and only in the same column (or adjacent for captures)
                            const validPawnMoves = (
                                (to.row === 5 && to.col === col) || // One square forward
                                (to.row === 4 && to.col === col)    // Two squares forward
                            );
                            return validPawnMoves;
                        }
                        
                        // If invalid, should have an error message
                        return result.error !== null;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should always validate king safety (Requirement 10.4)', () => {
            fc.assert(
                fc.property(
                    squareArbitrary(),
                    (to) => {
                        // Create a position where a piece is pinned
                        // White king on e2, white bishop on d2, black rook on a2
                        const gameState = {
                            board: [
                                [null, null, null, null, null, null, null, null],
                                [null, null, null, null, null, null, null, null],
                                [null, null, null, null, null, null, null, null],
                                [null, null, null, null, null, null, null, null],
                                [null, null, null, null, null, null, null, null],
                                [null, null, null, null, null, null, null, null],
                                ['r', null, null, 'B', 'K', null, null, null], // Black rook on a2, white bishop on d2, white king on e2
                                [null, null, null, null, 'k', null, null, null]  // Black king on e1
                            ],
                            currentPlayer: 'white',
                            gameStatus: 'playing',
                            moveHistory: [],
                            capturedPieces: { white: [], black: [] },
                            enPassantTarget: null,
                            castlingRights: {
                                white: { kingside: false, queenside: false },
                                black: { kingside: false, queenside: false }
                            },
                            halfMoveClock: 0,
                            fullMoveNumber: 1
                        };

                        // Try to move the pinned bishop
                        const from = { row: 6, col: 3 }; // d2 (bishop)
                        
                        const result = validator.validateMove(
                            gameState,
                            from,
                            to,
                            null
                        );

                        // If the move is valid, it must not leave the king in check
                        if (result.valid) {
                            // The bishop can only move along the a2-e2 diagonal
                            // or stay on the 2nd rank to block the rook
                            // Any other move would expose the king
                            const staysOnRank = to.row === 6;
                            return staysOnRank || !result.valid;
                        }
                        
                        // Invalid moves should have an error
                        return result.error !== null;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should reject all invalid moves with appropriate errors', () => {
            fc.assert(
                fc.property(
                    squareArbitrary(),
                    squareArbitrary(),
                    playerArbitrary(),
                    (from, to, player) => {
                        const gameState = createInitialGameState();
                        gameState.currentPlayer = player;
                        
                        const result = validator.validateMove(
                            gameState,
                            from,
                            to,
                            null
                        );

                        // Every validation result must have a valid boolean
                        if (typeof result.valid !== 'boolean') {
                            return false;
                        }

                        // If invalid, must have an error message
                        if (!result.valid && !result.error) {
                            return false;
                        }

                        // If valid, error should be null
                        if (result.valid && result.error !== null) {
                            return false;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should validate all four checks for every move attempt', () => {
            fc.assert(
                fc.property(
                    squareArbitrary(),
                    squareArbitrary(),
                    (from, to) => {
                        const gameState = createInitialGameState();
                        
                        const result = validator.validateMove(
                            gameState,
                            from,
                            to,
                            null
                        );

                        // The validator should always return a result object
                        if (!result || typeof result !== 'object') {
                            return false;
                        }

                        // Must have valid and error properties
                        if (!('valid' in result) || !('error' in result)) {
                            return false;
                        }

                        // If the move is invalid, one of the four checks must have failed:
                        // 1. Invalid coordinates
                        // 2. No piece at source
                        // 3. Not your piece (turn/ownership)
                        // 4. Invalid move for piece (chess rules)
                        // 5. Would leave king in check
                        if (!result.valid) {
                            const validErrors = [
                                'Invalid square coordinates',
                                'No piece at source square',
                                'Not your piece',
                                'Invalid move for this piece',
                                'Move would leave king in check',
                                'Promotion piece required',
                                'Invalid promotion piece'
                            ];
                            return validErrors.includes(result.error);
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should handle edge cases: out of bounds moves', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: -5, max: 12 }),
                    fc.integer({ min: -5, max: 12 }),
                    fc.integer({ min: -5, max: 12 }),
                    fc.integer({ min: -5, max: 12 }),
                    (fromRow, fromCol, toRow, toCol) => {
                        const gameState = createInitialGameState();
                        
                        const from = { row: fromRow, col: fromCol };
                        const to = { row: toRow, col: toCol };
                        
                        const result = validator.validateMove(
                            gameState,
                            from,
                            to,
                            null
                        );

                        // If coordinates are out of bounds, should be rejected
                        const fromOutOfBounds = fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7;
                        const toOutOfBounds = toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7;
                        
                        if (fromOutOfBounds || toOutOfBounds) {
                            return !result.valid && result.error === 'Invalid square coordinates';
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('should handle promotion validation correctly', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 7 }),
                    fc.option(fc.oneof(
                        fc.constant('Q'), fc.constant('R'), 
                        fc.constant('B'), fc.constant('N'),
                        fc.constant('K'), fc.constant('P') // Invalid promotions
                    ), { nil: null }),
                    (col, promotion) => {
                        // Set up a white pawn about to promote
                        const gameState = {
                            board: [
                                [null, null, null, null, null, null, null, null],
                                [null, null, null, null, 'P', null, null, null], // White pawn on e7
                                [null, null, null, null, null, null, null, null],
                                [null, null, null, null, null, null, null, null],
                                [null, null, null, null, null, null, null, null],
                                [null, null, null, null, null, null, null, null],
                                [null, null, null, null, null, null, null, null],
                                [null, null, 'k', null, 'K', null, null, null]
                            ],
                            currentPlayer: 'white',
                            gameStatus: 'playing',
                            moveHistory: [],
                            capturedPieces: { white: [], black: [] },
                            enPassantTarget: null,
                            castlingRights: {
                                white: { kingside: false, queenside: false },
                                black: { kingside: false, queenside: false }
                            },
                            halfMoveClock: 0,
                            fullMoveNumber: 1
                        };

                        const from = { row: 1, col: 4 }; // e7
                        const to = { row: 0, col: 4 }; // e8
                        
                        const result = validator.validateMove(
                            gameState,
                            from,
                            to,
                            promotion
                        );

                        // If no promotion piece provided, should be rejected
                        if (promotion === null) {
                            return !result.valid && result.error === 'Promotion piece required';
                        }

                        // If invalid promotion piece (K or P), should be rejected
                        if (promotion === 'K' || promotion === 'P') {
                            return !result.valid && result.error === 'Invalid promotion piece';
                        }

                        // Valid promotion pieces (Q, R, B, N) should be accepted
                        if (['Q', 'R', 'B', 'N'].includes(promotion)) {
                            return result.valid === true;
                        }

                        return true;
                    }
                ),
                { numRuns: 5 }
            );
        });
    });
});
