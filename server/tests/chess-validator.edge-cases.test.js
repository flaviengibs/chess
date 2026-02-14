const ChessValidator = require('../chess-validator');
const ChessEngine = require('../chess-engine');

/**
 * Edge Case Tests for ChessValidator
 * 
 * This test suite covers edge cases for chess validation:
 * - Castling validation (kingside and queenside)
 * - En passant validation
 * - Pawn promotion validation
 * - Check detection
 * 
 * Requirements: 4.2, 10.3, 10.4
 */
describe('ChessValidator - Edge Cases', () => {
    let validator;

    beforeEach(() => {
        validator = new ChessValidator();
    });

    describe('Castling Validation', () => {
        describe('Kingside Castling', () => {
            test('should allow kingside castling when conditions are met', () => {
                const engine = new ChessEngine();
                // Clear pieces between king and rook
                engine.board[7][5] = null; // f1
                engine.board[7][6] = null; // g1

                const gameState = {
                    board: engine.board,
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

                const result = validator.validateMove(
                    gameState,
                    { row: 7, col: 4 }, // e1 (king)
                    { row: 7, col: 6 }, // g1 (kingside castle)
                    null
                );

                expect(result.valid).toBe(true);
                expect(result.error).toBe(null);
            });

            test('should reject kingside castling when king has moved', () => {
                const engine = new ChessEngine();
                engine.board[7][5] = null; // f1
                engine.board[7][6] = null; // g1

                const gameState = {
                    board: engine.board,
                    currentPlayer: 'white',
                    gameStatus: 'playing',
                    moveHistory: [],
                    capturedPieces: { white: [], black: [] },
                    enPassantTarget: null,
                    castlingRights: {
                        white: { kingside: false, queenside: false }, // King has moved
                        black: { kingside: true, queenside: true }
                    },
                    halfMoveClock: 0,
                    fullMoveNumber: 1
                };

                const result = validator.validateMove(
                    gameState,
                    { row: 7, col: 4 }, // e1 (king)
                    { row: 7, col: 6 }, // g1 (kingside castle)
                    null
                );

                expect(result.valid).toBe(false);
                expect(result.error).toBe('Invalid move for this piece');
            });

            test('should reject kingside castling when rook has moved', () => {
                const engine = new ChessEngine();
                engine.board[7][5] = null; // f1
                engine.board[7][6] = null; // g1

                const gameState = {
                    board: engine.board,
                    currentPlayer: 'white',
                    gameStatus: 'playing',
                    moveHistory: [],
                    capturedPieces: { white: [], black: [] },
                    enPassantTarget: null,
                    castlingRights: {
                        white: { kingside: false, queenside: true }, // Kingside rook has moved
                        black: { kingside: true, queenside: true }
                    },
                    halfMoveClock: 0,
                    fullMoveNumber: 1
                };

                const result = validator.validateMove(
                    gameState,
                    { row: 7, col: 4 }, // e1 (king)
                    { row: 7, col: 6 }, // g1 (kingside castle)
                    null
                );

                expect(result.valid).toBe(false);
                expect(result.error).toBe('Invalid move for this piece');
            });

            test('should reject kingside castling when path is blocked', () => {
                const engine = new ChessEngine();
                // Leave knight on g1 (blocking path)
                engine.board[7][5] = null; // f1 is clear

                const gameState = {
                    board: engine.board,
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

                const result = validator.validateMove(
                    gameState,
                    { row: 7, col: 4 }, // e1 (king)
                    { row: 7, col: 6 }, // g1 (kingside castle)
                    null
                );

                expect(result.valid).toBe(false);
                expect(result.error).toBe('Invalid move for this piece');
            });

            test('should reject kingside castling when king is in check', () => {
                const engine = new ChessEngine();
                engine.board[7][5] = null; // f1
                engine.board[7][6] = null; // g1
                // Place black rook attacking the king on e1
                // Need to clear the path for the rook
                engine.board[1][4] = null; // Clear e7
                engine.board[2][4] = null; // Clear e6
                engine.board[3][4] = null; // Clear e5
                engine.board[4][4] = null; // Clear e4
                engine.board[5][4] = null; // Clear e3
                engine.board[6][4] = null; // Clear e2
                engine.board[0][4] = 'r'; // Black rook on e8 attacking e1

                const gameState = {
                    board: engine.board,
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

                const result = validator.validateMove(
                    gameState,
                    { row: 7, col: 4 }, // e1 (king)
                    { row: 7, col: 6 }, // g1 (kingside castle)
                    null
                );

                expect(result.valid).toBe(false);
                expect(result.error).toBe('Invalid move for this piece');
            });

            test('should reject kingside castling when king passes through check', () => {
                const engine = new ChessEngine();
                engine.board[7][5] = null; // f1
                engine.board[7][6] = null; // g1
                // Place black rook attacking f1 (king would pass through check)
                // Clear the path for the rook
                engine.board[1][5] = null; // Clear f7
                engine.board[2][5] = null; // Clear f6
                engine.board[3][5] = null; // Clear f5
                engine.board[4][5] = null; // Clear f4
                engine.board[5][5] = null; // Clear f3
                engine.board[6][5] = null; // Clear f2
                engine.board[0][5] = 'r'; // Black rook on f8 attacking f1

                const gameState = {
                    board: engine.board,
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

                const result = validator.validateMove(
                    gameState,
                    { row: 7, col: 4 }, // e1 (king)
                    { row: 7, col: 6 }, // g1 (kingside castle)
                    null
                );

                expect(result.valid).toBe(false);
                expect(result.error).toBe('Invalid move for this piece');
            });

            test('should reject kingside castling when king ends in check', () => {
                const engine = new ChessEngine();
                engine.board[7][5] = null; // f1
                engine.board[7][6] = null; // g1
                // Place black rook attacking g1 (destination square)
                // Clear the path for the rook
                engine.board[1][6] = null; // Clear g7
                engine.board[2][6] = null; // Clear g6
                engine.board[3][6] = null; // Clear g5
                engine.board[4][6] = null; // Clear g4
                engine.board[5][6] = null; // Clear g3
                engine.board[6][6] = null; // Clear g2
                engine.board[0][6] = 'r'; // Black rook on g8 attacking g1

                const gameState = {
                    board: engine.board,
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

                const result = validator.validateMove(
                    gameState,
                    { row: 7, col: 4 }, // e1 (king)
                    { row: 7, col: 6 }, // g1 (kingside castle)
                    null
                );

                expect(result.valid).toBe(false);
                expect(result.error).toBe('Invalid move for this piece');
            });
        });

        describe('Queenside Castling', () => {
            test('should allow queenside castling when conditions are met', () => {
                const engine = new ChessEngine();
                // Clear pieces between king and rook
                engine.board[7][1] = null; // b1
                engine.board[7][2] = null; // c1
                engine.board[7][3] = null; // d1

                const gameState = {
                    board: engine.board,
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

                const result = validator.validateMove(
                    gameState,
                    { row: 7, col: 4 }, // e1 (king)
                    { row: 7, col: 2 }, // c1 (queenside castle)
                    null
                );

                expect(result.valid).toBe(true);
                expect(result.error).toBe(null);
            });

            test('should reject queenside castling when queenside rook has moved', () => {
                const engine = new ChessEngine();
                engine.board[7][1] = null; // b1
                engine.board[7][2] = null; // c1
                engine.board[7][3] = null; // d1

                const gameState = {
                    board: engine.board,
                    currentPlayer: 'white',
                    gameStatus: 'playing',
                    moveHistory: [],
                    capturedPieces: { white: [], black: [] },
                    enPassantTarget: null,
                    castlingRights: {
                        white: { kingside: true, queenside: false }, // Queenside rook has moved
                        black: { kingside: true, queenside: true }
                    },
                    halfMoveClock: 0,
                    fullMoveNumber: 1
                };

                const result = validator.validateMove(
                    gameState,
                    { row: 7, col: 4 }, // e1 (king)
                    { row: 7, col: 2 }, // c1 (queenside castle)
                    null
                );

                expect(result.valid).toBe(false);
                expect(result.error).toBe('Invalid move for this piece');
            });

            test('should reject queenside castling when path is blocked', () => {
                const engine = new ChessEngine();
                // Leave bishop on c1 (blocking path)
                engine.board[7][1] = null; // b1 is clear
                engine.board[7][3] = null; // d1 is clear

                const gameState = {
                    board: engine.board,
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

                const result = validator.validateMove(
                    gameState,
                    { row: 7, col: 4 }, // e1 (king)
                    { row: 7, col: 2 }, // c1 (queenside castle)
                    null
                );

                expect(result.valid).toBe(false);
                expect(result.error).toBe('Invalid move for this piece');
            });


            test('should reject queenside castling when king passes through check', () => {
                const engine = new ChessEngine();
                engine.board[7][1] = null; // b1
                engine.board[7][2] = null; // c1
                engine.board[7][3] = null; // d1
                // Place black rook attacking d1 (king would pass through check)
                // Clear the path for the rook
                engine.board[1][3] = null; // Clear d7
                engine.board[2][3] = null; // Clear d6
                engine.board[3][3] = null; // Clear d5
                engine.board[4][3] = null; // Clear d4
                engine.board[5][3] = null; // Clear d3
                engine.board[6][3] = null; // Clear d2
                engine.board[0][3] = 'r'; // Black rook on d8 attacking d1

                const gameState = {
                    board: engine.board,
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

                const result = validator.validateMove(
                    gameState,
                    { row: 7, col: 4 }, // e1 (king)
                    { row: 7, col: 2 }, // c1 (queenside castle)
                    null
                );

                expect(result.valid).toBe(false);
                expect(result.error).toBe('Invalid move for this piece');
            });

            test('should allow black queenside castling', () => {
                const engine = new ChessEngine();
                // Clear pieces between black king and rook
                engine.board[0][1] = null; // b8
                engine.board[0][2] = null; // c8
                engine.board[0][3] = null; // d8
                engine.currentPlayer = 'black';

                const gameState = {
                    board: engine.board,
                    currentPlayer: 'black',
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

                const result = validator.validateMove(
                    gameState,
                    { row: 0, col: 4 }, // e8 (black king)
                    { row: 0, col: 2 }, // c8 (queenside castle)
                    null
                );

                expect(result.valid).toBe(true);
                expect(result.error).toBe(null);
            });
        });
    });


    describe('En Passant Validation', () => {
        test('should allow en passant capture when conditions are met', () => {
            const engine = new ChessEngine();
            // Set up position: white pawn on d5, black pawn just moved from e7 to e5
            engine.board = [
                ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
                ['p', 'p', 'p', 'p', null, 'p', 'p', 'p'],
                [null, null, null, null, null, null, null, null],
                [null, null, null, 'P', 'p', null, null, null], // White pawn on d5, black pawn on e5
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                ['P', 'P', 'P', null, 'P', 'P', 'P', 'P'],
                ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
                currentPlayer: 'white',
                gameStatus: 'playing',
                moveHistory: [],
                capturedPieces: { white: [], black: [] },
                enPassantTarget: { row: 2, col: 4 }, // e6 (en passant target)
                castlingRights: {
                    white: { kingside: true, queenside: true },
                    black: { kingside: true, queenside: true }
                },
                halfMoveClock: 0,
                fullMoveNumber: 1
            };

            const result = validator.validateMove(
                gameState,
                { row: 3, col: 3 }, // d5 (white pawn)
                { row: 2, col: 4 }, // e6 (en passant capture)
                null
            );

            // Note: This test depends on the chess engine correctly implementing en passant
            // The validator should accept this as a valid move
            expect(result.valid).toBe(true);
            expect(result.error).toBe(null);
        });

        test('should reject en passant when no en passant target exists', () => {
            const engine = new ChessEngine();
            // Set up position: white pawn on d5, black pawn on e5
            engine.board = [
                ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
                ['p', 'p', 'p', 'p', null, 'p', 'p', 'p'],
                [null, null, null, null, null, null, null, null],
                [null, null, null, 'P', 'p', null, null, null], // White pawn on d5, black pawn on e5
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                ['P', 'P', 'P', null, 'P', 'P', 'P', 'P'],
                ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
                currentPlayer: 'white',
                gameStatus: 'playing',
                moveHistory: [],
                capturedPieces: { white: [], black: [] },
                enPassantTarget: null, // No en passant target
                castlingRights: {
                    white: { kingside: true, queenside: true },
                    black: { kingside: true, queenside: true }
                },
                halfMoveClock: 0,
                fullMoveNumber: 1
            };

            const result = validator.validateMove(
                gameState,
                { row: 3, col: 3 }, // d5 (white pawn)
                { row: 2, col: 4 }, // e6 (attempted en passant)
                null
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid move for this piece');
        });

        test('should allow black en passant capture', () => {
            const engine = new ChessEngine();
            // Set up position: black pawn on d4, white pawn just moved from e2 to e4
            engine.board = [
                ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
                ['p', 'p', 'p', null, 'p', 'p', 'p', 'p'],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, 'p', 'P', null, null, null], // Black pawn on d4, white pawn on e4
                [null, null, null, null, null, null, null, null],
                ['P', 'P', 'P', 'P', null, 'P', 'P', 'P'],
                ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
            ];
            engine.currentPlayer = 'black';

            const gameState = {
                board: engine.board,
                currentPlayer: 'black',
                gameStatus: 'playing',
                moveHistory: [],
                capturedPieces: { white: [], black: [] },
                enPassantTarget: { row: 5, col: 4 }, // e3 (en passant target)
                castlingRights: {
                    white: { kingside: true, queenside: true },
                    black: { kingside: true, queenside: true }
                },
                halfMoveClock: 0,
                fullMoveNumber: 2
            };

            const result = validator.validateMove(
                gameState,
                { row: 4, col: 3 }, // d4 (black pawn)
                { row: 5, col: 4 }, // e3 (en passant capture)
                null
            );

            expect(result.valid).toBe(true);
            expect(result.error).toBe(null);
        });

        test('should reject en passant from wrong pawn', () => {
            const engine = new ChessEngine();
            // Set up position: white pawn on c5, black pawn just moved from e7 to e5
            // But white pawn on c5 is too far away
            engine.board = [
                ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
                ['p', 'p', 'p', 'p', null, 'p', 'p', 'p'],
                [null, null, null, null, null, null, null, null],
                [null, null, 'P', null, 'p', null, null, null], // White pawn on c5, black pawn on e5
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                ['P', 'P', null, 'P', 'P', 'P', 'P', 'P'],
                ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
                currentPlayer: 'white',
                gameStatus: 'playing',
                moveHistory: [],
                capturedPieces: { white: [], black: [] },
                enPassantTarget: { row: 2, col: 4 }, // e6 (en passant target)
                castlingRights: {
                    white: { kingside: true, queenside: true },
                    black: { kingside: true, queenside: true }
                },
                halfMoveClock: 0,
                fullMoveNumber: 1
            };

            const result = validator.validateMove(
                gameState,
                { row: 3, col: 2 }, // c5 (white pawn)
                { row: 2, col: 4 }, // e6 (attempted en passant - too far)
                null
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid move for this piece');
        });
    });

    describe('Pawn Promotion Validation', () => {
        test('should require promotion piece when pawn reaches end rank', () => {
            const engine = new ChessEngine();
            // White pawn on e7 about to promote
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'P', null, null, null], // White pawn on e7
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, 'k', null, 'K', null, null, null]
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            const result = validator.validateMove(
                gameState,
                { row: 1, col: 4 }, // e7
                { row: 0, col: 4 }, // e8
                null // No promotion piece specified
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Promotion piece required');
        });

        test('should accept promotion to queen', () => {
            const engine = new ChessEngine();
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'P', null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, 'k', null, 'K', null, null, null]
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            const result = validator.validateMove(
                gameState,
                { row: 1, col: 4 }, // e7
                { row: 0, col: 4 }, // e8
                'Q' // Promote to queen
            );

            expect(result.valid).toBe(true);
            expect(result.error).toBe(null);
        });

        test('should accept promotion to rook', () => {
            const engine = new ChessEngine();
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'P', null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, 'k', null, 'K', null, null, null]
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            const result = validator.validateMove(
                gameState,
                { row: 1, col: 4 }, // e7
                { row: 0, col: 4 }, // e8
                'R' // Promote to rook
            );

            expect(result.valid).toBe(true);
            expect(result.error).toBe(null);
        });

        test('should accept promotion to bishop', () => {
            const engine = new ChessEngine();
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'P', null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, 'k', null, 'K', null, null, null]
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            const result = validator.validateMove(
                gameState,
                { row: 1, col: 4 }, // e7
                { row: 0, col: 4 }, // e8
                'B' // Promote to bishop
            );

            expect(result.valid).toBe(true);
            expect(result.error).toBe(null);
        });


        test('should accept promotion to knight', () => {
            const engine = new ChessEngine();
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'P', null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, 'k', null, 'K', null, null, null]
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            const result = validator.validateMove(
                gameState,
                { row: 1, col: 4 }, // e7
                { row: 0, col: 4 }, // e8
                'N' // Promote to knight
            );

            expect(result.valid).toBe(true);
            expect(result.error).toBe(null);
        });

        test('should reject promotion to king', () => {
            const engine = new ChessEngine();
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'P', null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, 'k', null, 'K', null, null, null]
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            const result = validator.validateMove(
                gameState,
                { row: 1, col: 4 }, // e7
                { row: 0, col: 4 }, // e8
                'K' // Invalid - can't promote to king
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid promotion piece');
        });

        test('should reject promotion to pawn', () => {
            const engine = new ChessEngine();
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'P', null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, 'k', null, 'K', null, null, null]
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            const result = validator.validateMove(
                gameState,
                { row: 1, col: 4 }, // e7
                { row: 0, col: 4 }, // e8
                'P' // Invalid - can't promote to pawn
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid promotion piece');
        });

        test('should allow black pawn promotion', () => {
            const engine = new ChessEngine();
            // Black pawn on e2 about to promote
            engine.board = [
                [null, null, 'K', null, 'k', null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'p', null, null, null], // Black pawn on e2
                [null, null, null, null, null, null, null, null]
            ];
            engine.currentPlayer = 'black';

            const gameState = {
                board: engine.board,
                currentPlayer: 'black',
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

            const result = validator.validateMove(
                gameState,
                { row: 6, col: 4 }, // e2
                { row: 7, col: 4 }, // e1
                'q' // Promote to queen (lowercase for black)
            );

            expect(result.valid).toBe(true);
            expect(result.error).toBe(null);
        });

        test('should allow promotion with capture', () => {
            const engine = new ChessEngine();
            // White pawn on e7, black knight on d8
            engine.board = [
                [null, null, null, 'n', null, null, null, null], // Black knight on d8
                [null, null, null, null, 'P', null, null, null], // White pawn on e7
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, 'k', null, 'K', null, null, null]
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            const result = validator.validateMove(
                gameState,
                { row: 1, col: 4 }, // e7
                { row: 0, col: 3 }, // d8 (capture knight and promote)
                'Q' // Promote to queen
            );

            expect(result.valid).toBe(true);
            expect(result.error).toBe(null);
        });
    });


    describe('Check Detection', () => {
        test('should detect check from rook', () => {
            const engine = new ChessEngine();
            // White king on e1, black rook on e8 (checking the king)
            engine.board = [
                [null, null, null, null, 'r', null, null, null], // Black rook on e8
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'K', null, null, 'k']  // White king on e1, black king on h1
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            // Try to move a piece that doesn't block or capture the checking piece
            // This should be rejected because the king is in check
            const result = validator.validateMove(
                gameState,
                { row: 7, col: 4 }, // e1 (king)
                { row: 7, col: 3 }, // d1 (king moves away but still in check from rook)
                null
            );

            // The king can't move to d1 because it's still attacked by the rook on e8
            // Actually, d1 is not attacked by the rook on e8, so this should be valid
            // Let me fix this test
            expect(result.valid).toBe(true); // King can escape to d1
        });

        test('should reject move that leaves king in check', () => {
            const engine = new ChessEngine();
            // White king on e1, white bishop on d2, black rook on a2
            // If bishop moves, king is in check from rook
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                ['r', null, null, 'B', 'K', null, null, null], // Black rook on a2, white bishop on d2, white king on e2
                [null, null, null, null, 'k', null, null, null]  // Black king on e1
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            // Moving the bishop would expose the king to the rook
            const result = validator.validateMove(
                gameState,
                { row: 6, col: 3 }, // d2 (bishop)
                { row: 5, col: 2 }, // c3 (moving bishop away)
                null
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid move for this piece');
        });


        test('should detect check from bishop', () => {
            const engine = new ChessEngine();
            // White king on e1, black bishop on a5 (checking the king diagonally)
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                ['b', null, null, null, null, null, null, null], // Black bishop on a5
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'K', null, null, 'k']  // White king on e1, black king on h1
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            // King must respond to check - can't make unrelated moves
            // Try to move king to f1 (escaping check)
            const result = validator.validateMove(
                gameState,
                { row: 7, col: 4 }, // e1 (king)
                { row: 7, col: 5 }, // f1 (king escapes)
                null
            );

            expect(result.valid).toBe(true); // King can escape
        });

        test('should detect check from knight', () => {
            const engine = new ChessEngine();
            // White king on e4, black knight on d2 (checking the king)
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'K', null, null, null], // White king on e4
                [null, null, null, null, null, null, null, null],
                [null, null, null, 'n', null, null, null, null], // Black knight on d2
                [null, null, null, null, 'k', null, null, null]  // Black king on e1
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            // King must move out of check
            const result = validator.validateMove(
                gameState,
                { row: 4, col: 4 }, // e4 (king)
                { row: 3, col: 4 }, // e5 (king escapes)
                null
            );

            expect(result.valid).toBe(true); // King can escape
        });

        test('should detect check from queen', () => {
            const engine = new ChessEngine();
            // White king on e1, black queen on e8 (checking the king)
            engine.board = [
                [null, null, null, null, 'q', null, null, null], // Black queen on e8
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'K', null, null, 'k']  // White king on e1, black king on h1
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            // King must escape check
            const result = validator.validateMove(
                gameState,
                { row: 7, col: 4 }, // e1 (king)
                { row: 7, col: 3 }, // d1 (king escapes)
                null
            );

            expect(result.valid).toBe(true); // King can escape
        });


        test('should detect check from pawn', () => {
            const engine = new ChessEngine();
            // White king on e4, black pawn on d5 (checking the king)
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, 'p', null, null, null, null], // Black pawn on d5
                [null, null, null, null, 'K', null, null, null], // White king on e4
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'k', null, null, null]  // Black king on e1
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            // King must escape check or capture the pawn
            const result = validator.validateMove(
                gameState,
                { row: 4, col: 4 }, // e4 (king)
                { row: 3, col: 3 }, // d5 (king captures pawn)
                null
            );

            expect(result.valid).toBe(true); // King can capture the checking pawn
        });

        test('should allow blocking check with another piece', () => {
            const engine = new ChessEngine();
            // White king on e1, black rook on e8, white bishop on c3
            engine.board = [
                [null, null, null, null, 'r', null, null, null], // Black rook on e8
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, 'B', null, null, null, null, null], // White bishop on c3
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'K', null, null, 'k']  // White king on e1, black king on h1
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            // Block check by moving bishop to e5
            const result = validator.validateMove(
                gameState,
                { row: 5, col: 2 }, // c3 (bishop)
                { row: 3, col: 4 }, // e5 (blocks check)
                null
            );

            expect(result.valid).toBe(true); // Bishop can block the check
        });

        test('should reject move that does not resolve check', () => {
            const engine = new ChessEngine();
            // White king on e1 in check from black rook on e8, white pawn on a2
            engine.board = [
                [null, null, null, null, 'r', null, null, null], // Black rook on e8
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                ['P', null, null, null, null, null, null, null], // White pawn on a2
                [null, null, null, null, 'K', null, null, 'k']  // White king on e1, black king on h1
            ];
            engine.currentPlayer = 'white';

            const gameState = {
                board: engine.board,
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

            // Try to move pawn (doesn't resolve check)
            const result = validator.validateMove(
                gameState,
                { row: 6, col: 0 }, // a2 (pawn)
                { row: 5, col: 0 }, // a3 (doesn't help with check)
                null
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid move for this piece');
        });
    });
});
