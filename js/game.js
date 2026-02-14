class ChessGame {
    constructor() {
        this.engine = new ChessEngine();
        this.ai = new ChessAI('medium');
        this.selectedSquare = null;
        this.validMoves = [];
        this.isPlayerTurn = true;
        this.gameMode = 'ai'; // 'ai', 'multiplayer', or 'local'
        this.playerColor = 'white';
        this.pendingPromotion = null; // Store promotion move until piece is selected
        this.boardFlipped = false; // For local 2-player mode
        
        this.pieceSymbols = {
            'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
            'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
        };
        
        this.initializeBoard();
        this.updateDisplay();
        this.setupPromotionModal();
    }

    startMultiplayerGame(playerColor, opponentInfo) {
        this.gameMode = 'multiplayer';
        this.playerColor = playerColor;
        this.opponentInfo = opponentInfo;
        this.isPlayerTurn = playerColor === 'white';
        this.boardFlipped = false;
        
        // Rebuild board with correct orientation for this player
        this.initializeBoard();
        
        this.newGame();
        this.updateDisplay();
    }

    startAIGame() {
        this.gameMode = 'ai';
        this.playerColor = 'white';
        this.isPlayerTurn = true;
        this.boardFlipped = false;
        
        this.newGame();
        this.updateDisplay();
    }

    startLocalGame() {
        this.gameMode = 'local';
        this.playerColor = 'white'; // Not really used in local mode
        this.isPlayerTurn = true;
        this.boardFlipped = false;
        
        this.newGame();
        this.updateDisplay();
    }

    initializeBoard() {
        const board = document.getElementById('chess-board');
        board.innerHTML = '';

        // Determine if board should be flipped
        let flipBoard = false;
        if (this.gameMode === 'multiplayer' && this.playerColor === 'black') {
            flipBoard = true;
        } else if (this.gameMode === 'local' && this.boardFlipped) {
            flipBoard = true;
        }

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                
                // If flipped, reverse BOTH row and column to rotate 180 degrees
                const displayRow = flipBoard ? 7 - row : row;
                const displayCol = flipBoard ? 7 - col : col;
                
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = displayRow;
                square.dataset.col = displayCol;
                
                square.addEventListener('click', (e) => this.handleSquareClick(e));
                
                board.appendChild(square);
            }
        }
    }

    updateDisplay() {
        this.updateBoard();
        this.updateGameInfo();
        this.updateCapturedPieces();
        this.updateMoveHistory();
    }

    updateBoard() {
        const squares = document.querySelectorAll('.square');
        
        squares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const piece = this.engine.getPieceAt(row, col);
            
            // Clear previous styling
            square.classList.remove('selected', 'valid-move', 'capture-move', 'in-check');
            
            // Set piece symbol
            square.textContent = piece ? this.pieceSymbols[piece] : '';
            
            // Highlight selected square
            if (this.selectedSquare && 
                this.selectedSquare.row === row && 
                this.selectedSquare.col === col) {
                square.classList.add('selected');
            }
            
            // Highlight valid moves
            const validMove = this.validMoves.find(move => move.row === row && move.col === col);
            if (validMove) {
                if (validMove.type === 'capture' || validMove.type === 'enpassant') {
                    square.classList.add('capture-move');
                } else {
                    square.classList.add('valid-move');
                }
            }
            
            // Highlight king in check
            if (piece && piece.toLowerCase() === 'k') {
                const color = this.engine.isWhitePiece(piece) ? 'white' : 'black';
                if (this.engine.isInCheck(color)) {
                    square.classList.add('in-check');
                }
            }
        });
    }

    updateGameInfo() {
        const currentPlayerElement = document.getElementById('current-player');
        const gameStatusElement = document.getElementById('game-status');
        
        // Update active player highlighting
        document.querySelectorAll('.player').forEach(p => p.classList.remove('active'));
        if (this.engine.currentPlayer === 'white') {
            document.querySelector('.white-player')?.classList.add('active');
        } else {
            document.querySelector('.black-player')?.classList.add('active');
        }
        
        if (this.engine.gameState === 'playing') {
            currentPlayerElement.textContent = `${this.engine.currentPlayer === 'white' ? 'White' : 'Black'} to move`;
            gameStatusElement.textContent = '';
            gameStatusElement.className = '';
            
            if (this.engine.isInCheck(this.engine.currentPlayer)) {
                gameStatusElement.textContent = 'Check!';
                gameStatusElement.className = 'game-status-check';
            }
            
            // Show turn indicator for multiplayer
            if (this.gameMode === 'multiplayer') {
                if (this.engine.currentPlayer === this.playerColor) {
                    currentPlayerElement.textContent += ' (Your turn)';
                } else {
                    currentPlayerElement.textContent += ' (Opponent\'s turn)';
                }
            }
        } else {
            currentPlayerElement.textContent = 'Game Over';
            
            switch (this.engine.gameState) {
                case 'checkmate':
                    const winner = this.engine.currentPlayer === 'white' ? 'Black' : 'White';
                    gameStatusElement.textContent = `Checkmate! ${winner} wins!`;
                    gameStatusElement.className = 'game-won';
                    
                    // Handle game end
                    if (this.gameMode === 'ai') {
                        this.handleGameEnd(winner.toLowerCase() === this.playerColor ? 'win' : 'loss');
                    }
                    break;
                case 'stalemate':
                    gameStatusElement.textContent = 'Stalemate! Draw!';
                    gameStatusElement.className = 'game-draw';
                    if (this.gameMode === 'ai') {
                        this.handleGameEnd('draw');
                    }
                    break;
                case 'draw':
                    gameStatusElement.textContent = 'Draw!';
                    gameStatusElement.className = 'game-draw';
                    if (this.gameMode === 'ai') {
                        this.handleGameEnd('draw');
                    }
                    break;
            }
        }
    }

    updateCapturedPieces() {
        const whiteCaptured = document.querySelector('.white-captured');
        const blackCaptured = document.querySelector('.black-captured');
        
        whiteCaptured.innerHTML = '';
        blackCaptured.innerHTML = '';
        
        this.engine.capturedPieces.white.forEach(piece => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = this.pieceSymbols[piece];
            whiteCaptured.appendChild(pieceElement);
        });
        
        this.engine.capturedPieces.black.forEach(piece => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = this.pieceSymbols[piece];
            blackCaptured.appendChild(pieceElement);
        });
    }

    updateMoveHistory() {
        const movesList = document.getElementById('moves-list');
        movesList.innerHTML = '';
        
        for (let i = 0; i < this.engine.moveHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = this.engine.moveHistory[i];
            const blackMove = this.engine.moveHistory[i + 1];
            
            const movePair = document.createElement('div');
            movePair.className = 'move-pair';
            
            const moveNumberElement = document.createElement('span');
            moveNumberElement.className = 'move-number';
            moveNumberElement.textContent = `${moveNumber}.`;
            
            const whiteMoveElement = document.createElement('span');
            whiteMoveElement.className = 'move';
            whiteMoveElement.textContent = this.formatMove(whiteMove);
            
            movePair.appendChild(moveNumberElement);
            movePair.appendChild(whiteMoveElement);
            
            if (blackMove) {
                const blackMoveElement = document.createElement('span');
                blackMoveElement.className = 'move';
                blackMoveElement.textContent = this.formatMove(blackMove);
                movePair.appendChild(blackMoveElement);
            }
            
            movesList.appendChild(movePair);
        }
        
        // Scroll to bottom
        movesList.scrollTop = movesList.scrollHeight;
    }

    formatMove(move) {
        if (!move || !move.from || !move.to) return '';
        
        const piece = move.piece && move.piece.toUpperCase() === 'P' ? '' : (move.piece ? move.piece.toUpperCase() : '');
        const from = this.squareToAlgebraic(move.from.row, move.from.col);
        const to = this.squareToAlgebraic(move.to.row, move.to.col);
        const capture = move.capturedPiece ? 'x' : '';
        
        if (move.type === 'castle-kingside') return 'O-O';
        if (move.type === 'castle-queenside') return 'O-O-O';
        
        return `${piece}${capture}${to}`;
    }

    squareToAlgebraic(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return '??';
        
        const files = 'abcdefgh';
        const ranks = '87654321';
        return files[col] + ranks[row];
    }

    handleSquareClick(event) {
        // Check if it's player's turn
        if (this.gameMode === 'multiplayer' && !this.isPlayerTurn) {
            return;
        }
        
        if (this.gameMode === 'ai' && !this.isPlayerTurn) {
            return;
        }
        
        if (this.engine.gameState !== 'playing') {
            return;
        }

        // Check if it's the right color's turn in multiplayer
        if (this.gameMode === 'multiplayer' && this.engine.currentPlayer !== this.playerColor) {
            return;
        }

        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);
        
        // If clicking on a valid move square
        const validMove = this.validMoves.find(move => move.row === row && move.col === col);
        if (validMove && this.selectedSquare) {
            this.makePlayerMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
            return;
        }
        
        // If clicking on own piece
        const piece = this.engine.getPieceAt(row, col);
        if (piece && this.engine.isPieceColor(piece, this.engine.currentPlayer)) {
            // In multiplayer, only allow moving own color
            if (this.gameMode === 'multiplayer' && this.engine.currentPlayer !== this.playerColor) {
                return;
            }
            this.selectSquare(row, col);
        } else {
            this.clearSelection();
        }
    }

    selectSquare(row, col) {
        this.selectedSquare = { row, col };
        this.validMoves = this.engine.getValidMoves(row, col);
        this.updateBoard();
    }

    clearSelection() {
        this.selectedSquare = null;
        this.validMoves = [];
        this.updateBoard();
    }

    makePlayerMove(fromRow, fromCol, toRow, toCol) {
        // Check if this move would result in pawn promotion
        if (this.engine.wouldPromote(fromRow, fromCol, toRow, toCol)) {
            this.pendingPromotion = { fromRow, fromCol, toRow, toCol };
            this.showPromotionModal();
            return;
        }

        this.executeMove(fromRow, fromCol, toRow, toCol);
    }

    executeMove(fromRow, fromCol, toRow, toCol, promotionPiece = null) {
        if (this.engine.makeMove(fromRow, fromCol, toRow, toCol, promotionPiece)) {
            this.clearSelection();
            this.updateDisplay();
            
            // Handle local 2-player mode - flip board after each move
            if (this.gameMode === 'local') {
                this.boardFlipped = !this.boardFlipped;
                setTimeout(() => {
                    this.initializeBoard();
                    this.updateDisplay();
                }, 300); // Small delay for smooth transition
            }
            
            // Handle multiplayer move
            if (this.gameMode === 'multiplayer' && window.multiplayerManager) {
                window.multiplayerManager.makeMove(fromRow, fromCol, toRow, toCol, promotionPiece);
                this.isPlayerTurn = false;
            }
            
            // Handle AI move
            if (this.gameMode === 'ai' && this.engine.gameState === 'playing') {
                this.isPlayerTurn = false;
                setTimeout(() => this.makeAIMove(), 500);
            }
        }
    }

    // Promotion Modal
    setupPromotionModal() {
        const promotionBtns = document.querySelectorAll('.promotion-btn');
        promotionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const piece = btn.dataset.piece;
                this.handlePromotion(piece);
            });
        });
    }

    showPromotionModal() {
        const modal = document.getElementById('promotion-modal');
        modal.classList.remove('hidden');
        
        // Update piece symbols based on current player
        const isWhite = this.engine.currentPlayer === 'white';
        const symbols = {
            'q': isWhite ? '♕' : '♛',
            'r': isWhite ? '♖' : '♜', 
            'b': isWhite ? '♗' : '♝',
            'n': isWhite ? '♘' : '♞'
        };
        
        document.querySelectorAll('.promotion-btn').forEach(btn => {
            const piece = btn.dataset.piece;
            const pieceName = { 'q': 'Queen', 'r': 'Rook', 'b': 'Bishop', 'n': 'Knight' }[piece];
            btn.innerHTML = `${symbols[piece]} ${pieceName}`;
        });
    }

    hidePromotionModal() {
        const modal = document.getElementById('promotion-modal');
        modal.classList.add('hidden');
    }

    handlePromotion(piece) {
        if (this.pendingPromotion) {
            const { fromRow, fromCol, toRow, toCol } = this.pendingPromotion;
            this.executeMove(fromRow, fromCol, toRow, toCol, piece);
            this.pendingPromotion = null;
        }
        this.hidePromotionModal();
    }

    async makeAIMove() {
        if (this.engine.gameState !== 'playing') return;
        
        // Show thinking indicator
        const gameStatusElement = document.getElementById('game-status');
        gameStatusElement.textContent = 'AI is thinking...';
        gameStatusElement.className = 'ai-thinking';
        
        // Use setTimeout to allow UI to update
        setTimeout(() => {
            const move = this.ai.getBestMove(this.engine);
            
            if (move && this.validateAIMove(move)) {
                if (this.engine.makeMove(move.from.row, move.from.col, move.to.row, move.to.col)) {
                    this.updateDisplay();
                } else {
                    console.error('AI move failed:', move);
                    // Try a random valid move as fallback
                    this.makeRandomAIMove();
                }
            } else {
                console.error('Invalid AI move:', move);
                this.makeRandomAIMove();
            }
            
            this.isPlayerTurn = true;
        }, 100);
    }

    validateAIMove(move) {
        if (!move) {
            console.error('AI move is null or undefined');
            return false;
        }
        
        // Check if move coordinates are valid
        if (!this.engine.isValidSquare(move.from.row, move.from.col) ||
            !this.engine.isValidSquare(move.to.row, move.to.col)) {
            console.error('AI move has invalid coordinates:', move);
            return false;
        }
        
        // Check if there's a piece at the from position
        const piece = this.engine.getPieceAt(move.from.row, move.from.col);
        if (!piece) {
            console.error('No piece at AI move source:', move.from);
            return false;
        }
        
        if (!this.engine.isPieceColor(piece, this.engine.currentPlayer)) {
            console.error('AI trying to move opponent piece:', piece, 'current player:', this.engine.currentPlayer);
            return false;
        }
        
        // Check if the move is in the list of valid moves
        const validMoves = this.engine.getValidMoves(move.from.row, move.from.col);
        const isValid = validMoves.some(validMove => 
            validMove.row === move.to.row && validMove.col === move.to.col
        );
        
        if (!isValid) {
            console.error('AI move not in valid moves:', move, 'valid moves:', validMoves);
            return false;
        }
        
        // Double-check that this move won't put own king in check
        if (this.engine.wouldBeInCheck(move.from.row, move.from.col, move.to.row, move.to.col)) {
            console.error('AI move would put own king in check:', move);
            return false;
        }
        
        return true;
    }

    makeRandomAIMove() {
        const allMoves = this.engine.getAllValidMoves(this.engine.currentPlayer);
        if (allMoves.length > 0) {
            const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
            this.engine.makeMove(randomMove.from.row, randomMove.from.col, randomMove.to.row, randomMove.to.col);
            this.updateDisplay();
        }
    }

    newGame() {
        this.engine = new ChessEngine();
        this.clearSelection();
        this.isPlayerTurn = this.gameMode === 'ai' ? true : (this.playerColor === 'white');
        this.ai.clearTranspositionTable();
        this.pendingPromotion = null;
        this.updateDisplay();
    }

    setDifficulty(difficulty) {
        this.ai.setDifficulty(difficulty);
    }

    handleGameEnd(result) {
        // Update ELO rating
        if (window.authSystem && window.authSystem.getCurrentUser()) {
            let opponentElo = 1200; // Default AI ELO
            
            // Get opponent ELO for multiplayer games
            if (this.gameMode === 'multiplayer' && this.opponentInfo) {
                opponentElo = this.opponentInfo.elo;
            }
            
            window.authSystem.updateElo(result, opponentElo);
            
            // Update player info display
            const stats = window.authSystem.getUserStats();
            if (stats) {
                // Update ELO display in multiplayer
                if (this.gameMode === 'multiplayer') {
                    if (this.playerColor === 'white') {
                        document.getElementById('white-player-elo').textContent = `ELO: ${stats.elo}`;
                    } else {
                        document.getElementById('black-player-elo').textContent = `ELO: ${stats.elo}`;
                    }
                }
            }
        }
    }

    flipBoard() {
        // Implementation for flipping board perspective
        // This would involve changing the display order of squares
        // For now, we'll keep it simple
    }
}