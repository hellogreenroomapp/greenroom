# Firebase Deployment Checklist

If you're getting authentication errors on your live site, check these settings:

## 1. Enable Email/Password Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`merch-planner`)
3. Click **Authentication** in the left sidebar
4. Click **Sign-in method** tab
5. Click **Email/Password**
6. Toggle **Enable** to **ON**
7. Click **Save**

## 2. Enable Google Sign-In (Optional)

If you want to use "Sign in with Google":

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`merch-planner`)
3. Click **Authentication** in the left sidebar
4. Click **Sign-in method** tab
5. Click **Google**
6. Toggle **Enable** to **ON**
7. Click **Save**

**Note**: Firebase automatically creates an OAuth 2.0 Client ID in Google Cloud Console. You may need to:
- Configure the OAuth consent screen (if prompted)
- Verify authorized redirect URIs are set (Firebase usually does this automatically)

To verify redirect URIs:
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Click on "Web client (auto created by Google Service)" OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", you should see:
   - `https://merch-planner.firebaseapp.com/__/auth/handler`
   - `https://merch-planner.web.app/__/auth/handler`
   - `http://localhost:5173/__/auth/handler` (for local dev)

## 3. Add Authorized Domains

Firebase needs to know which domains are allowed to use authentication:

1. In Firebase Console → **Authentication**
2. Click **Settings** tab
3. Scroll to **Authorized domains**
4. Make sure these domains are listed:
   - `localhost` (for local development)
   - `merch-planner.web.app` (Firebase Hosting default)
   - `merch-planner.firebaseapp.com` (Firebase Hosting default)
   - Your custom domain (if you have one)

If your Firebase Hosting domain is missing, click **Add domain** and add it.

## 4. Check API Key Restrictions (if applicable)

If you've set up API key restrictions:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your API key (the one starting with `AIzaSyCFbaqqsyhb0_9-T4jVoCdzQ9xcskuLYbw`)
5. Click on it to edit
6. Under **Application restrictions**, make sure:
   - Either **None** is selected, OR
   - **HTTP referrers** is selected with your Firebase Hosting domains added
7. Under **API restrictions**, make sure **Identity Toolkit API** is allowed
8. Click **Save**

## 5. Verify Environment Variables

Make sure your `.env` file has the correct values (these are used during build):

```env
VITE_FIREBASE_API_KEY=AIzaSyCFbaqqsyhb0_9-T4jVoCdzQ9xcskuLYbw
VITE_FIREBASE_AUTH_DOMAIN=merch-planner.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=merch-planner
VITE_FIREBASE_STORAGE_BUCKET=merch-planner.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=9049463967
VITE_FIREBASE_APP_ID=1:9049463967:web:482d3251183c2da63b56aa
```

**Important**: After updating `.env`, you need to rebuild and redeploy:
```bash
npm run build:deploy
firebase deploy --only hosting
```

## 6. Common Error Messages

- **400 Bad Request**: Usually means Email/Password auth is not enabled or domain not authorized
- **403 Forbidden**: API key restrictions or Identity Toolkit API not enabled
- **Network Error**: Check if the API key is correct and not restricted

## Quick Fix Steps

1. ✅ Enable Email/Password authentication
2. ✅ Add Firebase Hosting domains to authorized domains
3. ✅ Rebuild and redeploy: `npm run build:deploy && firebase deploy --only hosting`
4. ✅ Test login on the live site
