import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  Timestamp
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

class SocialService {
  // Follow a user with notification
  async followUser(currentUserId: string, targetUserId: string): Promise<void> {
    try {
      // First update the user documents
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

      // Get user names for notification
      const [currentUser, targetUser] = await Promise.all([
        userService.getUserProfile(currentUserId),
        userService.getUserProfile(targetUserId)
      ]);

      // Send notification to the followed user
      if (currentUser && targetUser) {
        await notificationService.notifyUserFollowed(
          targetUserId,
          currentUserId,
          currentUser.displayName || 'Someone'
        );
      }
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  }

  // Unfollow a user
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

  // Remove a follower (block functionality)
  async removeFollower(currentUserId: string, followerUserId: string): Promise<void> {
    try {
      const currentUserRef = doc(db, 'users', currentUserId);
      const followerUserRef = doc(db, 'users', followerUserId);

      await Promise.all([
        updateDoc(currentUserRef, {
          followers: arrayRemove(followerUserId),
          updatedAt: Timestamp.now()
        }),
        updateDoc(followerUserRef, {
          following: arrayRemove(currentUserId),
          updatedAt: Timestamp.now()
        })
      ]);
    } catch (error) {
      console.error('Error removing follower:', error);
      throw error;
    }
  }

  // Block a user (remove from followers/following and add to blocked list)
  async blockUser(currentUserId: string, targetUserId: string): Promise<void> {
    try {
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      // Remove from followers/following
      await Promise.all([
        updateDoc(currentUserRef, {
          followers: arrayRemove(targetUserId),
          following: arrayRemove(targetUserId),
          blocked: arrayUnion(targetUserId),
          updatedAt: Timestamp.now()
        }),
        updateDoc(targetUserRef, {
          followers: arrayRemove(currentUserId),
          following: arrayRemove(currentUserId),
          updatedAt: Timestamp.now()
        })
      ]);
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  // Unblock a user
  async unblockUser(currentUserId: string, targetUserId: string): Promise<void> {
    try {
      const currentUserRef = doc(db, 'users', currentUserId);

      await updateDoc(currentUserRef, {
        blocked: arrayRemove(targetUserId),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }

  // Get user's followers with full profile data
  async getUserFollowers(userId: string): Promise<UserProfile[]> {
    return await userService.getUserFollowers(userId);
  }

  // Get user's following with full profile data
  async getUserFollowing(userId: string): Promise<UserProfile[]> {
    return await userService.getUserFollowing(userId);
  }

  // Check if user is following another user
  async isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
    try {
      const currentUser = await userService.getUserProfile(currentUserId);
      return currentUser?.following?.includes(targetUserId) || false;
    } catch (error) {
      console.error('Error checking if following:', error);
      return false;
    }
  }

  // Check if user is blocked
  async isBlocked(currentUserId: string, targetUserId: string): Promise<boolean> {
    try {
      const currentUser = await userService.getUserProfile(currentUserId);
      return currentUser?.blocked?.includes(targetUserId) || false;
    } catch (error) {
      console.error('Error checking if blocked:', error);
      return false;
    }
  }

  // Get follow statistics for a user
  async getFollowStats(userId: string): Promise<{
    followersCount: number;
    followingCount: number;
    followers: UserProfile[];
    following: UserProfile[];
  }> {
    try {
      const [followers, following] = await Promise.all([
        this.getUserFollowers(userId),
        this.getUserFollowing(userId)
      ]);

      return {
        followersCount: followers.length,
        followingCount: following.length,
        followers,
        following
      };
    } catch (error) {
      console.error('Error getting follow stats:', error);
      return {
        followersCount: 0,
        followingCount: 0,
        followers: [],
        following: []
      };
    }
  }
}

export const socialService = new SocialService();
