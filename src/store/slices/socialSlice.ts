import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs, query, orderBy, limit, startAfter, type DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { socialService } from '@/modules/social/services/socialService';
import type { UserProfile } from '@/services/userServiceEnhanced';

// Types
// Serializable version of UserProfile for Redux state (converts Date to string)
export type SerializableUserProfile = Omit<UserProfile, 'lastActive' | 'createdAt' | 'updatedAt'> & {
  lastActive?: string;
  createdAt: string;
  updatedAt: string;
};

// Helper function to convert UserProfile to SerializableUserProfile
const serializeUserProfile = (profile: UserProfile): SerializableUserProfile => ({
  ...profile,
  lastActive: profile.lastActive instanceof Date ? profile.lastActive.toISOString() : profile.lastActive,
  createdAt: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : profile.createdAt,
  updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : profile.updatedAt,
});
export interface SocialState {
  // User discovery
  exploreUsers: SerializableUserProfile[];
  filteredUsers: SerializableUserProfile[];
  exploreLoading: boolean;
  exploreError: string | null;
  
  // Social relationships
  followers: SerializableUserProfile[];
  following: SerializableUserProfile[];
  suggestions: SerializableUserProfile[];
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
}

// Async thunks
export const fetchExploreUsers = createAsyncThunk<
  {
    users: SerializableUserProfile[];
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
    isLoadMore: boolean;
  },
  { 
    currentUserId?: string; 
    isLoadMore?: boolean; 
    lastDocument?: DocumentSnapshot | null; 
    usersPerPage?: number; 
  }
>(
  'social/fetchExploreUsers',
  async ({ 
    currentUserId, 
    isLoadMore = false, 
    lastDocument = null, 
    usersPerPage = 12 
  }, { rejectWithValue }) => {
    try {
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
      const fetchedUsers: SerializableUserProfile[] = [];

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
          lastActive: data.lastActive?.toDate().toISOString() || new Date().toISOString(),
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
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
      };
    } catch (error) {
      console.error('Error fetching explore users:', error);
      return rejectWithValue('Failed to load users. Please try again.');
    }
  }
);

export const checkFollowingStatuses = createAsyncThunk(
  'social/checkFollowingStatuses',
  async ({ currentUserId, userIds }: { currentUserId: string; userIds: string[] }, { rejectWithValue }) => {
    try {
      const statusMap: Record<string, boolean> = {};
      
      for (const userId of userIds) {
        try {
          const isFollowing = await socialService.isFollowing(currentUserId, userId);
          statusMap[userId] = isFollowing;
        } catch (error) {
          console.error('Error checking following status:', error);
          statusMap[userId] = false;
        }
      }
      
      return statusMap;
    } catch (error) {
      console.error('Error checking following statuses:', error);
      return rejectWithValue('Failed to check following statuses.');
    }
  }
);

export const followUser = createAsyncThunk(
  'social/followUser',
  async ({ currentUserId, targetUserId }: { currentUserId: string; targetUserId: string }, { rejectWithValue }) => {
    try {
      await socialService.followUser(currentUserId, targetUserId);
      return { targetUserId, isFollowing: true };
    } catch (error) {
      console.error('Error following user:', error);
      return rejectWithValue('Failed to follow user. Please try again.');
    }
  }
);

export const unfollowUser = createAsyncThunk(
  'social/unfollowUser',
  async ({ currentUserId, targetUserId }: { currentUserId: string; targetUserId: string }, { rejectWithValue }) => {
    try {
      await socialService.unfollowUser(currentUserId, targetUserId);
      return { targetUserId, isFollowing: false };
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return rejectWithValue('Failed to unfollow user. Please try again.');
    }
  }
);

// Fetch user followers
export const fetchUserFollowers = createAsyncThunk<SerializableUserProfile[], { userId: string }>(
  'social/fetchUserFollowers',
  async (payload: { userId: string }, { rejectWithValue }) => {
    try {
      const followers = await socialService.getUserFollowers(payload.userId);
      return followers.map(serializeUserProfile);
    } catch (error) {
      console.error('Error fetching followers:', error);
      return rejectWithValue('Failed to fetch followers');
    }
  }
);

// Fetch user following
export const fetchUserFollowing = createAsyncThunk<SerializableUserProfile[], { userId: string }>(
  'social/fetchUserFollowing',
  async (payload: { userId: string }, { rejectWithValue }) => {
    try {
      const following = await socialService.getUserFollowing(payload.userId);
      return following.map(serializeUserProfile);
    } catch (error) {
      console.error('Error fetching following:', error);
      return rejectWithValue('Failed to fetch following');
    }
  }
);

// Remove follower
export const removeFollower = createAsyncThunk(
  'social/removeFollower',
  async (payload: { currentUserId: string; followerId: string }, { rejectWithValue }) => {
    try {
      await socialService.removeFollower(payload.currentUserId, payload.followerId);
      return payload.followerId;
    } catch (error) {
      console.error('Error removing follower:', error);
      return rejectWithValue('Failed to remove follower');
    }
  }
);

// Block user
export const blockUser = createAsyncThunk(
  'social/blockUser',
  async (payload: { currentUserId: string; targetUserId: string }, { rejectWithValue }) => {
    try {
      await socialService.blockUser(payload.currentUserId, payload.targetUserId);
      return payload.targetUserId;
    } catch (error) {
      console.error('Error blocking user:', error);
      return rejectWithValue('Failed to block user');
    }
  }
);

// Initial state
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
};

// Social slice
const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    // Explore users
    setExploreUsers: (state, action: PayloadAction<SerializableUserProfile[]>) => {
      state.exploreUsers = action.payload;
      state.filteredUsers = action.payload;
    },
    setFilteredUsers: (state, action: PayloadAction<SerializableUserProfile[]>) => {
      state.filteredUsers = action.payload;
    },
    
    // Search and filters
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setViewMode: (state, action: PayloadAction<'grid' | 'list'>) => {
      state.viewMode = action.payload;
    },
    
    // Filter users based on search query
    filterUsers: (state) => {
      if (!state.searchQuery.trim()) {
        state.filteredUsers = state.exploreUsers;
        return;
      }

      state.filteredUsers = state.exploreUsers.filter(user =>
        user.displayName.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        user.location?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        user.bio?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        user.occupation?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        user.interests?.some(interest => 
          interest.toLowerCase().includes(state.searchQuery.toLowerCase())
        )
      );
    },
    
    // Social relationships
    setFollowers: (state, action: PayloadAction<SerializableUserProfile[]>) => {
      state.followers = action.payload;
    },
    addFollowers: (state, action: PayloadAction<SerializableUserProfile[]>) => {
      state.followers = [...state.followers, ...action.payload];
    },
    setFollowing: (state, action: PayloadAction<SerializableUserProfile[]>) => {
      state.following = action.payload;
    },
    addFollowing: (state, action: PayloadAction<SerializableUserProfile[]>) => {
      state.following = [...state.following, ...action.payload];
    },
    setSuggestions: (state, action: PayloadAction<SerializableUserProfile[]>) => {
      state.suggestions = action.payload;
    },
    addSuggestions: (state, action: PayloadAction<SerializableUserProfile[]>) => {
      state.suggestions = [...state.suggestions, ...action.payload];
    },
    
    // Following status
    setFollowingStatus: (state, action: PayloadAction<Record<string, boolean>>) => {
      state.followingStatus = { ...state.followingStatus, ...action.payload };
    },
    updateFollowingStatus: (state, action: PayloadAction<{ userId: string; isFollowing: boolean }>) => {
      state.followingStatus[action.payload.userId] = action.payload.isFollowing;
    },
    
    // Pagination
    setLastDoc: (state, action: PayloadAction<DocumentSnapshot | null>) => {
      state.lastDoc = action.payload;
    },
    setHasMore: (state, action: PayloadAction<boolean>) => {
      state.hasMore = action.payload;
    },
    
    // Loading states
    setExploreLoading: (state, action: PayloadAction<boolean>) => {
      state.exploreLoading = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setExploreError: (state, action: PayloadAction<string | null>) => {
      state.exploreError = action.payload;
    },
    clearError: (state) => {
      state.error = null;
      state.exploreError = null;
    },
    
    // Cleanup
    clearSocial: (state) => {
      state.exploreUsers = [];
      state.filteredUsers = [];
      state.followers = [];
      state.following = [];
      state.suggestions = [];
      state.followingStatus = {};
      state.searchQuery = '';
      state.error = null;
      state.exploreError = null;
      state.lastDoc = null;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    // Fetch explore users
    builder
      .addCase(fetchExploreUsers.pending, (state) => {
        state.exploreLoading = true;
        state.exploreError = null;
      })
      .addCase(fetchExploreUsers.fulfilled, (state, action) => {
        state.exploreLoading = false;
        
        if (action.payload.isLoadMore) {
          state.exploreUsers = [...state.exploreUsers, ...action.payload.users];
        } else {
          state.exploreUsers = action.payload.users;
        }
        
        // Apply current search filter to new users
        if (!state.searchQuery.trim()) {
          state.filteredUsers = state.exploreUsers;
        } else {
          state.filteredUsers = state.exploreUsers.filter(user =>
            user.displayName.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            user.location?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            user.bio?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            user.occupation?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            user.interests?.some(interest => 
              interest.toLowerCase().includes(state.searchQuery.toLowerCase())
            )
          );
        }
        
        state.lastDoc = action.payload.lastDoc;
        state.hasMore = action.payload.hasMore;
      })
      .addCase(fetchExploreUsers.rejected, (state, action) => {
        state.exploreLoading = false;
        state.exploreError = action.payload as string;
      });

    // Check following statuses
    builder
      .addCase(checkFollowingStatuses.fulfilled, (state, action) => {
        state.followingStatus = { ...state.followingStatus, ...action.payload };
      })
      .addCase(checkFollowingStatuses.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Follow user
    builder
      .addCase(followUser.fulfilled, (state, action) => {
        state.followingStatus[action.payload.targetUserId] = action.payload.isFollowing;
      })
      .addCase(followUser.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Unfollow user
    builder
      .addCase(unfollowUser.fulfilled, (state, action) => {
        state.followingStatus[action.payload.targetUserId] = action.payload.isFollowing;
      })
      .addCase(unfollowUser.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Fetch user followers
      .addCase(fetchUserFollowers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserFollowers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.followers = action.payload;
      })
      .addCase(fetchUserFollowers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch user following
      .addCase(fetchUserFollowing.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserFollowing.fulfilled, (state, action) => {
        state.isLoading = false;
        state.following = action.payload;
      })
      .addCase(fetchUserFollowing.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Remove follower
      .addCase(removeFollower.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeFollower.fulfilled, (state, action) => {
        state.isLoading = false;
        state.followers = state.followers.filter(follower => follower.uid !== action.payload);
      })
      .addCase(removeFollower.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Block user
      .addCase(blockUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(blockUser.fulfilled, (state, action) => {
        state.isLoading = false;
        // Remove from both followers and following
        state.followers = state.followers.filter(follower => follower.uid !== action.payload);
        state.following = state.following.filter(user => user.uid !== action.payload);
        // Update following status
        state.followingStatus[action.payload] = false;
      })
      .addCase(blockUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setExploreUsers,
  setFilteredUsers,
  setSearchQuery,
  setViewMode,
  filterUsers,
  setFollowers,
  addFollowers,
  setFollowing,
  addFollowing,
  setSuggestions,
  addSuggestions,
  setFollowingStatus,
  updateFollowingStatus,
  setLastDoc,
  setHasMore,
  setExploreLoading,
  setLoading,
  setError,
  setExploreError,
  clearError,
  clearSocial,
} = socialSlice.actions;

// Selectors
export const selectSocial = (state: { social: SocialState }) => state.social;

// Explore selectors
export const selectExploreUsers = (state: { social: SocialState }) => state.social.exploreUsers;
export const selectFilteredUsers = (state: { social: SocialState }) => state.social.filteredUsers;
export const selectExploreLoading = (state: { social: SocialState }) => state.social.exploreLoading;
export const selectExploreError = (state: { social: SocialState }) => state.social.exploreError;

// Search and UI selectors
export const selectSearchQuery = (state: { social: SocialState }) => state.social.searchQuery;
export const selectViewMode = (state: { social: SocialState }) => state.social.viewMode;

// Pagination selectors
export const selectLastDoc = (state: { social: SocialState }) => state.social.lastDoc;
export const selectHasMore = (state: { social: SocialState }) => state.social.hasMore;
export const selectUsersPerPage = (state: { social: SocialState }) => state.social.usersPerPage;

// Social relationship selectors
export const selectFollowers = (state: { social: SocialState }) => state.social.followers;
export const selectFollowing = (state: { social: SocialState }) => state.social.following;
export const selectSuggestions = (state: { social: SocialState }) => state.social.suggestions;
export const selectFollowingStatus = (state: { social: SocialState }) => state.social.followingStatus;

// Helper selectors
export const selectIsFollowing = (state: { social: SocialState }, userId: string) => 
  state.social.followingStatus[userId] || false;

// General selectors
export const selectSocialLoading = (state: { social: SocialState }) => state.social.isLoading;
export const selectSocialError = (state: { social: SocialState }) => state.social.error;

export default socialSlice.reducer;
