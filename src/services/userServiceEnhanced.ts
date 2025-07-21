import { 
  db, 
  auth,
  storage 
} from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  arrayUnion, 
  arrayRemove,
  Timestamp,
  GeoPoint
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import type { User } from 'firebase/auth';

// Enhanced user profile interface
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  
  // Personal Information
  bio?: string;
  location?: string;
  occupation?: string;
  interests?: string[];
  
  // Travel Preferences
  travelStyle?: string;
  budgetRange?: string;
  accommodationTypes?: string[];
  preferredActivities?: string[];
  
  // Social & Community
  followers?: string[];
  following?: string[];
  isHost?: boolean;
  hostRating?: number;
  guestRating?: number;
  totalReviews?: number;
  
  // Profile Management
  profileComplete?: boolean;
  isOnboardingComplete?: boolean;
  verified?: boolean;
  lastActive?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Hosting Information (if applicable)
  hostingInfo?: {
    maxGuests: number;
    propertyType: string;
    amenities: string[];
    houseRules: string[];
    responseRate: number;
    responseTime: string;
  };
  
  // Location data
  coordinates?: GeoPoint;
  
  // Privacy settings
  privacy?: {
    showEmail: boolean;
    showLocation: boolean;
    allowMessages: boolean;
    searchable: boolean;
  };
}

export interface OnboardingData {
  personalInfo: {
    bio: string;
    location: string;
    occupation: string;
    interests: string[];
  };
  travelPreferences: {
    travelStyle: string;
    budgetRange: string;
    accommodationTypes: string[];
    preferredActivities: string[];
  };
  userDiscovery: {
    followUsers: string[];
  };
}

class UserService {
  // Create or update user profile during initial signup
  async createUserProfile(user: User, additionalData: Partial<UserProfile> = {}): Promise<void> {
    try {
      const userRef = doc(db, 'users', user.uid);
      
      const userData: UserProfile = {
        uid: user.uid,
        displayName: user.displayName || 'User',
        email: user.email || '',
        photoURL: user.photoURL || undefined,
        bio: '',
        location: '',
        occupation: '',
        interests: [],
        travelStyle: '',
        budgetRange: '',
        accommodationTypes: [],
        preferredActivities: [],
        followers: [],
        following: [],
        isHost: false,
        hostRating: 0,
        guestRating: 0,
        totalReviews: 0,
        profileComplete: false,
        isOnboardingComplete: false,
        verified: false,
        lastActive: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        privacy: {
          showEmail: false,
          showLocation: true,
          allowMessages: true,
          searchable: true
        },
        ...additionalData
      };

      await setDoc(userRef, userData);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastActive: data.lastActive?.toDate() || new Date()
        } as UserProfile;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await updateDoc(userRef, updateData);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Complete onboarding process
  async completeOnboarding(userId: string, onboardingData: OnboardingData): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      
      const updates: Partial<UserProfile> = {
        bio: onboardingData.personalInfo.bio,
        location: onboardingData.personalInfo.location,
        occupation: onboardingData.personalInfo.occupation,
        interests: onboardingData.personalInfo.interests,
        travelStyle: onboardingData.travelPreferences.travelStyle,
        budgetRange: onboardingData.travelPreferences.budgetRange,
        accommodationTypes: onboardingData.travelPreferences.accommodationTypes,
        preferredActivities: onboardingData.travelPreferences.preferredActivities,
        isOnboardingComplete: true,
        profileComplete: true,
        updatedAt: new Date()
      };

      await updateDoc(userRef, updates);

      // Follow selected users
      if (onboardingData.userDiscovery.followUsers.length > 0) {
        await this.followMultipleUsers(userId, onboardingData.userDiscovery.followUsers);
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  }

  // Upload and update profile picture
  async updateProfilePicture(userId: string, file: File): Promise<string> {
    try {
      // Delete old profile picture if exists
      const currentUser = await this.getUserProfile(userId);
      if (currentUser?.photoURL) {
        try {
          const oldImageRef = ref(storage, currentUser.photoURL);
          await deleteObject(oldImageRef);
        } catch {
          console.log('Old image not found or already deleted');
        }
      }

      // Upload new picture
      const imageRef = ref(storage, `profile-pictures/${userId}/${Date.now()}`);
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update user profile
      await this.updateUserProfile(userId, { photoURL: downloadURL });

      return downloadURL;
    } catch (error) {
      console.error('Error updating profile picture:', error);
      throw error;
    }
  }

  // Follow/Unfollow functionality
  async followUser(currentUserId: string, targetUserId: string): Promise<void> {
    try {
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      await Promise.all([
        updateDoc(currentUserRef, {
          following: arrayUnion(targetUserId),
          updatedAt: Timestamp.now()
        }),
        updateDoc(targetUserRef, {
          followers: arrayUnion(currentUserId),
          updatedAt: Timestamp.now()
        })
      ]);
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  }

  async unfollowUser(currentUserId: string, targetUserId: string): Promise<void> {
    try {
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      await Promise.all([
        updateDoc(currentUserRef, {
          following: arrayRemove(targetUserId),
          updatedAt: Timestamp.now()
        }),
        updateDoc(targetUserRef, {
          followers: arrayRemove(currentUserId),
          updatedAt: Timestamp.now()
        })
      ]);
    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw error;
    }
  }

  async followMultipleUsers(currentUserId: string, targetUserIds: string[]): Promise<void> {
    try {
      const promises = targetUserIds.map(targetUserId => 
        this.followUser(currentUserId, targetUserId)
      );
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error following multiple users:', error);
      throw error;
    }
  }

  // Get suggested users for discovery
  async getSuggestedUsers(currentUserId: string, count: number = 20): Promise<UserProfile[]> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('uid', '!=', currentUserId),
        where('profileComplete', '==', true),
        where('privacy.searchable', '==', true),
        orderBy('totalReviews', 'desc'),
        limit(count * 2)
      );

      const querySnapshot = await getDocs(q);
      const users: UserProfile[] = [];

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        users.push({
          ...userData,
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
          lastActive: userData.lastActive?.toDate() || new Date()
        } as UserProfile);
      });

      // Shuffle and return requested count
      const shuffled = users.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    } catch (error) {
      console.error('Error getting suggested users:', error);
      return [];
    }
  }

  // Search users by various criteria
  async searchUsers(searchQuery: string, filters: {
    location?: string;
    interests?: string[];
    isHost?: boolean;
    travelStyle?: string;
  } = {}): Promise<UserProfile[]> {
    try {
      const usersRef = collection(db, 'users');
      const constraints = [
        where('profileComplete', '==', true),
        where('privacy.searchable', '==', true)
      ];

      // Add search constraints
      if (searchQuery) {
        constraints.push(where('displayName', '>=', searchQuery));
        constraints.push(where('displayName', '<=', searchQuery + '\uf8ff'));
      }

      if (filters.location) {
        constraints.push(where('location', '>=', filters.location));
        constraints.push(where('location', '<=', filters.location + '\uf8ff'));
      }

      if (filters.isHost !== undefined) {
        constraints.push(where('isHost', '==', filters.isHost));
      }

      if (filters.travelStyle) {
        constraints.push(where('travelStyle', '==', filters.travelStyle));
      }

      const q = query(usersRef, ...constraints, limit(50));
      const querySnapshot = await getDocs(q);
      const users: UserProfile[] = [];

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        users.push({
          ...userData,
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
          lastActive: userData.lastActive?.toDate() || new Date()
        } as UserProfile);
      });

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  // Get user's followers
  async getUserFollowers(userId: string): Promise<UserProfile[]> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile?.followers?.length) return [];

      const followerProfiles = await Promise.all(
        userProfile.followers.map(followerId => this.getUserProfile(followerId))
      );

      return followerProfiles.filter(profile => profile !== null) as UserProfile[];
    } catch (error) {
      console.error('Error getting user followers:', error);
      return [];
    }
  }

  // Get user's following
  async getUserFollowing(userId: string): Promise<UserProfile[]> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile?.following?.length) return [];

      const followingProfiles = await Promise.all(
        userProfile.following.map(followingId => this.getUserProfile(followingId))
      );

      return followingProfiles.filter(profile => profile !== null) as UserProfile[];
    } catch (error) {
      console.error('Error getting user following:', error);
      return [];
    }
  }

  // Update user's last active timestamp
  async updateLastActive(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        lastActive: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating last active:', error);
    }
  }

  // Delete user account
  async deleteUserAccount(userId: string): Promise<void> {
    try {
      // Delete profile picture from storage
      const userProfile = await this.getUserProfile(userId);
      if (userProfile?.photoURL) {
        try {
          const imageRef = ref(storage, userProfile.photoURL);
          await deleteObject(imageRef);
        } catch {
          console.log('Profile picture not found or already deleted');
        }
      }

      // Remove user from followers/following lists
      if (userProfile?.followers?.length) {
        await Promise.all(
          userProfile.followers.map(followerId => 
            this.unfollowUser(followerId, userId)
          )
        );
      }

      if (userProfile?.following?.length) {
        await Promise.all(
          userProfile.following.map(followingId => 
            this.unfollowUser(userId, followingId)
          )
        );
      }

      // Delete user document
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);

      // Delete Firebase Auth user
      if (auth.currentUser?.uid === userId) {
        await auth.currentUser.delete();
      }
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }
  }

  // Get users by IDs
  async getUsersByIds(userIds: string[]): Promise<UserProfile[]> {
    try {
      const userProfiles = await Promise.all(
        userIds.map(userId => this.getUserProfile(userId))
      );

      return userProfiles.filter(profile => profile !== null) as UserProfile[];
    } catch (error) {
      console.error('Error getting users by IDs:', error);
      return [];
    }
  }

  // Check if user exists
  async userExists(userId: string): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(userId);
      return userProfile !== null;
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false;
    }
  }

  // Update user privacy settings
  async updatePrivacySettings(userId: string, privacy: UserProfile['privacy']): Promise<void> {
    try {
      await this.updateUserProfile(userId, { privacy });
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
