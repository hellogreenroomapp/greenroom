# Firebase Setup Guide

This guide will walk you through setting up Firebase for the Merch Pipeline application.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `merch-pipeline` (or your preferred name)
4. Disable Google Analytics (optional, can enable later)
5. Click "Create project"

## Step 2: Register Your Web App

1. In your Firebase project, click the web icon (`</>`) to add a web app
2. Register app name: `Merch Pipeline`
3. **Don't** check "Also set up Firebase Hosting" (we're using Vite)
4. Click "Register app"
5. Copy the Firebase configuration object that appears

## Step 3: Enable Authentication

1. In Firebase Console, go to **Authentication** → **Get started**
2. Click **Sign-in method** tab
3. Enable **Email/Password**:
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"

## Step 4: Set Up Firestore Database

1. In Firebase Console, go to **Firestore Database** → **Create database**
2. Choose **Start in test mode** (we'll add security rules next)
3. Select a location (choose closest to your users)
4. Click "Enable"

## Step 5: Configure Security Rules

1. In Firestore Database, go to the **Rules** tab
2. Replace the default rules with the rules from `SECURITY_RULES.md`
3. Click "Publish"

**Important**: The security rules in `SECURITY_RULES.md` are conceptual. For now, use test mode rules to get started, then update them based on your needs.

## Step 6: Create Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your Firebase config values from Step 2:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Step 7: Create Firestore Indexes (Optional but Recommended)

For better query performance, create these composite indexes in Firestore:

1. Go to Firestore → **Indexes** → **Create Index**

**Index 1: Products by Brand**
- Collection: `products`
- Fields: `brandId` (Ascending), `createdAt` (Descending)

**Index 2: Products by Project**
- Collection: `products`
- Fields: `projectId` (Ascending), `createdAt` (Descending)

**Index 3: Projects by Brand**
- Collection: `projects`
- Fields: `brandId` (Ascending), `createdAt` (Descending)

**Index 4: Brand Members**
- Collection: `brandMembers`
- Fields: `brandId` (Ascending), `userId` (Ascending)

**Index 5: Brand Invites**
- Collection: `brandInvites`
- Fields: `brandId` (Ascending), `status` (Ascending)

## Step 8: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173` (or your Vite port)

3. Try to sign up:
   - Go to `/signup`
   - Create an account with email/password
   - You should be redirected to dashboard

4. Check Firebase Console:
   - **Authentication** → Should see your new user
   - **Firestore Database** → Should see `userProfiles` collection with your profile

## Step 9: Create Your First Brand

1. After logging in, you'll be redirected to dashboard
2. If you have no brands, you'll be redirected to Settings
3. Create your first brand in the Brand Settings section

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure your `.env` file exists and has all required variables
- Restart your dev server after creating/updating `.env`

### "Missing or insufficient permissions"
- Check Firestore security rules
- Make sure you're authenticated
- Verify rules allow read/write for authenticated users

### "Network request failed"
- Check your internet connection
- Verify Firebase project is active
- Check browser console for specific error messages

### Environment variables not loading
- Make sure variable names start with `VITE_`
- Restart dev server after changing `.env`
- Check that `.env` is in project root (not in `src/`)

## Next Steps

1. **Set up Storage** (optional, for logo uploads):
   - Go to Firebase Console → Storage → Get started
   - Start in test mode
   - Update security rules to allow authenticated uploads

2. **Configure Custom Domain** (optional):
   - In Authentication → Settings → Authorized domains
   - Add your production domain

3. **Set up Production Environment**:
   - Create a separate Firebase project for production
   - Use different `.env` files for dev/prod
   - Update security rules for production

4. **Enable Email Verification** (optional):
   - In Authentication → Settings → Templates
   - Customize email verification template

## Security Rules Quick Start

For development, you can use these permissive rules (NOT for production):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Important**: Replace with proper rules from `SECURITY_RULES.md` before going to production!
