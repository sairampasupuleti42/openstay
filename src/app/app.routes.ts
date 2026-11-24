import { Routes } from '@angular/router';
import {
  authenticatedGuard,
  dashboardGuard,
  onboardingGuard,
  welcomeGuard,
} from './core/firebase/auth.guards';

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
    path: 'auth/:mode',
    loadComponent: () =>
      import('./features/auth/auth-page.component').then(
        (module) => module.AuthPageComponent,
      ),
  },
  {
    path: 'onboarding',
    canActivate: [authenticatedGuard, onboardingGuard],
    loadComponent: () =>
      import('./features/profile/profile-onboarding-page.component').then(
        (module) => module.ProfileOnboardingPageComponent,
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
