import { socialService } from '@/modules/social/services/socialService';
import { userService } from '@/services/userServiceEnhanced';
import { notificationService } from '@/modules/social/services/notificationService';

// Mock the dependencies
jest.mock('@/services/userServiceEnhanced');
jest.mock('@/modules/social/services/notificationService');
jest.mock('@/lib/firebase');

const mockUserService = userService as jest.Mocked<typeof userService>;
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;

describe('SocialService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMutualFriends', () => {
    it('should return empty array when user has no following', async () => {
      mockUserService.getUserProfile.mockResolvedValue({
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        following: [],
        followers: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await socialService.getMutualFriends('user1');
      expect(result).toEqual([]);
    });

    it('should return mutual friends correctly', async () => {
      const mockCurrentUser = {
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        following: ['user2', 'user3'],
        followers: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockFollowingUsers = [
        {
          uid: 'user2',
          displayName: 'Friend 1',
          email: 'friend1@example.com',
          following: ['user1'], // This user follows back
          followers: ['user1'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          uid: 'user3',
          displayName: 'Friend 2',
          email: 'friend2@example.com',
          following: [], // This user doesn't follow back
          followers: ['user1'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockUserService.getUserProfile.mockResolvedValue(mockCurrentUser);
      mockUserService.getUserFollowing.mockResolvedValue(mockFollowingUsers);

      const result = await socialService.getMutualFriends('user1');
      
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('user2');
      expect(result[0].displayName).toBe('Friend 1');
    });

    it('should handle errors gracefully', async () => {
      mockUserService.getUserProfile.mockRejectedValue(new Error('Database error'));

      const result = await socialService.getMutualFriends('user1');
      expect(result).toEqual([]);
    });
  });

  describe('isFollowing', () => {
    it('should return true when user is following target', async () => {
      mockUserService.getUserProfile.mockResolvedValue({
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        following: ['user2'],
        followers: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await socialService.isFollowing('user1', 'user2');
      expect(result).toBe(true);
    });

    it('should return false when user is not following target', async () => {
      mockUserService.getUserProfile.mockResolvedValue({
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        following: [],
        followers: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await socialService.isFollowing('user1', 'user2');
      expect(result).toBe(false);
    });
  });
});
