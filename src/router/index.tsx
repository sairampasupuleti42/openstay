import { createBrowserRouter } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import HomePageNew from '@/pages/HomePageNew';
import AboutPage from '@/pages/About';
import Contact from '@/pages/Contact';
import AuthLayout from '@/components/AuthLayout';
import LazyLoadSpinner from '@/LazyLoadSpinner';

// Lazy load auth components
const SignIn = lazy(() => import('@/pages/auth/SignIn'));
const SignUp = lazy(() => import('@/pages/auth/SignUp'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));

// Lazy load profile components with better chunking
const Profile = lazy(() => import(/* webpackChunkName: "profile" */ '@/pages/Profile'));
const Settings = lazy(() => import(/* webpackChunkName: "settings" */ '@/pages/Settings'));
const OnboardingPageNew = lazy(() => import(/* webpackChunkName: "onboarding" */ '@/pages/OnboardingPageNew'));

// Lazy load search components
const SearchPage = lazy(() => import(/* webpackChunkName: "search" */ '@/pages/SearchPage'));
const SearchResultsPage = lazy(() => import(/* webpackChunkName: "search" */ '@/pages/SearchResultsPage'));
const Explore = lazy(() => import(/* webpackChunkName: "explore" */ '@/pages/Explore'));

// Lazy load legal pages - group them together
const PrivacyPolicy = lazy(() => import(/* webpackChunkName: "legal" */ '@/pages/PrivacyPolicy'));
const TermsConditions = lazy(() => import(/* webpackChunkName: "legal" */ '@/pages/TermsConditions'));

// Lazy load admin pages - separate chunk for admin functionality
const IncidentResponseDashboard = lazy(() => import(/* webpackChunkName: "admin" */ '@/modules/incident/pages/IncidentResponseDashboard'));
const IncidentDetails = lazy(() => import(/* webpackChunkName: "admin" */ '@/modules/incident/pages/IncidentDetails'));
const IncidentReportPage = lazy(() => import(/* webpackChunkName: "incident" */ '@/modules/incident/pages/IncidentReportPage'));

// Lazy load admin layout
const AdminLayout = lazy(() => import(/* webpackChunkName: "admin" */ '@/components/AdminLayout'));

// Lazy load social components - separate chunk for social functionality
const FollowersPage = lazy(() => import(/* webpackChunkName: "social" */ '@/modules/social/pages/FollowersPage'));
const FollowingPage = lazy(() => import(/* webpackChunkName: "social" */ '@/modules/social/pages/FollowingPage'));

// Lazy load messaging components - separate chunk for messaging functionality
const MessagingPage = lazy(() => import(/* webpackChunkName: "messaging" */ '@/modules/messaging/pages/MessagingPage'));

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
        path: '/explore',
        element: (
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<LazyLoadSpinner />}>
              <Explore />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: '/profile',
        element: (
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<LazyLoadSpinner />}>
              <Profile />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: '/settings',
        element: (
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<LazyLoadSpinner />}>
              <Settings />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: '/onboarding',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LazyLoadSpinner />}>
              <OnboardingPageNew />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: '/report-incident',
        element: (
          <Suspense fallback={<LazyLoadSpinner />}>
            <IncidentReportPage />
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
      },
      {
        path: '/social/followers',
        element: (
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<LazyLoadSpinner />}>
              <FollowersPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: '/social/following',
        element: (
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<LazyLoadSpinner />}>
              <FollowingPage />
            </Suspense>
          </ProtectedRoute>
        )
      },
      {
        path: '/messages',
        element: (
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<LazyLoadSpinner />}>
              <MessagingPage />
            </Suspense>
          </ProtectedRoute>
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
