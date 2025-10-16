# 🚀 Deployment Guide - UGCfy on Render

## Prerequisites

✅ You already have:
- Render account (your database is already there!)
- PostgreSQL database on Render
- GitHub account (to push code)

---

## Step 1: Push Code to GitHub

### Create a New Repository

1. **Go to GitHub:** https://github.com/new
2. **Repository name:** `ugcfy-app` (or whatever you prefer)
3. **Privacy:** Private (recommended for now)
4. **Don't** initialize with README (you already have code)
5. Click **"Create repository"**

### Push Your Code

```bash
cd /Users/farooqalikhan/Desktop/ugcs-app/ug-cs

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - UGCfy production-ready app"

# Add GitHub remote (replace USERNAME and REPO)
git remote add origin https://github.com/YOUR_USERNAME/ugcfy-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy on Render

### Option A: Using render.yaml (Recommended)

1. **Go to Render Dashboard:** https://dashboard.render.com
2. Click **"New" → "Blueprint"**
3. **Connect your GitHub repository**
4. Select **`ugcfy-app`** repository
5. Render will detect `render.yaml` automatically
6. Click **"Apply"**

### Option B: Manual Setup

1. **Go to Render Dashboard**
2. Click **"New" → "Web Service"**
3. **Connect GitHub** repository
4. **Configure:**
   - **Name:** `ugcfy-app`
   - **Region:** Oregon (same as your database)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:**
     ```
     pnpm install && pnpm prisma generate && pnpm build
     ```
   - **Start Command:**
     ```
     pnpm prisma migrate deploy && pnpm start
     ```
   - **Plan:** Starter ($7/month) or Free

---

## Step 3: Configure Environment Variables

In Render dashboard, add these **Environment Variables:**

### Required:

```bash
# Database (you already have this!)
DATABASE_URL=postgresql://ugcs_db_user:IYF42hvSDUJKySf8L8FahPny0V00SwaQ@dpg-d3n99gu3jp1c73e1fl80-a.oregon-postgres.render.com/ugcs_db?sslmode=require

DIRECT_URL=postgresql://ugcs_db_user:IYF42hvSDUJKySf8L8FahPny0V00SwaQ@dpg-d3n99gu3jp1c73e1fl80-a.oregon-postgres.render.com/ugcs_db?sslmode=require

# Shopify App Credentials (from Partners Dashboard)
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret

# Scopes
SCOPES=write_products

# Your Render App URL (will be: https://ugcfy-app.onrender.com or your custom domain)
SHOPIFY_APP_URL=https://YOUR_APP_NAME.onrender.com
```

### Optional (Instagram):

```bash
INSTAGRAM_APP_ID=2214943242250385
INSTAGRAM_APP_SECRET=11dedac130b7de642014a0ba59532232
```

---

## Step 4: Update Shopify App URLs

After deploy, Render gives you a URL like: `https://ugcfy-app.onrender.com`

### Update in Shopify Partners:

1. **Go to:** https://partners.shopify.com
2. **Select your app** (UGCs)
3. **App setup → URLs:**
   - **App URL:** `https://ugcfy-app.onrender.com`
   - **Allowed redirection URL(s):**
     ```
     https://ugcfy-app.onrender.com/auth/callback
     https://ugcfy-app.onrender.com/auth/*
     https://ugcfy-app.onrender.com/auth/instagram/callback
     ```

### Update shopify.app.toml:

```toml
application_url = "https://ugcfy-app.onrender.com"

[auth]
redirect_urls = [
  "https://ugcfy-app.onrender.com/auth/callback",
  "https://ugcfy-app.onrender.com/auth/*"
]
```

---

## Step 5: Deploy!

### Auto-Deploy (Recommended):

Render automatically deploys when you push to GitHub:

```bash
# Make any changes
git add .
git commit -m "Ready for production"
git push

# Render automatically:
# 1. Detects the push
# 2. Runs build command
# 3. Runs migrations
# 4. Starts your app
# 5. Goes live! 🚀
```

### Manual Deploy:

In Render dashboard:
1. Go to your service
2. Click **"Manual Deploy" → "Deploy latest commit"**

---

## Step 6: Verify Deployment

### Check Health:

1. **Visit:** `https://your-app.onrender.com`
2. **Should see:** Shopify app install screen
3. **Check logs** in Render dashboard for errors

### Test in Shopify:

1. **Go to your dev store:** `ugcs-dev.myshopify.com/admin`
2. **Apps → Your app**
3. **Should load** without errors!

---

## 🎯 Production Checklist

Before going live:

- [ ] All environment variables set in Render
- [ ] Database migrations ran successfully
- [ ] App loads in Shopify admin
- [ ] Widgets load on storefront (test App Proxy)
- [ ] Billing scopes added (for production billing)
- [ ] Instagram setup complete (optional)
- [ ] Error tracking set up (Sentry, LogRocket, etc.)
- [ ] Custom domain configured (optional)

---

## 🔧 Troubleshooting

### Build fails:
```bash
# Check Render logs for:
- Missing env variables
- Prisma migration errors
- Build command issues
```

### App won't load:
```bash
# Verify:
- DATABASE_URL is correct
- SHOPIFY_API_KEY matches Partners dashboard
- SHOPIFY_APP_URL matches your Render URL
```

### Database connection fails:
```bash
# Make sure:
- Both DATABASE_URL and DIRECT_URL are set
- ?sslmode=require is appended
- Database allows connections from Render
```

---

## 🚀 Going Live

### When ready for real customers:

1. **Switch billing to live mode:**
   - Change `isTest: false` in `app/shopify.server.js`
   
2. **Submit app for review:**
   - Shopify Partners → App Review
   - Get approved (3-7 days)

3. **Publish to Shopify App Store:**
   - Or distribute directly to clients

---

## 💡 Pro Tips

**Custom Domain:**
- Add custom domain in Render: `app.ugcfy.com`
- Update `SHOPIFY_APP_URL`
- Update Shopify Partners URLs

**Auto-deploy:**
- Render auto-deploys on git push
- Use branches for staging/production
- Test in dev store before production

**Monitoring:**
- Check Render metrics dashboard
- Set up error alerts
- Monitor database usage

---

## Need Help?

**Render Docs:** https://render.com/docs
**Shopify Deployment:** https://shopify.dev/docs/apps/deployment

---

Ready to deploy? Just follow the steps above! 🎉

