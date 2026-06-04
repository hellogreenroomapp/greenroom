# Firebase Quick Start - Step by Step

Follow these steps to get Firebase set up and start using the app.

## 1. Create Firebase Project (5 minutes)

1. Visit: https://console.firebase.google.com/
2. Click **"Add project"** or **"Create a project"**
3. Project name: `merch-planner` (or any name you prefer)
4. Click **Continue**
5. **Disable** Google Analytics (optional - you can enable later)
6. Click **Create project**
7. Wait for project creation, then click **Continue**

## 2. Add Web App (2 minutes)

1. In your Firebase project dashboard, click the **web icon** (`</>`)
2. App nickname: `Merch Planner Web`
3. **Don't** check "Also set up Firebase Hosting"
4. Click **Register app**
5. **Copy the `firebaseConfig` object** - you'll need these values!

It looks like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## 3. Enable Email/Password Auth (1 minute)

1. In Firebase Console, click **Authentication** in left sidebar
2. Click **Get started** (if first time)
3. Click **Sign-in method** tab
4. Click **Email/Password**
5. Toggle **Enable** to ON
6. Click **Save**

## 4. Create Firestore Database (2 minutes)

1. In Firebase Console, click **Firestore Database** in left sidebar
2. Click **Create database**
3. Select **Start in test mode** (we'll secure it later)
4. Choose a location (pick closest to you)
5. Click **Enable**

## 5. Create .env File (2 minutes)

1. In your project root, create a file named `.env` (not `.env.example`)
2. Copy this template and fill in your values from Step 2:

```env
VITE_FIREBASE_API_KEY=AIza... (from firebaseConfig.apiKey)
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Important**: 
- Replace all the placeholder values with your actual Firebase config values
- Don't include quotes around the values
- Make sure there are no spaces around the `=` sign

## 6. Start the App (1 minute)

1. Make sure you're in the project directory
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Open the URL shown (usually `http://localhost:5173`)

## 7. Create Your First Account (1 minute)

1. Click **Sign Up** (or navigate to `/signup`)
2. Enter:
   - Email: your email address
   - Password: (at least 6 characters)
   - Display Name: your name
3. Click **Sign Up**
4. You should be redirected to the dashboard!

## 8. Verify It Worked

Check Firebase Console:
- **Authentication** → Users → Should see your email
- **Firestore Database** → Data → Should see `userProfiles` collection with your profile

## Common Issues

### "Firebase: Error (auth/configuration-not-found)"
**Solution**: 
- Make sure `.env` file exists in project root
- Check all 6 environment variables are set
- Restart dev server: Stop (Ctrl+C) and run `npm run dev` again

### "Missing or insufficient permissions"
**Solution**: 
- Go to Firestore → Rules tab
- Make sure rules allow authenticated users:
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
- Click "Publish"

### Variables not loading
**Solution**:
- Make sure variable names start with `VITE_`
- Restart dev server after creating/editing `.env`
- Check `.env` is in root directory, not in `src/`

## Next: Create Your First Brand

After logging in:
1. You'll be redirected to Dashboard
2. If you have no brands, you'll see a message to create one
3. Go to Settings (gear icon in sidebar)
4. Create your first brand!

## Need Help?

- Check `FIREBASE_SETUP.md` for detailed setup
- Check `SECURITY_RULES.md` for production security rules
- Firebase Docs: https://firebase.google.com/docs
