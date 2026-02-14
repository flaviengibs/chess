class ChessAI {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.maxDepth = this.getMaxDepth(difficulty);
        this.transpositionTable = new Map();
        this.maxTableSize = 10000; // Limit table size for memory
    }

    getMaxDepth(difficulty) {
        switch (difficulty) {
            case 'easy': return 1;
            case 'medium': return 3;
            case 'hard': return 4;
            default: return 3;
        }
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.maxDepth = this.getMaxDepth(difficulty);
        this.clearTranspositionTable();
    }

    getBestMove(engine) {
        const startTime = Date.now();
        
        if (this.difficulty === 'easy') {
            return this.getRandomMove(engine);
        }

        // Clear table if it gets too large
        if (this.transpositionTable.size > this.maxTableSize) {
            this.transpositionTable.clear();
        }

        const moves = engine.getAllValidMoves(engine.currentPlayer);
        if (moves.length === 0) return null;

        // Quick move for single option
        if (moves.length === 1) return moves[0];

        const result = this.minimax(engine, this.maxDepth, -Infinity, Infinity, engine.currentPlayer === 'black');
        
        const endTime = Date.now();
        console.log(`AI thinking time: ${endTime - startTime}ms, evaluated moves: ${moves.length}`);
        
        return result.move || moves[0]; // Fallback to first move if no best move found
    }

    getRandomMove(engine) {
        const moves = engine.getAllValidMoves(engine.currentPlayer);
        if (moves.length === 0) return null;
        
        // Validate moves before returning
        const validMoves = moves.filter(move => {
            return engine.isValidSquare(move.from.row, move.from.col) && 
                   engine.isValidSquare(move.to.row, move.to.col);
        });
        
        if (validMoves.length === 0) return null;
        
        // Add some basic strategy even for easy mode
        const captures = validMoves.filter(move => move.type === 'capture');
        const checks = validMoves.filter(move => {
            const clone = engine.clone();
            if (clone.makeMove(move.from.row, move.from.col, move.to.row, move.to.col)) {
                return clone.isInCheck(clone.currentPlayer === 'white' ? 'black' : 'white');
            }
            return false;
        });

        // Prefer captures and checks with some randomness
        if (captures.length > 0 && Math.random() < 0.7) {
            return captures[Math.floor(Math.random() * captures.length)];
        }
        
        if (checks.length > 0 && Math.random() < 0.5) {
            return checks[Math.floor(Math.random() * checks.length)];
        }

        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    minimax(engine, depth, alpha, beta, maximizingPlayer) {
        if (depth === 0 || engine.gameState !== 'playing') {
            const evaluation = this.evaluatePosition(engine);
            return { score: evaluation, move: null };
        }

        const moves = engine.getAllValidMoves(engine.currentPlayer);
        
        // Validate moves
        const validMoves = moves.filter(move => {
            return engine.isValidSquare(move.from.row, move.from.col) && 
                   engine.isValidSquare(move.to.row, move.to.col);
        });
        
        if (validMoves.length === 0) {
            const evaluation = this.evaluatePosition(engine);
            return { score: evaluation, move: null };
        }

        this.orderMoves(validMoves, engine);

        let bestMove = null;

        if (maximizingPlayer) {
            let maxEval = -Infinity;
            
            for (const move of validMoves) {
                const clone = engine.clone();
                if (clone.makeMove(move.from.row, move.from.col, move.to.row, move.to.col)) {
                    const evaluation = this.minimax(clone, depth - 1, alpha, beta, false);
                    
                    if (evaluation.score > maxEval) {
                        maxEval = evaluation.score;
                        bestMove = move;
                    }
                    
                    alpha = Math.max(alpha, evaluation.score);
                    if (beta <= alpha) {
                        break; // Alpha-beta pruning
                    }
                }
            }
            
            return { score: maxEval, move: bestMove };
        } else {
            let minEval = Infinity;
            
            for (const move of validMoves) {
                const clone = engine.clone();
                if (clone.makeMove(move.from.row, move.from.col, move.to.row, move.to.col)) {
                    const evaluation = this.minimax(clone, depth - 1, alpha, beta, true);
                    
                    if (evaluation.score < minEval) {
                        minEval = evaluation.score;
                        bestMove = move;
                    }
                    
                    beta = Math.min(beta, evaluation.score);
                    if (beta <= alpha) {
                        break; // Alpha-beta pruning
                    }
                }
            }
            
            return { score: minEval, move: bestMove };
        }
    }

    orderMoves(moves, engine) {
        // Move ordering for better alpha-beta pruning
        moves.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;

            // Prioritize captures
            if (a.type === 'capture') scoreA += 100;
            if (b.type === 'capture') scoreB += 100;

            // Prioritize center moves
            const centerA = Math.abs(a.to.row - 3.5) + Math.abs(a.to.col - 3.5);
            const centerB = Math.abs(b.to.row - 3.5) + Math.abs(b.to.col - 3.5);
            scoreA += (7 - centerA) * 2;
            scoreB += (7 - centerB) * 2;

            return scoreB - scoreA;
        });
    }

    evaluatePosition(engine) {
        if (engine.gameState === 'checkmate') {
            return engine.currentPlayer === 'black' ? 10000 : -10000;
        }
        
        if (engine.gameState === 'stalemate' || engine.gameState === 'draw') {
            return 0;
        }

        let score = 0;

        // Material evaluation
        score += this.evaluateMaterial(engine);
        
        // Positional evaluation
        score += this.evaluatePosition_positional(engine);
        
        // King safety
        score += this.evaluateKingSafety(engine);
        
        // Mobility
        score += this.evaluateMobility(engine);

        return score;
    }

    evaluateMaterial(engine) {
        let score = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = engine.getPieceAt(row, col);
                if (piece) {
                    const value = engine.pieceValues[piece];
                    score += engine.isWhitePiece(piece) ? -value : value;
                }
            }
        }
        
        return score;
    }

    evaluatePosition_positional(engine) {
        let score = 0;

        // Piece-square tables (simplified)
        const pawnTable = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [5,  5, 10, 25, 25, 10,  5,  5],
            [0,  0,  0, 20, 20,  0,  0,  0],
            [5, -5,-10,  0,  0,-10, -5,  5],
            [5, 10, 10,-20,-20, 10, 10,  5],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ];

        const knightTable = [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50]
        ];

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = engine.getPieceAt(row, col);
                if (piece) {
                    const isWhite = engine.isWhitePiece(piece);
                    const pieceType = piece.toLowerCase();
                    let positionalValue = 0;

                    switch (pieceType) {
                        case 'p':
                            positionalValue = pawnTable[isWhite ? 7 - row : row][col];
                            break;
                        case 'n':
                            positionalValue = knightTable[isWhite ? 7 - row : row][col];
                            break;
                        // Add more piece-square tables as needed
                    }

                    score += isWhite ? -positionalValue : positionalValue;
                }
            }
        }

        return score / 100; // Scale down positional values
    }

    evaluateKingSafety(engine) {
        let score = 0;

        // Check if kings are in check
        if (engine.isInCheck('white')) score -= 50;
        if (engine.isInCheck('black')) score += 50;

        // Evaluate pawn shield around kings
        const whiteKing = engine.findKing('white');
        const blackKing = engine.findKing('black');

        if (whiteKing) {
            score -= this.evaluatePawnShield(engine, whiteKing, 'white');
        }

        if (blackKing) {
            score += this.evaluatePawnShield(engine, blackKing, 'black');
        }

        return score;
    }

    evaluatePawnShield(engine, kingPos, color) {
        let shieldScore = 0;
        const direction = color === 'white' ? -1 : 1;
        const pawnPiece = color === 'white' ? 'P' : 'p';

        // Check squares in front of king
        for (let colOffset = -1; colOffset <= 1; colOffset++) {
            const col = kingPos.col + colOffset;
            if (col >= 0 && col <= 7) {
                const row = kingPos.row + direction;
                if (row >= 0 && row <= 7) {
                    const piece = engine.getPieceAt(row, col);
                    if (piece === pawnPiece) {
                        shieldScore += 10;
                    }
                }
            }
        }

        return shieldScore;
    }

    evaluateMobility(engine) {
        const whiteMoves = engine.getAllValidMoves('white').length;
        const blackMoves = engine.getAllValidMoves('black').length;
        
        return (blackMoves - whiteMoves) * 0.1;
    }

    clearTranspositionTable() {
        this.transpositionTable.clear();
    }
}