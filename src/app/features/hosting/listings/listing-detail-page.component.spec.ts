import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Timestamp } from 'firebase/firestore';
import { vi } from 'vitest';
import { Listing } from '../../../core/models/listing.model';
import { ListingService } from '../../../core/services/listing.service';
import { ListingDetailPageComponent } from './listing-detail-page.component';

describe('ListingDetailPageComponent', () => {
  const getOwnListing = vi.fn();
  const getErrorMessage = vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong.',
  );

  beforeEach(async () => {
    vi.clearAllMocks();
    getOwnListing.mockResolvedValue(null);
    getErrorMessage.mockImplementation((error: unknown) =>
      error instanceof Error ? error.message : 'Something went wrong.',
    );
    await TestBed.configureTestingModule({
      imports: [ListingDetailPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'listing-1' } } },
        },
        { provide: ListingService, useValue: { getOwnListing, getErrorMessage } },
      ],
    }).compileComponents();
  });

  it('previews the host listing details and lifecycle status', async () => {
    const timestamp = Timestamp.fromMillis(1_000);
    const saved: Listing = {
      listingId: 'listing-1',
      hostUid: 'host-uid',
      title: 'A welcoming stay near the centre',
      description: 'A comfortable place to stay with a welcoming host and shared kitchen.',
      accommodationType: 'private_room',
      country: 'New Zealand',
      city: 'Wellington',
      guestCapacity: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: ['wifi'],
      houseRules: ['Quiet hours after ten'],
      status: 'published',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getOwnListing.mockResolvedValue(saved);
    const fixture = TestBed.createComponent(ListingDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Host preview');
    expect(fixture.nativeElement.textContent).toContain('Published');
    expect(fixture.nativeElement.textContent).toContain('Wellington, New Zealand');
    expect(fixture.nativeElement.textContent).toContain('Quiet hours after ten');
  });

  it('shows a clear unavailable state for a missing listing', async () => {
    const fixture = TestBed.createComponent(ListingDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Listing preview unavailable');
  });
});
