# Getting Started with Merch Pipeline

Welcome! This guide will help you set up Firebase and get your first account created.

## Quick Start (15 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Firebase

**Option A: Follow the Quick Guide**
- Open `FIREBASE_QUICK_START.md` and follow the steps
- Takes about 10 minutes

**Option B: Use the Checklist**
- Open `SETUP_CHECKLIST.md` and check off each step
- More detailed, step-by-step

### 3. Create Your .env File

After setting up Firebase, create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then edit `.env` and fill in your Firebase config values.

### 4. Start the App

```bash
npm run dev
```

### 5. Create Your Account

1. Navigate to the URL shown (usually `http://localhost:5173`)
2. Click "Sign up"
3. Fill in your details
4. Click "Sign up"
5. You're in! 🎉

## What You'll See

### If Firebase is NOT configured:
- A yellow warning banner will appear (bottom right)
- Console will show helpful error messages
- Follow the setup guides to fix

### If Firebase IS configured:
- Login/Signup pages work normally
- You can create an account
- After signup, you'll be redirected to dashboard

## First Steps After Login

1. **Create a Brand**
   - Go to Settings (gear icon)
   - Create your first brand
   - This is your "workspace"

2. **Create a Project**
   - Go to Projects page
   - Click "New Project"
   - Add a seasonal collection (e.g., "Spring 2026")

3. **Add Products**
   - Go to Pipeline page
   - Click "Add Product"
   - Or use Bulk Upload for multiple products

4. **Start Tracking**
   - Drag products between pipeline stages
   - View calendar for go-live dates
   - Check photo queue for today's shoots

## Common First-Time Issues

### "Firebase not configured" warning
**Solution**: Create `.env` file with your Firebase config (see Step 3 above)

### Can't sign up
**Solution**: 
- Check Email/Password auth is enabled in Firebase Console
- Verify `.env` file has all 6 variables set
- Restart dev server

### "Insufficient permissions" error
**Solution**: Set Firestore rules to test mode (see `SETUP_CHECKLIST.md` Step 4)

### Blank page or errors
**Solution**:
- Check browser console for errors
- Verify `.env` file is in project root
- Make sure all Firebase services are enabled

## Need Help?

- **Quick Setup**: `FIREBASE_QUICK_START.md`
- **Detailed Setup**: `FIREBASE_SETUP.md`
- **Step-by-Step**: `SETUP_CHECKLIST.md`
- **Security Rules**: `SECURITY_RULES.md`

## Firebase Console Links

- **Main Console**: https://console.firebase.google.com/
- **Authentication**: https://console.firebase.google.com/project/_/authentication
- **Firestore**: https://console.firebase.google.com/project/_/firestore

## Next Steps

Once you're set up:
1. Create your first brand
2. Add team members via invitations
3. Set up projects for different seasons
4. Start tracking products through the pipeline!

Happy tracking! 🚀
