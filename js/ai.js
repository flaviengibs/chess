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
            case 'hard': return 5; // Increased from 4 to 5
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

            // Prioritize captures (especially high-value pieces)
            if (a.type === 'capture') {
                const capturedPiece = engine.getPieceAt(a.to.row, a.to.col);
                scoreA += capturedPiece ? (engine.pieceValues[capturedPiece] || 0) : 100;
            }
            if (b.type === 'capture') {
                const capturedPiece = engine.getPieceAt(b.to.row, b.to.col);
                scoreB += capturedPiece ? (engine.pieceValues[capturedPiece] || 0) : 100;
            }

            // Hard mode: additional move ordering
            if (this.difficulty === 'hard') {
                // Prioritize checks
                const cloneA = engine.clone();
                if (cloneA.makeMove(a.from.row, a.from.col, a.to.row, a.to.col)) {
                    if (cloneA.isInCheck(cloneA.currentPlayer === 'white' ? 'black' : 'white')) {
                        scoreA += 200;
                    }
                }
                
                const cloneB = engine.clone();
                if (cloneB.makeMove(b.from.row, b.from.col, b.to.row, b.to.col)) {
                    if (cloneB.isInCheck(cloneB.currentPlayer === 'white' ? 'black' : 'white')) {
                        scoreB += 200;
                    }
                }
                
                // Prioritize center control
                const centerDistA = Math.abs(a.to.row - 3.5) + Math.abs(a.to.col - 3.5);
                const centerDistB = Math.abs(b.to.row - 3.5) + Math.abs(b.to.col - 3.5);
                scoreA += (7 - centerDistA) * 5;
                scoreB += (7 - centerDistB) * 5;
            } else {
                // Medium/easy: simpler center prioritization
                const centerA = Math.abs(a.to.row - 3.5) + Math.abs(a.to.col - 3.5);
                const centerB = Math.abs(b.to.row - 3.5) + Math.abs(b.to.col - 3.5);
                scoreA += (7 - centerA) * 2;
                scoreB += (7 - centerB) * 2;
            }

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

        // Material evaluation (most important)
        score += this.evaluateMaterial(engine);
        
        // Positional evaluation
        score += this.evaluatePosition_positional(engine);
        
        // King safety (critical in hard mode)
        score += this.evaluateKingSafety(engine);
        
        // Mobility (piece activity)
        score += this.evaluateMobility(engine);
        
        // Hard mode: additional strategic evaluations
        if (this.difficulty === 'hard') {
            score += this.evaluatePawnStructure(engine);
            score += this.evaluateCenterControl(engine);
            score += this.evaluatePieceCoordination(engine);
            score += this.evaluateThreats(engine);
        }

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

    // Hard mode: Evaluate pawn structure
    evaluatePawnStructure(engine) {
        let score = 0;
        
        for (let col = 0; col < 8; col++) {
            let whitePawns = 0;
            let blackPawns = 0;
            
            for (let row = 0; row < 8; row++) {
                const piece = engine.getPieceAt(row, col);
                if (piece === 'P') whitePawns++;
                if (piece === 'p') blackPawns++;
            }
            
            // Penalize doubled pawns
            if (whitePawns > 1) score += (whitePawns - 1) * 10;
            if (blackPawns > 1) score -= (blackPawns - 1) * 10;
        }
        
        // Check for isolated pawns
        for (let col = 0; col < 8; col++) {
            for (let row = 0; row < 8; row++) {
                const piece = engine.getPieceAt(row, col);
                if (piece === 'P' || piece === 'p') {
                    const isWhite = piece === 'P';
                    const hasNeighbor = this.hasPawnNeighbor(engine, row, col, isWhite);
                    if (!hasNeighbor) {
                        score += isWhite ? 15 : -15; // Penalize isolated pawns
                    }
                }
            }
        }
        
        return score;
    }

    hasPawnNeighbor(engine, row, col, isWhite) {
        const pawn = isWhite ? 'P' : 'p';
        const leftCol = col - 1;
        const rightCol = col + 1;
        
        for (let r = 0; r < 8; r++) {
            if (leftCol >= 0 && engine.getPieceAt(r, leftCol) === pawn) return true;
            if (rightCol < 8 && engine.getPieceAt(r, rightCol) === pawn) return true;
        }
        return false;
    }

    // Hard mode: Evaluate center control
    evaluateCenterControl(engine) {
        let score = 0;
        const centerSquares = [
            [3, 3], [3, 4], [4, 3], [4, 4], // Center 4 squares
            [2, 2], [2, 3], [2, 4], [2, 5], // Extended center
            [3, 2], [3, 5], [4, 2], [4, 5],
            [5, 2], [5, 3], [5, 4], [5, 5]
        ];
        
        for (const [row, col] of centerSquares) {
            const piece = engine.getPieceAt(row, col);
            if (piece) {
                const value = row >= 2 && row <= 5 && col >= 2 && col <= 5 ? 5 : 3;
                score += engine.isWhitePiece(piece) ? -value : value;
            }
        }
        
        return score;
    }

    // Hard mode: Evaluate piece coordination
    evaluatePieceCoordination(engine) {
        let score = 0;
        
        // Check if pieces are protecting each other
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = engine.getPieceAt(row, col);
                if (piece && piece !== 'K' && piece !== 'k') {
                    const isWhite = engine.isWhitePiece(piece);
                    const defenders = this.countDefenders(engine, row, col, isWhite);
                    score += isWhite ? -defenders : defenders;
                }
            }
        }
        
        return score * 2;
    }

    countDefenders(engine, row, col, isWhite) {
        let count = 0;
        const color = isWhite ? 'white' : 'black';
        
        // Check all friendly pieces that can reach this square
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = engine.getPieceAt(r, c);
                if (piece && engine.isWhitePiece(piece) === isWhite) {
                    const moves = engine.getValidMovesForPiece(r, c);
                    if (moves.some(move => move.row === row && move.col === col)) {
                        count++;
                    }
                }
            }
        }
        
        return count;
    }

    // Hard mode: Evaluate threats (attacks on opponent pieces)
    evaluateThreats(engine) {
        let score = 0;
        
        // Check threats to opponent pieces
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = engine.getPieceAt(row, col);
                if (piece) {
                    const isWhite = engine.isWhitePiece(piece);
                    const attackers = this.countAttackers(engine, row, col, !isWhite);
                    const defenders = this.countDefenders(engine, row, col, isWhite);
                    
                    if (attackers > defenders) {
                        const pieceValue = engine.pieceValues[piece] || 0;
                        const threatValue = pieceValue * (attackers - defenders) * 0.5;
                        score += isWhite ? threatValue : -threatValue;
                    }
                }
            }
        }
        
        return score;
    }

    countAttackers(engine, row, col, isWhite) {
        let count = 0;
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = engine.getPieceAt(r, c);
                if (piece && engine.isWhitePiece(piece) === isWhite) {
                    const moves = engine.getValidMovesForPiece(r, c);
                    if (moves.some(move => move.row === row && move.col === col)) {
                        count++;
                    }
                }
            }
        }
        
        return count;
    }

    clearTranspositionTable() {
        this.transpositionTable.clear();
    }
}