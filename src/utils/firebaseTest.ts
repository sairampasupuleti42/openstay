import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// Test Firebase connection
export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...');
    
    // Test 1: Try to add a test document
    const testDoc = await addDoc(collection(db, 'test_collection'), {
      message: 'Test connection',
      timestamp: new Date().toISOString(),
    });
    
    console.log('✅ Successfully added test document with ID:', testDoc.id);
    
    // Test 2: Try to read from the test collection
    const querySnapshot = await getDocs(collection(db, 'test_collection'));
    console.log('✅ Successfully read documents. Count:', querySnapshot.size);
    
    return { success: true, message: 'Firebase connection successful' };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('❌ Firebase connection failed:', error);
    return { 
      success: false, 
      error: firebaseError.code || 'unknown',
      message: firebaseError.message || 'Unknown error'
    };
  }
};

// Test specifically the contacts collection
export const testContactsCollection = async () => {
  try {
    console.log('Testing contacts_messages collection...');
    
    const testContact = {
      name: 'Test User',
      email: 'test@example.com',
      subject: 'Test Subject',
      message: 'This is a test message',
      timestamp: new Date().toISOString(),
      status: 'test',
    };
    
    const docRef = await addDoc(collection(db, 'contacts_messages'), testContact);
    console.log('✅ Successfully added contact test document with ID:', docRef.id);
    
    return { success: true, docId: docRef.id };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('❌ Contacts collection test failed:', error);
    return { 
      success: false, 
      error: firebaseError.code || 'unknown',
      message: firebaseError.message || 'Unknown error'
    };
  }
};
