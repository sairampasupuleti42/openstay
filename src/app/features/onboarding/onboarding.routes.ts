import { Routes } from '@angular/router';
import { authenticatedGuard, onboardingGuard } from '../../core/auth/auth.guard';

export const onboardingRoutes: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard, onboardingGuard],
    loadComponent: () =>
      import('./profile-setup/profile-setup.component').then(
        (module) => module.ProfileOnboardingPageComponent,
      ),
  },
];
