import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Timestamp } from 'firebase/firestore';
import { vi } from 'vitest';
import { Listing } from '../../../core/models/listing.model';
import { ListingService } from '../../../core/services/listing.service';
import { HostListingsPageComponent } from './host-listings-page.component';

function listing(overrides: Partial<Listing> = {}): Listing {
  const timestamp = Timestamp.fromMillis(1_000);
  return {
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
    houseRules: [],
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: null,
    pausedAt: null,
    archivedAt: null,
    ...overrides,
  };
}

describe('HostListingsPageComponent', () => {
  const getOwnListings = vi.fn();
  const publishListing = vi.fn();
  const pauseListing = vi.fn();
  const resumeListing = vi.fn();
  const archiveListing = vi.fn();
  const getErrorMessage = vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong.',
  );

  beforeEach(async () => {
    vi.clearAllMocks();
    getOwnListings.mockResolvedValue([]);
    publishListing.mockResolvedValue(undefined);
    pauseListing.mockResolvedValue(undefined);
    resumeListing.mockResolvedValue(undefined);
    archiveListing.mockResolvedValue(undefined);
    getErrorMessage.mockImplementation((error: unknown) =>
      error instanceof Error ? error.message : 'Something went wrong.',
    );
    await TestBed.configureTestingModule({
      imports: [HostListingsPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ListingService,
          useValue: {
            getOwnListings,
            publishListing,
            pauseListing,
            resumeListing,
            archiveListing,
            getErrorMessage,
          },
        },
      ],
    }).compileComponents();
  });

  it('shows loading and empty states without treating an empty result as an error', async () => {
    let resolveListings: ((value: Listing[]) => void) | undefined;
    getOwnListings.mockReturnValueOnce(new Promise<Listing[]>((resolve) => {
      resolveListings = resolve;
    }));
    const fixture = TestBed.createComponent(HostListingsPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent)
      .toContain('Loading your listings');

    resolveListings?.([]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Your hosting story starts here');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('renders listing statuses and provides state-appropriate actions', async () => {
    getOwnListings.mockResolvedValueOnce([
      listing({ listingId: 'draft-1', status: 'draft' }),
      listing({ listingId: 'published-1', status: 'published' }),
      listing({ listingId: 'paused-1', status: 'paused' }),
      listing({ listingId: 'archived-1', status: 'archived' }),
    ]);
    const fixture = TestBed.createComponent(HostListingsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Draft');
    expect(fixture.nativeElement.textContent).toContain('Published');
    expect(fixture.nativeElement.textContent).toContain('Paused');
    expect(fixture.nativeElement.textContent).toContain('Archived');
    expect(fixture.nativeElement.textContent).toContain('Edit draft');
    expect(fixture.nativeElement.textContent).toContain('Publish');
    expect(fixture.nativeElement.textContent).toContain('Pause');
    expect(fixture.nativeElement.textContent).toContain('Resume');
    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(6);
  });

  it('refreshes after a successful lifecycle action and shows confirmation', async () => {
    const draft = listing();
    getOwnListings
      .mockResolvedValueOnce([draft])
      .mockResolvedValueOnce([listing({ status: 'published' })]);
    const fixture = TestBed.createComponent(HostListingsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.requestPublicationReview(draft, 'publish');
    fixture.componentInstance.confirmPublicationReview(draft, 'publish');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(publishListing).toHaveBeenCalledWith('listing-1', expect.any(String), true);
    expect(getOwnListings).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.listings()[0].status).toBe('published');
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent)
      .toContain('Listing published.');
  });

  it('requires an explicit text review before publishing or resuming', async () => {
    const draft = listing();
    getOwnListings.mockResolvedValue([draft]);
    const fixture = TestBed.createComponent(HostListingsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.listings()).toHaveLength(1);
    const publishButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Publish');
    expect(publishButton).toBeDefined();
    publishButton!.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Automated checks can miss residential addresses or personal information.',
    );
    expect(publishListing).not.toHaveBeenCalled();

    fixture.nativeElement.querySelector('.review-confirmation button').click();
    await fixture.whenStable();
    expect(publishListing).toHaveBeenCalledWith('listing-1', expect.any(String), true);

    const paused = listing({ status: 'paused' });
    getOwnListings.mockResolvedValue([paused]);
    const pausedFixture = TestBed.createComponent(HostListingsPageComponent);
    pausedFixture.detectChanges();
    await pausedFixture.whenStable();
    pausedFixture.detectChanges();
    const resumeButton = Array.from((pausedFixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Resume');
    expect(resumeButton).toBeDefined();
    resumeButton!.click();
    pausedFixture.detectChanges();
    expect(resumeListing).not.toHaveBeenCalled();
    pausedFixture.nativeElement.querySelector('.review-confirmation button').click();
    await pausedFixture.whenStable();
    expect(resumeListing).toHaveBeenCalledWith('listing-1', expect.any(String), true);
  });

  it('does not dispatch publish or resume through the action handler without review', async () => {
    const component = TestBed.createComponent(HostListingsPageComponent).componentInstance;
    await component.performAction(listing(), 'publish');
    await component.performAction(listing({ status: 'paused' }), 'resume');

    expect(publishListing).not.toHaveBeenCalled();
    expect(resumeListing).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Review the public listing text');
  });

  it('keeps the same request key after a backend error and displays the error', async () => {
    const draft = listing();
    getOwnListings.mockResolvedValue([draft]);
    pauseListing.mockRejectedValue(new Error('Only published listings can be paused.'));
    const component = TestBed.createComponent(HostListingsPageComponent).componentInstance;

    await component.performAction(draft, 'pause');
    await component.performAction(draft, 'pause');

    expect(pauseListing.mock.calls[0][1]).toBe(pauseListing.mock.calls[1][1]);
    expect(component.errorMessage()).toBe('Only published listings can be paused.');
  });

  it('discards a stale request key and refreshes before a new action', async () => {
    const published = listing({ status: 'published' });
    getOwnListings.mockResolvedValue([published]);
    pauseListing
      .mockRejectedValueOnce(new Error('Response lost'))
      .mockRejectedValueOnce({ details: { reason: 'stale-listing-request' } })
      .mockResolvedValueOnce(undefined);
    const component = TestBed.createComponent(HostListingsPageComponent).componentInstance;

    await component.performAction(published, 'pause');
    await component.performAction(published, 'pause');
    expect(pauseListing.mock.calls[0][1]).toBe(pauseListing.mock.calls[1][1]);
    expect(component.errorMessage()).toContain('listing changed');
    expect(component.successMessage()).toBe('');
    await component.performAction(published, 'pause');
    expect(pauseListing.mock.calls[2][1]).not.toBe(pauseListing.mock.calls[1][1]);
  });

  it('reports dashboard loading failures and offers a retry', async () => {
    getOwnListings.mockRejectedValueOnce(new Error('Firestore unavailable'));
    const fixture = TestBed.createComponent(HostListingsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Firestore unavailable');
    expect(fixture.nativeElement.textContent).toContain('Try again');
  });
});
