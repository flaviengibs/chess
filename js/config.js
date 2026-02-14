// Server configuration
// For local development, use localhost
// For production, update this to your deployed server URL

// Automatically detect environment
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname === '';

// Set server URL based on environment
if (isLocalhost) {
    // Local development
    window.CHESS_SERVER_URL = 'http://localhost:3000';
} else {
    // Production - UPDATE THIS after deploying your server
    // Example: 'https://chess-game-server.onrender.com'
    window.CHESS_SERVER_URL = 'http://localhost:3000'; // CHANGE THIS TO YOUR DEPLOYED SERVER URL
}

console.log('Chess server URL:', window.CHESS_SERVER_URL);
