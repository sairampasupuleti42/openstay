import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { addNetworkListeners } from '@/utils/pwa';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    // Add network event listeners
    const removeListeners = addNetworkListeners(handleOnline, handleOffline);

    // Cleanup listeners on unmount
    return removeListeners;
  }, []);

  // Auto-hide the offline message after going back online
  useEffect(() => {
    if (isOnline && showOfflineMessage) {
      const timer = setTimeout(() => {
        setShowOfflineMessage(false);
      }, 3000); // Hide after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isOnline, showOfflineMessage]);

  if (!showOfflineMessage && isOnline) {
    return null;
  }

  return (
    <div className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 transition-all duration-300 ${
      isOnline ? 'animate-out slide-out-to-top-4' : 'animate-in slide-in-from-top-4'
    }`}>
      <div className={`rounded-lg p-3 shadow-lg border flex items-center space-x-3 ${
        isOnline 
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        <div className="flex-shrink-0">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {isOnline ? 'Back online!' : 'You\'re offline'}
          </p>
          <p className="text-xs opacity-80">
            {isOnline 
              ? 'Your connection has been restored.' 
              : 'Some features may be limited. We\'ll sync when you\'re back online.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator;