# 🏀 March Madness Bracket Pool

A fun, easy-to-use bracket pool app for family and friends. No email required — just pick a screen name and a secret code to join!

## Features

- **Simple sign-up**: Screen name + key code (no email needed)
- **Full 64-team bracket**: All teams pre-loaded with seeds and regions
- **Click-to-pick**: Simple team selection through the bracket
- **Multiple brackets**: Create as many brackets as you want
- **Live leaderboard**: See who's winning with automatic scoring
- **Scoring system**: 1/2/4/8/16/32 points per round
- **Score fetching**: Pull latest game results from ESPN
- **Sports-themed UI**: Dark mode, basketball-inspired design
- **Mobile friendly**: Works on phones and tablets

## How to Deploy (Easy!)

### Option 1: Railway.app (Recommended — Easiest!)

1. Go to [railway.app](https://railway.app) and sign up with your GitHub account
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select this repository
4. Railway will auto-detect and deploy it!
5. Go to **Settings → Networking** and click **"Generate Domain"** to get your public URL
6. **Important**: Add a Volume mount:
   - Go to your service → **Settings → Volumes**
   - Click **"Add Volume"**
   - Mount path: `/data`
   - This keeps your database data saved between deploys

**Environment Variables** (optional, set in Railway dashboard):
- `ADMIN_CODE` — Password for admin features (default: `admin2026`)
- `PORT` — Automatically set by Railway

### Option 2: Render.com

1. Go to [render.com](https://render.com) and sign up
2. Click **"New" → "Web Service"**
3. Connect your GitHub repo
4. Settings:
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Add a **Disk** at mount path `/data` for database persistence
6. Set environment variable: `DB_PATH=/data/marchmadness.db`

### Option 3: Run Locally

```bash
npm install
npm start
# Open http://localhost:3000
```

## Admin Features

Use the admin code (default: `admin2026`) to:
- Update game results and scores
- Lock brackets when tournament starts
- Fetch live scores from ESPN

## Scoring System

| Round | Points per Correct Pick |
|-------|------------------------|
| Round of 64 | 1 point |
| Round of 32 | 2 points |
| Sweet 16 | 4 points |
| Elite 8 | 8 points |
| Final Four | 16 points |
| Championship | 32 points |

**Maximum possible score: 192 points**

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (zero config!)
- **Frontend**: Vanilla HTML/CSS/JS (no build step needed)
