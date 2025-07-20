import { db } from '@/lib/firebase';
import { enableNetwork, clearIndexedDbPersistence } from 'firebase/firestore';

// Fix WebChannel connection issues
export const fixFirestoreConnection = async () => {
  try {
    console.log('🔧 Attempting to fix Firestore connection...');
    
    // Method 1: Clear IndexedDB persistence (helps with caching issues)
    try {
      await clearIndexedDbPersistence(db);
      console.log('✅ Cleared Firestore persistence cache');
    } catch (error) {
      console.log('ℹ️ Persistence clear not needed or failed:', error);
    }
    
    // Method 2: Ensure network is enabled
    try {
      await enableNetwork(db);
      console.log('✅ Network enabled for Firestore');
    } catch (error) {
      console.log('ℹ️ Network enable failed or not needed:', error);
    }
    
    return { success: true, message: 'Connection fix attempts completed' };
  } catch (error) {
    console.error('❌ Connection fix failed:', error);
    return { success: false, error };
  }
};

// Check if we're in development and using emulator
export const checkFirestoreConfig = () => {
  const config = {
    environment: import.meta.env.MODE,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    isLocalhost: window.location.hostname === 'localhost',
    isEmulator: false // We'll detect this if needed
  };
  
  console.log('🔍 Firestore Configuration:', config);
  
  // Recommendations based on environment
  if (config.environment === 'development' && config.isLocalhost) {
    console.log('💡 Development environment detected');
    console.log('💡 If experiencing connection issues, consider:');
    console.log('   1. Checking if Firestore emulator is running');
    console.log('   2. Verifying internet connection');
    console.log('   3. Checking browser console for CORS errors');
  }
  
  return config;
};

// Retry mechanism for Firestore operations
export const retryFirestoreOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}`);
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`❌ Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError;
};
