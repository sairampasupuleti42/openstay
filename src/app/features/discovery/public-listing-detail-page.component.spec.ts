import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { PublicListingDetails } from '../../core/models/listing.model';
import { ListingService } from '../../core/services/listing.service';
import { PublicListingDetailPageComponent } from './public-listing-detail-page.component';

const publicDetails: PublicListingDetails = {
  listingId: 'public-detail-1',
  title: 'A welcoming stay near the centre',
  description: 'A comfortable place to stay with a welcoming host and shared kitchen.',
  country: 'New Zealand',
  city: 'Wellington',
  region: 'Te Aro',
  accommodationType: 'private_room',
  guestCapacity: 2,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  amenities: ['wifi', 'kitchen'],
  houseRules: ['Quiet hours after ten'],
  host: {
    displayName: 'Openstay Host',
    introduction: 'I enjoy welcoming travellers to Wellington.',
    languages: ['en', 'mi'],
  },
};

describe('PublicListingDetailPageComponent', () => {
  const getPublicListingDetails = vi.fn();
  const getErrorMessage = vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong.',
  );

  beforeEach(async () => {
    vi.clearAllMocks();
    getPublicListingDetails.mockResolvedValue(publicDetails);
    getErrorMessage.mockImplementation((error: unknown) =>
      error instanceof Error ? error.message : 'Something went wrong.',
    );
    await TestBed.configureTestingModule({
      imports: [PublicListingDetailPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'public-detail-1' } } },
        },
        {
          provide: ListingService,
          useValue: { getPublicListingDetails, getErrorMessage },
        },
      ],
    }).compileComponents();
  });

  it('renders only the public listing and approved public host fields', async () => {
    const fixture = TestBed.createComponent(PublicListingDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getPublicListingDetails).toHaveBeenCalledWith('public-detail-1');
    expect(fixture.nativeElement.textContent).toContain('A welcoming stay near the centre');
    expect(fixture.nativeElement.textContent).toContain('Wellington, New Zealand');
    expect(fixture.nativeElement.textContent).toContain('Quiet hours after ten');
    expect(fixture.nativeElement.textContent).toContain('Openstay Host');
    expect(fixture.nativeElement.textContent).toContain('Languages: en, mi');
    expect(fixture.nativeElement.textContent).not.toContain('hostUid');
    expect(fixture.nativeElement.textContent).not.toContain('areaDescription');
    expect(fixture.nativeElement.textContent).not.toContain('exactAddress');
    expect(fixture.nativeElement.textContent).not.toContain('privateContact');
  });

  it('shows an unavailable state if a listing is unpublished or removed', async () => {
    getPublicListingDetails.mockResolvedValue(null);
    const fixture = TestBed.createComponent(PublicListingDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('This stay is no longer available');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('keeps callable failures visible and allows retry', async () => {
    getPublicListingDetails
      .mockRejectedValueOnce(new Error('Details are temporarily unavailable.'))
      .mockResolvedValueOnce(publicDetails);
    const fixture = TestBed.createComponent(PublicListingDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Details are temporarily unavailable.');
    const retryButton = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    retryButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Openstay Host');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});
