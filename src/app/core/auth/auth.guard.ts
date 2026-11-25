import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export const authenticatedGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await firstValueFrom(auth.user$);
  if (!user) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }
  if (!user.emailVerified) return router.createUrlTree(['/auth/verify-email']);
  return true;
};

export const onboardingGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await firstValueFrom(auth.user$);
  if (!user) return router.createUrlTree(['/auth/login']);
  if (!user.emailVerified) return router.createUrlTree(['/auth/verify-email']);
  const profile = await auth.getProfile(user.uid);
  return profile?.city?.trim()
    ? router.createUrlTree(['/dashboard'])
    : true;
};

export const dashboardGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await firstValueFrom(auth.user$);
  if (!user) return router.createUrlTree(['/auth/login']);
  if (!user.emailVerified) return router.createUrlTree(['/auth/verify-email']);
  const profile = await auth.getProfile(user.uid);
  return profile?.city?.trim()
    ? true
    : router.createUrlTree(['/onboarding']);
};

export const welcomeGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await firstValueFrom(auth.user$);
  if (!user) return true;
  return router.createUrlTree([await auth.destinationFor(user)]);
};
