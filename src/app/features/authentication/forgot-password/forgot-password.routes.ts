import { Routes } from '@angular/router';

export const forgotPasswordRoutes: Routes = [
  {
    path: 'forgot-password',
    data: { mode: 'forgot-password' },
    loadComponent: () =>
      import('../shared/auth-page.component').then(
        (module) => module.AuthPageComponent,
      ),
  },
];
