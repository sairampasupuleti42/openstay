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
  if (await accountUnavailable(auth, user)) {
    return router.createUrlTree(['/auth/account-unavailable']);
  }
  if (!user.emailVerified) return router.createUrlTree(['/auth/verify-email']);
  return true;
};

export const onboardingGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await firstValueFrom(auth.user$);
  if (!user) return router.createUrlTree(['/auth/login']);
  if (await accountUnavailable(auth, user)) {
    return router.createUrlTree(['/auth/account-unavailable']);
  }
  if (!user.emailVerified) return router.createUrlTree(['/auth/verify-email']);
  const profile = await auth.ensureAccountAccess(user);
  return profile?.city?.trim()
    ? router.createUrlTree(['/dashboard'])
    : true;
};

export const dashboardGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await firstValueFrom(auth.user$);
  if (!user) return router.createUrlTree(['/auth/login']);
  if (await accountUnavailable(auth, user)) {
    return router.createUrlTree(['/auth/account-unavailable']);
  }
  if (!user.emailVerified) return router.createUrlTree(['/auth/verify-email']);
  const profile = await auth.ensureAccountAccess(user);
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

async function accountUnavailable(
  auth: AuthService,
  user: NonNullable<AuthService['currentUser']>,
): Promise<boolean> {
  try {
    await auth.ensureAccountAccess(user);
    return false;
  } catch (error) {
    if (auth.isAccountUnavailableError(error)) return true;
    throw error;
  }
}
