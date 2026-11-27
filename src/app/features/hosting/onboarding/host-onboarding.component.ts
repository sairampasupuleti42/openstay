import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import {
  HOST_PARTICIPATION_TERMS_TEXT,
  HOST_PARTICIPATION_TERMS_VERSION,
  HOST_PARTICIPATION_TERMS_DIGEST,
  HostPrivateProfile,
} from '../../../core/models/host-profile.model';
import { HostProfileService } from '../../../core/services/host-profile.service';

const LANGUAGE_CODE = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;

@Component({
  selector: 'app-host-onboarding',
  providers: [HostProfileService],
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './host-onboarding.component.html',
  styles: `
    :host { display: block; min-height: calc(100vh - 76px); background: var(--openstay-cream); }
    .onboarding-page { display: grid; min-height: calc(100vh - 76px); place-items: center; padding: 28px 16px; }
    .onboarding-panel { width: min(100%, 620px); padding: clamp(24px, 6vw, 52px); border: 1px solid var(--openstay-border); border-radius: 28px; background: var(--openstay-warm-white); box-shadow: var(--openstay-card-shadow); }
    .eyebrow { margin: 0 0 10px; color: var(--openstay-forest); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 0 0 14px; font-size: clamp(34px, 7vw, 50px); line-height: 1.08; letter-spacing: -.03em; }
    .intro, .privacy-note { color: var(--openstay-muted); line-height: 1.65; }
    .intro { margin: 0 0 18px; font-size: 17px; }
    .privacy-note { margin: 0 0 26px; padding: 14px 16px; border-left: 3px solid var(--openstay-lime); background: var(--openstay-cream); }
    form { display: grid; gap: 8px; }
    mat-form-field { width: 100%; }
    textarea { resize: vertical; }
    .consent { margin: 10px 0; padding: 18px; border: 1px solid var(--openstay-border); border-radius: 16px; }
    .consent h2 { margin: 0 0 8px; font-size: 19px; }
    .consent p { color: var(--openstay-muted); font-size: 14px; line-height: 1.6; }
    .field-error, .form-error { color: #a4262c; }
    .success-message { color: var(--openstay-forest); }
    .submit-button { min-height: 50px; border-radius: 999px; background: var(--openstay-forest); color: #fff; }
    .submit-button:disabled { opacity: .65; }
    .back-link { justify-self: center; margin: 10px 0 0; color: var(--openstay-forest); font-weight: 700; text-align: center; }
    @media (min-width: 600px) { .onboarding-page { padding: 48px 20px; } }
  `,
})
export class HostOnboardingComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly hostProfiles = inject(HostProfileService);
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  readonly termsText = HOST_PARTICIPATION_TERMS_TEXT;
  readonly termsVersion = HOST_PARTICIPATION_TERMS_VERSION;
  readonly privacyWarning =
    'Your host profile starts private. If you make it public, only the profile details you provide will be shared. Do not include phone numbers, email addresses, exact residential addresses, or other sensitive personal information in your name or introduction. Free text can still reveal sensitive information, so review it before making your profile public.';
  readonly isLoadingProfile = signal(true);
  readonly isSubmitting = signal(false);
  readonly isWithdrawing = signal(false);
  readonly isResuming = signal(false);
  readonly isComplete = signal(false);
  readonly isWithdrawn = signal(false);
  readonly canWithdraw = signal(false);
  readonly errorMessage = signal('');
  private consentEventId: string | null = null;
  private consentRequest: ConsentRequest | null = null;
  private withdrawalRequest: ConsentRequest | null = null;
  private resumeRequest: ConsentRequest | null = null;
  readonly form = this.formBuilder.group({
    displayName: [
      this.auth.currentUser?.displayName ?? '',
      [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)],
    ],
    introduction: ['', Validators.maxLength(500)],
    languages: ['', languageListValidator],
    consent: [false, Validators.requiredTrue],
  });

  async ngOnInit(): Promise<void> {
    try {
      const existingProfile = await this.hostProfiles.getOwnProfile();
      this.applyConsent(await this.hostProfiles.getOwnConsentState());
      if (existingProfile) {
        this.isComplete.set(true);
      }
    } catch (error) {
      this.errorMessage.set(this.auth.getErrorMessage(error));
    } finally {
      this.isLoadingProfile.set(false);
    }
  }

  async submit(): Promise<void> {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.auth.currentUser) {
      this.errorMessage.set('Sign in again before starting a host profile.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      this.consentRequest ??= this.newConsentRequest();
      const values = this.form.getRawValue();
      this.consentEventId = await this.hostProfiles.acceptParticipation(
        this.consentRequest.key, this.consentRequest.expectedEventId,
      );
      this.isWithdrawn.set(false);
      this.canWithdraw.set(true);
      await this.hostProfiles.createProfile({
        displayName: values.displayName.trim(),
        ...(values.introduction.trim()
          ? { introduction: values.introduction.trim() }
          : {}),
        languages: parseLanguages(values.languages),
      });
      this.isComplete.set(true);
    } catch (error) {
      if (isStaleConsentRequest(error)) this.consentRequest = null;
      await this.handleConsentError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async withdrawConsent(): Promise<void> {
    this.errorMessage.set('');
    this.isWithdrawing.set(true);
    try {
      this.withdrawalRequest ??= this.newConsentRequest();
      this.consentEventId = await this.hostProfiles.withdrawParticipation(
        this.withdrawalRequest.key, this.withdrawalRequest.expectedEventId,
      );
      this.withdrawalRequest = null;
      this.isWithdrawn.set(true);
      this.canWithdraw.set(false);
      this.form.controls.consent.reset(false);
    } catch (error) {
      if (isStaleConsentRequest(error)) this.withdrawalRequest = null;
      await this.handleConsentError(error);
    } finally {
      this.isWithdrawing.set(false);
    }
  }

  async resumeHosting(): Promise<void> {
    this.errorMessage.set('');
    if (this.form.controls.consent.invalid) {
      this.form.controls.consent.markAsTouched();
      return;
    }

    this.isResuming.set(true);
    try {
      this.resumeRequest ??= this.newConsentRequest();
      this.consentEventId = await this.hostProfiles.acceptParticipation(
        this.resumeRequest.key, this.resumeRequest.expectedEventId,
      );
      this.resumeRequest = null;
      this.isWithdrawn.set(false);
      this.canWithdraw.set(true);
    } catch (error) {
      if (isStaleConsentRequest(error)) this.resumeRequest = null;
      await this.handleConsentError(error);
    } finally {
      this.isResuming.set(false);
    }
  }

  private newConsentRequest(): ConsentRequest {
    return { key: globalThis.crypto.randomUUID(), expectedEventId: this.consentEventId };
  }

  private applyConsent(consent: HostPrivateProfile | null): void {
    this.consentEventId = consent?.eventId ?? null;
    this.canWithdraw.set(consent?.consentState === 'accepted');
    this.isWithdrawn.set(
      consent?.consentState !== 'accepted'
      || consent.termsVersion !== HOST_PARTICIPATION_TERMS_VERSION
      || consent.termsDigest !== HOST_PARTICIPATION_TERMS_DIGEST,
    );
  }

  private async handleConsentError(error: unknown): Promise<void> {
    if (isStaleConsentRequest(error)) {
      try {
        this.applyConsent(await this.hostProfiles.getOwnConsentState());
      } catch {
        this.errorMessage.set('Could not refresh your consent. Reload the page before trying again.');
        return;
      }
    }
    this.errorMessage.set(this.auth.getErrorMessage(error));
  }
}

interface ConsentRequest {
  key: string;
  expectedEventId: string | null;
}

function isStaleConsentRequest(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'details' in error
    && typeof error.details === 'object'
    && error.details !== null
    && 'reason' in error.details
    && error.details.reason === 'stale-consent-request';
}

export const languageListValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  if (!value) return null;
  const languages = parseLanguages(value);
  return languages.length <= 10
    && languages.every((language) => LANGUAGE_CODE.test(language))
    && new Set(languages).size === languages.length
    ? null
    : { languageList: true };
};

function parseLanguages(value: string): string[] {
  return value.split(',').map((language) => language.trim()).filter(Boolean);
}
