class MultiplayerManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentRoom = null;
        this.playerColor = null;
        this.opponentInfo = null;
        this.gameId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        console.log('MultiplayerManager initialized');
    }

    connect() {
        const serverUrl = window.CHESS_SERVER_URL || 'http://localhost:3000';
        this.socket = io(serverUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts
        });
        
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('connected');
            console.log('Connected to multiplayer server');
            
            // Setup social socket listeners when connected
            if (window.socialManager) {
                window.socialManager.setupSocketListeners();
            }
            
            // Attempt to restore session if we have a room
            if (this.currentRoom) {
                const user = authSystem.getCurrentUser();
                this.socket.emit('reconnect-player', {
                    roomCode: this.currentRoom,
                    playerId: user.username
                });
            }
        });
        
        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            this.updateConnectionStatus('disconnected');
            console.log('Disconnected from server:', reason);
            
            if (reason === 'io server disconnect') {
                // Server disconnected us, try to reconnect
                this.socket.connect();
            }
        });
        
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            this.reconnectAttempts = attemptNumber;
            console.log(`Reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`);
            showNotification(`Reconnecting... (${attemptNumber}/${this.maxReconnectAttempts})`, 'info');
        });
        
        this.socket.on('reconnect_failed', () => {
            console.error('Failed to reconnect after maximum attempts');
            showNotification('Failed to reconnect to server', 'error');
            this.updateConnectionStatus('error');
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus('error');
        });
        
        // Move synchronization events
        this.socket.on('move-made', (data) => {
            console.log('Received opponent move:', data);
            
            if (window.chessGame && window.chessGame.engine && data.move) {
                const success = window.chessGame.engine.makeMove(
                    data.move.from.row, data.move.from.col,
                    data.move.to.row, data.move.to.col,
                    data.move.promotion
                );
                
                if (success) {
                    window.chessGame.updateDisplay();
                    window.chessGame.isPlayerTurn = true;
                }
            }
        });
        
        this.socket.on('move-invalid', (data) => {
            showNotification(data.reason || 'Invalid move', 'error');
            console.error('Invalid move:', data);
        });
        
        // Chat events
        this.socket.on('chat-message', (data) => {
            this.displayChatMessage(data.sender, data.message, true);
        });
        
        // Draw offer events
        this.socket.on('draw-offered', (data) => {
            this.showDrawOfferModal(data.from);
        });
        
        this.socket.on('draw-response', (data) => {
            if (data.accepted) {
                showNotification('Opponent accepted the draw', 'info');
                if (window.chessGame) {
                    window.chessGame.engine.gameState = 'draw';
                    window.chessGame.updateDisplay();
                }
            } else {
                showNotification('Opponent declined the draw', 'info');
            }
        });
        
        // Game end events
        this.socket.on('game-ended', (data) => {
            console.log('Game ended:', data);
            
            const user = authSystem.getCurrentUser();
            let resultMessage = '';
            let isWin = false;
            
            // Determine if player won based on their color
            const playerWon = data.winner === this.playerColor;
            const isDraw = !data.winner || data.reason === 'draw' || data.reason === 'stalemate';
            
            // Determine result message
            if (data.reason === 'resignation') {
                if (playerWon) {
                    resultMessage = 'Opponent resigned. You win!';
                    isWin = true;
                } else {
                    resultMessage = 'You resigned';
                }
            } else if (data.reason === 'checkmate') {
                if (playerWon) {
                    resultMessage = 'Checkmate! You win!';
                    isWin = true;
                } else {
                    resultMessage = 'Checkmate! You lose.';
                }
            } else if (data.reason === 'stalemate' || data.reason === 'draw') {
                resultMessage = 'Draw';
            } else if (data.reason === 'timeout') {
                if (playerWon) {
                    resultMessage = 'Opponent timed out. You win!';
                    isWin = true;
                } else {
                    resultMessage = 'You timed out';
                }
            }
            
            showNotification(resultMessage, isWin ? 'success' : 'info');
            
            // Update ELO - CRITICAL FIX
            if (data.newElos) {
                const playerColor = this.playerColor;
                const newElo = playerColor === 'white' ? data.newElos.white : data.newElos.black;
                const eloChange = playerColor === 'white' ? data.eloChanges.white : data.eloChanges.black;
                
                console.log('Updating ELO:', { playerColor, newElo, eloChange, currentElo: user.elo });
                
                if (newElo !== undefined) {
                    // Update localStorage directly
                    user.elo = newElo;
                    authSystem.currentUser.elo = newElo;
                    authSystem.users[user.username].elo = newElo;
                    
                    // Update game stats
                    if (isWin) {
                        authSystem.users[user.username].wins = (authSystem.users[user.username].wins || 0) + 1;
                    } else if (isDraw) {
                        authSystem.users[user.username].draws = (authSystem.users[user.username].draws || 0) + 1;
                    } else {
                        authSystem.users[user.username].losses = (authSystem.users[user.username].losses || 0) + 1;
                    }
                    authSystem.users[user.username].gamesPlayed = (authSystem.users[user.username].gamesPlayed || 0) + 1;
                    
                    authSystem.saveUsers();
                    
                    const changeText = eloChange >= 0 ? `+${eloChange}` : `${eloChange}`;
                    showNotification(`ELO ${changeText} (${newElo})`, eloChange >= 0 ? 'success' : 'warning');
                }
            }
            
            // Update game state if game object exists
            if (window.chessGame) {
                window.chessGame.engine.gameState = data.reason === 'checkmate' ? 'checkmate' : 
                                                     data.reason === 'stalemate' ? 'stalemate' : 'ended';
                window.chessGame.updateDisplay();
            }
            
            // Return to menu after 3 seconds
            setTimeout(() => {
                this.returnToMenu();
            }, 3000);
        });
        
        // Reconnection events
        this.socket.on('opponent-disconnected', (data) => {
            showNotification('Opponent disconnected. Waiting for reconnection...', 'warning');
        });
        
        this.socket.on('opponent-reconnected', (data) => {
            showNotification('Opponent reconnected', 'success');
        });
        
        this.socket.on('game-state', (data) => {
            console.log('Received game state:', data);
            
            if (window.chessGame && window.chessGame.engine && data.gameState) {
                // Restore game state
                window.chessGame.engine.board = data.gameState.board;
                window.chessGame.engine.currentPlayer = data.gameState.currentPlayer;
                window.chessGame.engine.gameState = data.gameState.gameState;
                window.chessGame.engine.moveHistory = data.gameState.moveHistory || [];
                window.chessGame.updateDisplay();
                showNotification('Game state restored', 'success');
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.isConnected = false;
        this.currentRoom = null;
        this.playerColor = null;
        this.opponentInfo = null;
        this.gameId = null;
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('disconnected');
    }

    // Room Management
    createRoom() {
        if (!this.isConnected) {
            this.connect();
            setTimeout(() => this.createRoom(), 600);
            return;
        }

        const user = authSystem.getCurrentUser();
        this.socket.emit('create-room', { 
            playerId: user.username,
            playerInfo: { username: user.username, elo: user.elo }
        });
        
        this.socket.once('room-created', (data) => {
            this.currentRoom = data.roomCode;
            this.playerColor = 'white';
            showNotification(`Room created: ${data.roomCode}`, 'success');
            showNotification(`Share this code with your opponent: ${data.roomCode}`, 'info');
            
            // Wait for opponent to join
            this.socket.once('game-started', (gameData) => {
                this.opponentInfo = gameData.blackPlayer;
                this.gameId = data.roomCode;
                showNotification(`${gameData.blackPlayer.username} joined the game!`, 'success');
                this.startGame();
            });
        });
        
        this.socket.once('error', (data) => {
            showNotification(data.message || 'Failed to create room', 'error');
        });
    }

    joinRoom(roomCode) {
        if (!this.isConnected) {
            this.connect();
            setTimeout(() => this.joinRoom(roomCode), 600);
            return;
        }

        const user = authSystem.getCurrentUser();
        this.socket.emit('join-room', { 
            roomCode,
            playerId: user.username,
            playerInfo: { username: user.username, elo: user.elo }
        });
        
        this.socket.once('game-started', (data) => {
            this.currentRoom = data.roomCode;
            this.playerColor = 'black'; // Joiner is always black
            this.opponentInfo = data.whitePlayer;
            this.gameId = data.roomCode;
            showNotification(`Joined room: ${roomCode}`, 'success');
            this.startGame();
        });
        
        this.socket.once('error', (data) => {
            showNotification(data.message || 'Failed to join room', 'error');
        });
    }

    findRandomGame() {
        if (!this.isConnected) {
            this.connect();
            setTimeout(() => this.findRandomGame(), 600);
            return;
        }

        const user = authSystem.getCurrentUser();
        showNotification('Looking for opponent...', 'info');
        this.socket.emit('find-match', { 
            playerId: user.username,
            playerInfo: { username: user.username, elo: user.elo }
        });
        
        this.socket.once('match-found', (data) => {
            this.currentRoom = data.roomCode;
            this.playerColor = data.playerColor;
            
            // Determine opponent based on our color
            const user = authSystem.getCurrentUser();
            if (data.playerColor === 'white') {
                this.opponentInfo = data.blackPlayer;
            } else {
                this.opponentInfo = data.whitePlayer;
            }
            
            this.gameId = data.roomCode;
            showNotification(`Found opponent: ${this.opponentInfo.username}!`, 'success');
            this.startGame();
        });
        
        this.socket.once('error', (data) => {
            showNotification(data.message || 'Matchmaking failed', 'error');
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
            if (!this.currentRoom) {
                showNotification('No opponent found. Please try again.', 'info');
            }
        }, 30000);
    }

    // Game Actions
    makeMove(fromRow, fromCol, toRow, toCol, promotion = null) {
        if (!this.currentRoom || !this.socket) return false;

        this.socket.emit('make-move', {
            roomCode: this.currentRoom,
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            promotion: promotion
        });

        return true;
    }

    sendChatMessage(message) {
        if (!this.currentRoom || !message.trim() || !this.socket) return;

        this.socket.emit('chat-message', {
            roomCode: this.currentRoom,
            message: message.trim()
        });
        
        this.displayChatMessage(authSystem.getCurrentUser().username, message, false);
    }

    resignGame() {
        if (!this.gameId || !this.socket) return;
        
        this.socket.emit('resign', { roomCode: this.currentRoom });
        showNotification('You resigned the game', 'info');
    }

    offerDraw() {
        if (!this.currentRoom || !this.socket) return;
        
        this.socket.emit('offer-draw', { roomCode: this.currentRoom });
        showNotification('Draw offer sent', 'info');
    }
    
    respondToDraw(accept) {
        if (!this.currentRoom || !this.socket) return;
        
        this.socket.emit('respond-draw', { 
            roomCode: this.currentRoom, 
            accept: accept 
        });
        
        if (accept) {
            showNotification('Draw accepted', 'info');
            if (window.chessGame) {
                window.chessGame.engine.gameState = 'draw';
                window.chessGame.updateDisplay();
            }
        }
    }
    
    showDrawOfferModal(from) {
        const modal = document.getElementById('draw-offer-modal');
        const message = document.getElementById('draw-offer-message');
        if (modal && message) {
            message.textContent = `${from} is offering a draw. Do you accept?`;
            modal.classList.remove('hidden');
            
            const acceptBtn = document.getElementById('accept-draw-btn');
            const declineBtn = document.getElementById('decline-draw-btn');
            
            acceptBtn.onclick = () => {
                this.respondToDraw(true);
                modal.classList.add('hidden');
            };
            
            declineBtn.onclick = () => {
                this.respondToDraw(false);
                modal.classList.add('hidden');
            };
        }
    }

    // UI Updates
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = status === 'connected' ? 'Connected' : 
                                      status === 'disconnected' ? 'Disconnected' : 'Error';
            statusElement.className = `online-only ${status}`;
        }
    }

    startGame() {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        document.body.classList.add('online-mode');
        document.body.classList.remove('ai-mode');

        if (!window.chessGame) {
            window.chessGame = new ChessGame();
        }
        
        window.chessGame.startMultiplayerGame(this.playerColor, this.opponentInfo);
        this.updatePlayerDisplay();
    }

    updatePlayerDisplay() {
        const user = authSystem.getCurrentUser();
        
        if (this.playerColor === 'white') {
            document.getElementById('white-player-name').textContent = user.username;
            document.getElementById('white-player-elo').textContent = `ELO: ${user.elo}`;
            document.getElementById('black-player-name').textContent = this.opponentInfo.username;
            document.getElementById('black-player-elo').textContent = `ELO: ${this.opponentInfo.elo}`;
        } else {
            document.getElementById('black-player-name').textContent = user.username;
            document.getElementById('black-player-elo').textContent = `ELO: ${user.elo}`;
            document.getElementById('white-player-name').textContent = this.opponentInfo.username;
            document.getElementById('white-player-elo').textContent = `ELO: ${this.opponentInfo.elo}`;
        }
    }

    displayChatMessage(sender, message, isOpponent) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${isOpponent ? 'opponent' : 'own'}`;
        
        const usernameElement = document.createElement('div');
        usernameElement.className = 'username';
        usernameElement.textContent = sender;
        
        const textElement = document.createElement('div');
        textElement.textContent = message;
        
        messageElement.appendChild(usernameElement);
        messageElement.appendChild(textElement);
        chatMessages.appendChild(messageElement);
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    setupEventHandlers() {
        document.addEventListener('DOMContentLoaded', () => {
            const chatInput = document.getElementById('chat-input');
            const sendBtn = document.getElementById('send-chat-btn');

            if (chatInput && sendBtn) {
                const sendMessage = () => {
                    const message = chatInput.value.trim();
                    if (message) {
                        this.sendChatMessage(message);
                        chatInput.value = '';
                    }
                };

                sendBtn.addEventListener('click', sendMessage);
                chatInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        sendMessage();
                    }
                });
            }
        });
    }
    
    returnToMenu() {
        // Clean up game state
        this.currentRoom = null;
        this.playerColor = null;
        this.opponentInfo = null;
        this.gameId = null;
        
        // Hide game screen, show menu
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        document.body.classList.remove('online-mode');
        
        // Update menu with new ELO
        const user = authSystem.getCurrentUser();
        if (user) {
            document.getElementById('menu-player-name').textContent = user.username;
            document.getElementById('menu-player-elo').textContent = `ELO: ${user.elo}`;
        }
    }
}
