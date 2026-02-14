# Chess Game Deployment Guide

## Overview
- **Frontend**: GitHub Pages (static files)
- **Backend**: Render.com (free tier) or Railway.app

## Part 1: Prepare Your Repository

### Files to Include in GitHub Repo

**Root directory (for GitHub Pages):**
```
index.html
styles.css
js/
  ├── app.js
  ├── auth.js
  ├── game.js
  ├── chess-engine.js
  ├── ai.js
  ├── multiplayer.js
  └── social.js
README.md
```

**Server directory (for backend deployment):**
```
server/
  ├── index.js
  ├── package.json
  ├── package-lock.json
  ├── room-manager.js
  ├── connection-manager.js
  ├── chess-validator.js
  ├── chess-engine.js
  ├── elo-calculator.js
  ├── friends-manager.js
  └── .gitignore
```

### Files to EXCLUDE (.gitignore)

Create/update `.gitignore`:
```
# Node modules
node_modules/
server/node_modules/

# Test files (optional - you can include these)
server/tests/
*.test.js

# Documentation files (optional)
IMPLEMENTATION_COMPLETE.md
FINAL_STATUS.md
test-login.html
test.html

# IDE files
.vscode/
.kiro/

# Environment files
.env
.env.local
```

## Part 2: Deploy Backend Server

### Option A: Render.com (Recommended - Free Tier)

1. **Sign up at [render.com](https://render.com)**

2. **Create a new Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `chess-game-server`
     - **Root Directory**: `server`
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `node index.js`
     - **Instance Type**: `Free`

3. **Add Environment Variables:**
   - `PORT`: `3000` (Render will override this automatically)
   - `CLIENT_URL`: `https://yourusername.github.io/your-repo-name`

4. **Deploy!** Render will give you a URL like:
   `https://chess-game-server.onrender.com`

### Option B: Railway.app

1. **Sign up at [railway.app](https://railway.app)**

2. **Create New Project:**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway auto-detects Node.js

3. **Configure:**
   - Set root directory to `server` in settings
   - Add environment variable:
     - `CLIENT_URL`: `https://yourusername.github.io/your-repo-name`

4. **Deploy!** Railway gives you a URL like:
   `https://your-app.up.railway.app`

### Option C: Heroku (Requires credit card for verification)

1. Create `Procfile` in server directory:
```
web: node index.js
```

2. Deploy via Heroku CLI or GitHub integration

## Part 3: Deploy Frontend to GitHub Pages

### Step 1: Update Server URL in Frontend

Create `js/config.js`:
```javascript
// Production server URL (update after deploying backend)
window.CHESS_SERVER_URL = 'https://your-server-url.onrender.com';
```

Add to `index.html` before other scripts:
```html
<script src="js/config.js"></script>
```

### Step 2: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add files
git add index.html styles.css js/ server/ README.md .gitignore

# Commit
git commit -m "Initial commit - Chess game with multiplayer"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/chess-game.git

# Push
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Source", select:
   - **Branch**: `main`
   - **Folder**: `/ (root)`
4. Click **Save**

Your site will be live at:
`https://yourusername.github.io/your-repo-name`

## Part 4: Update CORS Settings

After deploying, update `server/index.js`:

```javascript
// Update CLIENT_URL to match your GitHub Pages URL
const CLIENT_URL = process.env.CLIENT_URL || 'https://yourusername.github.io/your-repo-name';
```

Redeploy the server after this change.

## Part 5: Test Your Deployment

1. Visit your GitHub Pages URL
2. Create an account
3. Try playing online multiplayer
4. Test with a friend or in two browser windows

## Troubleshooting

### CORS Errors
- Make sure `CLIENT_URL` in server matches your GitHub Pages URL exactly
- Check browser console for specific error messages

### Server Connection Failed
- Verify server is running on Render/Railway
- Check server logs for errors
- Ensure WebSocket connections are allowed (they are by default on Render/Railway)

### GitHub Pages Not Updating
- Wait 2-3 minutes after pushing changes
- Clear browser cache
- Check GitHub Actions tab for build status

## Free Tier Limitations

**Render.com Free Tier:**
- Server spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- 750 hours/month (enough for hobby use)

**Railway.app Free Tier:**
- $5 free credit per month
- No automatic spin-down
- Better for active development

**GitHub Pages:**
- 1GB storage limit
- 100GB bandwidth/month
- Perfect for static sites

## Cost-Free Production Setup

For a completely free setup:
1. Frontend: GitHub Pages (free forever)
2. Backend: Render.com free tier (with spin-down)
3. Users will experience 30-60s delay on first connection if server is asleep

## Alternative: Keep Server Running 24/7

To prevent Render free tier from spinning down:
- Use a service like [UptimeRobot](https://uptimerobot.com) to ping your server every 5 minutes
- Note: This may violate Render's ToS for free tier

## Recommended Repository Structure

```
your-repo/
├── index.html              # Frontend entry point
├── styles.css              # Styles
├── js/                     # Frontend JavaScript
│   ├── config.js          # Server URL configuration
│   ├── app.js
│   ├── auth.js
│   ├── game.js
│   ├── chess-engine.js
│   ├── ai.js
│   ├── multiplayer.js
│   └── social.js
├── server/                 # Backend Node.js server
│   ├── index.js
│   ├── package.json
│   ├── room-manager.js
│   ├── connection-manager.js
│   ├── chess-validator.js
│   ├── chess-engine.js
│   ├── elo-calculator.js
│   └── friends-manager.js
├── README.md
├── DEPLOYMENT_GUIDE.md
└── .gitignore
```

## Quick Start Commands

```bash
# 1. Create GitHub repo
# 2. Clone locally
git clone https://github.com/yourusername/chess-game.git
cd chess-game

# 3. Copy your files
# (copy all files as shown above)

# 4. Commit and push
git add .
git commit -m "Initial deployment"
git push origin main

# 5. Deploy backend to Render.com (via web interface)
# 6. Enable GitHub Pages (via GitHub settings)
# 7. Update js/config.js with your server URL
# 8. Push changes
git add js/config.js
git commit -m "Update server URL"
git push
```

## Support

If you encounter issues:
1. Check browser console for errors
2. Check server logs on Render/Railway
3. Verify all URLs are correct (no trailing slashes)
4. Test locally first: `npm start` in server directory
