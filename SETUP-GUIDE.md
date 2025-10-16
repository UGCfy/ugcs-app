# 🚀 UGCfy Setup Guide

Complete guide to get UGCfy running on your system and deploying to production.

---

## 📋 Prerequisites

- Node.js v22.20.0 (via NVM)
- pnpm v10.18.3
- PostgreSQL database (Render recommended)
- Shopify Partner account
- Instagram Business/Creator account (optional, for auto-import)

---

## 🔧 Local Development Setup

### 1. Clone and Install Dependencies

```bash
cd /Users/farooqalikhan/Desktop/ugcs-app/ug-cs
pnpm install
```

### 2. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials
nano .env
```

**Required variables:**
```
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
SHOPIFY_API_KEY="your_key"
SHOPIFY_API_SECRET="your_secret"
```

**Optional (for Instagram):**
```
INSTAGRAM_APP_ID="your_app_id"
INSTAGRAM_APP_SECRET="your_app_secret"
```

### 3. Database Setup

```bash
# Generate Prisma Client
pnpm prisma generate

# Run migrations
pnpm prisma migrate deploy

# Seed demo data (optional)
node scripts/seed-ugc.mjs
```

### 4. Start Development Server

**Option A: With Shopify CLI** (recommended)
```bash
pnpm dev
```

**Option B: Without Shopify CLI**
```bash
# If Shopify CLI not installed
pnpm react-router dev
```

Server will start at: `http://localhost:3000` (or configured port)

---

## 🔗 Instagram Integration Setup

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Click **My Apps** → **Create App**
3. Choose **Business** type
4. Fill in app details

### Step 2: Add Instagram Basic Display

1. In your app dashboard, click **Add Product**
2. Find **Instagram Basic Display** → Click **Set Up**
3. Click **Create New App** (under Instagram Basic Display)
4. Fill in details:
   - **Display Name:** UGCfy
   - **Valid OAuth Redirect URIs:** `https://ugcs-app.onrender.com/auth/instagram/callback`
   - **Deauthorize Callback URL:** `https://ugcs-app.onrender.com/auth/instagram/deauthorize`
   - **Data Deletion Request URL:** `https://ugcs-app.onrender.com/auth/instagram/delete`

### Step 3: Get Credentials

1. Go to **Basic Display** → **Basic Settings**
2. Copy **Instagram App ID**
3. Copy **Instagram App Secret**
4. Add to `.env`:
```
INSTAGRAM_APP_ID="your_app_id_here"
INSTAGRAM_APP_SECRET="your_secret_here"
```

### Step 4: Test Connection

1. Restart your app
2. Navigate to **Content Channels**
3. Click **Connect Instagram**
4. Complete OAuth flow
5. Click **Test Import** to fetch recent posts

---

## 🎨 Widget Installation

### For Merchants to Install Widgets

1. **In UGCfy Admin:**
   - Go to **Widget Setup**
   - Configure options (columns, tags, limit)
   - Copy the embed code

2. **In Shopify Theme:**
   - Go to **Online Store → Themes → Edit Code**
   - Open the appropriate template:
     - Homepage: `sections/main-page.liquid` or `templates/index.liquid`
     - Product: `sections/main-product.liquid`
   - Paste the embed code
   - Save

3. **View Your Store:**
   - Widget appears immediately
   - Videos auto-play on hover
   - Click to view in lightbox

---

## 📦 Deployment to Production (Render)

### 1. Database (Already Set Up)
✅ PostgreSQL database on Render  
✅ Connection URL in `.env`

### 2. Web Service on Render

**Create New Web Service:**
- **Name:** ugcs-app
- **Region:** Oregon (matches your database)
- **Branch:** main
- **Build Command:** `cd ug-cs && pnpm install && pnpm prisma generate && pnpm build`
- **Start Command:** `cd ug-cs && pnpm start`
- **Environment:** Node

**Add Environment Variables:**
```
DATABASE_URL=your_render_db_url
DIRECT_URL=your_render_db_url
SHOPIFY_API_KEY=from_partners_dashboard
SHOPIFY_API_SECRET=from_partners_dashboard
INSTAGRAM_APP_ID=from_facebook_developers
INSTAGRAM_APP_SECRET=from_facebook_developers
NODE_ENV=production
```

### 3. Run Migrations on Deploy

**Add in Render dashboard → Settings → Build & Deploy:**
```bash
# Pre-deploy command
cd ug-cs && pnpm prisma migrate deploy
```

### 4. Update Shopify App URLs

In `shopify.app.toml`, ensure:
```toml
application_url = "https://ugcs-app.onrender.com"

[auth]
redirect_urls = [
  "https://ugcs-app.onrender.com/auth/callback",
  "https://ugcs-app.onrender.com/auth/*"
]
```

### 5. Deploy

```bash
git add .
git commit -m "feat: add widget system and Instagram import"
git push origin main
```

Render will automatically deploy.

---

## 🧪 Testing Checklist

### Media Management
- [ ] Create new media via form
- [ ] Upload URL successfully
- [ ] Add caption
- [ ] Set initial status
- [ ] View in table

### Filtering
- [ ] Search by URL/caption
- [ ] Filter by status (DRAFT/APPROVED/REJECTED)
- [ ] Filter by product attachment (yes/no)
- [ ] Filter by tag
- [ ] Combine multiple filters
- [ ] Clear all filters

### Bulk Operations
- [ ] Select individual items
- [ ] Select all items
- [ ] Bulk approve
- [ ] Bulk reject
- [ ] Bulk set to draft
- [ ] Clear selection

### Product Tagging
- [ ] Search for products
- [ ] Attach product to media
- [ ] View product thumbnail + title
- [ ] Change product
- [ ] Unset product

### Tag Management
- [ ] Add tag to media
- [ ] Remove tag from media
- [ ] Filter by tag
- [ ] Tags display in chips

### Widget System
- [ ] Configure widget in admin
- [ ] Copy embed code
- [ ] Install on test store
- [ ] Widget appears on storefront
- [ ] Videos auto-play on hover
- [ ] Click opens lightbox
- [ ] Responsive on mobile

### Instagram Import (if configured)
- [ ] Connect Instagram account
- [ ] OAuth flow completes
- [ ] Channel appears in list
- [ ] Test import button works
- [ ] New media created as DRAFT
- [ ] Duplicates skipped

---

## 🐛 Troubleshooting

### "shopify: command not found"

```bash
# Install Shopify CLI
pnpm add -g @shopify/cli @shopify/app

# Verify
shopify version
```

### "Database connection failed"

```bash
# Test connectivity
nc -vz dpg-d3n99gu3jp1c73e1fl80-a.oregon-postgres.render.com 5432

# Check .env file
cat .env | grep DATABASE_URL

# Test Prisma connection
pnpm prisma db pull
```

### "Widget not appearing"

1. Check App Proxy is configured in Partners dashboard
2. Verify shop parameter is correct
3. Check browser console for errors
4. Ensure at least 1 approved media exists

### "Instagram import fails"

1. Check access token hasn't expired
2. Verify Instagram app is in Live mode (not Development)
3. Check API credentials in .env
4. Review logs for specific error

---

## 📊 Monitoring & Maintenance

### Check Database Status
```bash
pnpm prisma migrate status
```

### View Logs (Render)
```
Dashboard → Your Service → Logs
```

### Backup Database
```bash
# From Render dashboard
Database → Backups → Create Backup
```

### Update Dependencies
```bash
pnpm update
pnpm prisma generate
```

---

## 🚀 Next Steps After Setup

1. **Add Real Media:**
   - Upload 10-20 real UGC items
   - Approve some, keep some as drafts
   - Tag with products
   - Add tags for organization

2. **Test Widgets:**
   - Install on development store
   - Test on different pages
   - Check mobile responsiveness
   - Optimize layout

3. **Connect Instagram:**
   - Set up Instagram app
   - Connect account
   - Run first import
   - Schedule recurring imports

4. **Prepare for Launch:**
   - Write merchant documentation
   - Create video tutorial
   - Set up support email
   - Prepare pricing page

---

## 📞 Support Resources

- **Shopify App Bridge Docs:** https://shopify.dev/docs/apps/tools/app-bridge
- **Prisma Docs:** https://www.prisma.io/docs
- **React Router v7:** https://reactrouter.com
- **Instagram Basic Display API:** https://developers.facebook.com/docs/instagram-basic-display-api

---

**Built with ❤️ by UGCfy Team**


---

## Instagram API Setup - Simplified Approach

### How It Works

**FOR APP OWNER (ONE-TIME SETUP):**
1. Create ONE Instagram app in Facebook Developers
2. Add credentials to `.env` file
3. Done!

**FOR MERCHANTS:**
1. Click "Connect Instagram"
2. Log in with Instagram
3. Done!

### Setup Steps (App Owner Only)

1. **Go to Facebook Developers**
   - Visit https://developers.facebook.com
   - Create a new app (choose "Business" type)

2. **Add Instagram Basic Display**
   - In your app dashboard, click "Add Product"
   - Find "Instagram Basic Display" and click "Set Up"

3. **Configure OAuth Redirect**
   - Go to Basic Display Settings
   - Under "Valid OAuth Redirect URIs", add:
     ```
     https://your-app-url.com/auth/instagram/callback
     ```
   - Replace `your-app-url.com` with your actual domain

4. **Get Your Credentials**
   - Copy your **Instagram App ID**
   - Copy your **Instagram App Secret**

5. **Update `.env` File**
   ```bash
   INSTAGRAM_APP_ID="your_actual_app_id"
   INSTAGRAM_APP_SECRET="your_actual_app_secret"
   SHOPIFY_APP_URL="https://your-app-url.com"
   ```

6. **Restart Your App**
   ```bash
   pnpm dev
   ```

### That's It!

Now when merchants click "Connect Instagram", they'll see a simple Instagram login screen. No complex setup needed for them!

