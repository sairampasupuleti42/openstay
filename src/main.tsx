import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'
import { AuthProvider } from '@/contexts/AuthContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import { initializePWA } from '@/utils/pwa'

const container = document.getElementById('root')!;
const root = createRoot(container);

// Initialize PWA features
initializePWA().then((status) => {
  console.log('PWA initialized with status:', status);
}).catch((error) => {
  console.error('Failed to initialize PWA:', error);
});

root.render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
)
