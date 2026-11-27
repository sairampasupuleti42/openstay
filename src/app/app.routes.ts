import { Routes } from '@angular/router';
import {
  authenticatedGuard,
  dashboardGuard,
  welcomeGuard,
} from './core/auth/auth.guard';
import { authenticationRoutes } from './features/authentication/authentication.routes';
import { onboardingRoutes } from './features/onboarding/onboarding.routes';

export const routes: Routes = [
  {
    path: '',
    canActivate: [welcomeGuard],
    loadComponent: () =>
      import('./features/home/home-page.component').then(
        (module) => module.HomePageComponent,
      ),
  },
  {
    path: 'explore',
    loadComponent: () =>
      import('./features/discovery/discovery-page.component').then(
        (module) => module.DiscoveryPageComponent,
      ),
  },
  {
    path: 'listings/:listingId',
    loadComponent: () =>
      import('./features/discovery/public-listing-detail-page.component').then(
        (module) => module.PublicListingDetailPageComponent,
      ),
  },
  { path: 'auth', children: authenticationRoutes },
  {
    path: 'onboarding',
    children: onboardingRoutes,
  },
  {
    path: 'hosting',
    canActivate: [authenticatedGuard],
    loadChildren: () =>
      import('./features/hosting/hosting.routes').then(
        (module) => module.hostingRoutes,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authenticatedGuard, dashboardGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard-page.component').then(
        (module) => module.DashboardPageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
