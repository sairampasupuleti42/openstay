import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { UserProfile } from '@/services/userServiceEnhanced';

// Types
export interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isProfileComplete: boolean;
}

// Initial state
const initialState: UserState = {
  profile: null,
  isLoading: false,
  error: null,
  isProfileComplete: false,
};

// User slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<UserProfile | null>) => {
      state.profile = action.payload;
      state.isProfileComplete = action.payload?.profileComplete || false;
    },
    updateProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
        state.isProfileComplete = state.profile.profileComplete || false;
      }
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
    clearProfile: (state) => {
      state.profile = null;
      state.isProfileComplete = false;
      state.error = null;
    },
  },
});

// Export actions
export const {
  setProfile,
  updateProfile,
  setLoading,
  setError,
  clearError,
  clearProfile,
} = userSlice.actions;

// Selectors
export const selectUser = (state: { user: UserState }) => state.user;
export const selectUserProfile = (state: { user: UserState }) => state.user.profile;
export const selectUserLoading = (state: { user: UserState }) => state.user.isLoading;
export const selectUserError = (state: { user: UserState }) => state.user.error;
export const selectIsProfileComplete = (state: { user: UserState }) => state.user.isProfileComplete;

export default userSlice.reducer;
