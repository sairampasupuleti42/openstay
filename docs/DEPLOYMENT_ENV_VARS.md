# Environment Variables Configuration for Deployment

## Problem
The error "auth/invalid-api-key" occurs when Firebase environment variables are not properly configured in your production deployment.

## Solutions by Platform

### 1. Firebase Hosting with GitHub Actions
Since you're using Firebase Hosting with GitHub Actions, you need to add environment variables as GitHub repository secrets:

**Step 1: Add GitHub Secrets**
1. Go to your GitHub repository: `https://github.com/sairampasupuleti42/openstay`
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret" and add each variable:


**Step 2: Verify GitHub Actions Workflow**
The workflow files have been updated to use these secrets during the build process.

### 2. Vercel Deployment
Add environment variables in Vercel dashboard:
1. Go to your project in Vercel dashboard
2. Navigate to Settings → Environment Variables
3. Add all VITE_ prefixed variables:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`

### 3. Netlify Deployment
Add environment variables in Netlify:
1. Go to Site settings → Environment variables
2. Add all VITE_ prefixed variables

### 4. GitHub Pages or Static Hosting
For static hosting without server-side support, you have two options:

#### Option A: Use a build-time config file
Create `src/config/firebase.prod.ts`:
```typescript
UPDATED NEW CONFIG FRO PROD
```

#### Option B: Use runtime config (not recommended for sensitive data)

## Current Values (from .env)
```
UPDATED NEW CONFIG FRO PROD
```

## Debugging Steps
1. Check browser console for the debug log we added
2. Verify all environment variables are set in your hosting platform
3. Ensure variable names match exactly (case-sensitive)
4. Redeploy after setting environment variables

## Security Note
Firebase API keys are not secret and can be safely exposed in client-side code. Firebase security is handled by Firestore security rules and Authentication settings.
