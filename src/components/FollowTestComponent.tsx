import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { followUser, unfollowUser, getUserProfile } from '@/services/userService';
import type { UserProfile } from '@/services/userService';

const FollowTestComponent: React.FC = () => {
  const { currentUser } = useAuth();
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [testUserId] = useState('test-user-123'); // You can change this to test with different users
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (currentUser?.uid) {
        const profile = await getUserProfile(currentUser.uid);
        setCurrentUserProfile(profile);
        if (profile?.following) {
          setIsFollowing(profile.following.includes(testUserId));
        }
      }
    };

    loadProfile();
  }, [currentUser?.uid, testUserId]);

  const handleFollowToggle = async () => {
    if (!currentUser?.uid) return;
    
    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(currentUser.uid, testUserId);
        setIsFollowing(false);
        console.log('✅ Successfully unfollowed user');
      } else {
        await followUser(currentUser.uid, testUserId);
        setIsFollowing(true);
        console.log('✅ Successfully followed user - notification should be created');
      }

      // Refresh profile to verify the change
      const updatedProfile = await getUserProfile(currentUser.uid);
      setCurrentUserProfile(updatedProfile);
      
    } catch (error) {
      console.error('❌ Error in follow/unfollow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Please log in to test follow functionality</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm max-w-md">
      <h3 className="text-lg font-semibold mb-4">Follow Test Component</h3>
      
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600">Current User: {currentUser.displayName}</p>
          <p className="text-sm text-gray-600">Test Target User ID: {testUserId}</p>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm font-medium">Current Following Status:</p>
          <p className="text-sm">
            {isFollowing ? '✅ Following' : '❌ Not Following'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Following Count: {currentUserProfile?.following?.length || 0}
          </p>
        </div>

        <button
          onClick={handleFollowToggle}
          disabled={isLoading}
          className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
            isFollowing
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            'Processing...'
          ) : isFollowing ? (
            'Unfollow User'
          ) : (
            'Follow User'
          )}
        </button>

        <div className="text-xs text-gray-500">
          <p>• Click the button to test follow/unfollow</p>
          <p>• Check browser console for logs</p>
          <p>• Notification should be created on follow</p>
        </div>
      </div>
    </div>
  );
};

export default FollowTestComponent;
