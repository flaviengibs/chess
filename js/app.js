// Global variables
let authSystem;
let chessGame;
let multiplayerManager;
let socialManager;
let themeManager;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    try {
        authSystem      = new AuthSystem();
        multiplayerManager = new MultiplayerManager();
        socialManager   = new SocialManager();
        themeManager    = typeof ThemeManager !== 'undefined' ? new ThemeManager() : null;

        window.authSystem         = authSystem;
        window.multiplayerManager = multiplayerManager;
        window.socialManager      = socialManager;

        initializeEventListeners();
        showLoginScreen();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});

function initializeEventListeners() {
    // Auth
    const loginBtn     = document.getElementById('login-btn');
    const registerBtn  = document.getElementById('register-btn');
    const logoutBtn    = document.getElementById('menu-logout-btn');
    if (loginBtn)    loginBtn.addEventListener('click', handleLogin);
    if (registerBtn) registerBtn.addEventListener('click', handleRegister);
    if (logoutBtn)   logoutBtn.addEventListener('click', handleLogout);

    // Menu
    const playAiBtn     = document.getElementById('play-ai-btn');
    const playLocalBtn  = document.getElementById('play-local-btn');
    const playOnlineBtn = document.getElementById('play-online-btn');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn   = document.getElementById('join-room-btn');
    const friendsBtn    = document.getElementById('friends-btn');
    const leaderboardBtn= document.getElementById('leaderboard-btn');
    const profileBtn    = document.getElementById('profile-btn');
    if (playAiBtn)      playAiBtn.addEventListener('click', startAIGame);
    if (playLocalBtn)   playLocalBtn.addEventListener('click', startLocalGame);
    if (playOnlineBtn)  playOnlineBtn.addEventListener('click', findOnlineGame);
    if (createRoomBtn)  createRoomBtn.addEventListener('click', createPrivateRoom);
    if (joinRoomBtn)    joinRoomBtn.addEventListener('click', showJoinRoomModal);
    if (friendsBtn)     friendsBtn.addEventListener('click', () => socialManager.showFriendsModal());
    if (leaderboardBtn) leaderboardBtn.addEventListener('click', () => socialManager.showLeaderboardModal());
    if (profileBtn)     profileBtn.addEventListener('click', showProfile);

    // Game controls
    const newGameBtn    = document.getElementById('new-game-btn');
    const diffSelect    = document.getElementById('difficulty-select');
    const resignBtn     = document.getElementById('resign-btn');
    const backBtn       = document.getElementById('back-to-menu-btn');
    const offerDrawBtn  = document.getElementById('offer-draw-btn');
    const settingsBtn   = document.getElementById('settings-btn');
    const analyzeBtn    = document.getElementById('analyze-btn');
    const exportPgnBtn  = document.getElementById('export-pgn-btn');
    if (newGameBtn)   newGameBtn.addEventListener('click', startNewGame);
    if (diffSelect)   diffSelect.addEventListener('change', handleDifficultyChange);
    if (resignBtn)    resignBtn.addEventListener('click', handleResign);
    if (backBtn)      backBtn.addEventListener('click', backToMenu);
    if (offerDrawBtn) offerDrawBtn.addEventListener('click', offerDraw);
    if (settingsBtn)  settingsBtn.addEventListener('click', openSettings);
    if (analyzeBtn)   analyzeBtn.addEventListener('click', analyzeGame);
    if (exportPgnBtn) exportPgnBtn.addEventListener('click', exportPGN);

    // Draw modal
    const acceptDrawBtn  = document.getElementById('accept-draw-btn');
    const declineDrawBtn = document.getElementById('decline-draw-btn');
    if (acceptDrawBtn)  acceptDrawBtn.addEventListener('click', acceptDraw);
    if (declineDrawBtn) declineDrawBtn.addEventListener('click', declineDraw);

    // Room modal
    const roomConfirm = document.getElementById('room-modal-confirm');
    const roomCancel  = document.getElementById('room-modal-cancel');
    if (roomConfirm) roomConfirm.addEventListener('click', handleRoomModalConfirm);
    if (roomCancel)  roomCancel.addEventListener('click', hideRoomModal);

    // Settings modal
    const closeSettings = document.getElementById('close-settings-btn');
    if (closeSettings) closeSettings.addEventListener('click', () => {
        document.getElementById('settings-modal').classList.add('hidden');
    });
    const closeAnalysis = document.getElementById('close-analysis-btn');
    if (closeAnalysis) closeAnalysis.addEventListener('click', () => {
        document.getElementById('analysis-panel').classList.add('hidden');
    });

    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (themeManager) themeManager.setTheme(btn.dataset.theme);
        });
    });
    const darkToggle = document.getElementById('dark-mode-toggle');
    if (darkToggle) {
        if (themeManager) darkToggle.checked = themeManager.darkMode;
        darkToggle.addEventListener('change', () => {
            if (themeManager) themeManager.toggleDarkMode();
        });
    }

    // Sound settings
    const soundToggle  = document.getElementById('sound-toggle');
    const volumeSlider = document.getElementById('volume-slider');
    if (soundToggle) soundToggle.addEventListener('change', () => {
        if (chessGame && chessGame.sounds) chessGame.sounds.setEnabled(soundToggle.checked);
    });
    if (volumeSlider) volumeSlider.addEventListener('input', () => {
        if (chessGame && chessGame.sounds) chessGame.sounds.setVolume(parseFloat(volumeSlider.value));
    });

    // Animation settings
    const animToggle = document.getElementById('animations-toggle');
    const animSpeed  = document.getElementById('animation-speed');
    if (animToggle) animToggle.addEventListener('change', () => {
        if (chessGame && chessGame.animations) chessGame.animations.setEnabled(animToggle.checked);
    });
    if (animSpeed) animSpeed.addEventListener('change', () => {
        if (chessGame && chessGame.animations) chessGame.animations.setSpeed(animSpeed.value);
    });

    // Enter key on login
    ['username','password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });
    });
    const roomInput = document.getElementById('room-code-input');
    if (roomInput) roomInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') handleRoomModalConfirm();
    });

    // Close modals on backdrop click
    document.addEventListener('click', e => {
        if (e.target.classList.contains('modal')) e.target.classList.add('hidden');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        if (document.getElementById('game-screen').classList.contains('hidden')) return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); startNewGame(); }
        if (e.key === 'Escape' && chessGame) chessGame.clearSelection();
    });
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
    document.body.classList.remove('local-mode');
    
    initializeGame();
    chessGame.startAIGame();
}

function startLocalGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.body.classList.add('local-mode');
    document.body.classList.remove('ai-mode');
    document.body.classList.remove('online-mode');
    
    initializeGame();
    chessGame.startLocalGame();
    showNotification('Local 2-player mode - board will flip after each move', 'info');
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

function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    // Sync current values
    if (chessGame) {
        const s = chessGame.sounds;
        const a = chessGame.animations;
        const soundToggle = document.getElementById('sound-toggle');
        const volSlider   = document.getElementById('volume-slider');
        const animToggle  = document.getElementById('animations-toggle');
        const animSpeed   = document.getElementById('animation-speed');
        if (s && soundToggle) soundToggle.checked = s.enabled;
        if (s && volSlider)   volSlider.value     = s.volume;
        if (a && animToggle)  animToggle.checked  = a.enabled;
        if (a && animSpeed)   animSpeed.value     = a.speed;
    }
    modal.classList.remove('hidden');
}

async function analyzeGame() {
    if (!chessGame) return;
    const history = chessGame.engine.moveHistory;
    if (!history || history.length === 0) {
        showNotification('No moves to analyse yet.', 'info');
        return;
    }

    const panel   = document.getElementById('analysis-panel');
    const content = document.getElementById('analysis-content');
    if (!panel || !content) return;

    // Show loading state
    panel.classList.remove('hidden');
    content.innerHTML = '<p style="text-align:center;padding:20px;">⏳ Analysing with Stockfish…<br><small id="analysis-progress"></small></p>';

    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) { analyzeBtn.disabled = true; analyzeBtn.textContent = 'Analysing…'; }

    try {
        const result = await runStockfishAnalysis(history, (done, total) => {
            const el = document.getElementById('analysis-progress');
            if (el) el.textContent = `Move ${done} / ${total}`;
        });

        renderAnalysis(result, history, content);
    } catch (e) {
        content.innerHTML = `<p style="color:#f44336;padding:10px;">Analysis failed: ${e.message}</p>`;
        showNotification('Stockfish analysis failed – check your connection.', 'error');
    } finally {
        if (analyzeBtn) { analyzeBtn.disabled = false; analyzeBtn.textContent = 'Analyse game'; }
    }
}

function renderAnalysis({ classifications, summary }, history, content) {
    const labels = { best: '✓ Best', good: '✓ Good', inaccuracy: '? Inaccuracy', mistake: '?! Mistake', blunder: '?? Blunder' };
    const colors = { best: '#4caf50', good: '#8bc34a', inaccuracy: '#ff9800', mistake: '#ff5722', blunder: '#f44336' };

    const tableRows = ['blunder','mistake','inaccuracy','good','best'].map(t => `
        <tr>
            <td style="color:${colors[t]}">${labels[t]}</td>
            <td>${summary.white[t] || 0}</td>
            <td>${summary.black[t] || 0}</td>
        </tr>`).join('');

    const movesHtml = classifications.map((c, i) => {
        const moveNum = Math.floor(i / 2) + 1;
        const prefix  = c.color === 'white' ? `${moveNum}.` : `${moveNum}…`;
        const m       = history[c.moveIndex];
        const notation = m ? formatMoveSimple(m) : '?';
        const evalStr  = c.evalAfter > 90000 ? 'M' : c.evalAfter < -90000 ? '-M' : (c.evalAfter / 100).toFixed(1);
        return `<span class="analysis-move" style="color:${colors[c.type]}" title="${labels[c.type]} (${evalStr})">${prefix}${notation}</span>`;
    }).join(' ');

    content.innerHTML = `
        <div class="analysis-summary">
            <table>
                <tr><th></th><th>White</th><th>Black</th></tr>
                ${tableRows}
            </table>
        </div>
        <div class="analysis-moves" style="margin-top:10px;line-height:2">${movesHtml}</div>`;
}

function formatMoveSimple(m) {
    if (!m || !m.to) return '?';
    const files = 'abcdefgh';
    const ranks = '87654321';
    if (m.type === 'castle-kingside')  return 'O-O';
    if (m.type === 'castle-queenside') return 'O-O-O';
    const piece = m.piece && m.piece.toUpperCase() !== 'P' ? m.piece.toUpperCase() : '';
    const cap   = m.capturedPiece ? 'x' : '';
    return `${piece}${cap}${files[m.to.col]}${ranks[m.to.row]}`;
}

function exportPGN() {
    if (!chessGame) return;
    const history = chessGame.engine.moveHistory;
    if (!history || history.length === 0) {
        showNotification('No moves to export.', 'info');
        return;
    }
    let pgn = '[Event "Chess game"]\n[Date "' + new Date().toISOString().slice(0,10) + '"]\n\n';
    for (let i = 0; i < history.length; i++) {
        if (i % 2 === 0) pgn += `${Math.floor(i/2)+1}. `;
        pgn += formatMoveSimple(history[i]) + ' ';
    }
    pgn = pgn.trim();
    navigator.clipboard.writeText(pgn)
        .then(() => showNotification('PGN copied to clipboard!', 'success'))
        .catch(() => {
            // Fallback: show in alert
            prompt('Copy this PGN:', pgn);
        });
}

function showProfile() {
    const user = authSystem.getCurrentUser();
    if (!user) return;
    
    const stats = authSystem.getUserStats();
    const message = `Profile: ${stats.username}
ELO: ${stats.elo}
Games played: ${stats.gamesPlayed}
Wins: ${stats.wins} | Losses: ${stats.losses} | Draws: ${stats.draws}
Win rate: ${stats.winRate}%`.trim();
    
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

// Make showNotification globally accessible
window.showNotification = showNotification;