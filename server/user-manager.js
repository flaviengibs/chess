const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

/**
 * UserManager - Handles user authentication and data storage
 * Uses bcrypt for secure password hashing
 */
class UserManager {
  constructor() {
    this.users = new Map(); // username -> user data
    this.dataFile = path.join(__dirname, 'users.json');
    this.saltRounds = 10; // bcrypt salt rounds
    
    // Load existing users from file
    this.loadUsers();
  }

  /**
   * Load users from JSON file
   */
  loadUsers() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = fs.readFileSync(this.dataFile, 'utf8');
        const usersObj = JSON.parse(data);
        
        // Convert object to Map
        Object.entries(usersObj).forEach(([username, userData]) => {
          this.users.set(username, userData);
        });
        
        console.log(`[UserManager] Loaded ${this.users.size} users from file`);
      } else {
        console.log('[UserManager] No existing users file, starting fresh');
      }
    } catch (error) {
      console.error('[UserManager] Error loading users:', error);
      this.users = new Map();
    }
  }

  /**
   * Save users to JSON file
   */
  saveUsers() {
    try {
      // Convert Map to object
      const usersObj = {};
      this.users.forEach((userData, username) => {
        usersObj[username] = userData;
      });
      
      fs.writeFileSync(this.dataFile, JSON.stringify(usersObj, null, 2), 'utf8');
      console.log(`[UserManager] Saved ${this.users.size} users to file`);
    } catch (error) {
      console.error('[UserManager] Error saving users:', error);
    }
  }

  /**
   * Register a new user
   */
  async register(username, password) {
    // Validation
    if (!username || !password) {
      return { success: false, message: 'Username and password are required' };
    }

    if (username.length < 3) {
      return { success: false, message: 'Username must be at least 3 characters' };
    }

    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' };
    }

    // Check if username already exists
    if (this.users.has(username)) {
      return { success: false, message: 'Username already exists' };
    }

    try {
      // Hash password with bcrypt
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);

      // Create user object
      const userData = {
        username,
        passwordHash: hashedPassword,
        elo: 1200,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      // Store user
      this.users.set(username, userData);
      this.saveUsers();

      console.log(`[UserManager] User registered: ${username}`);
      
      // Return user data without password hash
      return {
        success: true,
        message: 'Account created successfully',
        user: this.getUserPublicData(username)
      };
    } catch (error) {
      console.error('[UserManager] Error registering user:', error);
      return { success: false, message: 'Failed to create account' };
    }
  }

  /**
   * Login user
   */
  async login(username, password) {
    // Validation
    if (!username || !password) {
      return { success: false, message: 'Username and password are required' };
    }

    // Check if user exists
    const userData = this.users.get(username);
    if (!userData) {
      return { success: false, message: 'Invalid username or password' };
    }

    try {
      // Verify password with bcrypt
      const isValid = await bcrypt.compare(password, userData.passwordHash);

      if (!isValid) {
        return { success: false, message: 'Invalid username or password' };
      }

      // Update last login
      userData.lastLogin = new Date().toISOString();
      this.saveUsers();

      console.log(`[UserManager] User logged in: ${username}`);

      // Return user data without password hash
      return {
        success: true,
        message: 'Login successful',
        user: this.getUserPublicData(username)
      };
    } catch (error) {
      console.error('[UserManager] Error during login:', error);
      return { success: false, message: 'Login failed' };
    }
  }

  /**
   * Get user data without sensitive information
   */
  getUserPublicData(username) {
    const userData = this.users.get(username);
    if (!userData) return null;

    return {
      username: userData.username,
      elo: userData.elo,
      gamesPlayed: userData.gamesPlayed,
      wins: userData.wins,
      losses: userData.losses,
      draws: userData.draws,
      createdAt: userData.createdAt,
      lastLogin: userData.lastLogin
    };
  }

  /**
   * Get all users (public data only)
   */
  getAllUsersPublicData() {
    const users = {};
    this.users.forEach((userData, username) => {
      users[username] = this.getUserPublicData(username);
    });
    return users;
  }

  /**
   * Update user ELO and stats
   */
  updateUserStats(username, result, newElo) {
    const userData = this.users.get(username);
    if (!userData) {
      console.error(`[UserManager] User not found: ${username}`);
      return false;
    }

    // Update stats
    userData.elo = newElo;
    userData.gamesPlayed++;

    switch (result) {
      case 'win':
        userData.wins++;
        break;
      case 'loss':
        userData.losses++;
        break;
      case 'draw':
        userData.draws++;
        break;
    }

    this.saveUsers();
    console.log(`[UserManager] Updated stats for ${username}: ELO ${newElo}, Result: ${result}`);
    return true;
  }

  /**
   * Get user by username
   */
  getUser(username) {
    return this.users.get(username);
  }

  /**
   * Check if user exists
   */
  userExists(username) {
    return this.users.has(username);
  }

  /**
   * Get total number of users
   */
  getUserCount() {
    return this.users.size;
  }

  /**
   * Get leaderboard (top users by ELO)
   */
  getLeaderboard(limit = 50) {
    const users = Array.from(this.users.values())
      .map(user => this.getUserPublicData(user.username))
      .sort((a, b) => b.elo - a.elo)
      .slice(0, limit);

    return users;
  }
}

module.exports = UserManager;
