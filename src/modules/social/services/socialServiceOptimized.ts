import { 
  doc, 
  arrayUnion, 
  arrayRemove,
  Timestamp,
  writeBatch,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  documentId
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userService, type UserProfile } from '@/services/userServiceEnhanced';
import { notificationService } from './notificationService';

export interface FollowAction {
  userId: string;
  targetUserId: string;
  userName?: string;
  targetUserName?: string;
}

interface PendingRequest {
  resolve: (value: boolean) => void;
  reject: (error: Error) => void;
}

class OptimizedSocialService {
  private batchTimeout = 100; // 100ms batch window
  private pendingFollowChecks = new Map<string, PendingRequest[]>();
  private followCheckTimer: NodeJS.Timeout | null = null;
  
  // Request deduplication for user profiles
  private userProfileCache = new Map<string, { profile: UserProfile; timestamp: number }>();
  private profileCacheTimeout = 5 * 60 * 1000; // 5 minutes
  
  // Debounced operations
  private debounceTimeout = 300; // 300ms debounce
  private pendingOperations = new Map<string, NodeJS.Timeout>();

  // Optimized batch follow status checking
  async isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const batchKey = `${currentUserId}:${targetUserId}`;
      
      // Add to pending requests
      if (!this.pendingFollowChecks.has(batchKey)) {
        this.pendingFollowChecks.set(batchKey, []);
      }
      this.pendingFollowChecks.get(batchKey)!.push({ resolve, reject });
      
      // Set batch timer if not already set
      if (!this.followCheckTimer) {
        this.followCheckTimer = setTimeout(() => {
          this.processBatchedFollowChecks();
        }, this.batchTimeout);
      }
    });
  }

  private async processBatchedFollowChecks(): Promise<void> {
    const currentBatch = new Map(this.pendingFollowChecks);
    this.pendingFollowChecks.clear();
    this.followCheckTimer = null;

    try {
      // Group by currentUserId to minimize Firestore reads
      const userGroups = new Map<string, Set<string>>();
      
      for (const [batchKey] of currentBatch) {
        const [currentUserId, targetUserId] = batchKey.split(':');
        if (!userGroups.has(currentUserId)) {
          userGroups.set(currentUserId, new Set());
        }
        userGroups.get(currentUserId)!.add(targetUserId);
      }

      // Batch process each user's following checks
      for (const [currentUserId, targetUserIds] of userGroups) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUserId));
          const followingList = userDoc.data()?.following || [];
          
          // Resolve all pending requests for this user
          for (const targetUserId of targetUserIds) {
            const batchKey = `${currentUserId}:${targetUserId}`;
            const requests = currentBatch.get(batchKey) || [];
            const isFollowing = followingList.includes(targetUserId);
            
            requests.forEach(({ resolve }) => resolve(isFollowing));
          }
        } catch (error) {
          // Reject all pending requests for this user
          for (const targetUserId of targetUserIds) {
            const batchKey = `${currentUserId}:${targetUserId}`;
            const requests = currentBatch.get(batchKey) || [];
            requests.forEach(({ reject }) => reject(error));
          }
        }
      }
    } catch (error) {
      // Reject all remaining requests
      for (const requests of currentBatch.values()) {
        requests.forEach(({ reject }) => reject(error));
      }
    }
  }

  // Optimized follow with batch operations
  async followUser(currentUserId: string, targetUserId: string): Promise<void> {
    const operationKey = `follow:${currentUserId}:${targetUserId}`;
    
    // Debounce rapid follow/unfollow operations
    if (this.pendingOperations.has(operationKey)) {
      clearTimeout(this.pendingOperations.get(operationKey)!);
    }

    return new Promise((resolve, reject) => {
      this.pendingOperations.set(operationKey, setTimeout(async () => {
        this.pendingOperations.delete(operationKey);
        
        try {
          // Use batch operations for atomic updates
          const batch = writeBatch(db);
          
          const currentUserRef = doc(db, 'users', currentUserId);
          const targetUserRef = doc(db, 'users', targetUserId);

          batch.update(currentUserRef, {
            following: arrayUnion(targetUserId),
            updatedAt: Timestamp.now()
          });

          batch.update(targetUserRef, {
            followers: arrayUnion(currentUserId),
            updatedAt: Timestamp.now()
          });

          await batch.commit();

          // Handle notifications asynchronously
          this.handleFollowNotification(currentUserId, targetUserId).catch(console.error);
          
          resolve();
        } catch (error) {
          console.error('Error following user:', error);
          reject(error);
        }
      }, this.debounceTimeout));
    });
  }

  // Optimized unfollow with batch operations
  async unfollowUser(currentUserId: string, targetUserId: string): Promise<void> {
    const operationKey = `unfollow:${currentUserId}:${targetUserId}`;
    
    // Debounce rapid follow/unfollow operations
    if (this.pendingOperations.has(operationKey)) {
      clearTimeout(this.pendingOperations.get(operationKey)!);
    }

    return new Promise((resolve, reject) => {
      this.pendingOperations.set(operationKey, setTimeout(async () => {
        this.pendingOperations.delete(operationKey);
        
        try {
          // Use batch operations for atomic updates
          const batch = writeBatch(db);
          
          const currentUserRef = doc(db, 'users', currentUserId);
          const targetUserRef = doc(db, 'users', targetUserId);

          batch.update(currentUserRef, {
            following: arrayRemove(targetUserId),
            updatedAt: Timestamp.now()
          });

          batch.update(targetUserRef, {
            followers: arrayRemove(currentUserId),
            updatedAt: Timestamp.now()
          });

          await batch.commit();
          resolve();
        } catch (error) {
          console.error('Error unfollowing user:', error);
          reject(error);
        }
      }, this.debounceTimeout));
    });
  }

  // Optimized follower removal with batch operations
  async removeFollower(currentUserId: string, followerUserId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      const currentUserRef = doc(db, 'users', currentUserId);
      const followerUserRef = doc(db, 'users', followerUserId);

      batch.update(currentUserRef, {
        followers: arrayRemove(followerUserId),
        updatedAt: Timestamp.now()
      });

      batch.update(followerUserRef, {
        following: arrayRemove(currentUserId),
        updatedAt: Timestamp.now()
      });

      await batch.commit();
    } catch (error) {
      console.error('Error removing follower:', error);
      throw error;
    }
  }

  // Optimized user blocking with comprehensive cleanup
  async blockUser(currentUserId: string, targetUserId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      // Remove from all relationship arrays
      batch.update(currentUserRef, {
        following: arrayRemove(targetUserId),
        followers: arrayRemove(targetUserId),
        blocked: arrayUnion(targetUserId),
        updatedAt: Timestamp.now()
      });

      batch.update(targetUserRef, {
        following: arrayRemove(currentUserId),
        followers: arrayRemove(currentUserId),
        updatedAt: Timestamp.now()
      });

      await batch.commit();
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  // Cached and optimized user profile fetching
  private async getCachedUserProfile(userId: string): Promise<UserProfile | null> {
    const cached = this.userProfileCache.get(userId);
    const now = Date.now();
    
    // Return cached profile if fresh
    if (cached && (now - cached.timestamp) < this.profileCacheTimeout) {
      return cached.profile;
    }
    
    // Fetch fresh profile
    try {
      const profile = await userService.getUserProfile(userId);
      if (profile) {
        this.userProfileCache.set(userId, { profile, timestamp: now });
      }
      return profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // Optimized follower list fetching with caching
  async getUserFollowers(userId: string): Promise<UserProfile[]> {
    try {
      // First get the follower IDs
      const userDoc = await getDoc(doc(db, 'users', userId));
      const followerIds = userDoc.data()?.followers || [];
      
      if (followerIds.length === 0) {
        return [];
      }

      // Batch fetch user profiles with caching
      const profilePromises = followerIds.map((id: string) => this.getCachedUserProfile(id));
      const profiles = await Promise.all(profilePromises);
      
      // Filter out null results and return valid profiles
      return profiles.filter((profile): profile is UserProfile => profile !== null);
    } catch (error) {
      console.error('Error fetching user followers:', error);
      throw error;
    }
  }

  // Optimized following list fetching with caching
  async getUserFollowing(userId: string): Promise<UserProfile[]> {
    try {
      // First get the following IDs
      const userDoc = await getDoc(doc(db, 'users', userId));
      const followingIds = userDoc.data()?.following || [];
      
      if (followingIds.length === 0) {
        return [];
      }

      // Batch fetch user profiles with caching
      const profilePromises = followingIds.map((id: string) => this.getCachedUserProfile(id));
      const profiles = await Promise.all(profilePromises);
      
      // Filter out null results and return valid profiles
      return profiles.filter((profile): profile is UserProfile => profile !== null);
    } catch (error) {
      console.error('Error fetching user following:', error);
      throw error;
    }
  }

  // Optimized batch user profile fetching
  async getBatchUserProfiles(userIds: string[]): Promise<UserProfile[]> {
    if (userIds.length === 0) return [];

    try {
      // Check cache first
      const cachedResults: UserProfile[] = [];
      const uncachedIds: string[] = [];
      const now = Date.now();

      for (const userId of userIds) {
        const cached = this.userProfileCache.get(userId);
        if (cached && (now - cached.timestamp) < this.profileCacheTimeout) {
          cachedResults.push(cached.profile);
        } else {
          uncachedIds.push(userId);
        }
      }

      // Batch fetch uncached profiles
      if (uncachedIds.length > 0) {
        // Split into chunks of 10 (Firestore 'in' query limit)
        const chunks = [];
        for (let i = 0; i < uncachedIds.length; i += 10) {
          chunks.push(uncachedIds.slice(i, i + 10));
        }

        const fetchPromises = chunks.map(async (chunk) => {
          const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => {
            const data = doc.data();
            const profile: UserProfile = {
              uid: data.uid || doc.id,
              displayName: data.displayName || 'Anonymous User',
              email: data.email || '',
              photoURL: data.photoURL || '',
              bio: data.bio || '',
              location: data.location || '',
              verified: data.verified || false,
              hostRating: data.hostRating || 0,
              guestRating: data.guestRating || 0,
              totalReviews: data.totalReviews || 0,
              followers: data.followers || [],
              following: data.following || [],
              isHost: data.isHost || false,
              interests: data.interests || [],
              occupation: data.occupation || '',
              travelStyle: data.travelStyle || '',
              budgetRange: data.budgetRange || '',
              accommodationTypes: data.accommodationTypes || [],
              preferredActivities: data.preferredActivities || [],
              profileComplete: data.profileComplete || false,
              isOnboardingComplete: data.isOnboardingComplete || false,
              lastActive: data.lastActive?.toDate() || new Date(),
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              privacy: data.privacy || {
                showEmail: false,
                showLocation: true,
                showLastActive: false,
              },
            };
            
            // Cache the profile
            this.userProfileCache.set(profile.uid, { profile, timestamp: now });
            return profile;
          });
        });

        const fetchedProfiles = (await Promise.all(fetchPromises)).flat();
        return [...cachedResults, ...fetchedProfiles];
      }

      return cachedResults;
    } catch (error) {
      console.error('Error batch fetching user profiles:', error);
      throw error;
    }
  }

  // Handle follow notification asynchronously
  private async handleFollowNotification(currentUserId: string, targetUserId: string): Promise<void> {
    try {
      const [currentUser, targetUser] = await Promise.all([
        this.getCachedUserProfile(currentUserId),
        this.getCachedUserProfile(targetUserId)
      ]);

      if (currentUser && targetUser) {
        await notificationService.notifyUserFollowed(
          targetUserId,
          currentUserId,
          currentUser.displayName || 'Someone'
        );
      }
    } catch (error) {
      console.error('Error sending follow notification:', error);
      // Don't throw - notification failures shouldn't block the main operation
    }
  }

  // Get social statistics with caching
  async getUserSocialStats(userId: string): Promise<{
    followersCount: number;
    followingCount: number;
    isFollowing?: boolean;
  }> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      
      if (!userData) {
        return { followersCount: 0, followingCount: 0 };
      }

      return {
        followersCount: userData.followers?.length || 0,
        followingCount: userData.following?.length || 0,
      };
    } catch (error) {
      console.error('Error fetching user social stats:', error);
      throw error;
    }
  }

  // Clear cache manually if needed
  clearCache(): void {
    this.userProfileCache.clear();
    
    // Clear pending operations
    for (const timer of this.pendingOperations.values()) {
      clearTimeout(timer);
    }
    this.pendingOperations.clear();
    
    // Clear batch timers
    if (this.followCheckTimer) {
      clearTimeout(this.followCheckTimer);
      this.followCheckTimer = null;
    }
    this.pendingFollowChecks.clear();
  }

  // Get cache statistics for debugging
  getCacheStats(): {
    profileCacheSize: number;
    pendingOperations: number;
    pendingFollowChecks: number;
  } {
    return {
      profileCacheSize: this.userProfileCache.size,
      pendingOperations: this.pendingOperations.size,
      pendingFollowChecks: this.pendingFollowChecks.size,
    };
  }
}

// Export singleton instance
export const optimizedSocialService = new OptimizedSocialService();

// Maintain backward compatibility
export const socialService = optimizedSocialService;
