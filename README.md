# Merch Pipeline

A multi-tenant merchandising pipeline tool for e-commerce brands to track products from warehouse arrival through photo shoots to going live on site.

## Tech Stack

- **Vue 3** + **TypeScript** - Frontend framework
- **Firebase** - Backend (Auth, Firestore, Storage)
- **Tailwind CSS** - Styling
- **Pinia** - State management
- **Vue Router** - Navigation

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Firebase

**Follow the quick start guide**: See `FIREBASE_QUICK_START.md` for step-by-step instructions.

Quick version:
1. Create Firebase project at https://console.firebase.google.com/
2. Enable Email/Password authentication
3. Create Firestore database (test mode)
4. Copy `.env.example` to `.env` and fill in your Firebase config values

### 3. Start Development Server

```bash
npm run dev
```

### 4. Create Your Account

1. Navigate to `http://localhost:5173`
2. Click "Sign up"
3. Create your account
4. Create your first brand in Settings

## Project Structure

```
src/
├── components/     # Vue components
├── composables/   # Composition API utilities
├── firebase/      # Firebase configuration and services
├── router/        # Vue Router configuration
├── stores/        # Pinia stores
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── views/         # Page components
```

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Features

- ✅ User authentication (signup/login)
- ✅ Multi-tenant brand management
- ✅ Project management (seasonal collections)
- ✅ Product pipeline tracking (6 stages)
- ✅ Kanban board with drag-and-drop
- ✅ Calendar view for go-live dates
- ✅ Photo queue for photographers
- ✅ Bulk product upload via CSV
- ✅ Member invitations
- ✅ Responsive design
- ✅ Accessibility features

## Documentation

- `FIREBASE_QUICK_START.md` - Quick Firebase setup guide
- `FIREBASE_SETUP.md` - Detailed Firebase setup
- `SECURITY_RULES.md` - Firestore security rules
- `POLISH_SUMMARY.md` - UI/UX polish features

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## License

Private project
