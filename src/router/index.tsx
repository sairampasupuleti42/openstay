import { createBrowserRouter } from 'react-router-dom';
import { Suspense } from 'react';
import Layout from '@/components/Layout';
import AuthLayout from '@/components/AuthLayout';
import LazyLoadSpinner from '@/components/LazyLoadSpinner';
import HomePage from '@/pages/HomePage';
import AboutPage from '@/pages/About';
import Contact from '@/pages/Contact';
import { SignIn, SignUp } from './authRoutes';

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
      }
    ]
  }
]);
