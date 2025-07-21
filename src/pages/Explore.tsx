import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Users, Grid, List, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import SEOMeta from '@/helpers/SEOMeta';
import Title from '@/helpers/Title';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UserCard from '@/modules/social/components/UserCard';
import { socialService } from '@/modules/social/services/socialService';
import type { UserProfile } from '@/services/userServiceEnhanced';

const Explore: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});
  
  const usersPerPage = 12;

  // Fetch users from Firestore
  const fetchUsers = useCallback(async (isLoadMore: boolean = false) => {
    try {
      setLoading(true);
      setError('');

      const usersRef = collection(db, 'users');
      let q = query(
        usersRef,
        orderBy('createdAt', 'desc'),
        limit(usersPerPage)
      );

      if (isLoadMore && lastDoc) {
        q = query(
          usersRef,
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(usersPerPage)
        );
      }

      const querySnapshot = await getDocs(q);
      const fetchedUsers: UserProfile[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Skip current user from results
        if (currentUser?.uid && data.uid === currentUser.uid) {
          return;
        }

        fetchedUsers.push({
          uid: data.uid || doc.id,
          displayName: data.displayName || 'Anonymous User',
          email: data.email || '',
          photoURL: data.photoURL || '',
          bio: data.bio || '',
          location: data.location || '',
          verified: data.verified || false,
          hostRating: data.hostRating || 0,
          guestRating: data.guestRating || 0,
          totalReviews: data.totalReviews || 0,
          followers: data.followers || [],
          following: data.following || [],
          isHost: data.isHost || false,
          interests: data.interests || [],
          occupation: data.occupation || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          profileComplete: data.profileComplete || false,
          isOnboardingComplete: data.isOnboardingComplete || false
        });
      });

      if (isLoadMore) {
        setUsers(prev => [...prev, ...fetchedUsers]);
      } else {
        setUsers(fetchedUsers);
      }

      // Update pagination state
      if (querySnapshot.docs.length > 0) {
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === usersPerPage);
      } else {
        setHasMore(false);
      }

    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [lastDoc, currentUser?.uid]);

  // Load initial users
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Check following status for all users
  useEffect(() => {
    const checkFollowingStatus = async () => {
      if (!currentUser?.uid || users.length === 0) return;

      const statusMap: Record<string, boolean> = {};
      
      for (const user of users) {
        try {
          const isFollowing = await socialService.isFollowing(currentUser.uid, user.uid);
          statusMap[user.uid] = isFollowing;
        } catch (error) {
          console.error('Error checking following status:', error);
          statusMap[user.uid] = false;
        }
      }
      
      setFollowingStatus(statusMap);
    };

    checkFollowingStatus();
  }, [users, currentUser?.uid]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user =>
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.occupation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.interests?.some(interest => 
        interest.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const handleFollow = async (userId: string) => {
    if (!currentUser?.uid) return;

    try {
      await socialService.followUser(currentUser.uid, userId);
      setFollowingStatus(prev => ({ ...prev, [userId]: true }));
    } catch (err) {
      console.error('Error following user:', err);
      setError('Failed to follow user. Please try again.');
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!currentUser?.uid) return;

    try {
      await socialService.unfollowUser(currentUser.uid, userId);
      setFollowingStatus(prev => ({ ...prev, [userId]: false }));
    } catch (err) {
      console.error('Error unfollowing user:', err);
      setError('Failed to unfollow user. Please try again.');
    }
  };

  const handleMessage = (userId: string) => {
    // TODO: Implement messaging functionality
    console.log('Message user:', userId);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchUsers(true);
    }
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

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name, location, or interests..."
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
          {loading && users.length === 0 ? (
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
                    onClick={() => setSearchQuery('')}
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
                    isFollowing={followingStatus[user.uid] || false}
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
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
