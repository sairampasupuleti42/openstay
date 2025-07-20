import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { getRandomUsers, followUser, unfollowUser } from '@/services/userService';
import type { UserProfile } from '@/services/userService';

interface UserDiscoveryProps {
  currentUserId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

const UserDiscovery: React.FC<UserDiscoveryProps> = ({
  currentUserId,
  onComplete,
  onSkip
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const randomUsers = await getRandomUsers(currentUserId, 8);
        setUsers(randomUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUserId]);

  const handleFollowToggle = async (targetUserId: string) => {
    if (followingInProgress.has(targetUserId)) return;

    setFollowingInProgress(prev => new Set(prev).add(targetUserId));

    try {
      if (followingUsers.has(targetUserId)) {
        await unfollowUser(currentUserId, targetUserId);
        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetUserId);
          return newSet;
        });
      } else {
        await followUser(currentUserId, targetUserId);
        setFollowingUsers(prev => new Set(prev).add(targetUserId));
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <p className="text-gray-600">Finding interesting people to follow...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Discover People
        </h2>
        <p className="text-gray-600">
          Follow people you'd like to stay connected with
        </p>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No users found at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {users.map((user) => (
            <div
              key={user.uid}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <img
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=random`}
                  alt={user.displayName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {user.displayName}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {user.email}
                  </p>
                  {user.bio && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {user.bio}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  {user.followers?.length || 0} followers
                </div>
                <button
                  onClick={() => handleFollowToggle(user.uid)}
                  disabled={followingInProgress.has(user.uid)}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    followingUsers.has(user.uid)
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-blue-100 text-primary-700 hover:bg-primary-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {followingInProgress.has(user.uid) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : followingUsers.has(user.uid) ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col space-y-3 pt-4">
        <button
          onClick={onComplete}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium ml-auto"
        >
          Continue to OpenStay
        </button>

        
      </div>
    </div>
  );
};

export default UserDiscovery;
