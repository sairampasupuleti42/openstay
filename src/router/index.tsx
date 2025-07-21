import { createBrowserRouter } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from '@/components/Layout';
import HomePageNew from '@/pages/HomePageNew';
import AboutPage from '@/pages/About';
import Contact from '@/pages/Contact';
import AuthLayout from '@/components/AuthLayout';
import LazyLoadSpinner from '@/LazyLoadSpinner';

// Lazy load auth components
const SignIn = lazy(() => import('@/pages/auth/SignIn'));
const SignUp = lazy(() => import('@/pages/auth/SignUp'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));

// Lazy load profile component
const Profile = lazy(() => import('@/pages/Profile'));
const Settings = lazy(() => import('@/pages/Settings'));
const OnboardingPageNew = lazy(() => import('@/pages/OnboardingPageNew'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const SearchResultsPage = lazy(() => import('@/pages/SearchResultsPage'));

// Lazy load legal pages
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsConditions = lazy(() => import('@/pages/TermsConditions'));

// Lazy load admin pages
const IncidentResponseDashboard = lazy(() => import('@/pages/admin/IncidentResponseDashboard'));
const IncidentDetails = lazy(() => import('@/pages/admin/IncidentDetails'));

// Lazy load admin layout
const AdminLayout = lazy(() => import('@/components/AdminLayout'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePageNew />
      },
      {
        path: '/about',
        element: <AboutPage />
      },
      {
        path: '/contact',
        element: <Contact />
      },
      {
        path: '/profile',
        element: (
          <Suspense fallback={<LazyLoadSpinner />}>
            <Profile />
          </Suspense>
        )
      },
      {
        path: '/settings',
        element: (
          <Suspense fallback={<LazyLoadSpinner />}>
            <Settings />
          </Suspense>
        )
      },
      {
        path: '/onboarding',
        element: (
          <Suspense fallback={<LazyLoadSpinner />}>
            <OnboardingPageNew />
          </Suspense>
        )
      },
      {
        path: '/search',
        element: (
          <Suspense fallback={<LazyLoadSpinner />}>
            <SearchPage />
          </Suspense>
        )
      },
      {
        path: '/search/results',
        element: (
          <Suspense fallback={<LazyLoadSpinner />}>
            <SearchResultsPage />
          </Suspense>
        )
      },
      {
        path: '/privacy-policy',
        element: (
          <Suspense fallback={<LazyLoadSpinner />}>
            <PrivacyPolicy />
          </Suspense>
        )
      },
      {
        path: '/terms-conditions',
        element: (
          <Suspense fallback={<LazyLoadSpinner />}>
            <TermsConditions />
          </Suspense>
        )
      }
    ]
  },
  {
    path: '/admin',
    element: (
      <Suspense fallback={<LazyLoadSpinner />}>
        <AdminLayout />
      </Suspense>
    ),
    children: [
      {
        path: 'incidents',
        element: (
          <Suspense fallback={<LazyLoadSpinner />}>
            <IncidentResponseDashboard />
          </Suspense>
        )
      },
      {
        path: 'incidents/:id',
        element: (
          <Suspense fallback={<LazyLoadSpinner />}>
            <IncidentDetails />
          </Suspense>
        )
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
