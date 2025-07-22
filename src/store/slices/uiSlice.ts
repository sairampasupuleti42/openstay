import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

export interface UIState {
  // Global loading states
  isLoading: boolean;
  loadingMessage: string;
  
  // Notifications
  notifications: Notification[];
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Layout
  sidebarOpen: boolean;
  headerVisible: boolean;
  
  // Search
  searchQuery: string;
  searchFilters: Record<string, unknown>;
  
  // Modal states
  modals: Record<string, boolean>;
  
  // Form states
  forms: Record<string, {
    isSubmitting: boolean;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
  }>;
  
  // PWA states
  showPWAInstall: boolean;
  showPWAUpdate: boolean;
  isOffline: boolean;
}

// Initial state
const initialState: UIState = {
  isLoading: false,
  loadingMessage: '',
  notifications: [],
  theme: 'system',
  sidebarOpen: false,
  headerVisible: true,
  searchQuery: '',
  searchFilters: {},
  modals: {},
  forms: {},
  showPWAInstall: false,
  showPWAUpdate: false,
  isOffline: false,
};

// UI slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setLoadingMessage: (state, action: PayloadAction<string>) => {
      state.loadingMessage = action.payload;
    },
    
    // Notifications
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    // Theme
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    
    // Layout
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setHeaderVisible: (state, action: PayloadAction<boolean>) => {
      state.headerVisible = action.payload;
    },
    
    // Search
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSearchFilters: (state, action: PayloadAction<Record<string, unknown>>) => {
      state.searchFilters = action.payload;
    },
    updateSearchFilter: (state, action: PayloadAction<{ key: string; value: unknown }>) => {
      state.searchFilters[action.payload.key] = action.payload.value;
    },
    clearSearchFilters: (state) => {
      state.searchFilters = {};
    },
    
    // Modals
    setModal: (state, action: PayloadAction<{ name: string; isOpen: boolean }>) => {
      state.modals[action.payload.name] = action.payload.isOpen;
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = false;
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(key => {
        state.modals[key] = false;
      });
    },
    
    // Forms
    setFormState: (state, action: PayloadAction<{
      formName: string;
      isSubmitting?: boolean;
      errors?: Record<string, string>;
      touched?: Record<string, boolean>;
    }>) => {
      const { formName, ...formState } = action.payload;
      if (!state.forms[formName]) {
        state.forms[formName] = {
          isSubmitting: false,
          errors: {},
          touched: {},
        };
      }
      Object.assign(state.forms[formName], formState);
    },
    setFormSubmitting: (state, action: PayloadAction<{ formName: string; isSubmitting: boolean }>) => {
      if (!state.forms[action.payload.formName]) {
        state.forms[action.payload.formName] = {
          isSubmitting: false,
          errors: {},
          touched: {},
        };
      }
      state.forms[action.payload.formName].isSubmitting = action.payload.isSubmitting;
    },
    setFormErrors: (state, action: PayloadAction<{ formName: string; errors: Record<string, string> }>) => {
      if (!state.forms[action.payload.formName]) {
        state.forms[action.payload.formName] = {
          isSubmitting: false,
          errors: {},
          touched: {},
        };
      }
      state.forms[action.payload.formName].errors = action.payload.errors;
    },
    clearForm: (state, action: PayloadAction<string>) => {
      delete state.forms[action.payload];
    },
    
    // PWA states
    setShowPWAInstall: (state, action: PayloadAction<boolean>) => {
      state.showPWAInstall = action.payload;
    },
    setShowPWAUpdate: (state, action: PayloadAction<boolean>) => {
      state.showPWAUpdate = action.payload;
    },
    setOfflineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOffline = action.payload;
    },
  },
});

// Export actions
export const {
  setLoading,
  setLoadingMessage,
  addNotification,
  removeNotification,
  clearNotifications,
  setTheme,
  setSidebarOpen,
  toggleSidebar,
  setHeaderVisible,
  setSearchQuery,
  setSearchFilters,
  updateSearchFilter,
  clearSearchFilters,
  setModal,
  openModal,
  closeModal,
  closeAllModals,
  setFormState,
  setFormSubmitting,
  setFormErrors,
  clearForm,
  setShowPWAInstall,
  setShowPWAUpdate,
  setOfflineStatus,
} = uiSlice.actions;

// Selectors
export const selectUI = (state: { ui: UIState }) => state.ui;
export const selectIsLoading = (state: { ui: UIState }) => state.ui.isLoading;
export const selectLoadingMessage = (state: { ui: UIState }) => state.ui.loadingMessage;
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectSidebarOpen = (state: { ui: UIState }) => state.ui.sidebarOpen;
export const selectHeaderVisible = (state: { ui: UIState }) => state.ui.headerVisible;
export const selectSearchQuery = (state: { ui: UIState }) => state.ui.searchQuery;
export const selectSearchFilters = (state: { ui: UIState }) => state.ui.searchFilters;
export const selectModal = (state: { ui: UIState }, name: string) => state.ui.modals[name] || false;
export const selectFormState = (state: { ui: UIState }, formName: string) => 
  state.ui.forms[formName] || { isSubmitting: false, errors: {}, touched: {} };
export const selectShowPWAInstall = (state: { ui: UIState }) => state.ui.showPWAInstall;
export const selectShowPWAUpdate = (state: { ui: UIState }) => state.ui.showPWAUpdate;
export const selectIsOffline = (state: { ui: UIState }) => state.ui.isOffline;

export default uiSlice.reducer;
