import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthPageComponent } from './auth-page.component';

describe('AuthPageComponent registration', () => {
  const register = vi.fn();
  const navigateByUrl = vi.fn();
  const getErrorMessage = vi.fn();

  beforeEach(async () => {
    register.mockReset();
    navigateByUrl.mockReset();
    getErrorMessage.mockReset();
    await TestBed.configureTestingModule({
      imports: [AuthPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ mode: 'register' }),
            snapshot: { data: { mode: 'register' } },
          },
        },
        { provide: Router, useValue: { navigateByUrl } },
        {
          provide: AuthService,
          useValue: { register, getErrorMessage },
        },
      ],
    }).compileComponents();
  });

  it('prevents registration when the passwords do not match', async () => {
    const component = TestBed.createComponent(AuthPageComponent).componentInstance;
    component.form.controls.displayName.setValue('Traveller');
    component.form.controls.username.setValue('traveller_1');
    component.form.controls.email.setValue('traveller@example.com');
    component.form.controls.password.setValue('OpenstayRoad!2026');
    component.form.controls.confirmPassword.setValue('DifferentPass!2026');

    await component.submit();

    expect(component.form.hasError('passwordMismatch')).toBe(true);
    expect(register).not.toHaveBeenCalled();
  });

  it('rejects invalid email before registration', async () => {
    const component = TestBed.createComponent(AuthPageComponent).componentInstance;
    component.form.controls.displayName.setValue('Traveller');
    component.form.controls.username.setValue('traveller_1');
    component.form.controls.email.setValue('not-an-email');
    component.form.controls.password.setValue('OpenstayRoad!2026');
    component.form.controls.confirmPassword.setValue('OpenstayRoad!2026');

    await component.submit();

    expect(component.form.controls.email.invalid).toBe(true);
    expect(register).not.toHaveBeenCalled();
  });

  it('rejects a weak password before registration', async () => {
    const component = TestBed.createComponent(AuthPageComponent).componentInstance;
    component.form.controls.displayName.setValue('Traveller');
    component.form.controls.username.setValue('traveller_1');
    component.form.controls.email.setValue('traveller@example.com');
    component.form.controls.password.setValue('weak');
    component.form.controls.confirmPassword.setValue('weak');

    await component.submit();

    expect(component.form.controls.password.invalid).toBe(true);
    expect(register).not.toHaveBeenCalled();
  });

  it('requires a valid username and display name before registration', async () => {
    const component = TestBed.createComponent(AuthPageComponent).componentInstance;
    component.form.controls.email.setValue('traveller@example.com');
    component.form.controls.password.setValue('OpenstayRoad!2026');
    component.form.controls.confirmPassword.setValue('OpenstayRoad!2026');
    component.form.controls.displayName.setValue(' ');
    component.form.controls.username.setValue('Not Valid');

    await component.submit();

    expect(register).not.toHaveBeenCalled();
  });

  it('passes trimmed profile details to account registration', async () => {
    const component = TestBed.createComponent(AuthPageComponent).componentInstance;
    component.form.controls.displayName.setValue(' Traveller ');
    component.form.controls.username.setValue('traveller_1');
    component.form.controls.email.setValue('traveller@example.com');
    component.form.controls.password.setValue('OpenstayRoad!2026');
    component.form.controls.confirmPassword.setValue('OpenstayRoad!2026');

    await component.submit();

    expect(register).toHaveBeenCalledWith('traveller@example.com', 'OpenstayRoad!2026', {
      displayName: 'Traveller',
      username: 'traveller_1',
    });
    expect(navigateByUrl).toHaveBeenCalledWith('/auth/verify-email');
  });

  it('displays the Firebase error for an existing email', async () => {
    register.mockRejectedValue({ code: 'auth/email-already-in-use' });
    getErrorMessage.mockReturnValue('An account already exists for this email.');
    const component = TestBed.createComponent(AuthPageComponent).componentInstance;
    component.form.controls.displayName.setValue('Traveller');
    component.form.controls.username.setValue('traveller_1');
    component.form.controls.email.setValue('traveller@example.com');
    component.form.controls.password.setValue('OpenstayRoad!2026');
    component.form.controls.confirmPassword.setValue('OpenstayRoad!2026');

    await component.submit();

    expect(component.errorMessage()).toBe('An account already exists for this email.');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('updates the password strength label as the password changes', () => {
    const component = TestBed.createComponent(AuthPageComponent).componentInstance;

    component.form.controls.password.setValue('short');
    expect(component.passwordStrength().label).toBe('Weak');

    component.form.controls.password.setValue('OpenstayRoad!2026');
    expect(component.passwordStrength().label).toBe('Strong');
  });
});
