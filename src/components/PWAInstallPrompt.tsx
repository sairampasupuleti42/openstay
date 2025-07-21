import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { 
  isPWAInstalled, 
  installPromptManager, 
  handlePWAInstall 
} from '@/utils/pwa';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if PWA is already installed
  const checkIfInstalled = () => {
    return isPWAInstalled();
  };

  // Check if we should show the prompt today
  const shouldShowPrompt = () => {
    return installPromptManager.shouldShowPrompt();
  };

  useEffect(() => {
    // Check if already installed
    if (checkIfInstalled()) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const beforeInstallPromptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(beforeInstallPromptEvent);
      
      // Show prompt if conditions are met
      if (shouldShowPrompt()) {
        setShowPrompt(true);
        installPromptManager.setLastShown();
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      installPromptManager.clearData();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    const outcome = await handlePWAInstall(deferredPrompt);
    setDeferredPrompt(null);
    setShowPrompt(false);
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  const handleDismissPermanent = () => {
    setShowPrompt(false);
    installPromptManager.setDismissedPermanently();
  };

  // Don't render if installed or shouldn't show
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Install Openstay</h3>
            <p className="text-xs text-gray-600">Get the full app experience</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Install Openstay as an app for faster access, offline support, and a native experience.
      </p>
      
      <div className="flex space-x-2">
        <button
          onClick={handleInstall}
          className="flex-1 bg-primary-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-1"
        >
          <Download className="w-4 h-4" />
          <span>Install</span>
        </button>
        <button
          onClick={handleDismissPermanent}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;