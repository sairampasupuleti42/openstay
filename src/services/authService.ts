import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  type User
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { SignInFormData, SignUpFormData } from '@/schemas/authSchemas';

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Add required scopes for Google Sign-In
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Sign up with email and password
export const signUpWithEmailPassword = async (data: SignUpFormData): Promise<{ user: User | null; success: boolean; message: string }> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const user = userCredential.user;

    // Update user profile with name
    await updateProfile(user, {
      displayName: `${data.firstName} ${data.lastName}`
    });

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: `${data.firstName} ${data.lastName}`,
      email: user.email,
      photoURL: user.photoURL || null,
      firstName: data.firstName,
      lastName: data.lastName,
      followers: [],
      following: [],
      createdAt: new Date().toISOString(),
      isOnboardingComplete: false,
      emailVerified: false
    });

    // Send email verification
    await sendEmailVerification(user);

    return {
      user,
      success: true,
      message: 'Account created successfully! Please check your email to verify your account.'
    };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('Sign up error:', error);
    
    let message = 'Failed to create account. Please try again.';
    
    switch (firebaseError.code) {
      case 'auth/email-already-in-use':
        message = 'An account with this email already exists.';
        break;
      case 'auth/weak-password':
        message = 'Password is too weak. Please choose a stronger password.';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address.';
        break;
      case 'auth/operation-not-allowed':
        message = 'Email/password accounts are not enabled.';
        break;
    }

    return {
      user: null,
      success: false,
      message
    };
  }
};

// Sign in with email and password
export const signInWithEmailPassword = async (data: SignInFormData): Promise<{ user: User | null; success: boolean; message: string }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, data.emailOrPhone, data.password);
    return {
      user: userCredential.user,
      success: true,
      message: 'Signed in successfully!'
    };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('Sign in error:', error);
    
    let message = 'Failed to sign in. Please try again.';
    
    switch (firebaseError.code) {
      case 'auth/user-not-found':
        message = 'No account found with this email address.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password.';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address.';
        break;
      case 'auth/user-disabled':
        message = 'This account has been disabled.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later.';
        break;
    }

    return {
      user: null,
      success: false,
      message
    };
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<{ user: User | null; success: boolean; message: string }> => {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    const user = userCredential.user;

    // Check if this is a new user and create profile if needed
    const isNewUser = userCredential.user.metadata.creationTime === userCredential.user.metadata.lastSignInTime;
    
    if (isNewUser) {
      // Create user profile in Firestore for new Google users
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: user.displayName || 'User',
        email: user.email,
        photoURL: user.photoURL,
        followers: [],
        following: [],
        createdAt: new Date().toISOString(),
        isOnboardingComplete: false,
        emailVerified: user.emailVerified
      });
    }

    return {
      user: userCredential.user,
      success: true,
      message: 'Signed in with Google successfully!'
    };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('Google sign in error:', error);
    
    let message = 'Failed to sign in with Google. Please try again.';
    
    switch (firebaseError.code) {
      case 'auth/configuration-not-found':
        message = 'Google Sign-In is not properly configured. Please check Firebase Console settings.';
        break;
      case 'auth/account-exists-with-different-credential':
        message = 'An account already exists with the same email address but different sign-in credentials.';
        break;
      case 'auth/cancelled-popup-request':
        message = 'Sign in was cancelled.';
        break;
      case 'auth/popup-blocked':
        message = 'Pop-up was blocked by the browser. Please enable pop-ups and try again.';
        break;
      case 'auth/popup-closed-by-user':
        message = 'Sign in was cancelled.';
        break;
      case 'auth/unauthorized-domain':
        message = 'This domain is not authorized for Google Sign-In. Please add it to Firebase Console.';
        break;
    }

    return {
      user: null,
      success: false,
      message
    };
  }
};

// Sign out
export const signOutUser = async (): Promise<{ success: boolean; message: string }> => {
  try {
    await signOut(auth);
    return {
      success: true,
      message: 'Signed out successfully!'
    };
  } catch (error: unknown) {
    console.error('Sign out error:', error);
    return {
      success: false,
      message: 'Failed to sign out. Please try again.'
    };
  }
};

// Send password reset email
export const sendPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: 'Password reset email sent! Please check your inbox.'
    };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('Password reset error:', error);
    
    let message = 'Failed to send password reset email. Please try again.';
    
    switch (firebaseError.code) {
      case 'auth/user-not-found':
        message = 'No account found with this email address.';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address.';
        break;
    }

    return {
      success: false,
      message
    };
  }
};

// Resend email verification
export const resendEmailVerification = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return {
        success: false,
        message: 'No user signed in.'
      };
    }

    await sendEmailVerification(user);
    return {
      success: true,
      message: 'Verification email sent! Please check your inbox.'
    };
  } catch (error: unknown) {
    console.error('Email verification error:', error);
    return {
      success: false,
      message: 'Failed to send verification email. Please try again.'
    };
  }
};
