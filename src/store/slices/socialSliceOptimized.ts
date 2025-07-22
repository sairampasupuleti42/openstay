import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs, query, orderBy, limit, startAfter, type DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { socialService } from '@/modules/social/services/socialService';
import type { UserProfile } from '@/services/userServiceEnhanced';

// Types
export interface SocialState {
  // User discovery
  exploreUsers: UserProfile[];
  filteredUsers: UserProfile[];
  exploreLoading: boolean;
  exploreError: string | null;
  
  // Social relationships
  followers: UserProfile[];
  following: UserProfile[];
  suggestions: UserProfile[];
  followingStatus: Record<string, boolean>;
  
  // UI state
  searchQuery: string;
  viewMode: 'grid' | 'list';
  
  // Pagination
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
  usersPerPage: number;
  
  // General loading states
  isLoading: boolean;
  error: string | null;
  
  // Cache management
  lastFetchTime: Record<string, number>;
  cacheTimeout: number; // 5 minutes
}

// Cache timeout constant (5 minutes)
const CACHE_TIMEOUT = 5 * 60 * 1000;

// Optimized async thunks with caching and request deduplication
export const fetchExploreUsers = createAsyncThunk(
  'social/fetchExploreUsers',
  async ({ 
    currentUserId, 
    isLoadMore = false, 
    lastDocument = null, 
    usersPerPage = 12,
    forceRefresh = false
  }: { 
    currentUserId?: string; 
    isLoadMore?: boolean; 
    lastDocument?: DocumentSnapshot | null; 
    usersPerPage?: number; 
    forceRefresh?: boolean;
  }, { rejectWithValue, getState }) => {
    try {
      // Check cache if not force refresh and not loading more
      if (!forceRefresh && !isLoadMore) {
        const state = getState() as { social: SocialState };
        const lastFetch = state.social.lastFetchTime['exploreUsers'];
        const now = Date.now();
        
        if (lastFetch && (now - lastFetch) < CACHE_TIMEOUT && state.social.exploreUsers.length > 0) {
          return {
            users: state.social.exploreUsers,
            lastDoc: state.social.lastDoc,
            hasMore: state.social.hasMore,
            isLoadMore: false,
            fromCache: true
          };
        }
      }

      const usersRef = collection(db, 'users');
      let q = query(
        usersRef,
        orderBy('createdAt', 'desc'),
        limit(usersPerPage)
      );

      if (isLoadMore && lastDocument) {
        q = query(
          usersRef,
          orderBy('createdAt', 'desc'),
          startAfter(lastDocument),
          limit(usersPerPage)
        );
      }

      const querySnapshot = await getDocs(q);
      const fetchedUsers: UserProfile[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Skip current user from results
        if (currentUserId && data.uid === currentUserId) {
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
          travelStyle: data.travelStyle || '',
          budgetRange: data.budgetRange || '',
          accommodationTypes: data.accommodationTypes || [],
          preferredActivities: data.preferredActivities || [],
          profileComplete: data.profileComplete || false,
          isOnboardingComplete: data.isOnboardingComplete || false,
          lastActive: data.lastActive?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          privacy: data.privacy || {
            showEmail: false,
            showLocation: true,
            showLastActive: false,
          },
        });
      });

      const lastDoc = querySnapshot.docs.length > 0 ? 
        querySnapshot.docs[querySnapshot.docs.length - 1] : null;
      const hasMore = querySnapshot.docs.length === usersPerPage;

      return {
        users: fetchedUsers,
        lastDoc,
        hasMore,
        isLoadMore,
        fromCache: false
      };
    } catch (error) {
      console.error('Error fetching explore users:', error);
      return rejectWithValue('Failed to load users. Please try again.');
    }
  }
);

// Optimized following status check with batching
export const checkFollowingStatuses = createAsyncThunk(
  'social/checkFollowingStatuses',
  async ({ currentUserId, userIds }: { currentUserId: string; userIds: string[] }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { social: SocialState };
      const statusMap: Record<string, boolean> = {};
      const uncachedUserIds: string[] = [];
      
      // Check which statuses we already have cached
      for (const userId of userIds) {
        if (state.social.followingStatus[userId] !== undefined) {
          statusMap[userId] = state.social.followingStatus[userId];
        } else {
          uncachedUserIds.push(userId);
        }
      }
      
      // Batch check uncached statuses
      if (uncachedUserIds.length > 0) {
        const batchPromises = uncachedUserIds.map(async (userId) => {
          try {
            const isFollowing = await socialService.isFollowing(currentUserId, userId);
            return { userId, isFollowing };
          } catch (error) {
            console.error('Error checking following status:', error);
            return { userId, isFollowing: false };
          }
        });
        
        const results = await Promise.allSettled(batchPromises);
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            statusMap[result.value.userId] = result.value.isFollowing;
          } else {
            statusMap[uncachedUserIds[index]] = false;
          }
        });
      }
      
      return statusMap;
    } catch (error) {
      console.error('Error checking following statuses:', error);
      return rejectWithValue('Failed to check following statuses.');
    }
  }
);

// Optimistic follow with rollback
export const followUser = createAsyncThunk(
  'social/followUser',
  async ({ currentUserId, targetUserId }: { currentUserId: string; targetUserId: string }, { rejectWithValue, dispatch }) => {
    try {
      // Optimistic update
      const optimisticResult = { targetUserId, isFollowing: true };
      
      // Make API call
      await socialService.followUser(currentUserId, targetUserId);
      
      // Invalidate related caches
      dispatch(invalidateCache(['followers', 'following']));
      
      return optimisticResult;
    } catch (error) {
      console.error('Error following user:', error);
      return rejectWithValue('Failed to follow user. Please try again.');
    }
  }
);

// Optimistic unfollow with rollback
export const unfollowUser = createAsyncThunk(
  'social/unfollowUser',
  async ({ currentUserId, targetUserId }: { currentUserId: string; targetUserId: string }, { rejectWithValue, dispatch }) => {
    try {
      // Optimistic update
      const optimisticResult = { targetUserId, isFollowing: false };
      
      // Make API call
      await socialService.unfollowUser(currentUserId, targetUserId);
      
      // Invalidate related caches
      dispatch(invalidateCache(['followers', 'following']));
      
      return optimisticResult;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return rejectWithValue('Failed to unfollow user. Please try again.');
    }
  }
);

// Cached fetch with TTL
export const fetchUserFollowers = createAsyncThunk(
  'social/fetchUserFollowers',
  async (payload: { userId: string; forceRefresh?: boolean }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { social: SocialState };
      const cacheKey = `followers_${payload.userId}`;
      
      // Check cache
      if (!payload.forceRefresh) {
        const lastFetch = state.social.lastFetchTime[cacheKey];
        const now = Date.now();
        
        if (lastFetch && (now - lastFetch) < CACHE_TIMEOUT && state.social.followers.length > 0) {
          return { followers: state.social.followers, fromCache: true };
        }
      }
      
      const followers = await socialService.getUserFollowers(payload.userId);
      return { followers, fromCache: false };
    } catch (error) {
      console.error('Error fetching followers:', error);
      return rejectWithValue('Failed to fetch followers');
    }
  }
);

// Cached fetch with TTL
export const fetchUserFollowing = createAsyncThunk(
  'social/fetchUserFollowing',
  async (payload: { userId: string; forceRefresh?: boolean }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { social: SocialState };
      const cacheKey = `following_${payload.userId}`;
      
      // Check cache
      if (!payload.forceRefresh) {
        const lastFetch = state.social.lastFetchTime[cacheKey];
        const now = Date.now();
        
        if (lastFetch && (now - lastFetch) < CACHE_TIMEOUT && state.social.following.length > 0) {
          return { following: state.social.following, fromCache: true };
        }
      }
      
      const following = await socialService.getUserFollowing(payload.userId);
      return { following, fromCache: false };
    } catch (error) {
      console.error('Error fetching following:', error);
      return rejectWithValue('Failed to fetch following');
    }
  }
);

// Optimized remove follower
export const removeFollower = createAsyncThunk(
  'social/removeFollower',
  async (payload: { currentUserId: string; followerId: string }, { rejectWithValue, dispatch }) => {
    try {
      await socialService.removeFollower(payload.currentUserId, payload.followerId);
      
      // Invalidate related caches
      dispatch(invalidateCache(['followers', 'following']));
      
      return payload.followerId;
    } catch (error) {
      console.error('Error removing follower:', error);
      return rejectWithValue('Failed to remove follower');
    }
  }
);

// Optimized block user
export const blockUser = createAsyncThunk(
  'social/blockUser',
  async (payload: { currentUserId: string; targetUserId: string }, { rejectWithValue, dispatch }) => {
    try {
      await socialService.blockUser(payload.currentUserId, payload.targetUserId);
      
      // Invalidate all related caches
      dispatch(invalidateCache(['followers', 'following', 'exploreUsers']));
      
      return payload.targetUserId;
    } catch (error) {
      console.error('Error blocking user:', error);
      return rejectWithValue('Failed to block user');
    }
  }
);

// Cache invalidation action
export const invalidateCache = createAsyncThunk(
  'social/invalidateCache',
  async (cacheKeys: string[]) => {
    return cacheKeys;
  }
);

// Initial state with cache management
const initialState: SocialState = {
  // User discovery
  exploreUsers: [],
  filteredUsers: [],
  exploreLoading: false,
  exploreError: null,
  
  // Social relationships
  followers: [],
  following: [],
  suggestions: [],
  followingStatus: {},
  
  // UI state
  searchQuery: '',
  viewMode: 'grid',
  
  // Pagination
  lastDoc: null,
  hasMore: true,
  usersPerPage: 12,
  
  // General loading states
  isLoading: false,
  error: null,
  
  // Cache management
  lastFetchTime: {},
  cacheTimeout: CACHE_TIMEOUT
};

// Slice definition with optimized reducers
const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      // Filter users based on search query
      state.filteredUsers = state.exploreUsers.filter(user =>
        !action.payload.trim() ||
        user.displayName.toLowerCase().includes(action.payload.toLowerCase()) ||
        user.location?.toLowerCase().includes(action.payload.toLowerCase()) ||
        user.bio?.toLowerCase().includes(action.payload.toLowerCase())
      );
    },
    setViewMode: (state, action: PayloadAction<'grid' | 'list'>) => {
      state.viewMode = action.payload;
    },
    clearError: (state) => {
      state.error = null;
      state.exploreError = null;
    },
    // Optimistic UI updates
    optimisticFollowUpdate: (state, action: PayloadAction<{ userId: string; isFollowing: boolean }>) => {
      state.followingStatus[action.payload.userId] = action.payload.isFollowing;
    },
    // Manual cache invalidation
    clearCache: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach(key => {
        delete state.lastFetchTime[key];
      });
    }
  },
  extraReducers: (builder) => {
    // Explore users with caching
    builder
      .addCase(fetchExploreUsers.pending, (state, action) => {
        if (!action.meta.arg.isLoadMore) {
          state.exploreLoading = true;
        }
        state.exploreError = null;
      })
      .addCase(fetchExploreUsers.fulfilled, (state, action) => {
        state.exploreLoading = false;
        
        if (action.payload.fromCache) {
          // Data from cache, no need to update
          return;
        }
        
        if (action.payload.isLoadMore) {
          state.exploreUsers = [...state.exploreUsers, ...action.payload.users];
        } else {
          state.exploreUsers = action.payload.users;
          state.lastFetchTime['exploreUsers'] = Date.now();
        }
        
        state.lastDoc = action.payload.lastDoc;
        state.hasMore = action.payload.hasMore;
        
        // Apply current search filter
        state.filteredUsers = state.exploreUsers.filter(user =>
          !state.searchQuery.trim() ||
          user.displayName.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          user.location?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          user.bio?.toLowerCase().includes(state.searchQuery.toLowerCase())
        );
      })
      .addCase(fetchExploreUsers.rejected, (state, action) => {
        state.exploreLoading = false;
        state.exploreError = action.payload as string;
      })

    // Following status check with caching
    builder
      .addCase(checkFollowingStatuses.fulfilled, (state, action) => {
        state.followingStatus = { ...state.followingStatus, ...action.payload };
      })

    // Optimistic follow/unfollow
    builder
      .addCase(followUser.pending, (state, action) => {
        // Optimistic update
        state.followingStatus[action.meta.arg.targetUserId] = true;
      })
      .addCase(followUser.fulfilled, (state, action) => {
        state.followingStatus[action.payload.targetUserId] = action.payload.isFollowing;
      })
      .addCase(followUser.rejected, (state, action) => {
        // Rollback optimistic update
        state.followingStatus[action.meta.arg.targetUserId] = false;
        state.error = action.payload as string;
      })

    builder
      .addCase(unfollowUser.pending, (state, action) => {
        // Optimistic update
        state.followingStatus[action.meta.arg.targetUserId] = false;
      })
      .addCase(unfollowUser.fulfilled, (state, action) => {
        state.followingStatus[action.payload.targetUserId] = action.payload.isFollowing;
        // Remove from following list
        state.following = state.following.filter(user => user.uid !== action.payload.targetUserId);
      })
      .addCase(unfollowUser.rejected, (state, action) => {
        // Rollback optimistic update
        state.followingStatus[action.meta.arg.targetUserId] = true;
        state.error = action.payload as string;
      })

    // Cached followers fetch
    builder
      .addCase(fetchUserFollowers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserFollowers.fulfilled, (state, action) => {
        state.isLoading = false;
        
        if (!action.payload.fromCache) {
          state.followers = action.payload.followers;
          state.lastFetchTime[`followers_${action.meta.arg.userId}`] = Date.now();
        }
      })
      .addCase(fetchUserFollowers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Cached following fetch
    builder
      .addCase(fetchUserFollowing.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserFollowing.fulfilled, (state, action) => {
        state.isLoading = false;
        
        if (!action.payload.fromCache) {
          state.following = action.payload.following;
          state.lastFetchTime[`following_${action.meta.arg.userId}`] = Date.now();
        }
      })
      .addCase(fetchUserFollowing.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Remove follower
    builder
      .addCase(removeFollower.fulfilled, (state, action) => {
        state.isLoading = false;
        state.followers = state.followers.filter(follower => follower.uid !== action.payload);
        state.followingStatus[action.payload] = false;
      })
      .addCase(removeFollower.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Block user
    builder
      .addCase(blockUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const targetUserId = action.payload;
        
        // Remove from all lists
        state.followers = state.followers.filter(follower => follower.uid !== targetUserId);
        state.following = state.following.filter(user => user.uid !== targetUserId);
        state.exploreUsers = state.exploreUsers.filter(user => user.uid !== targetUserId);
        state.filteredUsers = state.filteredUsers.filter(user => user.uid !== targetUserId);
        
        // Update following status
        state.followingStatus[targetUserId] = false;
      })
      .addCase(blockUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

    // Cache invalidation
    builder
      .addCase(invalidateCache.fulfilled, (state, action) => {
        action.payload.forEach(cacheKey => {
          // Clear specific cache entries
          Object.keys(state.lastFetchTime).forEach(key => {
            if (key.includes(cacheKey)) {
              delete state.lastFetchTime[key];
            }
          });
        });
      });
  },
});

// Actions
export const { 
  setSearchQuery, 
  setViewMode, 
  clearError, 
  optimisticFollowUpdate,
  clearCache 
} = socialSlice.actions;

// Memoized selectors
export const selectExploreUsers = (state: { social: SocialState }) => state.social.exploreUsers;
export const selectFilteredUsers = (state: { social: SocialState }) => state.social.filteredUsers;
export const selectFollowers = (state: { social: SocialState }) => state.social.followers;
export const selectFollowing = (state: { social: SocialState }) => state.social.following;
export const selectFollowingStatus = (state: { social: SocialState }) => state.social.followingStatus;
export const selectSocialLoading = (state: { social: SocialState }) => state.social.isLoading;
export const selectExploreLoading = (state: { social: SocialState }) => state.social.exploreLoading;
export const selectSocialError = (state: { social: SocialState }) => state.social.error;
export const selectExploreError = (state: { social: SocialState }) => state.social.exploreError;
export const selectSearchQuery = (state: { social: SocialState }) => state.social.searchQuery;
export const selectViewMode = (state: { social: SocialState }) => state.social.viewMode;
export const selectHasMore = (state: { social: SocialState }) => state.social.hasMore;
export const selectLastDoc = (state: { social: SocialState }) => state.social.lastDoc;

// Cache status selectors
export const selectCacheStatus = (state: { social: SocialState }, cacheKey: string) => {
  const lastFetch = state.social.lastFetchTime[cacheKey];
  if (!lastFetch) return 'empty';
  
  const now = Date.now();
  const isExpired = (now - lastFetch) > state.social.cacheTimeout;
  return isExpired ? 'expired' : 'fresh';
};

export default socialSlice.reducer;
