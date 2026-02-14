class SocialManager {
    constructor() {
        // Server-managed data (no localStorage for friends)
        this.friendsData = {}; // username -> array of friend objects
        this.requestsData = {}; // username -> array of request objects
        this.leaderboard = [];
        
        this.initializeEventHandlers();
    }

    // Friend Management - All through server
    sendFriendRequest(username) {
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) return { success: false, message: 'Not logged in' };

        if (username === currentUser.username) {
            return { success: false, message: 'Cannot add yourself as friend' };
        }

        // Send to server
        if (window.multiplayerManager && window.multiplayerManager.socket && window.multiplayerManager.isConnected) {
            window.multiplayerManager.socket.emit('send-friend-request', {
                fromUsername: currentUser.username,
                toUsername: username
            });
            return { success: true, message: 'Sending friend request...' };
        }

        return { success: false, message: 'Not connected to server' };
    }

    acceptFriendRequest(username) {
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) return false;

        if (window.multiplayerManager && window.multiplayerManager.socket) {
            window.multiplayerManager.socket.emit('accept-friend-request', {
                username: currentUser.username,
                requesterUsername: username
            });
        }
        return true;
    }

    declineFriendRequest(username) {
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) return false;

        if (window.multiplayerManager && window.multiplayerManager.socket) {
            window.multiplayerManager.socket.emit('decline-friend-request', {
                username: currentUser.username,
                requesterUsername: username
            });
        }
        return true;
    }

    removeFriend(username) {
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) return false;

        if (window.multiplayerManager && window.multiplayerManager.socket) {
            window.multiplayerManager.socket.emit('remove-friend', {
                username: currentUser.username,
                friendUsername: username
            });
        }
        return true;
    }

    loadFriendsFromServer() {
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) return;

        // Ensure multiplayer manager and socket exist
        if (!window.multiplayerManager) {
            console.log('MultiplayerManager not initialized, waiting...');
            setTimeout(() => this.loadFriendsFromServer(), 500);
            return;
        }
        
        if (!window.multiplayerManager.socket || !window.multiplayerManager.isConnected) {
            console.log('Socket not connected, connecting...');
            window.multiplayerManager.connect();
            setTimeout(() => this.loadFriendsFromServer(), 1000);
            return;
        }

        console.log('Loading friends from server for:', currentUser.username);
        window.multiplayerManager.socket.emit('get-friends', {
            username: currentUser.username
        });
    }

    getFriends() {
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) return [];

        return this.friendsData[currentUser.username] || [];
    }

    getFriendRequests() {
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) return [];

        return this.requestsData[currentUser.username] || [];
    }
    
    setupSocketListeners() {
        if (!window.multiplayerManager || !window.multiplayerManager.socket) {
            console.log('Socket not ready for listeners, retrying...');
            setTimeout(() => this.setupSocketListeners(), 500);
            return;
        }
        
        const socket = window.multiplayerManager.socket;
        
        // Remove existing listeners to avoid duplicates
        socket.off('friend-request-response');
        socket.off('friend-request-received');
        socket.off('friend-request-accepted');
        socket.off('friend-request-accepted-response');
        socket.off('friend-request-declined-response');
        socket.off('friend-removed-response');
        socket.off('friends-list-updated');
        socket.off('friends-data');
        
        socket.on('friend-request-response', (data) => {
            console.log('Friend request response:', data);
            showNotification(data.message, data.success ? 'success' : 'error');
        });
        
        socket.on('friend-request-received', (data) => {
            console.log('Friend request received:', data);
            showNotification(`Friend request from ${data.from}`, 'info');
        });
        
        socket.on('friend-request-accepted', (data) => {
            console.log('Friend request accepted by:', data.by);
            showNotification(`${data.by} accepted your friend request!`, 'success');
        });
        
        socket.on('friend-request-accepted-response', (data) => {
            console.log('Accept response:', data);
            if (data.success) {
                showNotification('Friend added!', 'success');
            }
        });
        
        socket.on('friend-request-declined-response', (data) => {
            console.log('Decline response:', data);
            if (data.success) {
                showNotification('Request declined', 'info');
            }
        });
        
        socket.on('friend-removed-response', (data) => {
            console.log('Remove response:', data);
            if (data.success) {
                showNotification('Friend removed', 'info');
            }
        });
        
        socket.on('friends-updated', () => {
            console.log('Friends updated, reloading from server...');
            this.loadFriendsFromServer();
        });
        
        socket.on('friends-data', (data) => {
            console.log('Friends data received:', data);
            console.log('Friends array:', data.friends);
            console.log('Requests array:', data.requests);
            const currentUser = authSystem.getCurrentUser();
            if (currentUser) {
                // Filter out null values
                this.friendsData[currentUser.username] = (data.friends || []).filter(f => f !== null);
                this.requestsData[currentUser.username] = (data.requests || []).filter(r => r !== null);
                console.log('Stored friends after filtering:', this.friendsData[currentUser.username]);
                console.log('Stored requests after filtering:', this.requestsData[currentUser.username]);
                this.refreshFriendsDisplay();
            }
        });
        
        console.log('Socket listeners set up successfully');
    }

    // Leaderboard Management
    updateLeaderboard() {
        const users = authSystem.users;
        const leaderboard = Object.entries(users)
            .map(([username, userData]) => ({
                username,
                elo: userData.elo,
                gamesPlayed: userData.gamesPlayed,
                wins: userData.wins,
                losses: userData.losses,
                draws: userData.draws
            }))
            .sort((a, b) => b.elo - a.elo)
            .slice(0, 50);

        this.leaderboard = leaderboard;
        return leaderboard;
    }

    getLeaderboard() {
        return this.leaderboard;
    }

    // UI Management
    showFriendsModal() {
        const modal = document.getElementById('friends-modal');
        modal.classList.remove('hidden');
        
        // Setup socket listeners
        this.setupSocketListeners();
        
        // Load friends from server
        this.loadFriendsFromServer();
        
        // Re-attach handlers to ensure they work
        setTimeout(() => this.setupHandlers(), 100);
    }

    hideFriendsModal() {
        const modal = document.getElementById('friends-modal');
        modal.classList.add('hidden');
    }

    showLeaderboardModal() {
        const modal = document.getElementById('leaderboard-modal');
        modal.classList.remove('hidden');
        this.refreshLeaderboardDisplay();
    }

    hideLeaderboardModal() {
        const modal = document.getElementById('leaderboard-modal');
        modal.classList.add('hidden');
    }

    refreshFriendsDisplay() {
        this.displayFriendsList();
        this.displayFriendRequests();
    }

    displayFriendsList() {
        const container = document.getElementById('friends-container');
        if (!container) return;

        const friends = this.getFriends();
        console.log('Displaying friends:', friends);
        container.innerHTML = '';

        if (!friends || friends.length === 0) {
            container.innerHTML = '<p>No friends yet. Add some friends to play with!</p>';
            return;
        }

        friends.forEach(friend => {
            // Skip null/undefined friends
            if (!friend) {
                console.warn('Skipping null/undefined friend');
                return;
            }
            
            // Handle both string usernames and user objects
            let username, elo;
            
            if (typeof friend === 'string') {
                // Server sent just username string
                username = friend;
                elo = 1200;
            } else if (friend.username) {
                // Server sent user object
                username = friend.username;
                elo = friend.elo || 1200;
            } else {
                console.warn('Skipping invalid friend:', friend);
                return;
            }
            
            console.log('Creating friend element for:', username, 'ELO:', elo);
            
            const friendElement = document.createElement('div');
            friendElement.className = 'friend-item';
            
            friendElement.innerHTML = `
                <div class="friend-info">
                    <div class="friend-name">${username}</div>
                    <div class="friend-elo">ELO: ${elo}</div>
                </div>
                <div class="friend-actions">
                    <button class="invite-btn" data-username="${username}">
                        Invite to Game
                    </button>
                    <button class="remove-btn" data-username="${username}">
                        Remove
                    </button>
                </div>
            `;
            
            // Add event listeners
            const inviteBtn = friendElement.querySelector('.invite-btn');
            const removeBtn = friendElement.querySelector('.remove-btn');
            
            inviteBtn.addEventListener('click', () => this.inviteFriend(username));
            removeBtn.addEventListener('click', () => {
                this.removeFriend(username);
            });
            
            container.appendChild(friendElement);
        });
        
        console.log('Friends list displayed, total elements:', container.children.length);
    }

    displayFriendRequests() {
        const container = document.getElementById('requests-container');
        if (!container) {
            console.error('Requests container not found!');
            return;
        }

        const requests = this.getFriendRequests();
        console.log('Displaying friend requests:', requests);
        container.innerHTML = '';

        if (!requests || requests.length === 0) {
            container.innerHTML = '<p>No pending friend requests.</p>';
            return;
        }

        requests.forEach(request => {
            // Handle both string usernames and user objects
            let username, elo;
            
            if (typeof request === 'string') {
                // Server sent just username string
                username = request;
                elo = 1200;
                console.log('Request is string:', username);
            } else if (request && request.username) {
                // Server sent user object
                username = request.username;
                elo = request.elo || 1200;
                console.log('Request is object:', request);
            } else {
                console.warn('Skipping invalid request:', request);
                return;
            }
            
            console.log('Creating request element for:', username);
            const requestElement = document.createElement('div');
            requestElement.className = 'request-item';
            
            requestElement.innerHTML = `
                <div class="friend-info">
                    <div class="friend-name">${username}</div>
                    <div class="friend-elo">ELO: ${elo}</div>
                </div>
                <div class="friend-actions">
                    <button class="accept-btn" data-username="${username}">
                        Accept
                    </button>
                    <button class="decline-btn" data-username="${username}">
                        Decline
                    </button>
                </div>
            `;
            
            // Add event listeners
            const acceptBtn = requestElement.querySelector('.accept-btn');
            const declineBtn = requestElement.querySelector('.decline-btn');
            
            acceptBtn.addEventListener('click', () => {
                console.log('Accepting friend request from:', username);
                this.acceptFriendRequest(username);
                showNotification(`${username} added as friend!`, 'success');
            });
            
            declineBtn.addEventListener('click', () => {
                console.log('Declining friend request from:', username);
                this.declineFriendRequest(username);
                showNotification('Friend request declined', 'info');
            });
            
            container.appendChild(requestElement);
        });
        
        console.log('Friend requests displayed, container children:', container.children.length);
    }

    refreshLeaderboardDisplay() {
        const container = document.getElementById('leaderboard-container');
        if (!container) return;

        const leaderboard = this.updateLeaderboard();
        container.innerHTML = '';

        if (leaderboard.length === 0) {
            container.innerHTML = '<p>No players on leaderboard yet.</p>';
            return;
        }

        leaderboard.forEach((player, index) => {
            const playerElement = document.createElement('div');
            playerElement.className = 'leaderboard-item';
            
            // Highlight current user
            const currentUser = authSystem.getCurrentUser();
            if (currentUser && player.username === currentUser.username) {
                playerElement.style.backgroundColor = '#e8f5e8';
                playerElement.style.border = '2px solid #4CAF50';
            }
            
            playerElement.innerHTML = `
                <div class="leaderboard-rank">#${index + 1}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${player.username}</div>
                    <div class="leaderboard-stats">
                        ${player.gamesPlayed} games • 
                        ${player.wins}W ${player.losses}L ${player.draws}D
                    </div>
                </div>
                <div class="leaderboard-elo">${player.elo}</div>
            `;
            
            container.appendChild(playerElement);
        });
    }

    // Friend Invitations
    inviteFriend(username) {
        showNotification(`Game invitation sent to ${username}!`, 'success');
        
        if (window.multiplayerManager) {
            window.multiplayerManager.createRoom();
        }
    }

    // Utility Methods - removed localStorage methods
    
    // Event Handlers
    initializeEventHandlers() {
        // Set up handlers immediately if DOM is ready, otherwise wait
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupHandlers());
        } else {
            this.setupHandlers();
        }
    }
    
    setupHandlers() {
        // Friends modal tabs
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Add friend button
        const addFriendBtn = document.getElementById('send-friend-request-btn');
        if (addFriendBtn) {
            // Remove any existing listeners
            const newBtn = addFriendBtn.cloneNode(true);
            addFriendBtn.parentNode.replaceChild(newBtn, addFriendBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const input = document.getElementById('friend-username-input');
                const username = input.value.trim();
                
                console.log('Send friend request clicked:', username);
                
                if (!username) {
                    showNotification('Please enter a username', 'error');
                    return;
                }
                
                const result = this.sendFriendRequest(username);
                showNotification(result.message, result.success ? 'success' : 'error');
                if (result.success) {
                    input.value = '';
                }
            });
        }

        // Enter key for add friend
        const friendInput = document.getElementById('friend-username-input');
        if (friendInput) {
            friendInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const addBtn = document.getElementById('send-friend-request-btn');
                    if (addBtn) addBtn.click();
                }
            });
        }

        // Close modal buttons
        const closeFriendsBtn = document.getElementById('close-friends-modal');
        if (closeFriendsBtn) {
            closeFriendsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideFriendsModal();
            });
        }

        const closeLeaderboardBtn = document.getElementById('close-leaderboard-modal');
        if (closeLeaderboardBtn) {
            closeLeaderboardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideLeaderboardModal();
            });
        }
        
        console.log('Social handlers initialized');
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) targetBtn.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        const targetContent = document.getElementById(tabName);
        if (targetContent) targetContent.classList.remove('hidden');

        // Refresh content if needed
        if (tabName === 'friends-list') {
            this.displayFriendsList();
        } else if (tabName === 'friend-requests') {
            this.displayFriendRequests();
        }
    }
}