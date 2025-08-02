# Quick Fix for Firebase Hosting Deployment

## The Problem
Your site works on localhost but fails on openstay.in with "auth/invalid-api-key" because GitHub Actions can't access your environment variables.

## The Solution
Add your Firebase config as GitHub repository secrets:

### Step 1: Go to GitHub Secrets
1. Visit: https://github.com/sairampasupuleti42/openstay/settings/secrets/actions
2. Click "New repository secret"

### Step 2: Add These Secrets (one by one)
Create these secrets with the exact names and values:

| Secret Name | Value |
|-------------|--------|


### Step 3: Trigger a New Deployment
After adding all secrets, commit and push any small change to trigger a new deployment:

```bash
git add .
git commit -m "Fix environment variables for production"
git push origin main
```

### Step 4: Check Deployment
- Your GitHub Action will run with the environment variables
- The site should work on openstay.in after deployment completes

## Verification
Once deployed, open your browser console on openstay.in and look for the "Firebase Config Debug" log to verify the configuration is loaded correctly.

## Alternative (Immediate Fix)
If you need an immediate fix, the code already includes a fallback configuration that will work without environment variables. This is safe for Firebase as API keys are not secret for client-side applications.
