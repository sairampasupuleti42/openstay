import { Routes } from '@angular/router';

export const loginRoutes: Routes = [
  {
    path: 'login',
    data: { mode: 'login' },
    loadComponent: () =>
      import('../shared/auth-page.component').then(
        (module) => module.AuthPageComponent,
      ),
  },
];
