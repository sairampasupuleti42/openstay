import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { User } from '@angular/fire/auth';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { dashboardGuard } from './auth.guard';

describe('dashboardGuard', () => {
  it('redirects an unverified user to email verification before loading profile data', async () => {
    const verificationRoute = {} as UrlTree;
    const createUrlTree = vi.fn().mockReturnValue(verificationRoute);
    const getProfile = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            user$: of({ uid: 'traveller-1', emailVerified: false } as User),
            getProfile,
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
    expect(getProfile).not.toHaveBeenCalled();
  });
});
