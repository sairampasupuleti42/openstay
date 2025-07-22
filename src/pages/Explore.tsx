import React, { useEffect } from 'react';
import { Search, Users, Grid, List, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import SEOMeta from '@/helpers/SEOMeta';
import Title from '@/helpers/Title';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UserCard from '@/modules/social/components/UserCard';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchExploreUsers,
  checkFollowingStatuses,
  setSearchQuery,
  setViewMode,
  filterUsers,
  clearError,
  selectExploreUsers,
  selectFilteredUsers,
  selectExploreLoading,
  selectExploreError,
  selectSearchQuery,
  selectViewMode,
  selectHasMore
} from '@/store/slices/socialSlice';

const Explore: React.FC = () => {
  const { currentUser } = useAuth();
  const dispatch = useAppDispatch();
  
  // Redux selectors
  const exploreUsers = useAppSelector(selectExploreUsers);
  const filteredUsers = useAppSelector(selectFilteredUsers);
  const loading = useAppSelector(selectExploreLoading);
  const error = useAppSelector(selectExploreError);
  const searchQuery = useAppSelector(selectSearchQuery);
  const viewMode = useAppSelector(selectViewMode);
  const hasMore = useAppSelector(selectHasMore);

  // Load initial users
  useEffect(() => {
    if (currentUser?.uid) {
      dispatch(fetchExploreUsers({ 
        currentUserId: currentUser.uid,
        isLoadMore: false 
      }));
    }
  }, [dispatch, currentUser?.uid]);

  // Check following status when users change
  useEffect(() => {
    if (currentUser?.uid && exploreUsers.length > 0) {
      const userIds = exploreUsers.map(user => user.uid);
      dispatch(checkFollowingStatuses({
        currentUserId: currentUser.uid,
        userIds
      }));
    }
  }, [dispatch, exploreUsers, currentUser?.uid]);

  // Filter users when search query changes
  useEffect(() => {
    dispatch(filterUsers());
  }, [dispatch, searchQuery, exploreUsers]);

  // Handle search query change
  const handleSearchChange = (value: string) => {
    dispatch(setSearchQuery(value));
  };

  // Handle view mode change
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    dispatch(setViewMode(mode));
  };

  const handleMessage = (userId: string) => {
    // Navigate to messaging page with the user
    window.location.href = `/messages?startChat=${userId}`;
  };

  const loadMore = () => {
    if (!loading && hasMore && currentUser?.uid) {
      dispatch(fetchExploreUsers({ 
        currentUserId: currentUser.uid,
        isLoadMore: true 
      }));
    }
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  const handleClearSearch = () => {
    dispatch(setSearchQuery(''));
  };

  return (
    <>
      <Title>Explore Community - Openstay</Title>
      <SEOMeta
        title="Explore Community - Openstay"
        description="Discover and connect with fellow travelers and hosts in the Openstay community. Find people to follow and build your travel network."
        keywords="explore, community, travelers, hosts, social, network, Openstay"
        canonicalUrl="/explore"
      />

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-primary-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Explore Community</h1>
                  <p className="text-gray-600 mt-1">
                    Discover fellow travelers and hosts from around the world
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

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name, location, or interests..."
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
          {loading && exploreUsers.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading community members...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              {searchQuery ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-600">
                    No users match your search "{searchQuery}". Try adjusting your search terms.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleClearSearch}
                    className="mt-4"
                  >
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No community members found</h3>
                  <p className="text-gray-600">
                    Check back later as more people join the community!
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              )}>
                {filteredUsers.map((user) => (
                  <UserCard
                    key={user.uid}
                    user={user}
                    currentUserId={currentUser?.uid}
                    variant={viewMode}
                    showActions={true}
                    onMessage={handleMessage}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && !searchQuery && (
                <div className="mt-8 text-center">
                  <Button
                    onClick={loadMore}
                    disabled={loading}
                    variant="outline"
                    className="px-8"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Explore;
