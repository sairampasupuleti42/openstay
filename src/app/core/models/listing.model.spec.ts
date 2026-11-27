import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import {
  validateListingInput,
  validateListingData,
} from './listing.model';

describe('listing input validation', () => {
  it('normalizes and validates all required fields', () => {
    const input = {
      title: '  Cozy room in Paris  ',
      description: '  A lovely space with natural light and access to shared kitchen facilities.  ',
      accommodationType: 'private_room' as const,
      country: '  France  ',
      city: '  Paris  ',
      guestCapacity: 1,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: ['wifi', 'kitchen'],
      houseRules: ['No smoking', 'Quiet hours after 10 PM'],
    };

    const result = validateListingInput(input);

    expect(result.title).toBe('Cozy room in Paris');
    expect(result.description).toContain('lovely space');
    expect(result.country).toBe('France');
    expect(result.city).toBe('Paris');
  });

  it('allows optional region and areaDescription', () => {
    const input = {
      title: 'Beautiful apartment',
      description: 'This is a beautiful apartment with modern amenities and excellent location near the city center and public transport.',
      accommodationType: 'entire_home' as const,
      country: 'Japan',
      city: 'Tokyo',
      region: '  Shibuya  ',
      areaDescription: '  Near Shibuya Station  ',
      guestCapacity: 2,
      bedrooms: 1,
      beds: 2,
      bathrooms: 1,
      amenities: [],
      houseRules: [],
    };

    const result = validateListingInput(input);

    expect(result.region).toBe('Shibuya');
    expect(result.areaDescription).toBe('Near Shibuya Station');
  });

  it('rejects invalid titles (too short or too long)', () => {
    expect(() =>
      validateListingInput({
        title: 'Short',
        description: 'A description that is long enough to meet the minimum character requirement for validation.',
        accommodationType: 'private_room',
        country: 'Country',
        city: 'City',
        guestCapacity: 1,
        bedrooms: 0,
        beds: 1,
        bathrooms: 1,
        amenities: [],
        houseRules: [],
      }),
    ).toThrow('10–100 characters');

    expect(() =>
      validateListingInput({
        title: 'x'.repeat(101),
        description: 'A description that is long enough to meet the minimum character requirement for validation.',
        accommodationType: 'private_room',
        country: 'Country',
        city: 'City',
        guestCapacity: 1,
        bedrooms: 0,
        beds: 1,
        bathrooms: 1,
        amenities: [],
        houseRules: [],
      }),
    ).toThrow('10–100 characters');
  });

  it('rejects invalid descriptions (too short or too long)', () => {
    expect(() =>
      validateListingInput({
        title: 'Valid Title',
        description: 'Short',
        accommodationType: 'private_room',
        country: 'Country',
        city: 'City',
        guestCapacity: 1,
        bedrooms: 0,
        beds: 1,
        bathrooms: 1,
        amenities: [],
        houseRules: [],
      }),
    ).toThrow('50–2,000 characters');

    expect(() =>
      validateListingInput({
        title: 'Valid Title',
        description: 'x'.repeat(2001),
        accommodationType: 'private_room',
        country: 'Country',
        city: 'City',
        guestCapacity: 1,
        bedrooms: 0,
        beds: 1,
        bathrooms: 1,
        amenities: [],
        houseRules: [],
      }),
    ).toThrow('50–2,000 characters');
  });

  it('rejects invalid numeric capacity and room counts', () => {
    const baseInput = {
      title: 'Valid Title',
      description: 'A description that is long enough to meet the minimum character requirement for validation.',
      accommodationType: 'private_room' as const,
      country: 'Country',
      city: 'City',
      amenities: [],
      houseRules: [],
    };

    expect(() =>
      validateListingInput({
        ...baseInput,
        guestCapacity: 0,
        bedrooms: 0,
        beds: 1,
        bathrooms: 1,
      }),
    ).toThrow('guest capacity');

    expect(() =>
      validateListingInput({
        ...baseInput,
        guestCapacity: 1,
        bedrooms: 0,
        beds: 0,
        bathrooms: 1,
      }),
    ).toThrow('beds');

    expect(() =>
      validateListingInput({
        ...baseInput,
        guestCapacity: 1,
        bedrooms: 0,
        beds: 1,
        bathrooms: 0,
      }),
    ).toThrow('bathrooms');
  });

  it('rejects invalid amenities', () => {
    const baseInput = {
      title: 'Valid Title',
      description: 'A description that is long enough to meet the minimum character requirement for validation.',
      accommodationType: 'private_room' as const,
      country: 'Country',
      city: 'City',
      guestCapacity: 1,
      bedrooms: 0,
      beds: 1,
      bathrooms: 1,
      houseRules: [],
    };

    expect(() =>
      validateListingInput({
        ...baseInput,
        amenities: ['wifi', 'invalid_amenity'],
      }),
    ).toThrow('not approved');

    expect(() =>
      validateListingInput({
        ...baseInput,
        amenities: Array.from({ length: 31 }, (_, i) => 'wifi'),
      }),
    ).toThrow('30 amenities');
  });

  it('rejects invalid house rules', () => {
    const baseInput = {
      title: 'Valid Title',
      description: 'A description that is long enough to meet the minimum character requirement for validation.',
      accommodationType: 'private_room' as const,
      country: 'Country',
      city: 'City',
      guestCapacity: 1,
      bedrooms: 0,
      beds: 1,
      bathrooms: 1,
      amenities: [],
    };

    expect(() =>
      validateListingInput({
        ...baseInput,
        houseRules: ['Bad'],
      }),
    ).toThrow('5–200 characters');

    expect(() =>
      validateListingInput({
        ...baseInput,
        houseRules: Array.from({ length: 16 }, (_, i) => 'Valid rule'),
      }),
    ).toThrow('15 house rules');
  });

  it('rejects unapproved fields from runtime callers', () => {
    expect(() =>
      validateListingInput({
        title: 'Valid Title',
        description: 'A description that is long enough to meet the minimum character requirement for validation.',
        accommodationType: 'private_room',
        country: 'Country',
        city: 'City',
        guestCapacity: 1,
        bedrooms: 0,
        beds: 1,
        bathrooms: 1,
        amenities: [],
        houseRules: [],
        hostUid: 'secret-uid',
      } as Parameters<typeof validateListingInput>[0]),
    ).toThrow('not allowed');
  });

  it('validates stored listings against their document ID and schema', () => {
    const now = new Timestamp(1, 0);
    const listing = {
      listingId: 'listing-id-1',
      hostUid: 'host-uid',
      title: 'Valid Title Here',
      description: 'A description that is long enough to meet the minimum character requirement for validation.',
      accommodationType: 'private_room' as const,
      country: 'Country',
      city: 'City',
      guestCapacity: 1,
      bedrooms: 0,
      beds: 1,
      bathrooms: 1,
      amenities: [],
      houseRules: [],
      status: 'draft' as const,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      pausedAt: null,
      archivedAt: null,
    };

    expect(validateListingData(listing, 'listing-id-1')).toEqual(listing);

    // Test that a different listing ID fails
    expect(() =>
      validateListingData(listing, 'different-id'),
    ).toThrow();

    // Test that invalid status fails
    expect(() =>
      validateListingData({
        ...listing,
        status: 'invalid_status',
      }, 'listing-id-1'),
    ).toThrow();
  });

  it('rejects stored listings with invalid status or timestamps', () => {
    const now = new Timestamp(1, 0);
    const baseData = {
      listingId: 'listing-id-1',
      hostUid: 'host-uid',
      title: 'Valid Title',
      description: 'A description that is long enough to meet the minimum character requirement for validation.',
      accommodationType: 'private_room' as const,
      country: 'Country',
      city: 'City',
      guestCapacity: 1,
      bedrooms: 0,
      beds: 1,
      bathrooms: 1,
      amenities: [],
      houseRules: [],
      status: 'invalid_status',
      createdAt: now,
      updatedAt: now,
    };

    expect(() => validateListingData(baseData, 'listing-id-1')).toThrow('status');

    expect(() =>
      validateListingData(
        {
          ...baseData,
          status: 'draft',
          createdAt: 'not-a-timestamp',
        },
        'listing-id-1',
      ),
    ).toThrow('timestamp');
  });
});
