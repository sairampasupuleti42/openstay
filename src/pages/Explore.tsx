import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, MapPin, Star, Users, Grid, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import SEOMeta from '@/helpers/SEOMeta';
import Title from '@/helpers/Title';

interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  location?: string;
  verified?: boolean;
  rating?: number;
  reviewCount?: number;
  hostingSince?: Date;
  languages?: string[];
  interests?: string[];
  responseRate?: number;
  responseTime?: string;
  createdAt?: Date;
}

const Explore: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
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
      const fetchedUsers: User[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedUsers.push({
          id: doc.id,
          displayName: data.displayName || 'Anonymous User',
          email: data.email || '',
          photoURL: data.photoURL || '',
          bio: data.bio || '',
          location: data.location || '',
          verified: data.verified || false,
          rating: data.rating || 0,
          reviewCount: data.reviewCount || 0,
          hostingSince: data.hostingSince?.toDate() || data.createdAt?.toDate() || new Date(),
          languages: data.languages || [],
          interests: data.interests || [],
          responseRate: data.responseRate || 0,
          responseTime: data.responseTime || 'N/A',
          createdAt: data.createdAt?.toDate() || new Date(),
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
  }, [lastDoc]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search query
  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchUsers(true);
    }
  };

  const UserCard: React.FC<{ user: User; isListView?: boolean }> = ({ user, isListView = false }) => {
    const formatJoinDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'long' 
      }).format(date);
    };

    if (isListView) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="relative">
                <img
                  src={user.photoURL || '/api/placeholder/80/80'}
                  alt={user.displayName}
                  className="w-20 h-20 rounded-full object-cover"
                />
                {user.verified && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {user.displayName}
                    {user.verified && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Verified
                      </span>
                    )}
                  </h3>
                  
                  {user.location && (
                    <div className="flex items-center text-gray-600 mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">{user.location}</span>
                    </div>
                  )}
                  
                  {user.rating > 0 && (
                    <div className="flex items-center mt-2">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm font-medium">{user.rating.toFixed(1)}</span>
                      <span className="ml-1 text-sm text-gray-600">({user.reviewCount} reviews)</span>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    Hosting since {formatJoinDate(user.hostingSince!)}
                  </div>
                  {user.responseRate > 0 && (
                    <div className="text-sm text-gray-600 mt-1">
                      {user.responseRate}% response rate
                    </div>
                  )}
                </div>
              </div>
              
              {user.bio && (
                <p className="mt-3 text-gray-700 text-sm line-clamp-2">
                  {user.bio}
                </p>
              )}
              
              {user.languages && user.languages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {user.languages.slice(0, 3).map((language, index) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                    >
                      {language}
                    </span>
                  ))}
                  {user.languages.length > 3 && (
                    <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                      +{user.languages.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-square relative">
          <img
            src={user.photoURL || '/api/placeholder/300/300'}
            alt={user.displayName}
            className="w-full h-full object-cover"
          />
          {user.verified && (
            <div className="absolute top-3 right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 truncate">
            {user.displayName}
          </h3>
          
          {user.location && (
            <div className="flex items-center text-gray-600 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="text-sm truncate">{user.location}</span>
            </div>
          )}
          
          {user.rating > 0 && (
            <div className="flex items-center mt-2">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="ml-1 text-sm font-medium">{user.rating.toFixed(1)}</span>
              <span className="ml-1 text-sm text-gray-600">({user.reviewCount})</span>
            </div>
          )}
          
          {user.bio && (
            <p className="mt-2 text-gray-700 text-sm line-clamp-2">
              {user.bio}
            </p>
          )}
          
          <div className="mt-3 text-xs text-gray-500">
            Hosting since {formatJoinDate(user.hostingSince!)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <SEOMeta
        title="Explore Hosts - Openstay"
        description="Discover amazing local hosts and travelers from around the world. Connect with verified community members for authentic travel experiences."
        keywords="explore hosts, local hosts, travel community, verified hosts, cultural exchange"
        canonicalUrl="/explore"
      />
      
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Title variant="gradient" className="text-4xl text-center mb-4">
              Explore Our Community
            </Title>
            <p className="text-center text-gray-600 max-w-2xl mx-auto">
              Discover amazing hosts and travelers from around the world. Connect with verified community members for authentic experiences.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name, location, or interests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">View:</span>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      viewMode === 'grid' ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      viewMode === 'list' ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-gray-600">
              {loading ? 'Loading...' : `${filteredUsers.length} ${filteredUsers.length === 1 ? 'host' : 'hosts'} found`}
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => fetchUsers()}
                className="mt-2 text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Users Grid/List */}
          {filteredUsers.length > 0 ? (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                : "space-y-4"
            )}>
              {filteredUsers.map((user) => (
                <UserCard 
                  key={user.id} 
                  user={user} 
                  isListView={viewMode === 'list'} 
                />
              ))}
            </div>
          ) : !loading && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hosts found</h3>
              <p className="text-gray-600">
                {searchQuery ? 'Try adjusting your search criteria.' : 'No hosts have joined yet.'}
              </p>
            </div>
          )}

          {/* Load More Button */}
          {hasMore && filteredUsers.length > 0 && (
            <div className="text-center mt-8">
              <button
                onClick={loadMore}
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Loading...
                  </>
                ) : (
                  'Load More Hosts'
                )}
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && users.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="aspect-square bg-gray-200 animate-pulse"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse mb-2 w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Explore;
