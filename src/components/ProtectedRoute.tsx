import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/services/userService';
import LazyLoadSpinner from '@/LazyLoadSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireOnboarding = false 
}) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (currentUser) {
        try {
          const userProfile = await getUserProfile(currentUser.uid);
          setIsOnboardingComplete(userProfile?.isOnboardingComplete || false);
        } catch (error) {
          console.error('Error checking onboarding status:', error);
        }
      }
      setProfileLoading(false);
    };

    if (!authLoading) {
      checkOnboardingStatus();
    }
  }, [currentUser, authLoading]);

  // Show loading while checking authentication and profile
  if (authLoading || profileLoading) {
    return <LazyLoadSpinner />;
  }

  // Redirect to sign in if not authenticated
  if (!currentUser) {
    return <Navigate to="/auth/signin" replace />;
  }

  // If onboarding is required but not complete, redirect to onboarding
  if (requireOnboarding && !isOnboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  // If accessing onboarding but already complete, redirect to home
  if (!requireOnboarding && window.location.pathname === '/onboarding' && isOnboardingComplete) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
