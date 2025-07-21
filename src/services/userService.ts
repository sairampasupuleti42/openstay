import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, query, limit, where, getDoc, setDoc } from 'firebase/firestore';
import { cleanFirestoreData } from '@/lib/firestoreUtils';
import type { User } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  occupation?: string;
  interests?: string[];
  languages?: string[];
  verified?: boolean;
  rating?: number;
  reviewCount?: number;
  responseRate?: number;
  responseTime?: string;
  hostingSince?: Date;
  followers?: string[];
  following?: string[];
  createdAt: Date;
  updatedAt?: Date;
  isOnboardingComplete?: boolean;
  emailVerified?: boolean;
  travelPreferences?: {
    travelStyle: string;
    budget: string;
    accommodation: string;
    activities: string[];
  };
}

export interface PersonalInfo {
  bio: string;
  location: string;
  occupation: string;
  interests: string[];
}

export interface TravelPreferences {
  travelStyle: string;
  budget: string;
  accommodation: string;
  activities: string[];
}

// Get user profile
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        hostingSince: data.hostingSince?.toDate() || new Date(),
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Update personal information during onboarding
export const updatePersonalInfo = async (userId: string, personalInfo: PersonalInfo): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    bio: personalInfo.bio,
    location: personalInfo.location,
    occupation: personalInfo.occupation,
    interests: personalInfo.interests,
    updatedAt: new Date()
  });
};

// Update travel preferences during onboarding
export const updateTravelPreferences = async (userId: string, preferences: TravelPreferences): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    travelPreferences: preferences,
    updatedAt: new Date()
  });
};

// Create or update user profile
export const createUserProfile = async (user: User, additionalData: Partial<UserProfile> = {}): Promise<void> => {
  const userRef = doc(db, 'users', user.uid);
  
  const userData: Partial<UserProfile> = {
    uid: user.uid,
    displayName: user.displayName || 'User',
    email: user.email || '',
    ...(user.photoURL && { photoURL: user.photoURL }), // Only include if not null/undefined
    firstName: user.displayName?.split(' ')[0] || '',
    lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
    bio: '',
    location: '',
    occupation: '',
    interests: [],
    languages: [],
    verified: false,
    rating: 0,
    reviewCount: 0,
    responseRate: 0,
    responseTime: 'N/A',
    hostingSince: new Date(),
    followers: [],
    following: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isOnboardingComplete: false,
    emailVerified: user.emailVerified || false,
    travelPreferences: {
      travelStyle: '',
      budget: '',
      accommodation: '',
      activities: []
    },
    ...additionalData
  };

  // Clean the data to remove any undefined values
  const cleanData = cleanFirestoreData(userData);
  await setDoc(userRef, cleanData);
};

// Ensure user profile exists (create if it doesn't)
export const ensureUserProfile = async (user: User): Promise<void> => {
  try {
    const userProfile = await getUserProfile(user.uid);
    if (!userProfile) {
      // Profile doesn't exist, create it
      await createUserProfile(user);
    }
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    // Try to create the profile
    await createUserProfile(user);
  }
};

// Get random users for suggestions
export const getRandomUsers = async (currentUserId: string, count: number = 10): Promise<UserProfile[]> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('uid', '!=', currentUserId),
      limit(count * 2) // Get more than needed to filter out
    );
    
    const querySnapshot = await getDocs(q);
    const users: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data() as UserProfile;
      users.push(userData);
    });

    // Shuffle and return limited count
    const shuffled = users.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  } catch (error) {
    console.error('Error fetching random users:', error);
    return [];
  }
};

// Follow a user
export const followUser = async (currentUserId: string, targetUserId: string): Promise<void> => {
  const currentUserRef = doc(db, 'users', currentUserId);
  const targetUserRef = doc(db, 'users', targetUserId);

  // Add to current user's following list
  await updateDoc(currentUserRef, {
    following: arrayUnion(targetUserId)
  });

  // Add to target user's followers list
  await updateDoc(targetUserRef, {
    followers: arrayUnion(currentUserId)
  });
};

// Unfollow a user
export const unfollowUser = async (currentUserId: string, targetUserId: string): Promise<void> => {
  const currentUserRef = doc(db, 'users', currentUserId);
  const targetUserRef = doc(db, 'users', targetUserId);

  // Remove from current user's following list
  await updateDoc(currentUserRef, {
    following: arrayRemove(targetUserId)
  });

  // Remove from target user's followers list
  await updateDoc(targetUserRef, {
    followers: arrayRemove(currentUserId)
  });
};

// Complete onboarding
export const completeOnboarding = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    isOnboardingComplete: true,
    updatedAt: new Date()
  });
};

// Update profile picture
export const updateProfilePicture = async (userId: string, photoURL: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    photoURL: photoURL,
    updatedAt: new Date()
  });
};
