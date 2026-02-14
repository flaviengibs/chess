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
    // Production - your Render.com server
    window.CHESS_SERVER_URL = 'https://chess-o3ub.onrender.com';
}

console.log('Chess server URL:', window.CHESS_SERVER_URL);
