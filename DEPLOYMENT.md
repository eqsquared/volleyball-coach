# Deployment Guide for Volleyball Coach

This guide covers how to build and deploy the Volleyball Coach application to various hosting platforms.

## Current Structure

The application consists of:
- **Backend**: Node.js/Express server (`server.js`) that serves static files and provides REST API endpoints
- **Frontend**: Vanilla JavaScript (ES6 modules) in the `public/` directory
- **Data Storage**: File-based storage using `data/data.json`
- **No Build Step Required**: The frontend uses vanilla JavaScript, so no compilation/bundling is needed

## Pre-Deployment Checklist

1. ✅ **Dependencies**: All dependencies are in `package.json`
2. ✅ **Port Configuration**: Server uses `process.env.PORT` (falls back to 8000)
3. ✅ **Static Files**: All frontend files are in `public/` directory
4. ⚠️ **Data Persistence**: `data/data.json` must be writable on the server

## Deployment Options

### Option 1: Railway (Recommended for File-Based Storage)

Railway is excellent for Node.js apps with file-based storage.

**Steps:**
1. Sign up at [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository (or deploy from CLI)
4. Railway will auto-detect Node.js and run `npm start`
5. The `data/` directory will persist between deployments

**Environment Variables:**
- None required (PORT is auto-set by Railway)

**Pros:**
- Easy file-based storage persistence
- Automatic HTTPS
- Free tier available
- Simple deployment

---

### Option 2: Render

Render provides persistent disk storage for file-based apps.

**Steps:**
1. Sign up at [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Deploy

**Environment Variables:**
- `PORT`: Auto-set by Render (no action needed)

**Important**: Render provides persistent disk storage, so `data/data.json` will persist.

**Pros:**
- Persistent disk storage
- Free tier available
- Automatic HTTPS
- Easy GitHub integration

---

### Option 3: Heroku

**Steps:**
1. Install Heroku CLI: `brew install heroku/brew/heroku` (macOS)
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Deploy: `git push heroku main`
5. Open: `heroku open`

**Important Notes:**
- Heroku uses **ephemeral filesystem** - data will be lost on restart!
- Consider migrating to a database (PostgreSQL) for production
- For file-based storage, use Heroku's add-ons or external storage

**Environment Variables:**
- `PORT`: Auto-set by Heroku

**Pros:**
- Well-established platform
- Good documentation
- Free tier (with limitations)

**Cons:**
- Ephemeral filesystem (data loss on restart)
- Not ideal for file-based storage

---

### Option 4: DigitalOcean App Platform

**Steps:**
1. Sign up at [digitalocean.com](https://www.digitalocean.com)
2. Create a new App
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
5. Deploy

**Environment Variables:**
- `PORT`: Auto-set by DigitalOcean

**Pros:**
- Persistent storage available
- Predictable pricing
- Good performance

---

### Option 5: Vercel (Not Recommended for File-Based Storage)

Vercel is serverless and doesn't support persistent file storage. You would need to migrate to a database.

**If you want to use Vercel:**
1. Migrate data storage to a database (MongoDB, PostgreSQL, etc.)
2. Update API endpoints to use database instead of file system
3. Deploy backend as serverless functions

**Not recommended** for current file-based architecture.

---

### Option 6: Self-Hosted (VPS)

Deploy to your own server (DigitalOcean Droplet, AWS EC2, etc.).

**Steps:**
1. Set up a VPS (Ubuntu recommended)
2. Install Node.js: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`
3. Clone repository: `git clone <your-repo-url>`
4. Install dependencies: `npm install`
5. Set up process manager (PM2): `npm install -g pm2`
6. Start app: `pm2 start server.js --name volleyball-coach`
7. Set up reverse proxy (Nginx) for HTTPS
8. Configure firewall

**Environment Variables:**
- `PORT=8000` (or your preferred port)

**Pros:**
- Full control
- Persistent storage
- Cost-effective for long-term

**Cons:**
- Requires server management
- Need to handle SSL certificates
- More setup required

---

## Production Considerations

### 1. Environment Variables

The server now uses `process.env.PORT` which is automatically set by most hosting platforms. If deploying to a custom server, you can set it:

```bash
export PORT=8000
```

### 2. Data Persistence

⚠️ **Important**: Most hosting platforms have ephemeral filesystems. Your `data/data.json` file will be lost on:
- Server restarts (Heroku)
- New deployments (some platforms)
- Container restarts

**Solutions:**
- Use platforms with persistent storage (Railway, Render with persistent disk)
- Migrate to a database (PostgreSQL, MongoDB, etc.)
- Use external storage (AWS S3, Google Cloud Storage)

### 3. HTTPS

Most modern platforms (Railway, Render, Heroku, Vercel) provide automatic HTTPS. For self-hosted, use Let's Encrypt with Nginx.

### 4. Process Management

For self-hosted deployments, use a process manager:

```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start server.js --name volleyball-coach

# Auto-start on reboot
pm2 startup
pm2 save
```

### 5. Monitoring

Consider adding:
- Error tracking (Sentry)
- Uptime monitoring (UptimeRobot)
- Log aggregation (if needed)

---

## Quick Deploy Commands

### Railway
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Render
```bash
# Via GitHub integration (recommended)
# Or via CLI:
npm install -g render-cli
render deploy
```

### Heroku
```bash
heroku create your-app-name
git push heroku main
```

---

## Testing Deployment Locally

Before deploying, test with production-like settings:

```bash
# Set production port
export PORT=8000

# Start server
npm start

# Test in browser
open http://localhost:8000
```

---

## Troubleshooting

### Issue: Data not persisting
**Solution**: Use a platform with persistent storage or migrate to a database.

### Issue: Port already in use
**Solution**: Change PORT environment variable or kill the process using that port.

### Issue: CORS errors
**Solution**: The server already includes CORS middleware. If issues persist, check your hosting platform's CORS settings.

### Issue: Module not found
**Solution**: Ensure `npm install` runs during deployment. Check your platform's build logs.

---

## Recommended Deployment Path

For this application with file-based storage:

1. **Best Option**: **Railway** or **Render** (persistent storage, easy setup)
2. **Alternative**: Self-hosted VPS (full control, persistent storage)
3. **Future**: Migrate to database (PostgreSQL/MongoDB) for better scalability

---

## Next Steps After Deployment

1. ✅ Test all functionality (add players, save positions, etc.)
2. ✅ Verify data persistence (restart server, check if data remains)
3. ✅ Set up custom domain (if desired)
4. ✅ Configure backups (export data regularly)
5. ✅ Monitor application logs

---

## Need Help?

- Check platform-specific documentation
- Review server logs for errors
- Test API endpoints: `curl http://your-domain.com/api/data`
- Verify static files are served: `curl http://your-domain.com/`
