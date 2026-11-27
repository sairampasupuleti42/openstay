import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '@angular/fire/auth';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthPageComponent } from './auth-page.component';

describe('AuthPageComponent email verification and recovery', () => {
  const refreshCurrentUser = vi.fn();
  const destinationFor = vi.fn();
  const resendVerification = vi.fn();
  const sendPasswordReset = vi.fn();
  const isUnknownEmailError = vi.fn();
  const getErrorMessage = vi.fn();
  const navigateByUrl = vi.fn();
  let mode = 'verify-email';
  let returnUrl: string | null;

  beforeEach(async () => {
    refreshCurrentUser.mockReset();
    destinationFor.mockReset();
    resendVerification.mockReset();
    sendPasswordReset.mockReset();
    isUnknownEmailError.mockReset();
    getErrorMessage.mockReset();
    navigateByUrl.mockReset();
    mode = 'verify-email';
    returnUrl = null;

    await TestBed.configureTestingModule({
      imports: [AuthPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            get data() {
              return of({ mode });
            },
            snapshot: {
              data: { mode: 'verify-email' },
              queryParamMap: { get: (name: string) => name === 'returnUrl' ? returnUrl : null },
            },
          },
        },
        {
          provide: Router,
          useValue: {
            navigateByUrl,
            parseUrl: (url: string) => ({ url }),
            serializeUrl: (tree: { url: string }) => tree.url,
          },
        },
        {
          provide: AuthService,
          useValue: {
            refreshCurrentUser,
            destinationFor,
            resendVerification,
            sendPasswordReset,
            isUnknownEmailError,
            getErrorMessage,
          },
        },
      ],
    }).compileComponents();
  });

  it('detects the verified state after refreshing the current user', async () => {
    const user = { uid: 'traveller-1', emailVerified: true } as User;
    returnUrl = '/requests/new/listing-1';
    refreshCurrentUser.mockResolvedValue(user);
    destinationFor.mockResolvedValue('/dashboard');
    const component = TestBed.createComponent(AuthPageComponent).componentInstance;

    await component.checkVerification();

    expect(refreshCurrentUser).toHaveBeenCalledOnce();
    expect(destinationFor).toHaveBeenCalledWith(user);
    expect(navigateByUrl).toHaveBeenCalledWith('/requests/new/listing-1');
    expect(component.errorMessage()).toBe('');
  });

  it('detects an already verified account when the verification screen loads', async () => {
    const user = { uid: 'traveller-1', emailVerified: true } as User;
    refreshCurrentUser.mockResolvedValue(user);
    destinationFor.mockResolvedValue('/dashboard');
    const fixture = TestBed.createComponent(AuthPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(navigateByUrl).toHaveBeenCalledWith('/dashboard'));

    expect(refreshCurrentUser).toHaveBeenCalledOnce();
    expect(destinationFor).toHaveBeenCalledWith(user);
  });

  it('keeps an unverified user on the verification screen after refresh', async () => {
    refreshCurrentUser.mockResolvedValue({
      uid: 'traveller-1',
      emailVerified: false,
    } as User);
    const component = TestBed.createComponent(AuthPageComponent).componentInstance;

    await component.checkVerification();

    expect(component.errorMessage()).toContain('not verified yet');
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(destinationFor).not.toHaveBeenCalled();
  });

  it('sends a password reset email and displays success', async () => {
    mode = 'forgot-password';
    const fixture = TestBed.createComponent(AuthPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.controls.email.setValue('traveller@example.com');

    await component.submit();

    expect(sendPasswordReset).toHaveBeenCalledWith('traveller@example.com');
    expect(component.successMessage()).toContain('reset link is on its way');
    expect(component.errorMessage()).toBe('');
  });
});
