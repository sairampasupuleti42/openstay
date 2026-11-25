import { Component, computed, inject, signal } from '@angular/core';
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
import { AuthService } from '../../core/firebase/auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <section class="auth-page">
      <div class="auth-panel">
        <a class="auth-brand" routerLink="/" aria-label="Openstay home">Openstay</a>

        @if (isVerifyEmail()) {
          <p class="eyebrow">One last step</p>
          <h1>Check your inbox</h1>
          <p class="intro">
            We sent a verification link to
            <strong>{{ auth.currentUser?.email || 'your email address' }}</strong>.
            Verify your email, then come back here to continue.
          </p>
          <div class="auth-form">
            <button mat-flat-button type="button" class="submit-button" (click)="checkVerification()">
              I've verified my email
            </button>
            <button mat-stroked-button type="button" (click)="resendVerification()">
              Resend verification email
            </button>
          </div>
          @if (errorMessage()) {
            <p class="form-message error" role="alert">{{ errorMessage() }}</p>
          }
          @if (successMessage()) {
            <p class="form-message success" role="status">{{ successMessage() }}</p>
          }
          <p class="switch-mode">Already verified? <a routerLink="/auth/login">Sign in</a></p>
        } @else {
          <p class="eyebrow">
            {{ isRegister() ? 'Join the community' : isForgotPassword() ? 'Account recovery' : 'Welcome back' }}
          </p>
          <h1>
            {{ isRegister() ? 'Create your account' : isForgotPassword() ? 'Reset your password' : 'Sign in to Openstay' }}
          </h1>
          <p class="intro">
            {{ isRegister()
              ? 'Create an account to start meeting local hosts and sharing meaningful travel experiences.'
              : isForgotPassword()
                ? 'Enter your email and we’ll send you a link to reset your password.'
                : 'Continue planning meaningful stays and connecting with hosts.' }}
          </p>
          <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Email address</mat-label>
              <input matInput formControlName="email" type="email" autocomplete="email" required />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <mat-error>Enter a valid email address.</mat-error>
              }
            </mat-form-field>
            @if (!isForgotPassword()) {
              <mat-form-field appearance="outline">
                <mat-label>Password</mat-label>
                <input
                  matInput
                  formControlName="password"
                  type="password"
                  [autocomplete]="isRegister() ? 'new-password' : 'current-password'"
                  required
                />
                @if (form.controls.password.touched && form.controls.password.invalid) {
                  <mat-error>Password must be at least 8 characters.</mat-error>
                }
              </mat-form-field>
              @if (isRegister()) {
                <div class="password-strength" aria-live="polite">
                  <div class="strength-copy">
                    <span>Password strength</span>
                    <strong>{{ passwordStrength().label }}</strong>
                  </div>
                  <div
                    class="strength-meter"
                    role="progressbar"
                    [attr.aria-valuenow]="passwordStrength().score"
                    aria-valuemin="0"
                    aria-valuemax="5"
                    [attr.aria-label]="'Password strength: ' + passwordStrength().label"
                  >
                    <span
                      [style.width.%]="passwordStrength().score * 20"
                      [class.weak]="passwordStrength().score <= 1"
                      [class.fair]="passwordStrength().score === 2"
                      [class.good]="passwordStrength().score === 3"
                      [class.strong]="passwordStrength().score >= 4"
                    ></span>
                  </div>
                  <p>Use at least 8 characters. Longer passwords with mixed case, numbers, and symbols are stronger.</p>
                </div>
                <mat-form-field appearance="outline">
                  <mat-label>Confirm password</mat-label>
                  <input
                    matInput
                    formControlName="confirmPassword"
                    type="password"
                    autocomplete="new-password"
                    required
                  />
                  @if (form.controls.confirmPassword.touched && form.controls.confirmPassword.hasError('required')) {
                    <mat-error>Please confirm your password.</mat-error>
                  }
                  @if (form.controls.confirmPassword.touched && form.hasError('passwordMismatch')) {
                    <mat-error>Passwords do not match.</mat-error>
                  }
                </mat-form-field>
              }
            }
            @if (errorMessage()) {
              <p class="form-message error" role="alert">{{ errorMessage() }}</p>
            }
            @if (successMessage()) {
              <p class="form-message success" role="status">{{ successMessage() }}</p>
            }
            <button mat-flat-button type="submit" class="submit-button" [disabled]="isSubmitting()">
              {{ submitLabel() }}
            </button>
          </form>

          @if (!isRegister() && !isForgotPassword()) {
            <button mat-stroked-button type="button" class="google-button" (click)="signInWithGoogle()" [disabled]="isSubmitting()">
              Continue with Google
            </button>
            <p class="forgot-link"><a routerLink="/auth/forgot-password">Forgot your password?</a></p>
          }

          @if (!isForgotPassword()) {
            <p class="switch-mode">
              {{ isRegister() ? 'Already have an account?' : 'New to Openstay?' }}
              <a [routerLink]="isRegister() ? '/auth/login' : '/auth/register'">
                {{ isRegister() ? 'Sign in' : 'Join Openstay' }}
              </a>
            </p>
          } @else {
            <p class="switch-mode"><a routerLink="/auth/login">Back to sign in</a></p>
          }
        }
      </div>
    </section>
  `,
  styles: `
    :host { display: block; min-height: calc(100vh - 76px); background: var(--openstay-cream); }
    .auth-page { min-height: calc(100vh - 76px); display: grid; place-items: center; padding: 48px 20px; }
    .auth-panel { width: min(100%, 460px); padding: clamp(28px, 5vw, 44px); border: 1px solid var(--openstay-border); border-radius: 28px; background: var(--openstay-warm-white); box-shadow: var(--openstay-card-shadow); }
    .auth-brand { display: inline-flex; margin-bottom: 36px; color: var(--openstay-forest); font-size: 22px; font-weight: 800; text-decoration: none; }
    .eyebrow { margin: 0 0 10px; color: var(--openstay-forest); font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
    h1 { margin: 0 0 12px; font-size: clamp(32px, 6vw, 44px); line-height: 1.08; letter-spacing: -0.03em; }
    .intro { margin: 0 0 28px; color: var(--openstay-muted); line-height: 1.6; }
    .auth-form { display: grid; gap: 6px; }
    .auth-form mat-form-field { width: 100%; }
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
export class AuthPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  readonly auth = inject(AuthService);
  private readonly mode = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('mode') ?? 'login')),
    { initialValue: 'login' },
  );
  readonly isRegister = computed(() => this.mode() === 'register');
  readonly isForgotPassword = computed(() => this.mode() === 'forgot-password');
  readonly isVerifyEmail = computed(() => this.mode() === 'verify-email');
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly form = this.formBuilder.group({
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

  readonly submitLabel = computed(() => {
    if (this.isSubmitting()) return 'Please wait…';
    if (this.isRegister()) return 'Create account';
    if (this.isForgotPassword()) return 'Send reset link';
    return 'Sign in';
  });

  async submit(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    const requiredControls = this.isForgotPassword()
      ? [this.form.controls.email]
      : this.isRegister()
        ? [
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
      const { email, password } = this.form.getRawValue();
      if (this.isRegister()) {
        await this.auth.register(email.trim(), password);
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
    this.errorMessage.set('');
    try {
      const user = await this.auth.refreshCurrentUser();
      if (!user?.emailVerified) {
        this.errorMessage.set('Your email is not verified yet. Check your inbox and try again.');
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
