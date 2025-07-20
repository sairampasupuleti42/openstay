import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, enableNetwork } from 'firebase/firestore';

// Test Firebase connection with detailed diagnostics
export const testFirebaseConnection = async () => {
  try {
    console.log('🔍 Starting comprehensive Firebase connection test...');
    
    // Test 1: Check if db instance exists
    console.log('📊 DB Instance:', db);
    console.log('📊 DB App:', db.app);
    console.log('📊 Environment:', import.meta.env.MODE);
    
    // Test 2: Check network connectivity
    console.log('🌐 Testing network connectivity...');
    try {
      await enableNetwork(db);
      console.log('✅ Network enabled successfully');
    } catch (networkError) {
      console.warn('⚠️ Network enable warning:', networkError);
    }
    
    // Test 3: Try to add a test document with detailed logging
    console.log('📝 Attempting to write test document...');
    const testDoc = await addDoc(collection(db, 'test_collection'), {
      message: 'Test connection',
      timestamp: new Date().toISOString(),
      testId: `test_${Date.now()}`,
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    console.log('✅ Successfully added test document with ID:', testDoc.id);
    
    // Test 4: Try to read from the test collection
    console.log('📖 Attempting to read test documents...');
    const querySnapshot = await getDocs(collection(db, 'test_collection'));
    console.log('✅ Successfully read documents. Count:', querySnapshot.size);
    
    return { 
      success: true, 
      message: 'Firebase connection successful',
      testDocId: testDoc.id,
      documentCount: querySnapshot.size
    };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string; name?: string };
    console.error('❌ Firebase connection failed:', error);
    console.error('❌ Error details:', {
      code: firebaseError.code,
      message: firebaseError.message,
      name: firebaseError.name,
      fullError: error
    });
    
    // Check for specific WebChannel errors
    if (firebaseError.message?.includes('WebChannelConnection') || 
        firebaseError.message?.includes('transport errored')) {
      console.error('🚨 WebChannel transport error detected');
      console.error('💡 This usually indicates:');
      console.error('   - Network connectivity issues');
      console.error('   - Firestore service unavailable');
      console.error('   - Browser blocking the connection');
      console.error('   - CORS or security policy issues');
    }
    
    return { 
      success: false, 
      error: firebaseError.code || 'unknown',
      message: firebaseError.message || 'Unknown error',
      isWebChannelError: firebaseError.message?.includes('WebChannelConnection') || false
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
