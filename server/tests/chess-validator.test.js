const ChessValidator = require('../chess-validator');
const ChessEngine = require('../chess-engine');

describe('ChessValidator', () => {
    let validator;

    beforeEach(() => {
        validator = new ChessValidator();
    });

    describe('isValidSquare', () => {
        test('should return true for valid squares', () => {
            expect(validator.isValidSquare(0, 0)).toBe(true);
            expect(validator.isValidSquare(7, 7)).toBe(true);
            expect(validator.isValidSquare(3, 4)).toBe(true);
        });

        test('should return false for invalid squares', () => {
            expect(validator.isValidSquare(-1, 0)).toBe(false);
            expect(validator.isValidSquare(0, -1)).toBe(false);
            expect(validator.isValidSquare(8, 0)).toBe(false);
            expect(validator.isValidSquare(0, 8)).toBe(false);
            expect(validator.isValidSquare(10, 10)).toBe(false);
        });
    });

    describe('validateMove', () => {
        test('should validate a simple pawn move', () => {
            const engine = new ChessEngine();
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
                { row: 6, col: 4 }, // e2
                { row: 4, col: 4 }, // e4
                null
            );

            expect(result.valid).toBe(true);
            expect(result.error).toBe(null);
        });

        test('should reject move with invalid coordinates', () => {
            const engine = new ChessEngine();
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
                { row: 6, col: 4 },
                { row: 10, col: 4 }, // Invalid row
                null
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid square coordinates');
        });

        test('should reject move from empty square', () => {
            const engine = new ChessEngine();
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
                { row: 4, col: 4 }, // Empty square
                { row: 3, col: 4 },
                null
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('No piece at source square');
        });

        test('should reject moving opponent\'s piece', () => {
            const engine = new ChessEngine();
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
                { row: 1, col: 4 }, // Black pawn
                { row: 3, col: 4 },
                null
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Not your piece');
        });

        test('should reject invalid move for piece', () => {
            const engine = new ChessEngine();
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
                { row: 6, col: 4 }, // White pawn
                { row: 3, col: 4 }, // Three squares forward (invalid)
                null
            );

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid move for this piece');
        });

        test('should require promotion piece for pawn reaching end', () => {
            const engine = new ChessEngine();
            // Set up a board with a white pawn about to promote
            // Clear the board first
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'P', null, null, null], // White pawn on e7
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, 'k', null, 'K', null, null, null]  // Kings separated
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

        test('should accept valid promotion piece', () => {
            const engine = new ChessEngine();
            // Set up a board with a white pawn about to promote
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'P', null, null, null], // White pawn on e7
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, 'k', null, 'K', null, null, null]  // Kings separated
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

        test('should reject invalid promotion piece', () => {
            const engine = new ChessEngine();
            // Set up a board with a white pawn about to promote
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'P', null, null, null], // White pawn on e7
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, 'k', null, 'K', null, null, null]  // Kings separated
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
    });

    describe('isCorrectTurn', () => {
        test('should return true when it is the player\'s turn', () => {
            const gameState = {
                currentPlayer: 'white'
            };

            expect(validator.isCorrectTurn(gameState, 'white')).toBe(true);
        });

        test('should return false when it is not the player\'s turn', () => {
            const gameState = {
                currentPlayer: 'white'
            };

            expect(validator.isCorrectTurn(gameState, 'black')).toBe(false);
        });
    });

    describe('wouldLeaveKingInCheck', () => {
        test('should return false for a safe move', () => {
            const engine = new ChessEngine();
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

            const result = validator.wouldLeaveKingInCheck(
                gameState,
                { row: 6, col: 4 }, // e2
                { row: 4, col: 4 }  // e4
            );

            expect(result).toBe(false);
        });

        test('should return true for a move that leaves king in check', () => {
            const engine = new ChessEngine();
            // Set up a position where a piece is pinned
            // White king on e1, white bishop on d2, black rook on a2 attacking along the 2nd rank
            // If the bishop moves, the king would be in check from the rook
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
            const result = validator.wouldLeaveKingInCheck(
                gameState,
                { row: 6, col: 3 }, // d2 (bishop)
                { row: 5, col: 2 }  // c3 (moving bishop away)
            );

            expect(result).toBe(true);
        });
    });

    describe('getGameStatus', () => {
        test('should return "playing" for an ongoing game', () => {
            const engine = new ChessEngine();
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

            const status = validator.getGameStatus(gameState);
            expect(status).toBe('playing');
        });

        test('should return "checkmate" for a checkmate position', () => {
            const engine = new ChessEngine();
            // Set up fool's mate position
            // After 1. f3 e5 2. g4 Qh4#
            engine.board = [
                ['r', 'n', 'b', null, 'k', 'b', 'n', 'r'],
                ['p', 'p', 'p', 'p', null, 'p', 'p', 'p'],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, 'p', null, null, null],
                [null, null, null, null, null, null, 'P', 'q'], // Black queen on h4
                [null, null, null, null, null, 'P', null, null],
                ['P', 'P', 'P', 'P', 'P', null, null, 'P'],
                ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
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
                    white: { kingside: true, queenside: true },
                    black: { kingside: true, queenside: true }
                },
                halfMoveClock: 0,
                fullMoveNumber: 3
            };

            const status = validator.getGameStatus(gameState);
            expect(status).toBe('checkmate');
        });

        test('should return "stalemate" for a stalemate position', () => {
            const engine = new ChessEngine();
            // Set up a simple stalemate: white king on a1, black king on c1, black queen on b3
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, 'q', null, null, null, null, null, null], // Black queen on b3
                [null, null, null, null, null, null, null, null],
                ['K', null, 'k', null, null, null, null, null]  // White king on a1, black king on c1
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
                fullMoveNumber: 50
            };

            const status = validator.getGameStatus(gameState);
            expect(status).toBe('stalemate');
        });

        test('should return "draw" for insufficient material', () => {
            const engine = new ChessEngine();
            // King vs King
            engine.board = [
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                [null, null, null, null, null, null, null, null],
                ['K', null, null, null, 'k', null, null, null]
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
                fullMoveNumber: 50
            };

            const status = validator.getGameStatus(gameState);
            expect(status).toBe('draw');
        });
    });
});
