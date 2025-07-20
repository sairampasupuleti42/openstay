import { lazy } from 'react';

// Lazy load auth components
export const SignIn = lazy(() => import('@/pages/auth/SignIn'));
export const SignUp = lazy(() => import('@/pages/auth/SignUp'));
