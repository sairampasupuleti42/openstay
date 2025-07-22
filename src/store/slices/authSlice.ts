import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from 'firebase/auth';
import { 
  signInWithEmailPassword, 
  signInWithGoogle, 
  signUpWithEmailPassword,
  signOutUser,
  checkOnboardingStatus 
} from '@/services/authService';
import type { SignInFormData, SignUpFormData } from '@/schemas/authSchemas';

// Types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  success: string | null;
  isOnboardingComplete: boolean;
  // Form states
  signInLoading: boolean;
  signUpLoading: boolean;
  googleLoading: boolean;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  success: null,
  isOnboardingComplete: false,
  signInLoading: false,
  signUpLoading: false,
  googleLoading: false,
};

// Async thunks
export const signIn = createAsyncThunk(
  'auth/signIn',
  async (data: SignInFormData, { rejectWithValue }) => {
    try {
      const result = await signInWithEmailPassword(data);
      if (!result.success || !result.user) {
        return rejectWithValue(result.message);
      }
      
      // Check onboarding status
      const isOnboardingComplete = await checkOnboardingStatus(result.user.uid);
      
      return {
        user: result.user,
        message: result.message,
        isOnboardingComplete,
      };
    } catch {
      return rejectWithValue('An unexpected error occurred. Please try again.');
    }
  }
);

export const signInWithGoogleAsync = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      const result = await signInWithGoogle();
      if (!result.success || !result.user) {
        return rejectWithValue(result.message);
      }
      
      // Check onboarding status
      const isOnboardingComplete = await checkOnboardingStatus(result.user.uid);
      
      return {
        user: result.user,
        message: result.message,
        isOnboardingComplete,
      };
    } catch {
      return rejectWithValue('An unexpected error occurred. Please try again.');
    }
  }
);

export const signUp = createAsyncThunk(
  'auth/signUp',
  async (data: SignUpFormData, { rejectWithValue }) => {
    try {
      const result = await signUpWithEmailPassword(data);
      if (!result.success || !result.user) {
        return rejectWithValue(result.message);
      }
      
      return {
        user: result.user,
        message: result.message,
        isOnboardingComplete: false, // New users need onboarding
      };
    } catch {
      return rejectWithValue('An unexpected error occurred. Please try again.');
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      await signOutUser();
      return { message: 'Signed out successfully' };
    } catch {
      return rejectWithValue('Failed to sign out. Please try again.');
    }
  }
);

export const checkOnboarding = createAsyncThunk(
  'auth/checkOnboarding',
  async (userId: string, { rejectWithValue }) => {
    try {
      const isComplete = await checkOnboardingStatus(userId);
      return { isOnboardingComplete: isComplete };
    } catch {
      return rejectWithValue('Failed to check onboarding status.');
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Synchronous actions
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isInitialized = true;
    },
    setOnboardingComplete: (state, action: PayloadAction<boolean>) => {
      state.isOnboardingComplete = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = null;
    },
    clearMessages: (state) => {
      state.error = null;
      state.success = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Sign In
    builder
      .addCase(signIn.pending, (state) => {
        state.signInLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.signInLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.success = action.payload.message;
        state.isOnboardingComplete = action.payload.isOnboardingComplete;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.signInLoading = false;
        state.error = action.payload as string;
      });

    // Sign In with Google
    builder
      .addCase(signInWithGoogleAsync.pending, (state) => {
        state.googleLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(signInWithGoogleAsync.fulfilled, (state, action) => {
        state.googleLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.success = action.payload.message;
        state.isOnboardingComplete = action.payload.isOnboardingComplete;
      })
      .addCase(signInWithGoogleAsync.rejected, (state, action) => {
        state.googleLoading = false;
        state.error = action.payload as string;
      });

    // Sign Up
    builder
      .addCase(signUp.pending, (state) => {
        state.signUpLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.signUpLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.success = action.payload.message;
        state.isOnboardingComplete = action.payload.isOnboardingComplete;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.signUpLoading = false;
        state.error = action.payload as string;
      });

    // Sign Out
    builder
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.isOnboardingComplete = false;
        state.error = null;
        state.success = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Check Onboarding
    builder
      .addCase(checkOnboarding.fulfilled, (state, action) => {
        state.isOnboardingComplete = action.payload.isOnboardingComplete;
      });
  },
});

// Export actions
export const {
  setUser,
  setOnboardingComplete,
  clearError,
  clearSuccess,
  clearMessages,
  setLoading,
  setInitialized,
} = authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectAuthSuccess = (state: { auth: AuthState }) => state.auth.success;
export const selectIsOnboardingComplete = (state: { auth: AuthState }) => state.auth.isOnboardingComplete;
export const selectIsInitialized = (state: { auth: AuthState }) => state.auth.isInitialized;

// Form loading selectors
export const selectSignInLoading = (state: { auth: AuthState }) => state.auth.signInLoading;
export const selectSignUpLoading = (state: { auth: AuthState }) => state.auth.signUpLoading;
export const selectGoogleLoading = (state: { auth: AuthState }) => state.auth.googleLoading;

export default authSlice.reducer;
