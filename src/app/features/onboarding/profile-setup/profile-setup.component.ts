import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-profile-setup',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './profile-setup.component.html',
  styles: `
    :host { display: block; min-height: calc(100vh - 76px); background: var(--openstay-cream); }
    .onboarding-page { min-height: calc(100vh - 76px); display: grid; place-items: center; padding: 48px 20px; }
    .onboarding-panel { width: min(100%, 560px); padding: clamp(28px, 5vw, 48px); border: 1px solid var(--openstay-border); border-radius: 28px; background: var(--openstay-warm-white); box-shadow: var(--openstay-card-shadow); }
    .eyebrow { margin: 0 0 10px; color: var(--openstay-forest); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 0 0 12px; font-size: clamp(34px, 6vw, 48px); line-height: 1.08; letter-spacing: -.03em; }
    .intro { margin: 0 0 28px; color: var(--openstay-muted); line-height: 1.6; }
    form { display: grid; gap: 6px; }
    mat-form-field { width: 100%; }
    textarea { resize: vertical; }
    .submit-button { min-height: 48px; border-radius: 999px; background: var(--openstay-forest); color: #fff; }
    .error { color: #a4262c; }
  `,
})
export class ProfileOnboardingPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly form = this.formBuilder.group({
    displayName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    city: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    bio: ['', [Validators.maxLength(500)]],
  });

  async submit(): Promise<void> {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const user = this.auth.currentUser;
    if (!user) {
      await this.router.navigateByUrl('/auth/login');
      return;
    }
    this.isSubmitting.set(true);
    try {
      const values = this.form.getRawValue();
      const profile = {
        displayName: values.displayName.trim(),
        city: values.city.trim(),
        bio: values.bio.trim(),
      };
      await this.auth.saveProfile(user.uid, profile);
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.errorMessage.set(this.auth.getErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
