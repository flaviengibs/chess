# GitHub Deployment - Quick Summary

## What You Need to Deploy

### 1. Frontend (GitHub Pages) - FREE
**Files to include:**
- `index.html`, `styles.css`
- `js/` folder (all JavaScript files)
- `README.md`, `.gitignore`

**What it does:** Hosts your game's website

### 2. Backend (Render.com) - FREE
**Files to include:**
- `server/` folder (all server files)
- `server/package.json`, `server/package-lock.json`

**What it does:** Runs the multiplayer server

## Step-by-Step (5 Minutes)

### Step 1: Prepare Your Code (1 min)
```bash
# Update js/config.js line 13 with your server URL (do this AFTER step 3)
```

### Step 2: Push to GitHub (2 min)
```bash
git init
git add .
git commit -m "Chess game deployment"
git remote add origin https://github.com/YOUR_USERNAME/chess-game.git
git push -u origin main
```

### Step 3: Deploy Server to Render.com (2 min)
1. Go to [render.com](https://render.com) → Sign up (free)
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Free tier**: Yes
5. Add environment variable:
   - **Key**: `CLIENT_URL`
   - **Value**: `https://YOUR_USERNAME.github.io/chess-game`
6. Click "Create Web Service"
7. **Copy your server URL** (e.g., `https://chess-game-abc123.onrender.com`)

### Step 4: Update Frontend Config (1 min)
```bash
# Edit js/config.js line 13:
window.CHESS_SERVER_URL = 'https://your-server-url.onrender.com';

# Commit and push
git add js/config.js
git commit -m "Add production server URL"
git push
```

### Step 5: Enable GitHub Pages (1 min)
1. Go to your GitHub repo
2. Settings → Pages
3. Source: `main` branch, `/ (root)` folder
4. Save
5. Wait 2-3 minutes
6. Visit: `https://YOUR_USERNAME.github.io/chess-game`

## Done! 🎉

Your game is now live at:
- **Game**: `https://YOUR_USERNAME.github.io/chess-game`
- **Server**: `https://your-server.onrender.com`

## Important Notes

### Free Tier Limitations
- **Render.com**: Server sleeps after 15 min of inactivity
  - First connection takes 30-60 seconds to wake up
  - After that, works normally
- **GitHub Pages**: 1GB storage, 100GB bandwidth/month (plenty!)

### Cost
- **Total**: $0/month (completely free!)

### What Works
✅ All game features
✅ Multiplayer
✅ Friend system
✅ Leaderboard
✅ ELO ratings
✅ Chat

### What to Expect
- First multiplayer connection: 30-60s delay (server waking up)
- After that: Instant connections
- If no one plays for 15 min: Server sleeps again

## Troubleshooting

**"Can't connect to server"**
- Wait 60 seconds (server is waking up)
- Check server URL in `js/config.js`
- Check Render dashboard for errors

**"CORS error"**
- Verify `CLIENT_URL` in Render matches your GitHub Pages URL exactly
- No trailing slashes!

**"GitHub Pages not updating"**
- Wait 2-3 minutes
- Clear browser cache
- Check GitHub Actions tab

## Files Structure for GitHub

```
your-repo/
├── index.html              ← Frontend
├── styles.css              ← Frontend
├── js/                     ← Frontend
│   ├── config.js          ← UPDATE THIS!
│   ├── app.js
│   ├── auth.js
│   ├── game.js
│   ├── chess-engine.js
│   ├── ai.js
│   ├── multiplayer.js
│   └── social.js
├── server/                 ← Backend
│   ├── index.js
│   ├── package.json
│   ├── *.js (all server files)
├── README.md
├── DEPLOYMENT_GUIDE.md     ← Detailed guide
└── .gitignore
```

## Next Steps

1. Share your game URL with friends!
2. Test multiplayer with 2 browser windows
3. Monitor server logs on Render dashboard
4. Consider upgrading to paid tier ($7/mo) for 24/7 uptime

## Need Help?

See detailed guides:
- `DEPLOYMENT_GUIDE.md` - Full deployment instructions
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `README.md` - Game features and local setup

## Alternative: Keep Server Awake 24/7 (Free)

Use [UptimeRobot](https://uptimerobot.com):
1. Sign up (free)
2. Add monitor: `https://your-server.onrender.com`
3. Check interval: 5 minutes
4. Server stays awake!

Note: May violate Render's free tier ToS, use at your own risk.
