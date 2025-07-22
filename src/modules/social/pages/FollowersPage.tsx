import React, { useEffect } from 'react';
import { Users, Search, Grid, List, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Title from '@/helpers/Title';
import SEOMeta from '@/helpers/SEOMeta';
import UserCard from '../components/UserCard';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchUserFollowers,
  removeFollower,
  blockUser,
  setSearchQuery,
  setViewMode,
  clearError,
  selectFollowers,
  selectSocialLoading,
  selectSocialError,
  selectSearchQuery,
  selectViewMode
} from '@/store/slices/socialSlice';

const FollowersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const dispatch = useAppDispatch();
  
  // Redux selectors
  const followers = useAppSelector(selectFollowers);
  const loading = useAppSelector(selectSocialLoading);
  const error = useAppSelector(selectSocialError);
  const searchQuery = useAppSelector(selectSearchQuery);
  const viewMode = useAppSelector(selectViewMode);

  // Filtered followers based on search
  const filteredFollowers = followers.filter(follower =>
    !searchQuery.trim() ||
    follower.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    follower.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    follower.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load followers
  useEffect(() => {
    if (currentUser?.uid) {
      dispatch(fetchUserFollowers({ userId: currentUser.uid }));
    }
  }, [dispatch, currentUser?.uid]);

  const handleRemoveFollower = async (followerId: string) => {
    if (!currentUser?.uid) return;

    try {
      await dispatch(removeFollower({
        currentUserId: currentUser.uid,
        followerId
      })).unwrap();
    } catch (err) {
      console.error('Error removing follower:', err);
    }
  };

  const handleBlockFollower = async (followerId: string) => {
    if (!currentUser?.uid) return;

    try {
      await dispatch(blockUser({
        currentUserId: currentUser.uid,
        targetUserId: followerId
      })).unwrap();
    } catch (err) {
      console.error('Error blocking follower:', err);
    }
  };

  const handleSearchChange = (value: string) => {
    dispatch(setSearchQuery(value));
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    dispatch(setViewMode(mode));
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  const handleMessage = (userId: string) => {
    // Navigate to messaging page with the user
    window.location.href = `/messages?startChat=${userId}`;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Please sign in</h2>
          <p className="text-gray-600">You need to be signed in to view your followers.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Title>My Followers - Openstay</Title>
      <SEOMeta
        title="My Followers - Openstay"
        description="Manage your followers on Openstay. Remove followers or block users as needed."
        keywords="followers, social, community, Openstay"
        canonicalUrl="/social/followers"
      />

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-primary-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">My Followers</h1>
                  <p className="text-gray-600 mt-1">
                    {followers.length} {followers.length === 1 ? 'person follows' : 'people follow'} you
                  </p>
                </div>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewModeChange('grid')}
                  aria-label="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewModeChange('list')}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search followers..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearError}
                  className="text-red-600 hover:text-red-800"
                >
                  ×
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading followers...</span>
            </div>
          ) : filteredFollowers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              {searchQuery ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No followers found</h3>
                  <p className="text-gray-600">
                    No followers match your search "{searchQuery}". Try adjusting your search terms.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => handleSearchChange('')}
                    className="mt-4"
                  >
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No followers yet</h3>
                  <p className="text-gray-600">
                    When people follow you, they'll appear here. Share your profile to gain followers!
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            )}>
              {filteredFollowers.map((follower) => (
                <UserCard
                  key={follower.uid}
                  user={follower}
                  currentUserId={currentUser.uid}
                  variant={viewMode}
                  showActions={true}
                  isFollower={true}
                  onRemoveFollower={handleRemoveFollower}
                  onBlock={handleBlockFollower}
                  onMessage={handleMessage}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FollowersPage;
