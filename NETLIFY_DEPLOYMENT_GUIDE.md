# Vromm App - Netlify Deployment Guide

## ⚠️ IMPORTANT: Current App Status
This app is currently built for mobile (iOS/Android) using React Native and Expo. 
The web export functionality requires additional configuration to work properly with Netlify.

## Prerequisites
- Netlify account with your vromm domain configured
- Git repository for the project
- Node.js 18+ installed locally

## Manual Setup Instructions (For Mobile App Web Export)

### 1. Connect Your Repository to Netlify

1. Log in to [Netlify](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose your Git provider (GitHub/GitLab/Bitbucket)
4. Select the `vromm-app` repository
5. Configure build settings:
   - **Base directory**: Leave empty (root)
   - **Build command**: `npm install --legacy-peer-deps && npx expo export --platform web --output-dir dist`
   - **Publish directory**: `dist`
   - **Functions directory**: Leave empty

### 2. Configure Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables, add:

```
EXPO_PUBLIC_SUPABASE_URL=https://wbimxxrbzgynigwolcnk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiaW14eHJiemd5bmlnd29sY25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MDg1OTYsImV4cCI6MjA1MTk4NDU5Nn0.0kM04sBRE9x0pGMpubUjfkbXgp-c1aRoRdsCAz2cPV0
EXPO_PUBLIC_GIPHY_KEY=qy7cPb9DNZHFnccpdAtDcm2CrjZUuH4L
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDOtXSGBNx6ZNdQoGpdLuQUjguyRm8bke4
NODE_VERSION=18
NPM_FLAGS=--legacy-peer-deps
```

### 3. Configure Your Custom Domain

1. Go to **Site Settings** → **Domain Management**
2. Click **"Add a custom domain"**
3. Enter your vromm domain
4. Follow the DNS configuration instructions provided by Netlify

### 4. Deploy

**Option A: Automatic Deployment (Recommended)**
- Every push to your main branch will trigger an automatic deployment
- Check build status in Netlify Dashboard → Deploys

**Option B: Manual Deployment**
1. Build locally: `npm run build:web`
2. Drag and drop the `dist` folder to Netlify dashboard

## Deployment via Git Push

The project is already configured with `netlify.toml`. Simply:

```bash
# Add all changes
git add .

# Commit changes
git commit -m "Deploy to Netlify"

# Push to main branch
git push origin main
```

Netlify will automatically:
1. Detect the push
2. Run the build command
3. Deploy to your domain

## Build Commands Reference

```bash
# Test build locally
npm install --legacy-peer-deps
npm run build:web

# The build will create a 'dist' folder with static files
```

## Troubleshooting

### Build Failures
- Check Node version is set to 18 in environment variables
- Ensure `NPM_FLAGS=--legacy-peer-deps` is set
- Review build logs in Netlify Dashboard → Deploys → Failed Deploy

### Missing Environment Variables
- All `EXPO_PUBLIC_*` variables must be set in Netlify
- Variables are injected at build time, not runtime

### 404 Errors on Routes
- The `netlify.toml` includes SPA redirect rules
- All routes redirect to `/index.html` for client-side routing

## File Structure

```
vromm-app/
├── netlify.toml          # Netlify configuration (already configured)
├── .env.example          # Environment variables template
├── dist/                 # Build output directory (git-ignored)
├── src/                  # Source code
└── package.json          # Build scripts
```

## Important Notes

1. **Environment Variables**: The Supabase keys in the config are public anon keys and safe for client-side use
2. **Build Time**: Initial builds may take 5-10 minutes
3. **Cache**: Netlify caches dependencies between builds for faster deployments
4. **Preview Deploys**: Pull requests automatically create preview deployments

## Monitoring

- View live site: `https://[your-site-name].netlify.app` or your custom domain
- Check deploy status: Netlify Dashboard → Deploys
- View build logs: Click on any deployment for detailed logs

## Support

- [Netlify Documentation](https://docs.netlify.com)
- [Expo Web Documentation](https://docs.expo.dev/workflow/web/)