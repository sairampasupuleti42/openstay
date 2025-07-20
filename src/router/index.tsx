import { createBrowserRouter } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import AboutPage from '@/pages/About';
import Contact from '@/pages/Contact';
import AuthLayout from '@/components/AuthLayout';
import LazyLoadSpinner from '@/LazyLoadSpinner';

// Lazy load auth components
const SignIn = lazy(() => import('@/pages/auth/SignIn'));
const SignUp = lazy(() => import('@/pages/auth/SignUp'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: '/about',
        element: <AboutPage />
      },
      {
        path: '/contact',
        element: <Contact />
      }
    ]
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'signin',
        element: (
          <Suspense fallback={<LazyLoadSpinner />}>
            <SignIn />
          </Suspense>
        )
      },
      {
        path: 'signup',
        element: (
          <Suspense fallback={<LazyLoadSpinner />}>
            <SignUp />
          </Suspense>
        )
      },
      {
        path: 'forgot-password',
        element: (
          <Suspense fallback={<LazyLoadSpinner />}>
            <ForgotPassword />
          </Suspense>
        )
      }
    ]
  }
]);
