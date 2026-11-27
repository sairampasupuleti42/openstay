import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './auth-page.component.html',
  styles: `
    :host { display: block; min-height: calc(100vh - 76px); background: var(--openstay-cream); }
    .auth-page { min-height: calc(100vh - 76px); display: grid; place-items: center; padding: 48px 20px; }
    .auth-panel { width: min(100%, 460px); padding: clamp(28px, 5vw, 44px); border: 1px solid var(--openstay-border); border-radius: 28px; background: var(--openstay-warm-white); box-shadow: var(--openstay-card-shadow); }
    .auth-brand { display: inline-flex; margin-bottom: 36px; text-decoration: none; }
    .auth-brand img { display: block; width: 184px; height: auto; }
    .eyebrow { margin: 0 0 10px; color: var(--openstay-forest); font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
    h1 { margin: 0 0 12px; font-size: clamp(32px, 6vw, 44px); line-height: 1.08; letter-spacing: -0.03em; }
    .intro { margin: 0 0 28px; color: var(--openstay-muted); line-height: 1.6; }
    .auth-form { display: grid; gap: 6px; }
    .auth-form mat-form-field { width: 100%; }
    .password-toggle { min-width: 48px; }
    .password-strength { margin: -4px 0 10px; color: var(--openstay-muted); font-size: 13px; }
    .strength-copy { display: flex; justify-content: space-between; gap: 12px; }
    .strength-copy strong { color: var(--openstay-forest); }
    .strength-meter { height: 6px; margin: 8px 0; overflow: hidden; border-radius: 999px; background: #e7e5df; }
    .strength-meter span { display: block; height: 100%; border-radius: inherit; transition: width 160ms ease; }
    .strength-meter span.weak { background: #b42318; }
    .strength-meter span.fair { background: #c66a12; }
    .strength-meter span.good { background: #8a9b32; }
    .strength-meter span.strong { background: var(--openstay-forest); }
    .password-strength p { margin: 0; line-height: 1.45; }
    .submit-button { min-height: 48px; border-radius: 999px; background: var(--openstay-forest); color: #fff; }
    .submit-button:disabled { opacity: 0.65; }
    .google-button { width: 100%; min-height: 48px; margin-top: 16px; border-radius: 999px; }
    .switch-mode { margin: 24px 0 0; text-align: center; color: var(--openstay-muted); }
    .switch-mode a, .forgot-link a { color: var(--openstay-forest); font-weight: 800; }
    .forgot-link { margin: 16px 0 0; text-align: center; }
    .form-message { margin: 0 0 12px; line-height: 1.5; }
    .error { color: #a4262c; }
    .success { color: var(--openstay-forest); }
  `,
})
export class AuthPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  readonly auth = inject(AuthService);
  private readonly mode = toSignal(
    this.route.data.pipe(
      map((data) => typeof data['mode'] === 'string' ? data['mode'] : 'login'),
    ),
    { initialValue: 'login' },
  );
  readonly isRegister = computed(() => this.mode() === 'register');
  readonly isForgotPassword = computed(() => this.mode() === 'forgot-password');
  readonly isVerifyEmail = computed(() => this.mode() === 'verify-email');
  readonly isAccountUnavailable = computed(() => this.mode() === 'account-unavailable');
  readonly isSubmitting = signal(false);
  readonly passwordVisible = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly form = this.formBuilder.group({
    displayName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    username: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]{3,20}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordMatchValidator });
  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: this.form.controls.password.value,
  });
  readonly passwordStrength = computed(() => {
    const password = this.passwordValue();
    const score = [
      password.length >= 8,
      password.length >= 12,
      /[a-z]/.test(password) && /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;
    return {
      score,
      label: !password
        ? 'Not entered'
        : score <= 1
          ? 'Weak'
          : score === 2
            ? 'Fair'
            : score === 3
              ? 'Good'
              : 'Strong',
    };
  });

  ngOnInit(): void {
    if (this.isVerifyEmail()) void this.refreshVerificationStatus(false);
  }

  readonly submitLabel = computed(() => {
    if (this.isSubmitting()) return 'Please wait…';
    if (this.isRegister()) return 'Create account';
    if (this.isForgotPassword()) return 'Send reset link';
    return 'Sign in';
  });

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  async submit(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    const requiredControls = this.isForgotPassword()
      ? [this.form.controls.email]
      : this.isRegister()
        ? [
            this.form.controls.displayName,
            this.form.controls.username,
            this.form.controls.email,
            this.form.controls.password,
            this.form.controls.confirmPassword,
          ]
        : [this.form.controls.email, this.form.controls.password];
    if (
      requiredControls.some((control) => control.invalid) ||
      (this.isRegister() && this.form.hasError('passwordMismatch'))
    ) {
      requiredControls.forEach((control) => control.markAsTouched());
      return;
    }

    this.isSubmitting.set(true);
    try {
      const { email, password, displayName, username } = this.form.getRawValue();
      if (this.isRegister()) {
        await this.auth.register(email.trim(), password, {
          displayName: displayName.trim(),
          username: username.trim(),
        });
        await this.router.navigateByUrl('/auth/verify-email');
      } else if (this.isForgotPassword()) {
        try {
          await this.auth.sendPasswordReset(email.trim());
        } catch (error) {
          if (!this.auth.isUnknownEmailError(error)) throw error;
        }
        this.successMessage.set('If an account exists for that email, a password reset link is on its way.');
      } else {
        const user = await this.auth.signIn(email.trim(), password);
        await this.router.navigateByUrl(await this.auth.destinationFor(user));
      }
    } catch (error) {
      this.errorMessage.set(this.auth.getErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.errorMessage.set('');
    this.isSubmitting.set(true);
    try {
      const user = await this.auth.signInWithGoogle();
      await this.router.navigateByUrl(await this.auth.destinationFor(user));
    } catch (error) {
      this.errorMessage.set(this.auth.getErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async resendVerification(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      await this.auth.resendVerification();
      this.successMessage.set('A new verification email has been sent.');
    } catch (error) {
      this.errorMessage.set(this.auth.getErrorMessage(error));
    }
  }

  async checkVerification(): Promise<void> {
    await this.refreshVerificationStatus(true);
  }

  private async refreshVerificationStatus(showPendingMessage: boolean): Promise<void> {
    this.errorMessage.set('');
    try {
      const user = await this.auth.refreshCurrentUser();
      if (!user?.emailVerified) {
        if (showPendingMessage) {
          this.errorMessage.set('Your email is not verified yet. Check your inbox and try again.');
        }
        return;
      }
      await this.router.navigateByUrl(await this.auth.destinationFor(user));
    } catch (error) {
      this.errorMessage.set(this.auth.getErrorMessage(error));
    }
  }
}

const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmation = control.get('confirmPassword')?.value;
  return confirmation && password !== confirmation
    ? { passwordMismatch: true }
    : null;
};
