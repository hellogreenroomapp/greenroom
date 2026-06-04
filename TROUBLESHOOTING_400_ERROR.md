# Troubleshooting 400 Bad Request Error

If you're getting a `400 (Bad Request)` error when trying to sign in, follow these steps:

## Step 1: Verify Email/Password Authentication is Enabled

**This is the most common cause of 400 errors.**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **merch-planner**
3. Click **Authentication** in the left sidebar
4. Click the **Sign-in method** tab
5. Look for **Email/Password** in the list
6. **If it shows "Disabled"**:
   - Click on **Email/Password**
   - Toggle **Enable** to **ON**
   - Click **Save**
7. **If it's already enabled**, continue to Step 2

## Step 2: Check Authorized Domains

1. In Firebase Console → **Authentication**
2. Click **Settings** tab
3. Scroll to **Authorized domains**
4. Verify these domains are listed:
   - ✅ `localhost` (for development)
   - ✅ `merch-planner.web.app` (your live site)
   - ✅ `merch-planner.firebaseapp.com` (Firebase default)
5. If any are missing, click **Add domain** and add them

## Step 3: Verify API Key Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **merch-planner**
3. Go to **APIs & Services** → **Credentials**
4. Find your API key: `AIzaSyCFbaqqsyhb0_9-T4jVoCdzQ9xcskuLYbw`
5. Click on it to edit
6. Under **Application restrictions**:
   - Either select **None** (for testing), OR
   - Select **HTTP referrers** and add:
     - `https://merch-planner.web.app/*`
     - `https://merch-planner.firebaseapp.com/*`
     - `http://localhost:*` (for local dev)
7. Under **API restrictions**:
   - Make sure **Identity Toolkit API** is enabled
   - Or select **Don't restrict key** (for testing)
8. Click **Save**

## Step 4: Check Browser Console for Detailed Error

After trying to sign in, check your browser's Developer Console (F12) for:
- The full error message
- Any additional error codes
- Look for messages starting with "Firebase Auth Error Details"

## Step 5: Verify Environment Variables

Make sure your `.env` file has:
```env
VITE_FIREBASE_API_KEY=AIzaSyCFbaqqsyhb0_9-T4jVoCdzQ9xcskuLYbw
VITE_FIREBASE_AUTH_DOMAIN=merch-planner.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=merch-planner
VITE_FIREBASE_STORAGE_BUCKET=merch-planner.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=9049463967
VITE_FIREBASE_APP_ID=1:9049463967:web:482d3251183c2da63b56aa
```

**Important**: After updating `.env`, rebuild and redeploy:
```bash
npm run build:deploy
firebase deploy --only hosting
```

## Step 6: Test with Google Sign-In

Try using "Sign in with Google" instead:
- If Google Sign-In works but Email/Password doesn't, it confirms Email/Password auth is not enabled
- If both fail, it's likely a domain or API key restriction issue

## Common Causes

1. **Email/Password not enabled** (90% of cases) - Check Step 1
2. **Domain not authorized** - Check Step 2
3. **API key restrictions** - Check Step 3
4. **Wrong auth domain in .env** - Should be `merch-planner.firebaseapp.com`
5. **Stale build** - Rebuild and redeploy after changing `.env`

## Still Not Working?

1. Check the browser console for the full error message
2. Verify you're testing on the correct domain (`merch-planner.web.app`)
3. Try clearing browser cache and cookies
4. Try in an incognito/private window
5. Check Firebase Console → Authentication → Users to see if accounts exist
