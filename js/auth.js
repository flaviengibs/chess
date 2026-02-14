class AuthSystem {
    constructor() {
        this.users = {}; // Synced from server
        this.currentUser = null;
        this.serverUrl = window.CHESS_SERVER_URL || 'http://localhost:3000';
        console.log('AuthSystem initialized with server:', this.serverUrl);
        
        // Load users from server on init
        this.loadUsersFromServer();
    }

    /**
     * Load all users from server (for leaderboard, friend search, etc.)
     */
    async loadUsersFromServer() {
        try {
            const response = await fetch(`${this.serverUrl}/api/users`);
            const data = await response.json();
            
            if (data.success) {
                this.users = data.users;
                console.log(`Loaded ${Object.keys(this.users).length} users from server`);
            }
        } catch (error) {
            console.error('Error loading users from server:', error);
        }
    }

    /**
     * Register a new user (server-side)
     */
    async register(username, password) {
        console.log('Register attempt:', username);
        
        try {
            console.log('Sending register request to:', `${this.serverUrl}/api/register`);
            
            const response = await fetch(`${this.serverUrl}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            console.log('Register response status:', response.status);
            const data = await response.json();
            console.log('Register response data:', data);
            
            if (data.success) {
                console.log('User registered successfully:', username);
                // Reload users list
                await this.loadUsersFromServer();
            }
            
            return data;
        } catch (error) {
            console.error('Error registering user:', error);
            return { success: false, message: 'Failed to connect to server. Is the server running?' };
        }
    }

    /**
     * Login user (server-side authentication)
     */
    async login(username, password) {
        console.log('Login attempt:', username);
        
        try {
            const response = await fetch(`${this.serverUrl}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                
                // Store in localStorage for session persistence
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                
                console.log('Login successful:', username);
                
                // Reload users list
                await this.loadUsersFromServer();
            }
            
            return data;
        } catch (error) {
            console.error('Error logging in:', error);
            return { success: false, message: 'Failed to connect to server' };
        }
    }

    /**
     * Logout user
     */
    logout() {
        console.log('User logged out:', this.currentUser?.username);
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    /**
     * Try to restore session from localStorage
     */
    async restoreSession() {
        try {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                const user = JSON.parse(stored);
                
                // Verify user still exists on server and get updated data
                const response = await fetch(`${this.serverUrl}/api/user/${user.username}`);
                const data = await response.json();
                
                if (data.success) {
                    this.currentUser = data.user;
                    console.log('Session restored:', user.username);
                    return true;
                } else {
                    // User no longer exists, clear session
                    localStorage.removeItem('currentUser');
                }
            }
        } catch (error) {
            console.error('Error restoring session:', error);
            localStorage.removeItem('currentUser');
        }
        return false;
    }

    /**
     * Update user stats after game (sync with server)
     */
    async updateUserStats(username) {
        try {
            const response = await fetch(`${this.serverUrl}/api/user/${username}`);
            const data = await response.json();
            
            if (data.success) {
                // Update local cache
                this.users[username] = data.user;
                
                // Update current user if it's them
                if (this.currentUser && this.currentUser.username === username) {
                    this.currentUser = data.user;
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                }
                
                console.log('User stats updated:', username);
            }
        } catch (error) {
            console.error('Error updating user stats:', error);
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get user stats
     */
    getUserStats() {
        if (!this.currentUser) return null;
        
        return {
            username: this.currentUser.username,
            elo: this.currentUser.elo,
            gamesPlayed: this.currentUser.gamesPlayed,
            wins: this.currentUser.wins,
            losses: this.currentUser.losses,
            draws: this.currentUser.draws
        };
    }

    /**
     * Save users (no-op, server handles this now)
     */
    saveUsers() {
        // Server-side storage, no need to save locally
        console.log('Users are managed by server');
    }
}

// AuthSystem will be instantiated by app.js
// Don't create global instance here to avoid timing issues
