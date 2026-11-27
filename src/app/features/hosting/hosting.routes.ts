import { Routes } from '@angular/router';
import { ListingService } from '../../core/services/listing.service';

export const hostingRoutes: Routes = [
  {
    path: '',
    providers: [ListingService],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./onboarding/host-onboarding.component').then(
            (module) => module.HostOnboardingComponent,
          ),
      },
      {
        path: 'listings/new',
        loadComponent: () =>
          import('./listings/listing-editor-page.component').then(
            (module) => module.ListingEditorPageComponent,
          ),
      },
      {
        path: 'listings/:listingId/edit',
        loadComponent: () =>
          import('./listings/listing-editor-page.component').then(
            (module) => module.ListingEditorPageComponent,
          ),
      },
      {
        path: 'listings/:listingId',
        loadComponent: () =>
          import('./listings/listing-detail-page.component').then(
            (module) => module.ListingDetailPageComponent,
          ),
      },
      {
        path: 'listings',
        loadComponent: () =>
          import('./listings/host-listings-page.component').then(
            (module) => module.HostListingsPageComponent,
          ),
      },
    ],
  },
];
