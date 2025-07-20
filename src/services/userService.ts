import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, query, limit, where } from 'firebase/firestore';
import type { User } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  followers?: string[];
  following?: string[];
  createdAt: string;
  isOnboardingComplete?: boolean;
}

// Create or update user profile
export const createUserProfile = async (user: User, additionalData: Partial<UserProfile> = {}): Promise<void> => {
  const userRef = doc(db, 'users', user.uid);
  
  const userData: Partial<UserProfile> = {
    uid: user.uid,
    displayName: user.displayName || 'User',
    email: user.email || '',
    photoURL: user.photoURL || undefined,
    followers: [],
    following: [],
    createdAt: new Date().toISOString(),
    isOnboardingComplete: false,
    ...additionalData
  };

  await updateDoc(userRef, userData);
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
    isOnboardingComplete: true
  });
};

// Update profile picture
export const updateProfilePicture = async (userId: string, photoURL: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    photoURL: photoURL
  });
};
