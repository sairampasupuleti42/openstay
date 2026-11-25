import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/firebase/auth.service';
import { AuthPageComponent } from './auth-page.component';

describe('AuthPageComponent registration', () => {
  const register = vi.fn();

  beforeEach(async () => {
    register.mockReset();
    await TestBed.configureTestingModule({
      imports: [AuthPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ mode: 'register' })),
          },
        },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        {
          provide: AuthService,
          useValue: { register, getErrorMessage: vi.fn() },
        },
      ],
    }).compileComponents();
  });

  it('prevents registration when the passwords do not match', async () => {
    const component = TestBed.createComponent(AuthPageComponent).componentInstance;
    component.form.controls.email.setValue('traveller@example.com');
    component.form.controls.password.setValue('OpenstayRoad!2026');
    component.form.controls.confirmPassword.setValue('DifferentPass!2026');

    await component.submit();

    expect(component.form.hasError('passwordMismatch')).toBe(true);
    expect(register).not.toHaveBeenCalled();
  });

  it('updates the password strength label as the password changes', () => {
    const component = TestBed.createComponent(AuthPageComponent).componentInstance;

    component.form.controls.password.setValue('short');
    expect(component.passwordStrength().label).toBe('Weak');

    component.form.controls.password.setValue('OpenstayRoad!2026');
    expect(component.passwordStrength().label).toBe('Strong');
  });
});
