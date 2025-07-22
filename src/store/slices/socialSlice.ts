import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { UserProfile } from '@/services/userServiceEnhanced';

// Types
export interface SocialState {
  followers: UserProfile[];
  following: UserProfile[];
  suggestions: UserProfile[];
  followingStatus: Record<string, boolean>;
  isLoading: boolean;
  error: string | null;
  // Pagination
  followersPage: number;
  followingPage: number;
  suggestionsPage: number;
  hasMoreFollowers: boolean;
  hasMoreFollowing: boolean;
  hasMoreSuggestions: boolean;
}

// Initial state
const initialState: SocialState = {
  followers: [],
  following: [],
  suggestions: [],
  followingStatus: {},
  isLoading: false,
  error: null,
  followersPage: 1,
  followingPage: 1,
  suggestionsPage: 1,
  hasMoreFollowers: true,
  hasMoreFollowing: true,
  hasMoreSuggestions: true,
};

// Social slice
const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    setFollowers: (state, action: PayloadAction<UserProfile[]>) => {
      state.followers = action.payload;
    },
    addFollowers: (state, action: PayloadAction<UserProfile[]>) => {
      state.followers = [...state.followers, ...action.payload];
    },
    setFollowing: (state, action: PayloadAction<UserProfile[]>) => {
      state.following = action.payload;
    },
    addFollowing: (state, action: PayloadAction<UserProfile[]>) => {
      state.following = [...state.following, ...action.payload];
    },
    setSuggestions: (state, action: PayloadAction<UserProfile[]>) => {
      state.suggestions = action.payload;
    },
    addSuggestions: (state, action: PayloadAction<UserProfile[]>) => {
      state.suggestions = [...state.suggestions, ...action.payload];
    },
    setFollowingStatus: (state, action: PayloadAction<Record<string, boolean>>) => {
      state.followingStatus = { ...state.followingStatus, ...action.payload };
    },
    updateFollowingStatus: (state, action: PayloadAction<{ userId: string; isFollowing: boolean }>) => {
      state.followingStatus[action.payload.userId] = action.payload.isFollowing;
      
      // Update followers/following lists optimistically
      if (action.payload.isFollowing) {
        // Add to following list if not already there
        const existingIndex = state.following.findIndex(user => user.uid === action.payload.userId);
        if (existingIndex === -1) {
          // Note: We'd need the user profile to add it properly
          // This is a simplified version - in real app, we'd dispatch an action to fetch the user
        }
      } else {
        // Remove from following list
        state.following = state.following.filter(user => user.uid !== action.payload.userId);
      }
    },
    removeFollower: (state, action: PayloadAction<string>) => {
      state.followers = state.followers.filter(user => user.uid !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Pagination actions
    setFollowersPage: (state, action: PayloadAction<number>) => {
      state.followersPage = action.payload;
    },
    setFollowingPage: (state, action: PayloadAction<number>) => {
      state.followingPage = action.payload;
    },
    setSuggestionsPage: (state, action: PayloadAction<number>) => {
      state.suggestionsPage = action.payload;
    },
    setHasMoreFollowers: (state, action: PayloadAction<boolean>) => {
      state.hasMoreFollowers = action.payload;
    },
    setHasMoreFollowing: (state, action: PayloadAction<boolean>) => {
      state.hasMoreFollowing = action.payload;
    },
    setHasMoreSuggestions: (state, action: PayloadAction<boolean>) => {
      state.hasMoreSuggestions = action.payload;
    },
    clearSocial: (state) => {
      state.followers = [];
      state.following = [];
      state.suggestions = [];
      state.followingStatus = {};
      state.error = null;
    },
  },
});

// Export actions
export const {
  setFollowers,
  addFollowers,
  setFollowing,
  addFollowing,
  setSuggestions,
  addSuggestions,
  setFollowingStatus,
  updateFollowingStatus,
  removeFollower,
  setLoading,
  setError,
  clearError,
  setFollowersPage,
  setFollowingPage,
  setSuggestionsPage,
  setHasMoreFollowers,
  setHasMoreFollowing,
  setHasMoreSuggestions,
  clearSocial,
} = socialSlice.actions;

// Selectors
export const selectSocial = (state: { social: SocialState }) => state.social;
export const selectFollowers = (state: { social: SocialState }) => state.social.followers;
export const selectFollowing = (state: { social: SocialState }) => state.social.following;
export const selectSuggestions = (state: { social: SocialState }) => state.social.suggestions;
export const selectFollowingStatus = (state: { social: SocialState }) => state.social.followingStatus;
export const selectSocialLoading = (state: { social: SocialState }) => state.social.isLoading;
export const selectSocialError = (state: { social: SocialState }) => state.social.error;

// Pagination selectors
export const selectFollowersPage = (state: { social: SocialState }) => state.social.followersPage;
export const selectFollowingPage = (state: { social: SocialState }) => state.social.followingPage;
export const selectSuggestionsPage = (state: { social: SocialState }) => state.social.suggestionsPage;
export const selectHasMoreFollowers = (state: { social: SocialState }) => state.social.hasMoreFollowers;
export const selectHasMoreFollowing = (state: { social: SocialState }) => state.social.hasMoreFollowing;
export const selectHasMoreSuggestions = (state: { social: SocialState }) => state.social.hasMoreSuggestions;

export default socialSlice.reducer;
