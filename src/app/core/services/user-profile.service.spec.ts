import { TestBed } from '@angular/core/testing';
import { Firestore, Timestamp } from '@angular/fire/firestore';
import { describe, expect, it } from 'vitest';
import {
  buildAutomaticUsernameCandidates,
  createPrivateProfileData,
  normalizeUsername,
  selectAvailableUsername,
  validatePrivateProfileData,
  UserProfileService,
} from './user-profile.service';

describe('UserProfileService username normalization', () => {
  it('trims and lowercases a valid username', () => {
    expect(normalizeUsername('  Travel_Guide  ')).toBe('travel_guide');
  });

  it('rejects unsupported characters', () => {
    expect(() => normalizeUsername('travel-guide')).toThrow('USERNAME_INVALID');
  });

  it('rejects names outside the length limits', () => {
    expect(() => normalizeUsername('ab')).toThrow('USERNAME_INVALID');
    expect(() => normalizeUsername('a'.repeat(21))).toThrow('USERNAME_INVALID');
  });

  it('accepts names at the length boundaries', () => {
    expect(normalizeUsername('abc')).toBe('abc');
    expect(normalizeUsername('a'.repeat(20))).toBe('a'.repeat(20));
  });
});

describe('UserProfileService username reservations', () => {
  it('selects the normalized automatic username when available', () => {
    expect(selectAvailableUsername(
      ['traveller', 'traveller_123456'],
      [{ exists: false }, { exists: false }],
      'traveller-1',
    )).toBe('traveller');
  });

  it('falls back when an automatic username is owned by another UID', () => {
    expect(selectAvailableUsername(
      ['traveller', 'traveller_123456'],
      [{ exists: true, uid: 'other-user' }, { exists: false }],
      'traveller-1',
    )).toBe('traveller_123456');
  });

  it('allows an existing reservation owned by the same UID', () => {
    expect(selectAvailableUsername(
      ['traveller'],
      [{ exists: true, uid: 'traveller-1' }],
      'traveller-1',
    )).toBe('traveller');
  });

  it('rejects automatic candidates that are all reserved', () => {
    expect(() => selectAvailableUsername(
      ['traveller', 'traveller_123456'],
      [
        { exists: true, uid: 'other-user' },
        { exists: true, uid: 'another-user' },
      ],
      'traveller-1',
    )).toThrow('USERNAME_TAKEN');
  });

  it('creates deterministic fallback candidates from UID', () => {
    const candidates = buildAutomaticUsernameCandidates(
      'Traveller',
      'traveller-123456',
    );
    expect(candidates[0]).toBe('traveller');
    expect(candidates[1]).toBe('traveller_traveller1');
    expect(candidates).toEqual(buildAutomaticUsernameCandidates(
      'Traveller',
      'traveller-123456',
    ));
  });
});

describe('UserProfileService protected fields', () => {
  it('rejects privileged public profile updates before writing', async () => {
    await TestBed.configureTestingModule({
      providers: [
        UserProfileService,
        { provide: Firestore, useValue: {} },
      ],
    }).compileComponents();
    const service = TestBed.inject(UserProfileService);

    await expect(service.updateProfile('traveller-1', {
      roles: ['host'],
    } as Parameters<UserProfileService['updateProfile']>[1])).rejects.toThrow(
      'A protected profile field cannot be updated.',
    );
  });

  it('rejects public email and verification-field updates', async () => {
    await TestBed.configureTestingModule({
      providers: [
        UserProfileService,
        { provide: Firestore, useValue: {} },
      ],
    }).compileComponents();
    const service = TestBed.inject(UserProfileService);

    await expect(service.updateProfile('traveller-1', {
      email: 'changed@example.com',
    } as Parameters<UserProfileService['updateProfile']>[1])).rejects.toThrow(
      'A protected profile field cannot be updated.',
    );
    await expect(service.updateProfile('traveller-1', {
      emailVerified: true,
    } as Parameters<UserProfileService['updateProfile']>[1])).rejects.toThrow(
      'A protected profile field cannot be updated.',
    );
  });

  it('rejects privileged private profile updates before writing', async () => {
    await TestBed.configureTestingModule({
      providers: [
        UserProfileService,
        { provide: Firestore, useValue: {} },
      ],
    }).compileComponents();
    const service = TestBed.inject(UserProfileService);

    await expect(service.updatePrivateProfile('traveller-1', {
      email: 'changed@example.com',
    } as Parameters<UserProfileService['updatePrivateProfile']>[1])).rejects.toThrow(
      'A protected private profile field cannot be updated.',
    );
  });

  it('rejects private profile UID updates before writing', async () => {
    await TestBed.configureTestingModule({
      providers: [
        UserProfileService,
        { provide: Firestore, useValue: {} },
      ],
    }).compileComponents();
    const service = TestBed.inject(UserProfileService);

    await expect(service.updatePrivateProfile('traveller-1', {
      uid: 'another-user',
    } as Parameters<UserProfileService['updatePrivateProfile']>[1])).rejects.toThrow(
      'A protected private profile field cannot be updated.',
    );
  });
});

describe('UserProfileService email source of truth', () => {
  it('creates the private profile document without an email field', () => {
    expect(createPrivateProfileData('traveller-1', 'timestamp')).toEqual({
      uid: 'traveller-1',
      privatePreferences: {},
      updatedAt: 'timestamp',
    });
  });

  it('validates a private profile without requiring an email field', () => {
    const updatedAt = new Timestamp(1, 0);
    expect(validatePrivateProfileData({
      uid: 'traveller-1',
      privatePreferences: {},
      updatedAt,
    }, 'traveller-1')).toEqual({
      uid: 'traveller-1',
      privatePreferences: {},
      updatedAt,
    });
  });
});
