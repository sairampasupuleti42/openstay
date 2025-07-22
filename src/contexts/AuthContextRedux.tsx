import React, { createContext, useContext, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUser, setInitialized, selectAuth } from '@/store/slices/authSlice';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  isAuthenticated: false,
  isInitialized: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector(selectAuth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      dispatch(setUser(user));
      dispatch(setInitialized(true));
    });

    return unsubscribe;
  }, [dispatch]);

  const value: AuthContextType = {
    currentUser: authState.user,
    loading: authState.isLoading || !authState.isInitialized,
    isAuthenticated: authState.isAuthenticated,
    isInitialized: authState.isInitialized,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
