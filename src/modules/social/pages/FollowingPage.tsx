import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Grid, List, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { socialService } from '../services/socialService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Title from '@/helpers/Title';
import SEOMeta from '@/helpers/SEOMeta';
import UserCard from '../components/UserCard';
import type { UserProfile } from '@/services/userServiceEnhanced';

const FollowingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [filteredFollowing, setFilteredFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load following
  useEffect(() => {
    const loadFollowing = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        setError('');
        const followingData = await socialService.getUserFollowing(currentUser.uid);
        setFollowing(followingData);
        setFilteredFollowing(followingData);
      } catch (err) {
        console.error('Error loading following:', err);
        setError('Failed to load following. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadFollowing();
  }, [currentUser?.uid]);

  // Filter following based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFollowing(following);
      return;
    }

    const filtered = following.filter(user =>
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.bio?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredFollowing(filtered);
  }, [searchQuery, following]);

  const handleUnfollow = async (userId: string) => {
    if (!currentUser?.uid) return;

    try {
      await socialService.unfollowUser(currentUser.uid, userId);
      
      // Update local state
      const updatedFollowing = following.filter(f => f.uid !== userId);
      setFollowing(updatedFollowing);
      setFilteredFollowing(updatedFollowing.filter(user =>
        !searchQuery.trim() ||
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } catch (err) {
      console.error('Error unfollowing user:', err);
      setError('Failed to unfollow user. Please try again.');
    }
  };

  const handleMessage = (userId: string) => {
    // TODO: Implement messaging functionality
    console.log('Message user:', userId);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Please sign in</h2>
          <p className="text-gray-600">You need to be signed in to view who you're following.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Title>Following - Openstay</Title>
      <SEOMeta
        title="Following - Openstay"
        description="Manage who you're following on Openstay. Unfollow users or send messages."
        keywords="following, social, community, Openstay"
        canonicalUrl="/social/following"
      />

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <UserCheck className="w-8 h-8 text-primary-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Following</h1>
                  <p className="text-gray-600 mt-1">
                    You're following {following.length} {following.length === 1 ? 'person' : 'people'}
                  </p>
                </div>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
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
                placeholder="Search following..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading following...</span>
            </div>
          ) : filteredFollowing.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              {searchQuery ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-600">
                    No users match your search "{searchQuery}". Try adjusting your search terms.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery('')}
                    className="mt-4"
                  >
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Not following anyone yet</h3>
                  <p className="text-gray-600 mb-4">
                    Discover interesting people to follow and stay connected with the community.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/explore'}
                    className="mt-4"
                  >
                    Discover People
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            )}>
              {filteredFollowing.map((user) => (
                <UserCard
                  key={user.uid}
                  user={user}
                  currentUserId={currentUser.uid}
                  variant={viewMode}
                  showActions={true}
                  isFollowing={true}
                  onUnfollow={handleUnfollow}
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

export default FollowingPage;
