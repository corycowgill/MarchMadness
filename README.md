# 🏀 March Madness Bracket Pool

A fun, easy-to-use bracket pool app for family and friends. No email required — just pick a screen name and a secret code to join!

## 🚀 One-Click Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/corycowgill/MarchMadness)

**That's it!** Click the button above, sign up for a free Render account (use your Google or GitHub login), and your app will be live in about 2 minutes. Render will give you a URL like `https://march-madness-brackets-xxxx.onrender.com` — share that with your family and friends!

> **Note:** Render's free tier sleeps after 15 minutes of inactivity. The first visit after sleeping takes ~30 seconds to wake up. After that it's fast. If you want it always-on, upgrade to their $7/month plan.

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

## How to Deploy

### Option 1: Render.com (Recommended — Free!)

Just click the deploy button above! Or manually:

1. Go to [render.com](https://render.com) and sign up with Google or GitHub
2. Click **"New" → "Blueprint"**
3. Connect your GitHub account and select this repository
4. Render reads the `render.yaml` file and sets everything up automatically
5. Click **"Apply"** — done! Your app will be live in ~2 minutes
6. Find your URL in the Render dashboard

### Option 2: Railway.app

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click **"New Project" → "Deploy from GitHub Repo"**
3. Select this repository — Railway auto-detects the config
4. In **Settings → Networking**, click **"Generate Domain"**
5. In **Settings → Volumes**, add a volume at mount path `/data`

### Option 3: Run Locally

```bash
npm install
npm start
# Open http://localhost:3000
```

## Admin Features

After deploying, Render auto-generates your admin code. Find it in your Render dashboard under **Environment Variables → ADMIN_CODE**.

If running locally, the default admin code is `admin2026`.

Admin lets you:
- Update game results and scores
- Lock brackets when the tournament starts
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
