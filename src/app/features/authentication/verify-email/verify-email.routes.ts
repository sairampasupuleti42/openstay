import { Routes } from '@angular/router';

export const verifyEmailRoutes: Routes = [
  {
    path: 'verify-email',
    data: { mode: 'verify-email' },
    loadComponent: () =>
      import('../shared/auth-page.component').then(
        (module) => module.AuthPageComponent,
      ),
  },
];
