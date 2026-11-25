import { Routes } from '@angular/router';

export const registerRoutes: Routes = [
  {
    path: 'register',
    data: { mode: 'register' },
    loadComponent: () =>
      import('../shared/auth-page.component').then(
        (module) => module.AuthPageComponent,
      ),
  },
];
