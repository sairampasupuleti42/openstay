import { socialService } from '@/modules/social/services/socialService';

// Mock all external dependencies
jest.mock('@/lib/firebase', () => ({
  db: {},
}));

jest.mock('@/services/userServiceEnhanced', () => ({
  userService: {
    getUserProfile: jest.fn(),
    getUserFollowing: jest.fn(),
    getUserFollowers: jest.fn(),
  }
}));

jest.mock('@/modules/social/services/notificationService', () => ({
  notificationService: {
    notifyUserFollowed: jest.fn(),
  }
}));

describe('SocialService Basic Tests', () => {
  it('should be defined', () => {
    expect(socialService).toBeDefined();
  });

  it('should have required methods', () => {
    expect(typeof socialService.getMutualFriends).toBe('function');
    expect(typeof socialService.isFollowing).toBe('function');
    expect(typeof socialService.followUser).toBe('function');
    expect(typeof socialService.unfollowUser).toBe('function');
  });
});
