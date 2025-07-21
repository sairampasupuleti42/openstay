import { lazy } from 'react';

// Lazy load social module components
export const FollowersPage = lazy(() => import('./pages/FollowersPage'));
export const FollowingPage = lazy(() => import('./pages/FollowingPage'));

// Export components and services
export { default as UserCard } from './components/UserCard';
export { socialService } from './services/socialService';
export { notificationService } from './services/notificationService';
export type { Notification, CreateNotificationData } from './services/notificationService';
