import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Test Firestore connection and permissions
export const testFirestoreConnection = async (): Promise<boolean> => {
  try {
    if (!auth.currentUser) {
      console.log('No authenticated user');
      return false;
    }

    const testDoc = doc(db, 'test_collection', 'test_doc');
    
    // Try to write a test document
    await setDoc(testDoc, {
      message: 'Test connection',
      timestamp: new Date(),
      userId: auth.currentUser.uid
    });

    // Try to read the test document
    const docSnap = await getDoc(testDoc);
    
    if (docSnap.exists()) {
      console.log('Firestore connection test successful');
      return true;
    } else {
      console.log('Firestore read test failed');
      return false;
    }
  } catch (error) {
    console.error('Firestore connection test failed:', error);
    return false;
  }
};

// Test user document creation specifically
export const testUserDocumentCreation = async (): Promise<boolean> => {
  try {
    if (!auth.currentUser) {
      console.log('No authenticated user for user document test');
      return false;
    }

    const userDoc = doc(db, 'users', auth.currentUser.uid);
    
    // Try to create/update user document
    await setDoc(userDoc, {
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName || 'Test User',
      email: auth.currentUser.email,
      testField: 'This is a test',
      timestamp: new Date()
    }, { merge: true });

    console.log('User document creation test successful');
    return true;
  } catch (error) {
    console.error('User document creation test failed:', error);
    return false;
  }
};
