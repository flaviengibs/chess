class AuthSystem {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('chessUsers') || '{}');
        this.currentUser = null;
        console.log('AuthSystem initialized, users:', Object.keys(this.users));
    }

    register(username, password) {
        console.log('Register attempt:', username);
        
        if (this.users[username]) {
            return { success: false, message: 'Username already exists' };
        }

        if (username.length < 3) {
            return { success: false, message: 'Username must be at least 3 characters' };
        }

        if (password.length < 4) {
            return { success: false, message: 'Password must be at least 4 characters' };
        }

        this.users[username] = {
            password: this.hashPassword(password),
            elo: 1200,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            createdAt: new Date().toISOString()
        };

        this.saveUsers();
        console.log('User registered successfully:', username);
        return { success: true, message: 'Account created successfully' };
    }

    login(username, password) {
        console.log('Login attempt:', username);
        
        const user = this.users[username];
        if (!user) {
            return { success: false, message: 'Username not found' };
        }

        if (user.password !== this.hashPassword(password)) {
            return { success: false, message: 'Invalid password' };
        }

        this.currentUser = {
            username,
            ...user
        };

        console.log('Login successful:', username);
        return { success: true, message: 'Login successful', user: this.currentUser };
    }

    logout() {
        console.log('User logged out:', this.currentUser?.username);
        this.currentUser = null;
    }

    updateElo(result, opponentElo = 1200) {
        if (!this.currentUser) {
            console.log('No current user for ELO update');
            return;
        }

        const K = 32; // K-factor for Elo calculation
        const currentElo = this.currentUser.elo;
        
        let actualScore;
        switch(result) {
            case 'win':
                actualScore = 1;
                this.currentUser.wins++;
                break;
            case 'loss':
                actualScore = 0;
                this.currentUser.losses++;
                break;
            case 'draw':
                actualScore = 0.5;
                this.currentUser.draws++;
                break;
        }

        // Calculate expected score
        const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - currentElo) / 400));
        
        // Calculate new ELO
        const eloChange = Math.round(K * (actualScore - expectedScore));
        const newElo = Math.max(100, currentElo + eloChange); // Minimum Elo of 100
        
        console.log(`ELO Update: ${result} vs ${opponentElo} ELO`);
        console.log(`Old ELO: ${currentElo}, Change: ${eloChange > 0 ? '+' : ''}${eloChange}, New ELO: ${newElo}`);
        
        this.currentUser.elo = newElo;
        this.currentUser.gamesPlayed++;

        // Update stored user data
        this.users[this.currentUser.username] = {
            password: this.users[this.currentUser.username].password,
            elo: this.currentUser.elo,
            gamesPlayed: this.currentUser.gamesPlayed,
            wins: this.currentUser.wins,
            losses: this.currentUser.losses,
            draws: this.currentUser.draws,
            createdAt: this.users[this.currentUser.username].createdAt
        };

        this.saveUsers();
        console.log('ELO updated:', this.currentUser.username, 'New ELO:', this.currentUser.elo);
        
        // Show ELO change notification
        const changeText = eloChange > 0 ? `+${eloChange}` : `${eloChange}`;
        showNotification(`ELO ${changeText} (${newElo})`, eloChange > 0 ? 'success' : 'warning');
        
        return eloChange;
    }

    hashPassword(password) {
        // Simple hash function for demo purposes
        // In production, use proper hashing like bcrypt
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    saveUsers() {
        try {
            localStorage.setItem('chessUsers', JSON.stringify(this.users));
            console.log('Users saved to localStorage');
        } catch (error) {
            console.error('Error saving users:', error);
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserStats() {
        if (!this.currentUser) return null;
        
        return {
            username: this.currentUser.username,
            elo: this.currentUser.elo,
            gamesPlayed: this.currentUser.gamesPlayed,
            wins: this.currentUser.wins,
            losses: this.currentUser.losses,
            draws: this.currentUser.draws,
            winRate: this.currentUser.gamesPlayed > 0 ? 
                Math.round((this.currentUser.wins / this.currentUser.gamesPlayed) * 100) : 0
        };
    }
    
    updateUserElo(newElo) {
        if (!this.currentUser) return;
        
        this.currentUser.elo = newElo;
        this.users[this.currentUser.username].elo = newElo;
        this.saveUsers();
        
        // Update display if on game screen
        const eloElements = document.querySelectorAll('[id$="-player-elo"]');
        eloElements.forEach(el => {
            if (el.textContent.includes(this.currentUser.username)) {
                el.textContent = `ELO: ${newElo}`;
            }
        });
    }
}