import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from './config'
import type { UserProfile } from '@/types'

function getFriendlyErrorMessage(error: any): string {
  const code = error.code || ''
  const message = error.message || ''
  
  // Firebase Auth error codes
  if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
    return 'No account found with this email address. Please check your email or sign up.'
  }
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Incorrect password. Please try again or reset your password.'
  }
  if (code === 'auth/user-disabled') {
    return 'This account has been disabled. Please contact support.'
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many failed login attempts. Please try again later.'
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error. Please check your internet connection and try again.'
  }
  if (code === 'auth/invalid-api-key' || code === 'auth/api-key-not-valid') {
    return 'Authentication service error. Please contact support.'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password authentication is not enabled. Please contact support.'
  }
  if (message.includes('400') || message.includes('Bad Request')) {
    // Check if it's a configuration issue
    if (message.includes('OPERATION_NOT_ALLOWED') || code === 'auth/operation-not-allowed') {
      return 'Email/Password authentication is not enabled in Firebase. Please enable it in Firebase Console → Authentication → Sign-in method.'
    }
    return 'Invalid email or password. Please check your credentials and try again. If this persists, Email/Password authentication may not be enabled in Firebase Console.'
  }
  
  // Return original message if we can't parse it
  return message || 'Failed to sign in. Please try again.'
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error: any) {
    // Log full error details for debugging - expanded format
    console.error('=== FIREBASE AUTH ERROR ===')
    console.error('Error Code:', error.code)
    console.error('Error Message:', error.message)
    console.error('Full Error Object:', error)
    console.error('Email Attempted:', email)
    console.error('Auth Domain:', auth.config?.authDomain || 'not set')
    console.error('API Key (first 10 chars):', auth.config?.apiKey ? `${auth.config.apiKey.substring(0, 10)}...` : 'not set')
    console.error('Project ID:', (auth.app.options as any)?.projectId || 'not set')
    
    // Try to extract more details from the error
    if (error.customData) {
      console.error('Custom Data:', error.customData)
    }
    if (error.stack) {
      console.error('Stack Trace:', error.stack)
    }
    console.error('========================')
    
    const friendlyMessage = getFriendlyErrorMessage(error)
    throw new Error(friendlyMessage)
  }
}

function getFriendlySignupErrorMessage(error: any): string {
  const code = error.code || ''
  const message = error.message || ''
  
  // Firebase Auth error codes
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please sign in instead.'
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.'
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 6 characters.'
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error. Please check your internet connection and try again.'
  }
  if (code === 'auth/invalid-api-key' || code === 'auth/api-key-not-valid') {
    return 'Authentication service error. Please contact support.'
  }
  if (message.includes('400') || message.includes('Bad Request')) {
    return 'Invalid information provided. Please check your email and password.'
  }
  
  // Return original message if we can't parse it
  return message || 'Failed to create account. Please try again.'
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    )
    const user = userCredential.user

    const profile: Omit<UserProfile, 'id' | 'createdAt'> = {
      email,
      displayName,
    }

    const docRef = doc(db, 'userProfiles', user.uid)
    await setDoc(docRef, {
      ...profile,
      createdAt: Timestamp.now(),
    })

    return user
  } catch (error: any) {
    const friendlyMessage = getFriendlySignupErrorMessage(error)
    throw new Error(friendlyMessage)
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth)
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign out')
  }
}

export function onAuthChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback)
}

export function getCurrentUser(): User | null {
  return auth.currentUser
}

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error: any) {
    // Handle specific error cases
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.')
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.')
    }
    if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many password reset requests. Please try again later.')
    }
    throw new Error(error.message || 'Failed to send password reset email.')
  }
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const provider = new GoogleAuthProvider()
    const userCredential = await signInWithPopup(auth, provider)
    const user = userCredential.user

    // Check if user profile exists, create if it doesn't
    const profileRef = doc(db, 'userProfiles', user.uid)
    const profileSnap = await getDoc(profileRef)

    if (!profileSnap.exists()) {
      // Create user profile for Google sign-in
      const profile: Omit<UserProfile, 'id' | 'createdAt'> = {
        email: user.email || '',
        displayName: user.displayName || user.email || 'User',
        avatarUrl: user.photoURL || undefined,
      }

      await setDoc(profileRef, {
        ...profile,
        createdAt: Timestamp.now(),
      })
    } else {
      // Update avatar URL if it's not set but Google provides one
      const existingProfile = profileSnap.data() as UserProfile
      if (!existingProfile.avatarUrl && user.photoURL) {
        await setDoc(profileRef, {
          avatarUrl: user.photoURL,
        }, { merge: true })
      }
    }

    return user
  } catch (error: any) {
    // Handle popup closed by user
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled')
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked. Please allow popups for this site.')
    }
    const friendlyMessage = getFriendlyErrorMessage(error)
    throw new Error(friendlyMessage)
  }
}
