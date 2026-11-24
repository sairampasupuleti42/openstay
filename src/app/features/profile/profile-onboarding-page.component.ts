import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '../../core/firebase/auth.service';

@Component({
  selector: 'app-profile-onboarding-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="onboarding-page">
      <div class="onboarding-panel">
        <p class="eyebrow">Your traveller profile</p>
        <h1>Make it personal</h1>
        <p class="intro">Share a little about yourself so the Openstay community can get to know you.</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Your name</mat-label>
            <input matInput formControlName="displayName" autocomplete="name" required />
            @if (form.controls.displayName.touched && form.controls.displayName.invalid) {
              <mat-error>Please enter your name.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Where are you based?</mat-label>
            <input matInput formControlName="homeBase" placeholder="City or region" autocomplete="address-level2" required />
            @if (form.controls.homeBase.touched && form.controls.homeBase.invalid) {
              <mat-error>Please enter a city or region.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Tell us about yourself</mat-label>
            <textarea matInput formControlName="bio" rows="4" maxlength="500" placeholder="What do you enjoy about travelling?"></textarea>
            <mat-hint align="end">{{ form.controls.bio.value.length }}/500</mat-hint>
          </mat-form-field>
          @if (errorMessage()) {
            <p class="error" role="alert">{{ errorMessage() }}</p>
          }
          <button mat-flat-button class="submit-button" type="submit" [disabled]="isSubmitting()">
            {{ isSubmitting() ? 'Saving…' : 'Continue to dashboard' }}
          </button>
        </form>
      </div>
    </section>
  `,
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
    displayName: [this.auth.currentUser?.displayName ?? '', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    homeBase: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
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
        homeBase: values.homeBase.trim(),
        bio: values.bio.trim(),
      };
      await this.auth.saveProfile(user.uid, { ...profile, onboardingComplete: true });
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.errorMessage.set(this.auth.getErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
