import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value || value.includes('your-'))
  .map(([key]) => key)

if (missingVars.length > 0) {
  console.error('Missing Firebase environment variables:', missingVars)
  console.error('Please create a .env file with your Firebase configuration.')
  console.error('See FIREBASE_QUICK_START.md for setup instructions.')
}

export const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey || '',
  authDomain: requiredEnvVars.authDomain || '',
  projectId: requiredEnvVars.projectId || '',
  storageBucket: requiredEnvVars.storageBucket || '',
  messagingSenderId: requiredEnvVars.messagingSenderId || '',
  appId: requiredEnvVars.appId || '',
}

let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage

try {
  if (missingVars.length === 0) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)
    
    // Log Firebase configuration for debugging
    console.log('=== FIREBASE CONFIGURATION ===')
    console.log('Project ID:', firebaseConfig.projectId)
    console.log('Auth Domain:', firebaseConfig.authDomain)
    console.log('API Key:', firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'not set')
    if (typeof window !== 'undefined') {
      console.log('Current Host:', window.location.hostname)
    }
    console.log('============================')
  } else {
    console.warn('Firebase not fully configured. Some features may not work.')
    console.warn('Missing variables:', missingVars.join(', '))
    console.warn('See FIREBASE_QUICK_START.md for setup instructions.')
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error)
  if (missingVars.length > 0) {
    console.error('Please check your .env file and ensure all Firebase variables are set.')
    console.error('See FIREBASE_QUICK_START.md for setup instructions.')
  }
  throw error
}

export { app, auth, db, storage }
