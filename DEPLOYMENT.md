# Beyond Bullet Points - Deployment Guide

## Table of Contents
1. [Pre-Deployment Considerations](#pre-deployment-considerations)
2. [Architecture Overview](#architecture-overview)
3. [PartyKit Deployment](#partykit-deployment)
4. [Express Backend Deployment](#express-backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Testing Multiplayer](#testing-multiplayer)
7. [Environment Configuration](#environment-configuration)
8. [Monitoring & Debugging](#monitoring--debugging)
9. [Troubleshooting](#troubleshooting)
10. [Security Checklist](#security-checklist)

---

## Pre-Deployment Considerations

### 1. Hosting Requirements

**PartyKit (Real-time Multiplayer):**
- Runs on Cloudflare Workers (serverless)
- Requires Cloudflare account (free tier available)
- Global edge deployment (low latency worldwide)
- Automatic scaling

**Express Backend:**
- Can deploy to: Railway, Render, Fly.io, DigitalOcean, AWS, etc.
- Requires: Node.js 18+, SQLite write access, persistent storage for file system
- Recommend: Docker container with volume mount for `/data` directory

**Frontend (React + Vite):**
- Static files after `npm run build`
- Can host on: Cloudflare Pages, Vercel, Netlify, GitHub Pages
- Or serve from Express backend (included in current setup)

### 2. Domain & SSL

**Recommended Setup:**
- Main domain: `bbp.yourdomain.com` (Express + Frontend)
- PartyKit: `partykit.yourdomain.com` or use PartyKit's subdomain
- Both need SSL certificates (HTTPS required for WebSockets)

**CORS Configuration:**
PartyKit server must accept connections from your domain:
```typescript
// In party/index.ts - CORS headers will be needed for production
```

### 3. Database Persistence

**SQLite Considerations:**
- SQLite file must persist between deployments
- Use volume mounts in Docker/containerized environments
- For high availability: Consider migrating to PostgreSQL later
- Backup strategy: Regular backups of `/data/sessions.db`

### 4. File Storage

**Session Files:**
- Cards stored in `/data/sessions/{sessionId}/`
- Must persist between deployments
- Backup strategy: Regular backups of `/data/sessions/` directory

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React App (Vite)                                        │  │
│  │  - User Interface                                        │  │
│  │  - PartyKit Client (WebSocket)                          │  │
│  │  - REST API Client (HTTP)                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼ WebSocket                   ▼ HTTP
┌──────────────────────────┐    ┌──────────────────────────┐
│      PARTYKIT SERVER     │    │     EXPRESS SERVER       │
│   (Cloudflare Workers)   │    │   (Your Hosting)         │
│  ┌────────────────────┐  │    │  ┌────────────────────┐  │
│  │ Session Rooms      │  │    │  │ REST API           │  │
│  │ - Real-time sync   │  │    │  │ - CRUD operations  │  │
│  │ - Presence         │  │    │  │ - Auth             │  │
│  │ - Cursor tracking  │  │    │  │ - Export           │  │
│  └────────────────────┘  │    │  └────────────────────┘  │
└──────────────────────────┘    │  ┌────────────────────┐  │
                                │  │ SQLite Database    │  │
                                │  │ - Sessions         │  │
                                │  │ - Cards index      │  │
                                │  │ - Connections      │  │
                                │  └────────────────────┘  │
                                │  ┌────────────────────┐  │
                                │  │ File System        │  │
                                │  │ - Card markdown    │  │
                                │  │ - Session JSON     │  │
                                │  └────────────────────┘  │
                                └──────────────────────────┘
```

---

## PartyKit Deployment

### Step 1: Create Cloudflare Account

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign up for free account
3. Verify email address

### Step 2: Install PartyKit CLI (if not already)

```bash
# Already installed as devDependency
npm list partykit
```

### Step 3: Login to PartyKit

```bash
npx partykit login
```

This will open a browser window to authenticate with Cloudflare.

### Step 4: Deploy

```bash
# Deploy to PartyKit
npm run partykit:deploy

# Or directly:
npx partykit deploy
```

**Expected Output:**
```
✨ Built project
🌍 Deployed to https://beyond-bullet-points.{username}.partykit.dev
```

### Step 5: Verify Deployment

```bash
# Check health endpoint
curl https://beyond-bullet-points.{username}.partykit.dev/health

# Expected response:
{"status":"ok","room":"test","connections":0,"users":0,"lastActivity":...}
```

### Step 6: Configure Custom Domain (Optional)

1. Go to Cloudflare dashboard
2. Select your PartyKit project
3. Add custom domain in settings
4. Update DNS records as instructed

---

## Express Backend Deployment

### Option A: Railway (Recommended for Simplicity)

**1. Install Railway CLI:**
```bash
npm i -g @railway/cli
```

**2. Login:**
```bash
railway login
```

**3. Initialize Project:**
```bash
railway init
```

**4. Add Environment Variables:**
```bash
railway variables set ADMIN_PASSWORD=shazam!
railway variables set GEMINI_API_KEY=your_key
railway variables set OPENCODE_API_KEY=your_key
railway variables set PARTYKIT_HOST=beyond-bullet-points.{username}.partykit.dev
```

**5. Deploy:**
```bash
railway up
```

**6. Add Volume for Data Persistence:**
- Go to Railway dashboard
- Add a volume to your service
- Mount at `/app/data`

### Option B: Render

**1. Create `render.yaml`:**
```yaml
services:
  - type: web
    name: beyond-bullet-points
    runtime: node
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: ADMIN_PASSWORD
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: OPENCODE_API_KEY
        sync: false
      - key: PARTYKIT_HOST
        value: beyond-bullet-points.{username}.partykit.dev
    disk:
      name: data
      mountPath: /app/data
      sizeGB: 1
```

**2. Deploy via Dashboard:**
- Connect GitHub repository
- Render will auto-deploy on push

### Option C: Fly.io

**1. Install Fly CLI:**
```bash
curl -L https://fly.io/install.sh | sh
```

**2. Launch App:**
```bash
fly launch
```

**3. Create Volume:**
```bash
fly volumes create data --size 1
```

**4. Update `fly.toml`:**
```toml
[mounts]
  source = "data"
  destination = "/app/data"

[env]
  ADMIN_PASSWORD = "shazam!"
  PARTYKIT_HOST = "beyond-bullet-points.{username}.partykit.dev"
```

**5. Deploy:**
```bash
fly deploy
```

---

## Frontend Deployment

### Option 1: Serve from Express (Easiest)

The Express server already serves static files from `dist/` folder after build.

**Build steps:**
```bash
npm run build
npm start
```

### Option 2: Separate Static Hosting

**Build for production:**
```bash
npm run build
```

**Deploy to Vercel:**
```bash
npm i -g vercel
vercel --prod
```

**Deploy to Netlify:**
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

**Important:** Update API base URL in frontend if using separate hosting.

---

## Testing Multiplayer

### Local Testing

**1. Start PartyKit Dev Server:**
```bash
# Terminal 1
npm run partykit:dev

# Server starts on localhost:1999
```

**2. Start Express Backend:**
```bash
# Terminal 2
npm run dev

# Server starts on localhost:3000
```

**3. Test with Multiple Browsers:**

**Setup:**
- Browser 1: Open `http://localhost:3000/bdo-xxxx` (incognito/private mode)
- Browser 2: Open `http://localhost:3000/bdo-xxxx` (regular mode)

**Test Checklist:**

**Initial Connection:**
- [ ] Both browsers show "Connecting..." → "Connected"
- [ ] Profile prompt appears on first visit
- [ ] Active users show in top-right (2 users)

**Card Operations:**
- [ ] Create card in Browser 1 → appears in Browser 2 within 1 second
- [ ] Edit card in Browser 2 → updates in Browser 1 immediately
- [ ] Delete card in Browser 1 → removed from Browser 2
- [ ] Reorder cards in Browser 2 → order updates in Browser 1

**Connection Lines:**
- [ ] Create connection in Browser 1 → visible in Browser 2
- [ ] Delete connection in Browser 2 → removed from Browser 1

**Disconnection Handling:**
- [ ] Close Browser 1 tab → Browser 2 shows 1 active user
- [ ] Reopen Browser 1 → reconnects automatically
- [ ] Stop PartyKit server → shows "Disconnected" status
- [ ] Restart PartyKit → reconnects automatically

### Production Testing

**Before going live:**

1. **Create test session:**
   ```bash
   curl -X POST https://your-domain.com/api/sessions \
     -H "Content-Type: application/json" \
     -H "x-admin-session: your-admin-token" \
     -d '{"name":"Test Session","require_password":false}'
   ```

2. **Verify PartyKit connectivity:**
   ```bash
   wscat -c "wss://beyond-bullet-points.{username}.partykit.dev/party/session-test"
   ```

3. **Load testing (optional):**
   - Open 5+ browser tabs
   - Rapid card creation
   - Verify no performance degradation

---

## Environment Configuration

### Production `.env` File

```bash
# Required
ADMIN_PASSWORD=shazam!
GEMINI_API_KEY=your_gemini_api_key
OPENCODE_API_KEY=your_opencode_api_key

# PartyKit (Production)
PARTYKIT_HOST=beyond-bullet-points.{username}.partykit.dev

# Optional
DATABASE_PATH=./data/sessions.db
FILE_STORAGE_PATH=./data/sessions
NODE_ENV=production
PORT=3000
```

### Development `.env` File

```bash
# Required
ADMIN_PASSWORD=shazam!
GEMINI_API_KEY=your_gemini_api_key
OPENCODE_API_KEY=your_opencode_api_key

# PartyKit (Development - defaults)
# PARTYKIT_HOST=localhost:1999

# Optional
DATABASE_PATH=./data/sessions.db
FILE_STORAGE_PATH=./data/sessions
NODE_ENV=development
PORT=3000
```

---

## Monitoring & Debugging

### PartyKit Logs

**View logs in Cloudflare Dashboard:**
1. Go to Cloudflare dashboard
2. Navigate to Workers & Pages
3. Select your PartyKit project
4. View real-time logs

**Local logs:**
```bash
npm run partykit:dev
# Logs appear in terminal
```

### Express Backend Logs

**Structured logging (add to server.ts):**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### Health Checks

**Backend health:**
```bash
curl https://your-domain.com/health
```

**PartyKit health:**
```bash
curl https://beyond-bullet-points.{username}.partykit.dev/health
```

### Key Metrics to Monitor

1. **PartyKit:**
   - Active connections per room
   - Message throughput
   - Error rates

2. **Express:**
   - Response times
   - API error rates
   - Database connection health

3. **Storage:**
   - Disk usage (SQLite + files)
   - Backup success/failure

---

## Troubleshooting

### Common Issues

**1. "WebSocket connection failed"**
- **Cause:** PartyKit not running or wrong host
- **Fix:** 
  - Check PartyKit is deployed: `npm run partykit:deploy`
  - Verify PARTYKIT_HOST in .env
  - Check browser console for CORS errors

**2. "Changes not syncing between users"**
- **Cause:** Users in different PartyKit rooms
- **Fix:** 
  - Verify both users have same session ID in URL
  - Check PartyKit logs for room mismatch

**3. "Session data lost after deployment"**
- **Cause:** Volume not persisted
- **Fix:**
  - Ensure volume is mounted at correct path
  - Check data directory exists: `ls -la /app/data`

**4. "High latency in real-time updates"**
- **Cause:** User far from PartyKit edge location
- **Fix:**
  - Check PartyKit is deployed to closest region
  - Consider upgrading to paid Cloudflare plan for more regions

**5. "CORS errors in browser"**
- **Cause:** PartyKit not accepting connections from your domain
- **Fix:**
  - Add CORS headers in PartyKit server
  - Verify domain is whitelisted

### Debugging Commands

**Check WebSocket connection:**
```bash
# Install wscat
npm i -g wscat

# Connect to PartyKit room
wscat -c "wss://beyond-bullet-points.{username}.partykit.dev/party/session-test"

# Send test message
> {"type":"test","data":"hello"}
```

**Check API endpoints:**
```bash
# Get sessions
curl https://your-domain.com/api/sessions \
  -H "x-admin-session: your-token"

# Create card
curl -X POST https://your-domain.com/api/sessions/bdo-test/cards \
  -H "Content-Type: application/json" \
  -H "x-admin-session: your-token" \
  -d '{"section":"place","content":"Test card"}'
```

---

## Security Checklist

**Before deploying to production:**

- [ ] Change default admin password (`shazam!`)
- [ ] Use strong, unique passwords for all sessions
- [ ] Enable HTTPS (required for WebSockets)
- [ ] Set up environment variables securely (not in code)
- [ ] Configure CORS properly (restrict to your domain)
- [ ] Enable rate limiting on API endpoints
- [ ] Set up database backups
- [ ] Configure file storage backups
- [ ] Use secure session storage (HttpOnly cookies if possible)
- [ ] Add input validation for all API endpoints
- [ ] Sanitize user inputs (prevent XSS)
- [ ] Set up logging and monitoring
- [ ] Configure auto-restart for services
- [ ] Test disaster recovery (restore from backup)

### Security Best Practices

**1. Admin Password:**
```bash
# Generate strong password
openssl rand -base64 32
```

**2. Session Passwords:**
- Auto-generated hex passwords are secure
- Store hashed in database (already implemented)
- Never log or expose in client-side code

**3. API Security:**
```typescript
// Add rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

**4. CORS Configuration:**
```typescript
// In PartyKit server (party/index.ts)
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

---

## Post-Deployment Checklist

**Immediate (within 1 hour):**
- [ ] Verify application loads correctly
- [ ] Test admin login
- [ ] Create test session
- [ ] Test multiplayer with 2 browsers
- [ ] Verify exports work (ZIP, Markdown)

**Within 24 hours:**
- [ ] Monitor error logs
- [ ] Check PartyKit connection metrics
- [ ] Verify data persistence (create session, restart server, verify data intact)
- [ ] Test backup/restore process

**Ongoing:**
- [ ] Weekly: Review logs for errors
- [ ] Weekly: Monitor disk usage
- [ ] Monthly: Update dependencies
- [ ] Monthly: Review security settings

---

## Support & Resources

**Documentation:**
- PartyKit Docs: [docs.partykit.io](https://docs.partykit.io)
- Cloudflare Workers: [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers)

**Community:**
- PartyKit Discord: [discord.gg/partykit](https://discord.gg/partykit)
- Cloudflare Community: [community.cloudflare.com](https://community.cloudflare.com)

**Emergency Contacts:**
- Save this guide and TODO.md offline
- Document your specific hosting provider's support contacts
- Set up monitoring alerts

---

## Quick Reference

**Start development:**
```bash
# Terminal 1
npm run partykit:dev

# Terminal 2
npm run dev
```

**Deploy to production:**
```bash
# Build frontend
npm run build

# Deploy PartyKit
npm run partykit:deploy

# Deploy backend (platform-specific)
# Railway: railway up
# Render: git push
# Fly: fly deploy
```

**Check status:**
```bash
# Backend
curl https://your-domain.com/health

# PartyKit
curl https://beyond-bullet-points.{username}.partykit.dev/health
```

---

**Last Updated:** 2026-03-16
**Version:** 1.0
