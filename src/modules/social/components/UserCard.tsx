import React from 'react';
import { MapPin, Star, MessageSquare, UserPlus, UserMinus, UserX, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LazyImage from '@/components/LazyImage';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  followUser, 
  unfollowUser, 
  removeFollower, 
  blockUser,
  selectIsFollowing 
} from '@/store/slices/socialSlice';
import type { UserProfile } from '@/services/userServiceEnhanced';

interface UserCardProps {
  user: UserProfile;
  currentUserId?: string;
  showActions?: boolean;
  variant?: 'grid' | 'list';
  onMessage?: (userId: string) => void;
  isFollower?: boolean;
  className?: string;
  // Remove callback props - using Redux now
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  currentUserId,
  showActions = true,
  variant = 'grid',
  onMessage,
  isFollower = false,
  className
}) => {
  const dispatch = useAppDispatch();
  const isFollowing = useAppSelector(state => selectIsFollowing(state, user.uid));
  const isOwnProfile = currentUserId === user.uid;

  const handleFollow = async () => {
    if (!currentUserId) return;
    
    try {
      if (isFollowing) {
        await dispatch(unfollowUser({
          currentUserId,
          targetUserId: user.uid
        })).unwrap();
      } else {
        await dispatch(followUser({
          currentUserId,
          targetUserId: user.uid
        })).unwrap();
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  const handleRemoveFollower = async () => {
    if (!currentUserId) return;
    
    try {
      await dispatch(removeFollower({
        currentUserId,
        followerId: user.uid
      })).unwrap();
    } catch (error) {
      console.error('Error removing follower:', error);
    }
  };

  const handleBlock = async () => {
    if (!currentUserId) return;
    
    try {
      await dispatch(blockUser({
        currentUserId,
        targetUserId: user.uid
      })).unwrap();
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  const getInitials = (displayName: string, email: string) => {
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email ? email[0].toUpperCase() : 'U';
  };

  if (variant === 'list') {
    return (
      <div className={cn(
        "bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6",
        className
      )}>
        <div className="flex items-start space-x-4">
          {/* Profile Picture */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <LazyImage
                  src={user.photoURL}
                  alt={`${user.displayName} profile`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-lg font-medium">
                  {getInitials(user.displayName, user.email)}
                </span>
              )}
            </div>
            {user.verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Shield className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {user.displayName}
                </h3>
                
                {user.location && (
                  <div className="flex items-center text-gray-500 mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm truncate">{user.location}</span>
                  </div>
                )}

                {user.bio && (
                  <p className="text-gray-600 mt-2 text-sm line-clamp-2">
                    {user.bio}
                  </p>
                )}

                <div className="flex items-center space-x-4 mt-3">
                  {(user.hostRating || user.guestRating) && (
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600 ml-1">
                        {(user.hostRating || user.guestRating || 0).toFixed(1)}
                      </span>
                    </div>
                  )}
                  
                  {user.totalReviews && (
                    <span className="text-sm text-gray-500">
                      {user.totalReviews} reviews
                    </span>
                  )}

                  {user.isHost && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      Host
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {showActions && !isOwnProfile && (
                <div className="flex items-center space-x-2 ml-4">
                  {onMessage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMessage(user.uid)}
                      className="flex items-center space-x-1"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">Message</span>
                    </Button>
                  )}
                  
                  {/* Follow/Unfollow Button */}
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    onClick={handleFollow}
                    className="flex items-center space-x-1"
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="w-4 h-4" />
                        <span className="hidden sm:inline">Unfollow</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Follow</span>
                      </>
                    )}
                  </Button>

                  {/* Follower-specific actions */}
                  {isFollower && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveFollower}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <UserMinus className="w-4 h-4" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBlock}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <UserX className="w-4 h-4" />
                        <span className="hidden sm:inline">Block</span>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <div className={cn(
      "bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden",
      className
    )}>
      {/* Profile Picture */}
      <div className="relative p-6 pb-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-primary-500 flex items-center justify-center overflow-hidden relative">
          {user.photoURL ? (
            <LazyImage
              src={user.photoURL}
              alt={`${user.displayName} profile`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-xl font-medium">
              {getInitials(user.displayName, user.email)}
            </span>
          )}
          {user.verified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <Shield className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 pb-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {user.displayName}
          </h3>
          
          {user.location && (
            <div className="flex items-center justify-center text-gray-500 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="text-sm truncate">{user.location}</span>
            </div>
          )}

          {user.bio && (
            <p className="text-gray-600 mt-2 text-sm line-clamp-3">
              {user.bio}
            </p>
          )}

          <div className="flex items-center justify-center space-x-4 mt-3">
            {(user.hostRating || user.guestRating) && (
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600 ml-1">
                  {(user.hostRating || user.guestRating || 0).toFixed(1)}
                </span>
              </div>
            )}
            
            {user.totalReviews && (
              <span className="text-sm text-gray-500">
                {user.totalReviews} reviews
              </span>
            )}
          </div>

          {user.isHost && (
            <div className="mt-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                Host
              </span>
            </div>
          )}

          {/* Action Buttons */}
          {showActions && !isOwnProfile && (
            <div className="flex flex-col space-y-2 mt-4">
              <div className="flex space-x-2">
                {onMessage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMessage(user.uid)}
                    className="flex-1 flex items-center justify-center space-x-1"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                  </Button>
                )}
                
                {/* Follow/Unfollow Button */}
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  size="sm"
                  onClick={handleFollow}
                  className="flex-1 flex items-center justify-center space-x-1"
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4" />
                      <span>Unfollow</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Follow</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Follower-specific actions */}
              {isFollower && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveFollower}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <UserMinus className="w-4 h-4 mr-1" />
                    Remove Follower
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBlock}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    Block
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard;
