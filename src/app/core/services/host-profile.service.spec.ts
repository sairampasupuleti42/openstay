import { Timestamp } from '@angular/fire/firestore';
import { describe, expect, it } from 'vitest';
import {
  validateHostProfileData,
  validateHostProfileInput,
} from './host-profile.service';

describe('host profile input validation', () => {
  it('normalizes bounded public profile fields', () => {
    expect(validateHostProfileInput({
      displayName: '  Mina  ',
      introduction: '  A short introduction. ',
      languages: ['en', 'mi'],
    })).toEqual({
      displayName: 'Mina',
      introduction: 'A short introduction.',
      languages: ['en', 'mi'],
    });
  });

  it('rejects invalid language lists and oversized profile text', () => {
    expect(() => validateHostProfileInput({
      displayName: 'Mina',
      languages: ['en', 'en'],
    })).toThrow('Use up to 10 unique language codes');
    expect(() => validateHostProfileInput({
      displayName: 'Mina',
      introduction: 'a'.repeat(501),
      languages: [],
    })).toThrow('500 characters or fewer');
  });

  it('rejects unapproved fields from runtime callers', () => {
    expect(() => validateHostProfileInput({
      displayName: 'Mina',
      languages: [],
      phoneNumber: '+64000000000',
    } as Parameters<typeof validateHostProfileInput>[0]))
      .toThrow('A host profile field is not allowed.');
  });

  it('validates stored host profiles against their document UID and schema', () => {
    const now = new Timestamp(1, 0);
    const profile = {
      uid: 'host-uid',
      displayName: 'Mina',
      languages: ['en'],
      visibility: 'private',
      createdAt: now,
      updatedAt: now,
    };
    expect(validateHostProfileData(profile, 'host-uid')).toEqual(profile);
    expect(() => validateHostProfileData({
      ...profile,
      phoneNumber: '+64000000000',
    }, 'host-uid')).toThrow('saved host profile is invalid');
    expect(() => validateHostProfileData(profile, 'other-uid'))
      .toThrow('saved host profile is invalid');
  });
});
