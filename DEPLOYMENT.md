# Deployment Guide for Volleyball Coach

This guide covers how to build and deploy the Volleyball Coach application to various hosting platforms.

## Current Structure

The application consists of:
- **Backend**: Node.js/Express server (`server.js`) that serves static files and provides REST API endpoints
- **Frontend**: Vanilla JavaScript (ES6 modules) in the `public/` directory
- **Data Storage**: MongoDB database (MongoDB Atlas recommended)
- **No Build Step Required**: The frontend uses vanilla JavaScript, so no compilation/bundling is needed

## Pre-Deployment Checklist

1. ✅ **Dependencies**: All dependencies are in `package.json`
2. ✅ **Port Configuration**: Server uses `process.env.PORT` (falls back to 8000)
3. ✅ **Static Files**: All frontend files are in `public/` directory
4. ✅ **MongoDB Database**: Set up MongoDB Atlas cluster and configure `MONGODB_URI` environment variable

## MongoDB Atlas Setup (Required)

Before deploying, you need to set up a MongoDB database. MongoDB Atlas is recommended (free tier available).

### Step 1: Create MongoDB Atlas Account
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new project (or use the default)

### Step 2: Create a Cluster
1. Click **"Build a Database"** or **"Create"**
2. Choose **"M0 Free"** tier (perfect for development)
3. Select your preferred cloud provider and region
4. Click **"Create Cluster"** (takes 3-5 minutes)

### Step 3: Create Database User
1. Go to **Database Access** in the left sidebar
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Enter a username and strong password (save these!)
5. Set privileges to **"Atlas Admin"** (or **"Read and write to any database"**)
6. Click **"Add User"**

### Step 4: Configure Network Access
1. Go to **Network Access** in the left sidebar
2. Click **"Add IP Address"**
3. For development: Click **"Add Current IP Address"**
4. For production: Click **"Allow Access from Anywhere"** (0.0.0.0/0)
5. Click **"Confirm"**

### Step 5: Get Connection String
1. Go to **Database** in the left sidebar
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`)
5. Replace `<password>` with your actual password
6. Add database name at the end: `...mongodb.net/volleyball-coach?retryWrites=true&w=majority`

**Your connection string should look like:**
```
mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/volleyball-coach?retryWrites=true&w=majority
```

### Step 6: Set Environment Variable
Set `MONGODB_URI` (or `MONGO_URI`) to your connection string in your hosting platform's environment variables.

---

## Deployment Options

### Option 1: Railway (Recommended)

Railway is excellent for Node.js apps with MongoDB.

**Steps:**
1. Sign up at [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository (or deploy from CLI)
4. Railway will auto-detect Node.js and run `npm start`

**Setting Up MongoDB on Railway:**
1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add MongoDB"**
3. Railway will automatically create a MongoDB instance
4. Click on the MongoDB service
5. Go to **"Variables"** tab
6. Copy the `MONGO_URL` value
7. Go back to your app service
8. Go to **"Variables"** tab
9. Add a new variable:
   - **Name**: `MONGODB_URI`
   - **Value**: Paste the `MONGO_URL` from the MongoDB service
10. Add database name: Append `/volleyball-coach` to the connection string

**Or use MongoDB Atlas:**
1. Follow the MongoDB Atlas setup above
2. In Railway, go to your app service → **"Variables"**
3. Add variable:
   - **Name**: `MONGODB_URI`
   - **Value**: Your MongoDB Atlas connection string

**Finding Your App URL:**
1. In Railway dashboard, click on your **service** (the deployed app)
2. Go to the **Settings** tab
3. Scroll down to **Networking** section
4. Click **Generate Domain** (if you haven't already)
5. Railway will generate a public URL like: `https://your-app-name.up.railway.app`

**Environment Variables:**
- `MONGODB_URI` or `MONGO_URI`: Your MongoDB connection string (required)
- `PORT`: Auto-set by Railway (no action needed)
- `DB_NAME`: Optional, defaults to `volleyball-coach`

**Data Persistence:**
- ✅ **Data persists permanently**: All data is stored in MongoDB
- ✅ **Survives deployments**: Data is independent of code deployments
- ✅ **No data loss**: Database persists across all server restarts and rebuilds
- ✅ **Scalable**: Easy to scale and backup

**Pros:**
- Automatic HTTPS
- Free tier available
- Simple deployment
- Great MongoDB integration
- **Data persists across all deployments**

---

### Option 2: Render

Render is great for Node.js apps with MongoDB.

**Steps:**
1. Sign up at [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Add environment variable:
   - **Key**: `MONGODB_URI`
   - **Value**: Your MongoDB Atlas connection string (from setup above)
6. Deploy

**Environment Variables:**
- `MONGODB_URI` or `MONGO_URI`: Your MongoDB connection string (required)
- `PORT`: Auto-set by Render (no action needed)

**Pros:**
- Free tier available
- Automatic HTTPS
- Easy GitHub integration
- Great for MongoDB Atlas

---

### Option 3: Heroku

**Steps:**
1. Install Heroku CLI: `brew install heroku/brew/heroku` (macOS)
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set MongoDB URI: `heroku config:set MONGODB_URI="your-mongodb-atlas-connection-string"`
5. Deploy: `git push heroku main`
6. Open: `heroku open`

**Environment Variables:**
- `MONGODB_URI` or `MONGO_URI`: Your MongoDB Atlas connection string (required)
- `PORT`: Auto-set by Heroku

**Pros:**
- Well-established platform
- Good documentation
- Works great with MongoDB Atlas

**Cons:**
- Free tier has limitations (sleeps after inactivity)

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

### Option 5: Vercel

Vercel works great with MongoDB Atlas!

**Steps:**
1. Sign up at [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Other
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`
4. Add environment variable:
   - **Name**: `MONGODB_URI`
   - **Value**: Your MongoDB Atlas connection string
5. Deploy

**Note**: You may need to adjust the server setup for serverless functions, or use Vercel's API routes feature.

**Pros:**
- Excellent performance
- Automatic HTTPS
- Great for static + API routes
- Free tier available

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

✅ **MongoDB Database**: The app now uses MongoDB for data storage, which provides:
- Permanent data persistence across all deployments
- No data loss on server restarts or rebuilds
- Easy backups and scaling
- Works on any hosting platform

**Required Setup:**
- Set up MongoDB Atlas (free tier available) - see setup instructions above
- Set `MONGODB_URI` environment variable with your connection string

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
**Solution**: Ensure `MONGODB_URI` environment variable is set correctly. Check your MongoDB Atlas cluster is running and network access is configured.

### Issue: Cannot connect to MongoDB
**Solution**: 
- Verify `MONGODB_URI` is set correctly
- Check MongoDB Atlas network access allows your IP (or 0.0.0.0/0 for production)
- Verify database user credentials are correct
- Check MongoDB Atlas cluster is running (not paused)

### Issue: Port already in use
**Solution**: Change PORT environment variable or kill the process using that port.

### Issue: CORS errors
**Solution**: The server already includes CORS middleware. If issues persist, check your hosting platform's CORS settings.

### Issue: Module not found
**Solution**: Ensure `npm install` runs during deployment. Check your platform's build logs.

---

## Recommended Deployment Path

For this application with MongoDB:

1. **Best Option**: **Railway** with MongoDB Atlas (easiest setup, great integration)
2. **Alternative**: **Render** with MongoDB Atlas (free tier, simple setup)
3. **Alternative**: **Heroku** with MongoDB Atlas (well-established platform)
4. **Self-hosted**: VPS with MongoDB Atlas or self-hosted MongoDB

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
