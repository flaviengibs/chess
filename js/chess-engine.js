class ChessEngine {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.gameState = 'playing'; // playing, checkmate, stalemate, draw
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.enPassantTarget = null;
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        
        // Piece values for evaluation
        this.pieceValues = {
            'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0,
            'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 0
        };
    }

    initializeBoard() {
        return [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
    }

    getPieceAt(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this.board[row][col];
    }

    isValidSquare(row, col) {
        return row >= 0 && row <= 7 && col >= 0 && col <= 7;
    }

    setPieceAt(row, col, piece) {
        if (row >= 0 && row <= 7 && col >= 0 && col <= 7) {
            this.board[row][col] = piece;
        }
    }

    isWhitePiece(piece) {
        return piece && piece === piece.toUpperCase();
    }

    isBlackPiece(piece) {
        return piece && piece === piece.toLowerCase();
    }

    isPieceColor(piece, color) {
        if (!piece) return false;
        return color === 'white' ? this.isWhitePiece(piece) : this.isBlackPiece(piece);
    }

    getValidMoves(fromRow, fromCol) {
        const piece = this.getPieceAt(fromRow, fromCol);
        if (!piece || !this.isPieceColor(piece, this.currentPlayer)) {
            return [];
        }

        let moves = [];
        const pieceType = piece.toLowerCase();

        switch (pieceType) {
            case 'p':
                moves = this.getPawnMoves(fromRow, fromCol);
                break;
            case 'r':
                moves = this.getRookMoves(fromRow, fromCol);
                break;
            case 'n':
                moves = this.getKnightMoves(fromRow, fromCol);
                break;
            case 'b':
                moves = this.getBishopMoves(fromRow, fromCol);
                break;
            case 'q':
                moves = this.getQueenMoves(fromRow, fromCol);
                break;
            case 'k':
                moves = this.getKingMoves(fromRow, fromCol);
                break;
        }

        // Filter out moves that would put own king in check
        return moves.filter(move => !this.wouldBeInCheck(fromRow, fromCol, move.row, move.col));
    }

    getPawnMoves(row, col) {
        const moves = [];
        const piece = this.getPieceAt(row, col);
        const isWhite = this.isWhitePiece(piece);
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;

        // Forward move
        const forwardRow = row + direction;
        if (this.isValidSquare(forwardRow, col) && !this.getPieceAt(forwardRow, col)) {
            moves.push({ row: forwardRow, col, type: 'move' });
            
            // Double move from starting position
            const doubleRow = row + 2 * direction;
            if (row === startRow && this.isValidSquare(doubleRow, col) && !this.getPieceAt(doubleRow, col)) {
                moves.push({ row: doubleRow, col, type: 'move' });
            }
        }

        // Captures
        for (const colOffset of [-1, 1]) {
            const newCol = col + colOffset;
            const newRow = row + direction;
            
            if (!this.isValidSquare(newRow, newCol)) continue;
            
            const targetPiece = this.getPieceAt(newRow, newCol);
            
            if (targetPiece && !this.isPieceColor(targetPiece, this.currentPlayer)) {
                moves.push({ row: newRow, col: newCol, type: 'capture' });
            }
            
            // En passant
            if (this.enPassantTarget && 
                this.enPassantTarget.row === newRow && 
                this.enPassantTarget.col === newCol) {
                moves.push({ row: newRow, col: newCol, type: 'enpassant' });
            }
        }

        return moves;
    }

    getRookMoves(row, col) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [dRow, dCol] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dRow;
                const newCol = col + i * dCol;
                
                if (!this.isValidSquare(newRow, newCol)) break;
                
                const targetPiece = this.getPieceAt(newRow, newCol);

                if (targetPiece === null) {
                    moves.push({ row: newRow, col: newCol, type: 'move' });
                } else {
                    if (!this.isPieceColor(targetPiece, this.currentPlayer)) {
                        moves.push({ row: newRow, col: newCol, type: 'capture' });
                    }
                    break;
                }
            }
        }

        return moves;
    }

    getKnightMoves(row, col) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (const [dRow, dCol] of knightMoves) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            if (!this.isValidSquare(newRow, newCol)) continue;
            
            const targetPiece = this.getPieceAt(newRow, newCol);

            if (targetPiece === null) {
                moves.push({ row: newRow, col: newCol, type: 'move' });
            } else if (!this.isPieceColor(targetPiece, this.currentPlayer)) {
                moves.push({ row: newRow, col: newCol, type: 'capture' });
            }
        }

        return moves;
    }

    getBishopMoves(row, col) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        for (const [dRow, dCol] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dRow;
                const newCol = col + i * dCol;
                
                if (!this.isValidSquare(newRow, newCol)) break;
                
                const targetPiece = this.getPieceAt(newRow, newCol);

                if (targetPiece === null) {
                    moves.push({ row: newRow, col: newCol, type: 'move' });
                } else {
                    if (!this.isPieceColor(targetPiece, this.currentPlayer)) {
                        moves.push({ row: newRow, col: newCol, type: 'capture' });
                    }
                    break;
                }
            }
        }

        return moves;
    }

    getQueenMoves(row, col) {
        return [...this.getRookMoves(row, col), ...this.getBishopMoves(row, col)];
    }

    getKingMoves(row, col) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            if (!this.isValidSquare(newRow, newCol)) continue;
            
            const targetPiece = this.getPieceAt(newRow, newCol);

            if (targetPiece === null) {
                moves.push({ row: newRow, col: newCol, type: 'move' });
            } else if (!this.isPieceColor(targetPiece, this.currentPlayer)) {
                moves.push({ row: newRow, col: newCol, type: 'capture' });
            }
        }

        // Castling
        if (!this.isInCheck(this.currentPlayer)) {
            const castlingMoves = this.getCastlingMoves(row, col);
            moves.push(...castlingMoves);
        }

        return moves;
    }

    getCastlingMoves(row, col) {
        const moves = [];
        const color = this.currentPlayer;
        const rights = this.castlingRights[color];

        // Kingside castling
        if (rights.kingside && 
            !this.getPieceAt(row, 5) && 
            !this.getPieceAt(row, 6) &&
            !this.isSquareAttacked(row, 5, color === 'white' ? 'black' : 'white') &&
            !this.isSquareAttacked(row, 6, color === 'white' ? 'black' : 'white')) {
            moves.push({ row, col: 6, type: 'castle-kingside' });
        }

        // Queenside castling
        if (rights.queenside && 
            !this.getPieceAt(row, 3) && 
            !this.getPieceAt(row, 2) && 
            !this.getPieceAt(row, 1) &&
            !this.isSquareAttacked(row, 3, color === 'white' ? 'black' : 'white') &&
            !this.isSquareAttacked(row, 2, color === 'white' ? 'black' : 'white')) {
            moves.push({ row, col: 2, type: 'castle-queenside' });
        }

        return moves;
    }

    makeMove(fromRow, fromCol, toRow, toCol, promotionPiece = null) {
        const piece = this.getPieceAt(fromRow, fromCol);
        
        // Validate basic move requirements
        if (!piece) {
            console.error('No piece at source square:', fromRow, fromCol);
            return false;
        }
        
        if (!this.isPieceColor(piece, this.currentPlayer)) {
            console.error('Piece does not belong to current player:', piece, this.currentPlayer);
            return false;
        }
        
        if (!this.isValidSquare(fromRow, fromCol) || !this.isValidSquare(toRow, toCol)) {
            console.error('Invalid square coordinates:', fromRow, fromCol, 'to', toRow, toCol);
            return false;
        }
        
        // Check if this move is in the list of valid moves
        const validMoves = this.getValidMoves(fromRow, fromCol);
        const isValidMove = validMoves.some(move => move.row === toRow && move.col === toCol);
        
        if (!isValidMove) {
            console.error('Move not in valid moves list:', {
                from: {row: fromRow, col: fromCol},
                to: {row: toRow, col: toCol},
                piece: piece,
                validMoves: validMoves
            });
            return false;
        }

        const capturedPiece = this.getPieceAt(toRow, toCol);
        const moveType = this.getMoveType(fromRow, fromCol, toRow, toCol);

        // Store move for history
        const move = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece,
            capturedPiece,
            type: moveType,
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
            enPassantTarget: this.enPassantTarget,
            halfMoveClock: this.halfMoveClock
        };

        // Handle special moves
        switch (moveType) {
            case 'castle-kingside':
                this.setPieceAt(fromRow, fromCol, null);
                this.setPieceAt(toRow, toCol, piece);
                this.setPieceAt(fromRow, 7, null);
                this.setPieceAt(toRow, 5, this.currentPlayer === 'white' ? 'R' : 'r');
                break;
            
            case 'castle-queenside':
                this.setPieceAt(fromRow, fromCol, null);
                this.setPieceAt(toRow, toCol, piece);
                this.setPieceAt(fromRow, 0, null);
                this.setPieceAt(toRow, 3, this.currentPlayer === 'white' ? 'R' : 'r');
                break;
            
            case 'enpassant':
                this.setPieceAt(fromRow, fromCol, null);
                this.setPieceAt(toRow, toCol, piece);
                const capturedPawnRow = this.currentPlayer === 'white' ? toRow + 1 : toRow - 1;
                const capturedPawn = this.getPieceAt(capturedPawnRow, toCol);
                this.setPieceAt(capturedPawnRow, toCol, null);
                this.capturedPieces[this.currentPlayer === 'white' ? 'black' : 'white'].push(capturedPawn);
                break;
            
            default:
                // Regular move or capture
                if (capturedPiece) {
                    this.capturedPieces[this.currentPlayer === 'white' ? 'black' : 'white'].push(capturedPiece);
                }
                this.setPieceAt(fromRow, fromCol, null);
                this.setPieceAt(toRow, toCol, piece);
                break;
        }

        // Handle pawn promotion
        if (piece.toLowerCase() === 'p' && (toRow === 0 || toRow === 7)) {
            let promotedPiece;
            if (promotionPiece) {
                // Use specified promotion piece
                promotedPiece = this.currentPlayer === 'white' ? 
                    promotionPiece.toUpperCase() : promotionPiece.toLowerCase();
            } else {
                // Default to queen
                promotedPiece = this.currentPlayer === 'white' ? 'Q' : 'q';
            }
            this.setPieceAt(toRow, toCol, promotedPiece);
            move.promotion = promotedPiece;
        }

        // Update castling rights
        this.updateCastlingRights(fromRow, fromCol, toRow, toCol, piece);

        // Update en passant target
        this.enPassantTarget = null;
        if (piece.toLowerCase() === 'p' && Math.abs(toRow - fromRow) === 2) {
            this.enPassantTarget = { row: (fromRow + toRow) / 2, col: fromCol };
        }

        // Update clocks
        if (capturedPiece || piece.toLowerCase() === 'p') {
            this.halfMoveClock = 0;
        } else {
            this.halfMoveClock++;
        }

        if (this.currentPlayer === 'black') {
            this.fullMoveNumber++;
        }

        this.moveHistory.push(move);
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // Check game state
        this.updateGameState();

        return true;
    }

    // Check if a move would result in pawn promotion
    wouldPromote(fromRow, fromCol, toRow, toCol) {
        const piece = this.getPieceAt(fromRow, fromCol);
        return piece && piece.toLowerCase() === 'p' && (toRow === 0 || toRow === 7);
    }

    getMoveType(fromRow, fromCol, toRow, toCol) {
        const piece = this.getPieceAt(fromRow, fromCol);
        const targetPiece = this.getPieceAt(toRow, toCol);

        // Castling
        if (piece.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2) {
            return toCol > fromCol ? 'castle-kingside' : 'castle-queenside';
        }

        // En passant
        if (piece.toLowerCase() === 'p' && 
            this.enPassantTarget && 
            toRow === this.enPassantTarget.row && 
            toCol === this.enPassantTarget.col) {
            return 'enpassant';
        }

        // Regular capture or move
        return targetPiece ? 'capture' : 'move';
    }

    updateCastlingRights(fromRow, fromCol, toRow, toCol, piece) {
        // King moves
        if (piece.toLowerCase() === 'k') {
            const color = this.isWhitePiece(piece) ? 'white' : 'black';
            this.castlingRights[color].kingside = false;
            this.castlingRights[color].queenside = false;
        }

        // Rook moves
        if (piece.toLowerCase() === 'r') {
            const color = this.isWhitePiece(piece) ? 'white' : 'black';
            if (fromCol === 0) {
                this.castlingRights[color].queenside = false;
            } else if (fromCol === 7) {
                this.castlingRights[color].kingside = false;
            }
        }

        // Rook captured
        if (toRow === 0 || toRow === 7) {
            const color = toRow === 0 ? 'black' : 'white';
            if (toCol === 0) {
                this.castlingRights[color].queenside = false;
            } else if (toCol === 7) {
                this.castlingRights[color].kingside = false;
            }
        }
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
        // Save current state
        const originalPiece = this.getPieceAt(toRow, toCol);
        const movingPiece = this.getPieceAt(fromRow, fromCol);
        const originalEnPassant = this.enPassantTarget;
        const originalCastlingRights = JSON.parse(JSON.stringify(this.castlingRights));
        
        // Make temporary move without changing game state
        this.setPieceAt(fromRow, fromCol, null);
        this.setPieceAt(toRow, toCol, movingPiece);
        
        // Handle en passant capture
        let capturedEnPassantPawn = null;
        if (movingPiece && movingPiece.toLowerCase() === 'p' && 
            this.enPassantTarget && 
            toRow === this.enPassantTarget.row && 
            toCol === this.enPassantTarget.col) {
            const capturedPawnRow = this.currentPlayer === 'white' ? toRow + 1 : toRow - 1;
            capturedEnPassantPawn = this.getPieceAt(capturedPawnRow, toCol);
            this.setPieceAt(capturedPawnRow, toCol, null);
        }
        
        // Handle castling
        let rookMoved = false;
        let rookFromCol, rookToCol;
        if (movingPiece && movingPiece.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2) {
            rookMoved = true;
            if (toCol > fromCol) { // Kingside
                rookFromCol = 7;
                rookToCol = 5;
            } else { // Queenside
                rookFromCol = 0;
                rookToCol = 3;
            }
            const rook = this.getPieceAt(fromRow, rookFromCol);
            this.setPieceAt(fromRow, rookFromCol, null);
            this.setPieceAt(fromRow, rookToCol, rook);
        }

        const inCheck = this.isInCheck(this.currentPlayer);

        // Restore board state
        this.setPieceAt(fromRow, fromCol, movingPiece);
        this.setPieceAt(toRow, toCol, originalPiece);
        
        if (capturedEnPassantPawn) {
            const capturedPawnRow = this.currentPlayer === 'white' ? toRow + 1 : toRow - 1;
            this.setPieceAt(capturedPawnRow, toCol, capturedEnPassantPawn);
        }
        
        if (rookMoved) {
            const rook = this.getPieceAt(fromRow, rookToCol);
            this.setPieceAt(fromRow, rookToCol, null);
            this.setPieceAt(fromRow, rookFromCol, rook);
        }
        
        this.enPassantTarget = originalEnPassant;
        this.castlingRights = originalCastlingRights;

        return inCheck;
    }

    isInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;
        
        return this.isSquareAttacked(kingPos.row, kingPos.col, color === 'white' ? 'black' : 'white');
    }

    findKing(color) {
        const kingPiece = color === 'white' ? 'K' : 'k';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.getPieceAt(row, col) === kingPiece) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    isSquareAttacked(row, col, byColor) {
        if (!this.isValidSquare(row, col)) return false;
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.getPieceAt(r, c);
                if (piece && this.isPieceColor(piece, byColor)) {
                    const attacks = this.getPieceAttacks(r, c);
                    if (attacks.some(attack => attack.row === row && attack.col === col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getPieceAttacks(row, col) {
        const piece = this.getPieceAt(row, col);
        if (!piece) return [];

        const pieceType = piece.toLowerCase();
        let attacks = [];

        switch (pieceType) {
            case 'p':
                attacks = this.getPawnAttacks(row, col);
                break;
            case 'r':
                attacks = this.getRookAttacks(row, col);
                break;
            case 'n':
                attacks = this.getKnightAttacks(row, col);
                break;
            case 'b':
                attacks = this.getBishopAttacks(row, col);
                break;
            case 'q':
                attacks = this.getQueenAttacks(row, col);
                break;
            case 'k':
                attacks = this.getKingAttacks(row, col);
                break;
        }

        // Filter out invalid squares
        return attacks.filter(attack => this.isValidSquare(attack.row, attack.col));
    }

    getRookAttacks(row, col) {
        const attacks = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [dRow, dCol] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dRow;
                const newCol = col + i * dCol;
                
                if (!this.isValidSquare(newRow, newCol)) break;
                
                attacks.push({ row: newRow, col: newCol });
                
                // Stop if there's a piece (attacks through pieces for attack calculation)
                if (this.getPieceAt(newRow, newCol)) break;
            }
        }

        return attacks;
    }

    getBishopAttacks(row, col) {
        const attacks = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        for (const [dRow, dCol] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dRow;
                const newCol = col + i * dCol;
                
                if (!this.isValidSquare(newRow, newCol)) break;
                
                attacks.push({ row: newRow, col: newCol });
                
                // Stop if there's a piece
                if (this.getPieceAt(newRow, newCol)) break;
            }
        }

        return attacks;
    }

    getQueenAttacks(row, col) {
        return [...this.getRookAttacks(row, col), ...this.getBishopAttacks(row, col)];
    }

    getKnightAttacks(row, col) {
        const attacks = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (const [dRow, dCol] of knightMoves) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            if (this.isValidSquare(newRow, newCol)) {
                attacks.push({ row: newRow, col: newCol });
            }
        }

        return attacks;
    }

    getPawnAttacks(row, col) {
        const attacks = [];
        const piece = this.getPieceAt(row, col);
        const isWhite = this.isWhitePiece(piece);
        const direction = isWhite ? -1 : 1;

        for (const colOffset of [-1, 1]) {
            const newRow = row + direction;
            const newCol = col + colOffset;
            if (this.isValidSquare(newRow, newCol)) {
                attacks.push({ row: newRow, col: newCol });
            }
        }

        return attacks;
    }

    getKingAttacks(row, col) {
        const attacks = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            if (this.isValidSquare(newRow, newCol)) {
                attacks.push({ row: newRow, col: newCol });
            }
        }

        return attacks;
    }

    updateGameState() {
        const hasValidMoves = this.hasValidMoves(this.currentPlayer);
        const inCheck = this.isInCheck(this.currentPlayer);

        if (!hasValidMoves) {
            if (inCheck) {
                this.gameState = 'checkmate';
            } else {
                this.gameState = 'stalemate';
            }
        } else if (this.isDrawByFiftyMoveRule() || this.isDrawByInsufficientMaterial()) {
            this.gameState = 'draw';
        } else {
            this.gameState = 'playing';
        }
    }

    hasValidMoves(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPieceAt(row, col);
                if (piece && this.isPieceColor(piece, color)) {
                    const moves = this.getValidMoves(row, col);
                    if (moves.length > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isDrawByFiftyMoveRule() {
        return this.halfMoveClock >= 100; // 50 moves for each player
    }

    isDrawByRepetition() {
        // Simplified: check if current position occurred 3 times
        const currentPosition = this.getBoardHash();
        let count = 0;
        
        for (const move of this.moveHistory) {
            // This is a simplified check - in a real implementation,
            // you'd need to reconstruct board positions
            count++;
        }
        
        return false; // Simplified for now
    }

    isDrawByInsufficientMaterial() {
        const pieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPieceAt(row, col);
                if (piece) {
                    pieces.push(piece.toLowerCase());
                }
            }
        }

        // King vs King
        if (pieces.length === 2) return true;

        // King and Bishop/Knight vs King
        if (pieces.length === 3) {
            const nonKings = pieces.filter(p => p !== 'k');
            return nonKings.length === 1 && (nonKings[0] === 'b' || nonKings[0] === 'n');
        }

        return false;
    }

    getBoardHash() {
        return this.board.map(row => row.join('')).join('');
    }

    getAllValidMoves(color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPieceAt(row, col);
                if (piece && this.isPieceColor(piece, color)) {
                    const pieceMoves = this.getValidMoves(row, col);
                    for (const move of pieceMoves) {
                        // Validate move coordinates
                        if (this.isValidSquare(move.row, move.col)) {
                            moves.push({
                                from: { row, col },
                                to: { row: move.row, col: move.col },
                                piece,
                                type: move.type
                            });
                        }
                    }
                }
            }
        }
        return moves;
    }

    evaluatePosition() {
        let score = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPieceAt(row, col);
                if (piece) {
                    const value = this.pieceValues[piece];
                    score += this.isWhitePiece(piece) ? value : -value;
                }
            }
        }
        
        return score;
    }

    clone() {
        const clone = new ChessEngine();
        clone.board = this.board.map(row => [...row]);
        clone.currentPlayer = this.currentPlayer;
        clone.gameState = this.gameState;
        clone.moveHistory = [...this.moveHistory];
        clone.capturedPieces = {
            white: [...this.capturedPieces.white],
            black: [...this.capturedPieces.black]
        };
        clone.enPassantTarget = this.enPassantTarget;
        clone.castlingRights = JSON.parse(JSON.stringify(this.castlingRights));
        clone.halfMoveClock = this.halfMoveClock;
        clone.fullMoveNumber = this.fullMoveNumber;
        return clone;
    }
}