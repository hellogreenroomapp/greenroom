# Firebase Setup Checklist

Follow these steps in order to get your app running:

## ✅ Step 1: Create Firebase Project (5 min)

- [ ] Go to https://console.firebase.google.com/
- [ ] Click "Add project" or "Create a project"
- [ ] Enter project name (e.g., "merch-pipeline")
- [ ] Click "Continue"
- [ ] Disable Google Analytics (optional)
- [ ] Click "Create project"
- [ ] Wait for creation, then click "Continue"

## ✅ Step 2: Add Web App (2 min)

- [ ] In Firebase Console, click the web icon (`</>`)
- [ ] App nickname: "Merch Pipeline Web"
- [ ] **Don't** check "Also set up Firebase Hosting"
- [ ] Click "Register app"
- [ ] **Copy the firebaseConfig object** - you'll need these 6 values!

The config looks like this:
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

## ✅ Step 3: Enable Authentication (1 min)

- [ ] In Firebase Console, click **Authentication** in left sidebar
- [ ] Click **Get started** (if first time)
- [ ] Click **Sign-in method** tab
- [ ] Click **Email/Password**
- [ ] Toggle **Enable** to ON
- [ ] Click **Save**

## ✅ Step 4: Create Firestore Database (2 min)

- [ ] In Firebase Console, click **Firestore Database** in left sidebar
- [ ] Click **Create database**
- [ ] Select **Start in test mode** (we'll secure it later)
- [ ] Choose a location (pick closest to you)
- [ ] Click **Enable**

## ✅ Step 5: Create .env File (2 min)

- [ ] In your project root, create a file named `.env`
- [ ] Copy the template below and fill in your values from Step 2:

```env
VITE_FIREBASE_API_KEY=AIza... (paste your apiKey here)
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Important Notes:**
- Replace ALL placeholder values with your actual Firebase config values
- Don't include quotes around values
- No spaces around the `=` sign
- Make sure `.env` is in the project root (same folder as `package.json`)

## ✅ Step 6: Start the App (1 min)

- [ ] Open terminal in project directory
- [ ] Run: `npm run dev`
- [ ] Wait for server to start
- [ ] Open the URL shown (usually http://localhost:5173)

## ✅ Step 7: Create Your Account (1 min)

- [ ] Click "Sign up" on the login page
- [ ] Enter:
  - Display Name: Your name
  - Email: your email address
  - Password: (at least 6 characters)
  - Confirm Password: (same as password)
- [ ] Click "Sign up"
- [ ] You should be redirected to dashboard!

## ✅ Step 8: Verify Setup

Check Firebase Console to confirm:

- [ ] **Authentication** → **Users** → Should see your email
- [ ] **Firestore Database** → **Data** → Should see `userProfiles` collection
- [ ] Your user profile document should exist with your display name

## ✅ Step 9: Create Your First Brand

- [ ] After logging in, go to **Settings** (gear icon in sidebar)
- [ ] In Brand Settings section, create your first brand
- [ ] Enter brand name and slug
- [ ] Click "Save"
- [ ] You should now see your brand in the brand selector!

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
**Fix:**
1. Check `.env` file exists in project root
2. Verify all 6 variables are set
3. Make sure variable names start with `VITE_`
4. Restart dev server: Stop (Ctrl+C) and run `npm run dev` again

### "Missing or insufficient permissions"
**Fix:**
1. Go to Firestore → Rules tab
2. Replace with test mode rules:
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
3. Click "Publish"

### Variables not loading
**Fix:**
- Make sure `.env` is in root directory (not in `src/`)
- Restart dev server after creating/editing `.env`
- Check for typos in variable names

### Can't sign up
**Fix:**
- Make sure Email/Password auth is enabled in Firebase Console
- Check browser console for specific error messages
- Verify password is at least 6 characters

## Next Steps

Once you're logged in:
1. Create your first brand in Settings
2. Create a project for that brand
3. Add products to the pipeline
4. Start tracking your merchandising workflow!

## Need Help?

- See `FIREBASE_QUICK_START.md` for detailed instructions
- See `FIREBASE_SETUP.md` for advanced configuration
- Check browser console for error messages
- Firebase Docs: https://firebase.google.com/docs
