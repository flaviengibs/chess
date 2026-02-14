const ChessEngine = require('./chess-engine');

/**
 * ChessValidator - Server-side chess move validation
 * 
 * This class provides validation for chess moves in multiplayer games.
 * It uses the ChessEngine to validate moves according to chess rules
 * and ensures game integrity by checking turn order, piece ownership,
 * and king safety.
 * 
 * Requirements: 4.2, 10.1, 10.2, 10.3, 10.4
 */
class ChessValidator {
    constructor() {
        // ChessValidator is stateless - it validates moves against provided game states
    }

    /**
     * Validates a chess move against the current game state
     * 
     * @param {Object} gameState - The current game state with board, currentPlayer, etc.
     * @param {Object} from - Source position {row, col}
     * @param {Object} to - Destination position {row, col}
     * @param {string|null} promotion - Promotion piece ('Q', 'R', 'B', 'N') or null
     * @returns {Object} - {valid: boolean, error: string|null}
     * 
     * Requirements: 4.2, 10.1, 10.2, 10.3, 10.4
     */
    validateMove(gameState, from, to, promotion = null) {
        // Create a chess engine instance from the game state
        const engine = this._createEngineFromState(gameState);

        // Validate coordinates
        if (!this.isValidSquare(from.row, from.col) || !this.isValidSquare(to.row, to.col)) {
            return { valid: false, error: 'Invalid square coordinates' };
        }

        // Get the piece at the source position
        const piece = engine.getPieceAt(from.row, from.col);
        
        if (!piece) {
            return { valid: false, error: 'No piece at source square' };
        }

        // Check if it's the correct player's turn (Requirement 10.1)
        if (!engine.isPieceColor(piece, gameState.currentPlayer)) {
            return { valid: false, error: 'Not your piece' };
        }

        // Get valid moves for this piece
        const validMoves = engine.getValidMoves(from.row, from.col);
        const isValidMove = validMoves.some(move => move.row === to.row && move.col === to.col);

        if (!isValidMove) {
            return { valid: false, error: 'Invalid move for this piece' };
        }

        // Check if move would leave king in check (Requirement 10.4)
        // This is already handled by getValidMoves which filters out moves that leave king in check
        // But we double-check here for clarity
        if (engine.wouldBeInCheck(from.row, from.col, to.row, to.col)) {
            return { valid: false, error: 'Move would leave king in check' };
        }

        // Validate promotion if applicable
        if (piece.toLowerCase() === 'p' && (to.row === 0 || to.row === 7)) {
            if (!promotion) {
                return { valid: false, error: 'Promotion piece required' };
            }
            const validPromotions = ['Q', 'R', 'B', 'N', 'q', 'r', 'b', 'n'];
            if (!validPromotions.includes(promotion)) {
                return { valid: false, error: 'Invalid promotion piece' };
            }
        }

        return { valid: true, error: null };
    }

    /**
     * Checks if it's the correct player's turn
     * 
     * @param {Object} gameState - The current game state
     * @param {string} playerId - The ID of the player attempting to move
     * @returns {boolean} - True if it's the player's turn
     * 
     * Requirements: 10.1
     */
    isCorrectTurn(gameState, playerId) {
        // In the game state, we need to know which player is white and which is black
        // This is typically stored in the room data, not the game state itself
        // For now, we'll check if the playerId matches the current player color
        // The caller should pass the player's color as playerId (e.g., 'white' or 'black')
        return gameState.currentPlayer === playerId;
    }

    /**
     * Checks if a move would leave the king in check
     * 
     * @param {Object} gameState - The current game state
     * @param {Object} from - Source position {row, col}
     * @param {Object} to - Destination position {row, col}
     * @returns {boolean} - True if the move would leave the king in check
     * 
     * Requirements: 10.4
     */
    wouldLeaveKingInCheck(gameState, from, to) {
        const engine = this._createEngineFromState(gameState);
        return engine.wouldBeInCheck(from.row, from.col, to.row, to.col);
    }

    /**
     * Gets the current game status (playing, checkmate, stalemate, draw)
     * 
     * @param {Object} gameState - The current game state
     * @returns {string} - 'playing', 'checkmate', 'stalemate', or 'draw'
     * 
     * Requirements: 4.6
     */
    getGameStatus(gameState) {
        const engine = this._createEngineFromState(gameState);
        
        // Check if current player has any valid moves
        const hasValidMoves = engine.hasValidMoves(gameState.currentPlayer);
        const inCheck = engine.isInCheck(gameState.currentPlayer);

        if (!hasValidMoves) {
            if (inCheck) {
                return 'checkmate';
            } else {
                return 'stalemate';
            }
        }

        // Check for draw conditions
        if (engine.isDrawByFiftyMoveRule() || engine.isDrawByInsufficientMaterial()) {
            return 'draw';
        }

        return 'playing';
    }

    /**
     * Validates if a square is within the board boundaries
     * 
     * @param {number} row - Row index (0-7)
     * @param {number} col - Column index (0-7)
     * @returns {boolean} - True if the square is valid
     */
    isValidSquare(row, col) {
        return row >= 0 && row <= 7 && col >= 0 && col <= 7;
    }

    /**
     * Creates a ChessEngine instance from a game state object
     * This allows us to use the engine's validation logic without maintaining state
     * 
     * @param {Object} gameState - The game state to load
     * @returns {ChessEngine} - A chess engine instance with the loaded state
     * @private
     */
    _createEngineFromState(gameState) {
        const engine = new ChessEngine();
        
        // Load the board state
        engine.board = gameState.board.map(row => [...row]);
        engine.currentPlayer = gameState.currentPlayer;
        engine.gameState = gameState.gameStatus || 'playing';
        engine.moveHistory = gameState.moveHistory || [];
        engine.capturedPieces = gameState.capturedPieces || { white: [], black: [] };
        engine.enPassantTarget = gameState.enPassantTarget || null;
        engine.castlingRights = gameState.castlingRights || {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        engine.halfMoveClock = gameState.halfMoveClock || 0;
        engine.fullMoveNumber = gameState.fullMoveNumber || 1;
        
        return engine;
    }
}

module.exports = ChessValidator;
