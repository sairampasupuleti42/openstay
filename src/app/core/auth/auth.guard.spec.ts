import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { User } from '@angular/fire/auth';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { authenticatedGuard, dashboardGuard } from './auth.guard';

describe('dashboardGuard', () => {
  it('redirects an unverified user to email verification before loading profile data', async () => {
    const verificationRoute = {} as UrlTree;
    const createUrlTree = vi.fn().mockReturnValue(verificationRoute);
    const ensureAccountAccess = vi.fn().mockResolvedValue({
      accountStatus: 'active',
      city: undefined,
    });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            user$: of({ uid: 'traveller-1', emailVerified: false } as User),
            ensureAccountAccess,
            isAccountUnavailableError: vi.fn(),
          },
        },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    const result = await TestBed.runInInjectionContext(() =>
      dashboardGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/dashboard' } as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(verificationRoute);
    expect(createUrlTree).toHaveBeenCalledWith(['/auth/verify-email']);
    expect(ensureAccountAccess).toHaveBeenCalled();
  });

  it('routes a verified user without a completed profile to onboarding', async () => {
    const onboardingRoute = {} as UrlTree;
    const createUrlTree = vi.fn().mockReturnValue(onboardingRoute);
    const ensureAccountAccess = vi.fn().mockResolvedValue({
      accountStatus: 'active',
      city: undefined,
    });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            user$: of({ uid: 'traveller-1', emailVerified: true } as User),
            ensureAccountAccess,
            isAccountUnavailableError: vi.fn(),
          },
        },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    const result = await TestBed.runInInjectionContext(() =>
      dashboardGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/dashboard' } as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(onboardingRoute);
    expect(createUrlTree).toHaveBeenCalledWith(['/onboarding']);
  });

  it('blocks a suspended user even when their email is unverified', async () => {
    const unavailableRoute = {} as UrlTree;
    const createUrlTree = vi.fn().mockReturnValue(unavailableRoute);
    const ensureAccountAccess = vi.fn().mockRejectedValue(new Error('ACCOUNT_SUSPENDED'));
    const isAccountUnavailableError = vi.fn((error: unknown) =>
      error instanceof Error && error.message === 'ACCOUNT_SUSPENDED',
    );

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            user$: of({ uid: 'traveller-1', emailVerified: false } as User),
            ensureAccountAccess,
            isAccountUnavailableError,
          },
        },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    const result = await TestBed.runInInjectionContext(() =>
      authenticatedGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/dashboard' } as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(unavailableRoute);
    expect(createUrlTree).toHaveBeenCalledWith(['/auth/account-unavailable']);
  });

  it('sends active authenticated users to verification until their email is verified', async () => {
    const verificationRoute = {} as UrlTree;
    const createUrlTree = vi.fn().mockReturnValue(verificationRoute);
    const ensureAccountAccess = vi.fn().mockResolvedValue({ accountStatus: 'active' });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            user$: of({ uid: 'traveller-1', emailVerified: false } as User),
            ensureAccountAccess,
            isAccountUnavailableError: vi.fn(),
          },
        },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    const result = await TestBed.runInInjectionContext(() =>
      authenticatedGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/dashboard' } as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(verificationRoute);
    expect(createUrlTree).toHaveBeenCalledWith(['/auth/verify-email']);
  });
});
