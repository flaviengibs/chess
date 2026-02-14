// Global variables
let authSystem;
let chessGame;
let multiplayerManager;
let socialManager;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    try {
        authSystem = new AuthSystem();
        multiplayerManager = new MultiplayerManager();
        socialManager = new SocialManager();
        
        // Make globally accessible
        window.authSystem = authSystem;
        window.multiplayerManager = multiplayerManager;
        window.socialManager = socialManager;
        
        initializeEventListeners();
        showLoginScreen();
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});

function initializeEventListeners() {
    console.log('Setting up event listeners...');
    
    // Auth event listeners
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const menuLogoutBtn = document.getElementById('menu-logout-btn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
        console.log('Login button listener added');
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', handleRegister);
        console.log('Register button listener added');
    }
    
    if (menuLogoutBtn) {
        menuLogoutBtn.addEventListener('click', handleLogout);
        console.log('Logout button listener added');
    }
    
    // Menu event listeners
    const playAiBtn = document.getElementById('play-ai-btn');
    const playOnlineBtn = document.getElementById('play-online-btn');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const friendsBtn = document.getElementById('friends-btn');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const profileBtn = document.getElementById('profile-btn');
    
    if (playAiBtn) playAiBtn.addEventListener('click', startAIGame);
    if (playOnlineBtn) playOnlineBtn.addEventListener('click', findOnlineGame);
    if (createRoomBtn) createRoomBtn.addEventListener('click', createPrivateRoom);
    if (joinRoomBtn) joinRoomBtn.addEventListener('click', showJoinRoomModal);
    if (friendsBtn) friendsBtn.addEventListener('click', () => socialManager.showFriendsModal());
    if (leaderboardBtn) leaderboardBtn.addEventListener('click', () => socialManager.showLeaderboardModal());
    if (profileBtn) profileBtn.addEventListener('click', showProfile);
    
    // Game event listeners
    const newGameBtn = document.getElementById('new-game-btn');
    const difficultySelect = document.getElementById('difficulty-select');
    const resignBtn = document.getElementById('resign-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    const offerDrawBtn = document.getElementById('offer-draw-btn');
    
    if (newGameBtn) newGameBtn.addEventListener('click', startNewGame);
    if (difficultySelect) difficultySelect.addEventListener('change', handleDifficultyChange);
    if (resignBtn) resignBtn.addEventListener('click', handleResign);
    if (backToMenuBtn) backToMenuBtn.addEventListener('click', backToMenu);
    if (offerDrawBtn) offerDrawBtn.addEventListener('click', offerDraw);
    
    // Draw offer modal listeners
    const acceptDrawBtn = document.getElementById('accept-draw-btn');
    const declineDrawBtn = document.getElementById('decline-draw-btn');
    
    if (acceptDrawBtn) acceptDrawBtn.addEventListener('click', acceptDraw);
    if (declineDrawBtn) declineDrawBtn.addEventListener('click', declineDraw);
    
    // Room modal listeners
    const roomModalConfirm = document.getElementById('room-modal-confirm');
    const roomModalCancel = document.getElementById('room-modal-cancel');
    
    if (roomModalConfirm) roomModalConfirm.addEventListener('click', handleRoomModalConfirm);
    if (roomModalCancel) roomModalCancel.addEventListener('click', hideRoomModal);
    
    // Enter key support for login
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const roomCodeInput = document.getElementById('room-code-input');
    
    if (usernameInput) {
        usernameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleLogin();
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleLogin();
        });
    }
    
    if (roomCodeInput) {
        roomCodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleRoomModalConfirm();
        });
    }
    
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
        }
    });
    
    console.log('All event listeners set up');
}

// Authentication Functions
async function handleLogin() {
    console.log('Login button clicked');
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    
    if (!usernameInput || !passwordInput) {
        console.error('Username or password input not found');
        showAuthMessage('Login form error', 'error');
        return;
    }
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    console.log('Login attempt with username:', username);
    
    if (!username || !password) {
        showAuthMessage('Please enter both username and password', 'error');
        return;
    }
    
    if (!authSystem) {
        console.error('AuthSystem not initialized');
        showAuthMessage('System error', 'error');
        return;
    }
    
    // Disable button during request
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    showAuthMessage('Connecting to server...', 'info');
    
    const result = await authSystem.login(username, password);
    console.log('Login result:', result);
    
    // Re-enable button
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
    
    if (result.success) {
        showAuthMessage(result.message, 'success');
        setTimeout(() => {
            showMainMenu();
        }, 1000);
    } else {
        showAuthMessage(result.message, 'error');
    }
}

async function handleRegister() {
    console.log('Register button clicked');
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const registerBtn = document.getElementById('register-btn');
    
    if (!usernameInput || !passwordInput) {
        console.error('Username or password input not found');
        showAuthMessage('Registration form error', 'error');
        return;
    }
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    console.log('Register attempt with username:', username);
    
    if (!username || !password) {
        showAuthMessage('Please enter both username and password', 'error');
        return;
    }
    
    if (!authSystem) {
        console.error('AuthSystem not initialized');
        showAuthMessage('System error', 'error');
        return;
    }
    
    // Disable button during request
    registerBtn.disabled = true;
    registerBtn.textContent = 'Creating account...';
    showAuthMessage('Connecting to server...', 'info');
    
    const result = await authSystem.register(username, password);
    console.log('Register result:', result);
    
    // Re-enable button
    registerBtn.disabled = false;
    registerBtn.textContent = 'Register';
    
    showAuthMessage(result.message, result.success ? 'success' : 'error');
    
    if (result.success) {
        // Clear form
        usernameInput.value = '';
        passwordInput.value = '';
    }
}

function handleLogout() {
    console.log('Logout clicked');
    
    if (authSystem) {
        authSystem.logout();
    }
    
    if (multiplayerManager) {
        multiplayerManager.disconnect();
    }
    
    showLoginScreen();
    
    // Clean up game
    if (chessGame) {
        chessGame = null;
    }
    
    console.log('User logged out');
}

function showAuthMessage(message, type) {
    console.log('Auth message:', type, message);
    
    const messageElement = document.getElementById('auth-message');
    if (!messageElement) {
        console.error('Auth message element not found');
        return;
    }
    
    messageElement.textContent = message;
    messageElement.className = type;
    
    // Clear message after 3 seconds
    setTimeout(() => {
        messageElement.textContent = '';
        messageElement.className = '';
    }, 3000);
}

// Screen Management Functions
function showMainMenu() {
    console.log('Showing main menu');
    
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    
    // Update player info
    const user = authSystem.getCurrentUser();
    if (user) {
        const nameElement = document.getElementById('menu-player-name');
        const eloElement = document.getElementById('menu-player-elo');
        
        if (nameElement) nameElement.textContent = user.username;
        if (eloElement) eloElement.textContent = `ELO: ${user.elo}`;
        
        console.log('Player info updated:', user.username, user.elo);
    }
}

function showLoginScreen() {
    console.log('Showing login screen');
    
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    
    // Clear form
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const authMessage = document.getElementById('auth-message');
    
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (authMessage) {
        authMessage.textContent = '';
        authMessage.className = '';
    }
}

function showGameScreen() {
    console.log('Showing game screen');
    
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
}

// Game Mode Functions
function startAIGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.body.classList.add('ai-mode');
    document.body.classList.remove('online-mode');
    
    initializeGame();
    chessGame.startAIGame();
}

function findOnlineGame() {
    multiplayerManager.findRandomGame();
    showNotification('Looking for opponent...', 'info');
}

function createPrivateRoom() {
    multiplayerManager.createRoom();
    showNotification('Creating private room...', 'info');
}

function showJoinRoomModal() {
    document.getElementById('room-modal-title').textContent = 'Join Room';
    document.getElementById('room-code-input').placeholder = 'Enter room code';
    document.getElementById('room-modal-confirm').textContent = 'Join';
    document.getElementById('room-modal').classList.remove('hidden');
}

function hideRoomModal() {
    document.getElementById('room-modal').classList.add('hidden');
    document.getElementById('room-code-input').value = '';
}

function handleRoomModalConfirm() {
    const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (roomCode) {
        multiplayerManager.joinRoom(roomCode);
        hideRoomModal();
        showNotification(`Joining room ${roomCode}...`, 'info');
    }
}

// Game Control Functions
function initializeGame() {
    if (!chessGame) {
        chessGame = new ChessGame();
        window.chessGame = chessGame;
    }
    
    // Set initial difficulty for AI mode
    const difficulty = document.getElementById('difficulty-select').value;
    chessGame.setDifficulty(difficulty);
    
    // Update display
    chessGame.updateDisplay();
}

function startNewGame() {
    if (chessGame) {
        chessGame.newGame();
    }
}

function handleDifficultyChange() {
    const difficulty = document.getElementById('difficulty-select').value;
    if (chessGame) {
        chessGame.setDifficulty(difficulty);
    }
}

function handleResign() {
    if (confirm('Are you sure you want to resign?')) {
        if (chessGame && chessGame.gameMode === 'multiplayer') {
            // Get opponent ELO for proper calculation
            let opponentElo = 1200;
            if (chessGame.opponentInfo) {
                opponentElo = chessGame.opponentInfo.elo;
            }
            
            // Update ELO for resignation (loss)
            authSystem.updateElo('loss', opponentElo);
            
            multiplayerManager.resignGame();
        } else if (chessGame && chessGame.gameMode === 'ai') {
            // Update ELO for AI game resignation
            authSystem.updateElo('loss', 1200);
        }
        
        showNotification('Game resigned', 'info');
        setTimeout(() => backToMenu(), 1000);
    }
}

function offerDraw() {
    if (chessGame && chessGame.gameMode === 'multiplayer') {
        multiplayerManager.offerDraw();
        showNotification('Draw offer sent to opponent', 'info');
    }
}

function acceptDraw() {
    document.getElementById('draw-offer-modal').classList.add('hidden');
    
    if (chessGame) {
        chessGame.engine.gameState = 'draw';
        chessGame.updateDisplay();
        
        if (chessGame.gameMode === 'ai') {
            authSystem.updateElo('draw');
        }
    }
    
    showNotification('Draw accepted', 'info');
    setTimeout(() => backToMenu(), 2000);
}

function declineDraw() {
    document.getElementById('draw-offer-modal').classList.add('hidden');
    showNotification('Draw offer declined', 'info');
}

function backToMenu() {
    // Resign current game if playing
    if (chessGame && chessGame.engine.gameState === 'playing') {
        if (chessGame.gameMode === 'multiplayer') {
            // Get opponent ELO for proper calculation
            let opponentElo = 1200;
            if (chessGame.opponentInfo) {
                opponentElo = chessGame.opponentInfo.elo;
            }
            
            // Update ELO for resignation (loss)
            authSystem.updateElo('loss', opponentElo);
            
            multiplayerManager.resignGame();
            multiplayerManager.disconnect();
        } else if (chessGame.gameMode === 'ai') {
            // Update ELO for AI game resignation
            authSystem.updateElo('loss', 1200);
        }
        
        showNotification('Game resigned', 'info');
    }
    
    document.body.classList.remove('ai-mode', 'online-mode');
    showMainMenu();
}

function showProfile() {
    const user = authSystem.getCurrentUser();
    if (!user) return;
    
    const stats = authSystem.getUserStats();
    const message = `
Profile: ${stats.username}
ELO: ${stats.elo}
Games Played: ${stats.gamesPlayed}
Wins: ${stats.wins}
Losses: ${stats.losses}
Draws: ${stats.draws}
Win Rate: ${stats.winRate}%
    `.trim();
    
    alert(message);
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '5px',
        color: 'white',
        fontWeight: 'bold',
        zIndex: '1000',
        opacity: '0',
        transition: 'opacity 0.3s ease'
    });
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        default:
            notification.style.backgroundColor = '#2196F3';
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Fade in
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Make functions globally accessible
window.showNotification = showNotification;

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Only handle shortcuts when game is active
    if (document.getElementById('game-screen').classList.contains('hidden')) {
        return;
    }
    
    switch (e.key) {
        case 'n':
        case 'N':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                startNewGame();
                showNotification('New game started!', 'success');
            }
            break;
        case 'Escape':
            if (chessGame) {
                chessGame.clearSelection();
            }
            break;
    }
});

// Prevent context menu on chess board
document.addEventListener('contextmenu', function(e) {
    if (e.target.classList.contains('square')) {
        e.preventDefault();
    }
});

// Add visual feedback for buttons
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
        e.target.style.transform = 'scale(0.95)';
        setTimeout(() => {
            e.target.style.transform = 'scale(1)';
        }, 100);
    }
});

// Game state warning on page unload
window.addEventListener('beforeunload', function(e) {
    if (chessGame && chessGame.engine.moveHistory.length > 0 && chessGame.engine.gameState === 'playing') {
        e.preventDefault();
        e.returnValue = 'You have a game in progress. Are you sure you want to leave?';
        return e.returnValue;
    }
});