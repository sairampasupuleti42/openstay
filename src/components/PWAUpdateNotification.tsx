import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { updateServiceWorker } from '@/utils/pwa';

const PWAUpdateNotification: React.FC = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setShowUpdate(true);
    };

    // Listen for PWA update events
    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateServiceWorker();
    } catch (error) {
      console.error('Failed to update app:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-primary-50 border border-blue-200 rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-top-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-primary-900 text-sm">Update Available</h3>
            <p className="text-xs text-primary-700">A new version of Openstay is ready</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-primary-400 hover:text-primary-600 transition-colors"
          aria-label="Dismiss update notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <p className="text-sm text-primary-700 mb-4">
        Update now to get the latest features and improvements.
      </p>
      
      <div className="flex space-x-2">
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="flex-1 bg-primary-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Updating...' : 'Update Now'}</span>
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-2 text-sm text-primary-600 hover:text-primary-800 transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
};

export default PWAUpdateNotification;