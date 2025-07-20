import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface OnboardingRedirectProps {
  children: React.ReactNode;
}

const OnboardingRedirect: React.FC<OnboardingRedirectProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!currentUser || loading) return;

      // Skip onboarding check if already on onboarding page or auth pages
      if (location.pathname.startsWith('/onboarding') || location.pathname.startsWith('/auth')) {
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (!userDoc.exists()) {
          // New user - redirect to onboarding
          console.log('New user detected, redirecting to onboarding');
          navigate('/onboarding');
          return;
        }

        const userData = userDoc.data();
        if (!userData.isOnboardingComplete) {
          // User hasn't completed onboarding
          console.log('User onboarding incomplete, redirecting to onboarding');
          navigate('/onboarding');
          return;
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // On error, don't redirect - let user continue
      }
    };

    checkOnboardingStatus();
  }, [currentUser, loading, navigate, location.pathname]);

  return <>{children}</>;
};

export default OnboardingRedirect;
