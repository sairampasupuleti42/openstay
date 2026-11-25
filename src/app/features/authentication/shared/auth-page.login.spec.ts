import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '@angular/fire/auth';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthPageComponent } from './auth-page.component';

describe('AuthPageComponent login', () => {
  const signIn = vi.fn();
  const destinationFor = vi.fn();
  const getErrorMessage = vi.fn();
  const navigateByUrl = vi.fn();

  beforeEach(async () => {
    signIn.mockReset();
    destinationFor.mockReset();
    getErrorMessage.mockReset();
    navigateByUrl.mockReset();
    await TestBed.configureTestingModule({
      imports: [AuthPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ mode: 'login' }),
            snapshot: { data: { mode: 'login' } },
          },
        },
        { provide: Router, useValue: { navigateByUrl } },
        {
          provide: AuthService,
          useValue: { signIn, destinationFor, getErrorMessage },
        },
      ],
    }).compileComponents();
  });

  function createComponent() {
    const component = TestBed.createComponent(AuthPageComponent).componentInstance;
    component.form.controls.email.setValue('traveller@example.com');
    component.form.controls.password.setValue('OpenstayRoad!2026');
    return component;
  }

  it('signs in a verified user and opens the dashboard', async () => {
    const user = { uid: 'traveller-1', emailVerified: true } as User;
    signIn.mockResolvedValue(user);
    destinationFor.mockResolvedValue('/dashboard');
    const component = createComponent();

    await component.submit();

    expect(signIn).toHaveBeenCalledWith('traveller@example.com', 'OpenstayRoad!2026');
    expect(destinationFor).toHaveBeenCalledWith(user);
    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
    expect(component.errorMessage()).toBe('');
  });

  it('routes an unverified user to the verification screen', async () => {
    const user = { uid: 'traveller-1', emailVerified: false } as User;
    signIn.mockResolvedValue(user);
    destinationFor.mockResolvedValue('/auth/verify-email');
    const component = createComponent();

    await component.submit();

    expect(navigateByUrl).toHaveBeenCalledWith('/auth/verify-email');
  });

  it('displays Firebase credential errors without navigating', async () => {
    signIn.mockRejectedValue({ code: 'auth/invalid-credential' });
    getErrorMessage.mockReturnValue('The email or password is incorrect.');
    const component = createComponent();

    await component.submit();

    expect(component.errorMessage()).toBe('The email or password is incorrect.');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('routes an active user without a completed profile to onboarding', async () => {
    const user = { uid: 'traveller-1', emailVerified: true } as User;
    signIn.mockResolvedValue(user);
    destinationFor.mockResolvedValue('/onboarding');
    const component = createComponent();

    await component.submit();

    expect(navigateByUrl).toHaveBeenCalledWith('/onboarding');
  });

  it('shows the suspended-account error without granting access', async () => {
    signIn.mockRejectedValue(new Error('ACCOUNT_SUSPENDED'));
    getErrorMessage.mockReturnValue('This account has been suspended. Contact support for assistance.');
    const component = createComponent();

    await component.submit();

    expect(component.errorMessage()).toBe(
      'This account has been suspended. Contact support for assistance.',
    );
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('rejects invalid email and weak password before contacting Firebase', async () => {
    const component = createComponent();
    component.form.controls.email.setValue('not-an-email');
    component.form.controls.password.setValue('short');

    await component.submit();

    expect(component.form.controls.email.invalid).toBe(true);
    expect(component.form.controls.password.invalid).toBe(true);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('toggles password visibility with an accessible control', () => {
    const fixture = TestBed.createComponent(AuthPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.auth-brand img')?.getAttribute('alt')).toBe('Openstay');
    expect(fixture.nativeElement.querySelector('input[type="email"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.forgot-link a')?.textContent).toContain('Forgot your password?');
    expect(fixture.nativeElement.querySelector('.switch-mode a')?.textContent).toContain('Join Openstay');
    expect(fixture.nativeElement.querySelector('.google-button')).not.toBeNull();

    const password = fixture.nativeElement.querySelector('#auth-password') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement;

    expect(password.type).toBe('password');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');

    toggle.click();
    fixture.detectChanges();

    expect(password.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});
