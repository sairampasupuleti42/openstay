import React, { useState, useEffect } from 'react';
import { Users, Search, Grid, List, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { socialService } from '../services/socialService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Title from '@/helpers/Title';
import SEOMeta from '@/helpers/SEOMeta';
import UserCard from '../components/UserCard';
import type { UserProfile } from '@/services/userServiceEnhanced';

const FollowersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [filteredFollowers, setFilteredFollowers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load followers
  useEffect(() => {
    const loadFollowers = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        setError('');
        const followersData = await socialService.getUserFollowers(currentUser.uid);
        setFollowers(followersData);
        setFilteredFollowers(followersData);
      } catch (err) {
        console.error('Error loading followers:', err);
        setError('Failed to load followers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadFollowers();
  }, [currentUser?.uid]);

  // Filter followers based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFollowers(followers);
      return;
    }

    const filtered = followers.filter(follower =>
      follower.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      follower.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      follower.bio?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredFollowers(filtered);
  }, [searchQuery, followers]);

  const handleRemoveFollower = async (followerId: string) => {
    if (!currentUser?.uid) return;

    try {
      await socialService.removeFollower(currentUser.uid, followerId);
      
      // Update local state
      const updatedFollowers = followers.filter(f => f.uid !== followerId);
      setFollowers(updatedFollowers);
      setFilteredFollowers(updatedFollowers.filter(follower =>
        !searchQuery.trim() ||
        follower.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        follower.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        follower.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } catch (err) {
      console.error('Error removing follower:', err);
      setError('Failed to remove follower. Please try again.');
    }
  };

  const handleBlockFollower = async (followerId: string) => {
    if (!currentUser?.uid) return;

    try {
      await socialService.blockUser(currentUser.uid, followerId);
      
      // Update local state
      const updatedFollowers = followers.filter(f => f.uid !== followerId);
      setFollowers(updatedFollowers);
      setFilteredFollowers(updatedFollowers.filter(follower =>
        !searchQuery.trim() ||
        follower.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        follower.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        follower.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } catch (err) {
      console.error('Error blocking follower:', err);
      setError('Failed to block user. Please try again.');
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
                placeholder="Search followers..."
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
                    onClick={() => setSearchQuery('')}
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
