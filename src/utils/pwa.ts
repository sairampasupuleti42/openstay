// PWA utility functions

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

/**
 * Check if the app is running as an installed PWA
 */
export const isPWAInstalled = (): boolean => {
  // Check if running in standalone mode (PWA installed)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Check if running in PWA mode on iOS Safari
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  // Check for Chrome PWA indicators
  const isInWebApk = document.referrer.includes('android-app://');
  
  return isStandalone || isIOSStandalone || isInWebApk;
};

/**
 * Check if PWA installation is supported
 */
export const isPWAInstallable = (): boolean => {
  return 'serviceWorker' in navigator && 
         'PushManager' in window &&
         'Notification' in window;
};

/**
 * Get PWA installation status
 */
export const getPWAInstallStatus = () => {
  return {
    isInstalled: isPWAInstalled(),
    isInstallable: isPWAInstallable(),
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsNotifications: 'Notification' in window,
    supportsPush: 'PushManager' in window,
  };
};

/**
 * Register service worker
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered successfully:', registration);
    
    // Update service worker when new version is available
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available, could show update notification
            console.log('New app version available');
            showUpdateAvailable();
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

/**
 * Show update available notification
 */
const showUpdateAvailable = () => {
  // Dispatch custom event that components can listen to
  window.dispatchEvent(new CustomEvent('pwa-update-available'));
};

/**
 * Update service worker and reload
 */
export const updateServiceWorker = async (): Promise<void> => {
  if (!navigator.serviceWorker.controller) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  } catch (error) {
    console.error('Failed to update service worker:', error);
  }
};

/**
 * Check online/offline status
 */
export const getNetworkStatus = () => ({
  isOnline: navigator.onLine,
  connection: (navigator as any).connection,
});

/**
 * Add online/offline event listeners
 */
export const addNetworkListeners = (
  onOnline: () => void,
  onOffline: () => void
) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

/**
 * Show local notification
 */
export const showNotification = (
  title: string, 
  options: NotificationOptions = {}
): Notification | null => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const defaultOptions: NotificationOptions = {
    icon: '/src/assets/logo/transparent/icon.png',
    badge: '/src/assets/logo/transparent/icon.png',
    ...options,
  };

  // Add vibration pattern separately (not part of standard NotificationOptions)
  if ('vibrate' in navigator) {
    (navigator as any).vibrate([200, 100, 200]);
  }

  return new Notification(title, defaultOptions);
};

/**
 * Get app install prompt local storage key
 */
const INSTALL_PROMPT_STORAGE_KEY = 'pwa-install-prompt';

/**
 * PWA install prompt management
 */
export const installPromptManager = {
  getLastShown: (): Date | null => {
    const stored = localStorage.getItem(`${INSTALL_PROMPT_STORAGE_KEY}-last-shown`);
    return stored ? new Date(stored) : null;
  },

  setLastShown: (date: Date = new Date()): void => {
    localStorage.setItem(`${INSTALL_PROMPT_STORAGE_KEY}-last-shown`, date.toISOString());
  },

  isDismissedPermanently: (): boolean => {
    return localStorage.getItem(`${INSTALL_PROMPT_STORAGE_KEY}-dismissed`) === 'permanent';
  },

  setDismissedPermanently: (): void => {
    localStorage.setItem(`${INSTALL_PROMPT_STORAGE_KEY}-dismissed`, 'permanent');
  },

  shouldShowPrompt: (): boolean => {
    if (isPWAInstalled() || installPromptManager.isDismissedPermanently()) {
      return false;
    }

    const lastShown = installPromptManager.getLastShown();
    if (!lastShown) {
      return true;
    }

    // Show again after 24 hours
    const hoursSinceLastShown = (Date.now() - lastShown.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastShown >= 24;
  },

  clearData: (): void => {
    localStorage.removeItem(`${INSTALL_PROMPT_STORAGE_KEY}-last-shown`);
    localStorage.removeItem(`${INSTALL_PROMPT_STORAGE_KEY}-dismissed`);
  },
};

/**
 * Handle PWA installation
 */
export const handlePWAInstall = async (
  deferredPrompt: BeforeInstallPromptEvent
): Promise<'accepted' | 'dismissed'> => {
  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      // Clear install prompt data since app is being installed
      installPromptManager.clearData();
    } else {
      console.log('User dismissed the install prompt');
    }
    
    return outcome;
  } catch (error) {
    console.error('Error during PWA installation:', error);
    return 'dismissed';
  }
};

/**
 * Initialize PWA features
 */
export const initializePWA = async () => {
  console.log('Initializing PWA features...');
  
  // Register service worker
  await registerServiceWorker();
  
  // Log PWA status
  const status = getPWAInstallStatus();
  console.log('PWA Status:', status);
  
  // Request notification permission if not already granted
  if (status.supportsNotifications && Notification.permission === 'default') {
    // Don't request immediately, let user trigger this through UI
    console.log('Notification permission available to request');
  }
  
  return status;
};