/**
 * FriendsManager - Manages friend relationships and requests
 */
class FriendsManager {
  constructor() {
    // In-memory storage (in production, use a database)
    this.friendships = new Map(); // username -> Set of friend usernames
    this.friendRequests = new Map(); // username -> Set of pending request usernames
  }

  /**
   * Send a friend request
   */
  sendFriendRequest(fromUsername, toUsername) {
    if (fromUsername === toUsername) {
      return { success: false, message: 'Cannot add yourself as friend' };
    }

    // Check if already friends
    if (this.areFriends(fromUsername, toUsername)) {
      return { success: false, message: 'Already friends' };
    }

    // Check if request already exists
    if (this.hasPendingRequest(toUsername, fromUsername)) {
      return { success: false, message: 'Friend request already sent' };
    }

    // Add friend request
    if (!this.friendRequests.has(toUsername)) {
      this.friendRequests.set(toUsername, new Set());
    }
    this.friendRequests.get(toUsername).add(fromUsername);

    return { success: true, message: 'Friend request sent' };
  }

  /**
   * Accept a friend request
   */
  acceptFriendRequest(username, requesterUsername) {
    // Remove from requests
    if (this.friendRequests.has(username)) {
      this.friendRequests.get(username).delete(requesterUsername);
    }

    // Add to friends for both users
    if (!this.friendships.has(username)) {
      this.friendships.set(username, new Set());
    }
    if (!this.friendships.has(requesterUsername)) {
      this.friendships.set(requesterUsername, new Set());
    }

    this.friendships.get(username).add(requesterUsername);
    this.friendships.get(requesterUsername).add(username);

    return { success: true, message: 'Friend request accepted' };
  }

  /**
   * Decline a friend request
   */
  declineFriendRequest(username, requesterUsername) {
    if (this.friendRequests.has(username)) {
      this.friendRequests.get(username).delete(requesterUsername);
    }
    return { success: true, message: 'Friend request declined' };
  }

  /**
   * Remove a friend
   */
  removeFriend(username, friendUsername) {
    if (this.friendships.has(username)) {
      this.friendships.get(username).delete(friendUsername);
    }
    if (this.friendships.has(friendUsername)) {
      this.friendships.get(friendUsername).delete(username);
    }
    return { success: true, message: 'Friend removed' };
  }

  /**
   * Get list of friends for a user
   */
  getFriends(username) {
    if (!this.friendships.has(username)) {
      return [];
    }
    return Array.from(this.friendships.get(username));
  }

  /**
   * Get pending friend requests for a user
   */
  getFriendRequests(username) {
    if (!this.friendRequests.has(username)) {
      return [];
    }
    return Array.from(this.friendRequests.get(username));
  }

  /**
   * Check if two users are friends
   */
  areFriends(username1, username2) {
    return this.friendships.has(username1) && 
           this.friendships.get(username1).has(username2);
  }

  /**
   * Check if there's a pending request
   */
  hasPendingRequest(toUsername, fromUsername) {
    return this.friendRequests.has(toUsername) && 
           this.friendRequests.get(toUsername).has(fromUsername);
  }
}

module.exports = FriendsManager;
