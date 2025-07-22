import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authSlice from './slices/authSlice';
import userSlice from './slices/userSlice';
import socialSlice from './slices/socialSlice';
import messagingSlice from './slices/messagingSlice';
import uiSlice from './slices/uiSlice';
import { authApi } from './api/authApi';
import { userApi } from './api/userApi';
import { socialApi } from './api/socialApi';
import { messagingApi } from './api/messagingApi';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    user: userSlice,
    social: socialSlice,
    messaging: messagingSlice,
    ui: uiSlice,
    
    // RTK Query API slices
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [socialApi.reducerPath]: socialApi.reducer,
    [messagingApi.reducerPath]: messagingApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore Firebase Timestamp objects in actions
        ignoredActions: [
          'auth/setUser',
          'user/setProfile',
          'messaging/addMessage',
          'messaging/updateConversation',
        ],
        ignoredPaths: [
          'auth.user.metadata',
          'user.profile.createdAt',
          'user.profile.updatedAt',
          'messaging.conversations',
          'messaging.messages',
        ],
      },
    })
      .concat(authApi.middleware)
      .concat(userApi.middleware)
      .concat(socialApi.middleware)
      .concat(messagingApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup RTK Query listeners for refetchOnFocus/refetchOnReconnect behavior
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
