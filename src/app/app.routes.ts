import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
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
  { path: '**', redirectTo: '' },
];
