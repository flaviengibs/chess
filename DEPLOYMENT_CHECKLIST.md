# Deployment Checklist

## Pre-Deployment

- [ ] All files committed to git
- [ ] Tests passing (`cd server && npm test`)
- [ ] Server runs locally without errors
- [ ] Frontend works with local server

## Backend Deployment (Render.com)

- [ ] Create account on [render.com](https://render.com)
- [ ] Create new Web Service
- [ ] Connect GitHub repository
- [ ] Configure settings:
  - Root Directory: `server`
  - Build Command: `npm install`
  - Start Command: `node index.js`
  - Environment: Node
- [ ] Add environment variable: `CLIENT_URL` = (your GitHub Pages URL)
- [ ] Deploy and note the server URL

## Frontend Deployment (GitHub Pages)

- [ ] Update `js/config.js` with production server URL
- [ ] Commit and push changes
- [ ] Enable GitHub Pages in repository settings
- [ ] Select branch: `main`, folder: `/ (root)`
- [ ] Wait 2-3 minutes for deployment
- [ ] Visit your GitHub Pages URL

## Post-Deployment Testing

- [ ] Frontend loads without errors
- [ ] Can create account and login
- [ ] AI games work
- [ ] Can create multiplayer room
- [ ] Can join multiplayer room
- [ ] Moves synchronize between players
- [ ] Chat works
- [ ] ELO updates after games
- [ ] Friend system works
- [ ] Leaderboard displays

## Troubleshooting

If something doesn't work:

1. **Check browser console** for JavaScript errors
2. **Check server logs** on Render dashboard
3. **Verify CORS settings** - CLIENT_URL must match exactly
4. **Test locally first** to isolate issues
5. **Clear browser cache** and try again

## Files to Include in GitHub

### Required Files
```
✅ index.html
✅ styles.css
✅ js/config.js
✅ js/app.js
✅ js/auth.js
✅ js/game.js
✅ js/chess-engine.js
✅ js/ai.js
✅ js/multiplayer.js
✅ js/social.js
✅ server/index.js
✅ server/package.json
✅ server/package-lock.json
✅ server/room-manager.js
✅ server/connection-manager.js
✅ server/chess-validator.js
✅ server/chess-engine.js
✅ server/elo-calculator.js
✅ server/friends-manager.js
✅ README.md
✅ DEPLOYMENT_GUIDE.md
✅ .gitignore
```

### Optional Files
```
⚠️ server/tests/ (if you want to include tests)
⚠️ STARTUP_GUIDE.md
⚠️ DEPLOYMENT_CHECKLIST.md
```

### Exclude These
```
❌ node_modules/
❌ .vscode/
❌ .kiro/
❌ test-login.html
❌ test.html
❌ IMPLEMENTATION_COMPLETE.md
❌ FINAL_STATUS.md
```

## Quick Commands

```bash
# Initialize git
git init

# Add files
git add .

# Commit
git commit -m "Initial deployment"

# Add remote (replace with your URL)
git remote add origin https://github.com/yourusername/chess-game.git

# Push
git push -u origin main

# After updating server URL
git add js/config.js
git commit -m "Update production server URL"
git push
```

## Production URLs

After deployment, update these:

- **Frontend**: `https://yourusername.github.io/chess-game`
- **Backend**: `https://chess-game-server.onrender.com`
- **Update in**: `js/config.js` (line 13)

## Support

Need help? Check:
- [Render Documentation](https://render.com/docs)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
