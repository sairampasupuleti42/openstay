/**
 * Utility functions for Firebase Firestore operations
 */

/**
 * Removes undefined values from an object before saving to Firestore
 * Firebase doesn't allow undefined values in documents
 */
export const cleanFirestoreData = (data: Record<string, unknown>): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Recursively clean nested objects
        const cleanedNested = cleanFirestoreData(value as Record<string, unknown>);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
};

/**
 * Validates and cleans user profile data before saving to Firestore
 */
export const cleanUserProfileData = (data: Record<string, unknown>): Record<string, unknown> => {
  return cleanFirestoreData(data);
};
