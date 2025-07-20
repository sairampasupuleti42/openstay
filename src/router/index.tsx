import { createBrowserRouter } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import AboutPage from '@/pages/About';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/about",
    element: <AboutPage />,
  },
]);
