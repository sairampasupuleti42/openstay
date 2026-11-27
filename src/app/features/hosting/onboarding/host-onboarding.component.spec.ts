import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { HostProfileService } from '../../../core/services/host-profile.service';
import { HostOnboardingComponent } from './host-onboarding.component';

describe('HostOnboardingComponent', () => {
  const acceptParticipation = vi.fn();
  const withdrawParticipation = vi.fn();
  const createProfile = vi.fn();
  const getOwnProfile = vi.fn().mockResolvedValue(null);
  const getOwnConsentState = vi.fn().mockResolvedValue(null);
  const getErrorMessage = vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong.',
  );

  beforeEach(async () => {
    vi.resetAllMocks();
    getOwnProfile.mockResolvedValue(null);
    getOwnConsentState.mockResolvedValue(null);
    acceptParticipation.mockResolvedValue('a'.repeat(64));
    withdrawParticipation.mockResolvedValue('b'.repeat(64));
    createProfile.mockResolvedValue(undefined);
    getErrorMessage.mockImplementation((error: unknown) =>
      error instanceof Error ? error.message : 'Something went wrong.',
    );
    await TestBed.configureTestingModule({
      imports: [HostOnboardingComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: { uid: 'auth-uid', displayName: 'Mina' },
            getErrorMessage,
          },
        },
      ],
    }).overrideComponent(HostOnboardingComponent, {
      set: {
        providers: [{
          provide: HostProfileService,
          useValue: {
            acceptParticipation,
            withdrawParticipation,
            createProfile,
            getOwnProfile,
            getOwnConsentState,
          },
        }],
      },
    }).compileComponents();
  });

  it('requires explicit consent and reports invalid fields accessibly', async () => {
    const fixture = TestBed.createComponent(HostOnboardingComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
    component.form.controls.displayName.setValue('Mina');
    component.form.controls.languages.setValue('en, en');

    await component.submit();
    fixture.detectChanges();

    expect(component.form.controls.consent.touched).toBe(true);
    expect(component.form.controls.languages.invalid).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Please agree to the host participation terms');
    expect(acceptParticipation).not.toHaveBeenCalled();
    expect(createProfile).not.toHaveBeenCalled();
  });

  it('accepts valid profile values, saves privately, and shows success', async () => {
    const fixture = TestBed.createComponent(HostOnboardingComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.controls.displayName.setValue(' Mina ');
    component.form.controls.introduction.setValue(' I love sharing local walks. ');
    component.form.controls.languages.setValue('en, mi');
    component.form.controls.consent.setValue(true);

    await component.submit();
    fixture.detectChanges();

    expect(acceptParticipation).toHaveBeenCalledWith(expect.any(String), null);
    expect(createProfile).toHaveBeenCalledWith({
      displayName: 'Mina',
      introduction: 'I love sharing local walks.',
      languages: ['en', 'mi'],
    });
    expect(component.isComplete()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Your host profile has been created privately.');
  });

  it('rejects malformed, duplicate, or excessive language codes', () => {
    const component = TestBed.createComponent(HostOnboardingComponent).componentInstance;

    for (const languages of ['English', 'en, en', Array(11).fill('en').join(', ')]) {
      component.form.controls.languages.setValue(languages);
      expect(component.form.controls.languages.invalid).toBe(true);
    }

    component.form.controls.languages.setValue('en, mi');
    expect(component.form.controls.languages.valid).toBe(true);
  });

  it('records consent withdrawal through the trusted service action', async () => {
    const component = TestBed.createComponent(HostOnboardingComponent).componentInstance;

    await component.withdrawConsent();

    expect(withdrawParticipation).toHaveBeenCalledWith(expect.any(String), null);
    expect(component.isWithdrawn()).toBe(true);
  });

  it('uses a fresh key for each new withdrawal and resumption', async () => {
    const component = TestBed.createComponent(HostOnboardingComponent).componentInstance;

    await component.withdrawConsent();
    component.form.controls.consent.setValue(true);
    await component.resumeHosting();
    await component.withdrawConsent();
    component.form.controls.consent.setValue(true);
    await component.resumeHosting();

    expect(withdrawParticipation.mock.calls[0][0]).not.toBe(withdrawParticipation.mock.calls[1][0]);
    expect(acceptParticipation.mock.calls[0][0]).not.toBe(acceptParticipation.mock.calls[1][0]);
    expect(acceptParticipation.mock.calls[0][1]).toBe('b'.repeat(64));
    expect(withdrawParticipation.mock.calls[1][1]).toBe('a'.repeat(64));
  });

  it('reuses a failed request key but replaces a stale one', async () => {
    const component = TestBed.createComponent(HostOnboardingComponent).componentInstance;
    withdrawParticipation
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce({ details: { reason: 'stale-consent-request' } })
      .mockResolvedValueOnce(undefined);

    await component.withdrawConsent();
    await component.withdrawConsent();
    await component.withdrawConsent();

    expect(withdrawParticipation.mock.calls[0][0]).toBe(withdrawParticipation.mock.calls[1][0]);
    expect(withdrawParticipation.mock.calls[1][0]).not.toBe(withdrawParticipation.mock.calls[2][0]);
    expect(component.isWithdrawn()).toBe(true);
  });

  it('loads an existing withdrawn profile and requires renewed consent to resume', async () => {
    getOwnProfile.mockResolvedValue({ uid: 'auth-uid' });
    getOwnConsentState.mockResolvedValue({
      consentState: 'withdrawn', eventId: 'b'.repeat(64),
      termsVersion: 'host-participation-v1', termsDigest: 'digest',
    });
    const fixture = TestBed.createComponent(HostOnboardingComponent);
    fixture.detectChanges();
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.isComplete()).toBe(true);
    expect(component.isWithdrawn()).toBe(true);
    component.form.controls.consent.setValue(true);
    await component.resumeHosting();

    expect(acceptParticipation).toHaveBeenCalledWith(expect.any(String), 'b'.repeat(64));
    expect(component.isWithdrawn()).toBe(false);
  });

  it('offers reacceptance and withdrawal for an older accepted terms version', async () => {
    getOwnProfile.mockResolvedValue({ uid: 'auth-uid' });
    getOwnConsentState.mockResolvedValue({
      consentState: 'accepted', eventId: 'c'.repeat(64),
      termsVersion: 'old-version', termsDigest: 'old-digest',
    });
    const component = TestBed.createComponent(HostOnboardingComponent).componentInstance;
    await component.ngOnInit();
    expect(component.isWithdrawn()).toBe(true);
    expect(component.canWithdraw()).toBe(true);
    component.form.controls.consent.setValue(true);
    await component.resumeHosting();
    expect(acceptParticipation).toHaveBeenCalledWith(expect.any(String), 'c'.repeat(64));
    expect(component.isWithdrawn()).toBe(false);
  });

  it('warns explicitly about sensitive data in public text', async () => {
    const fixture = TestBed.createComponent(HostOnboardingComponent);
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('.privacy-note').textContent;
    expect(text).toContain('phone numbers');
    expect(text).toContain('email addresses');
    expect(text).toContain('exact residential addresses');
    expect(text).toContain('other sensitive personal information');
  });
});
