import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { PublicListingPage } from '../../core/models/listing.model';
import { ListingService } from '../../core/services/listing.service';
import { DiscoveryPageComponent } from './discovery-page.component';

const firstPage: PublicListingPage = {
  items: [{
    listingId: 'published-listing-1',
    title: 'A welcoming stay near the centre',
    country: 'New Zealand',
    city: 'Wellington',
    accommodationType: 'private_room',
    guestCapacity: 2,
  }],
  nextCursor: null,
  hasMore: false,
};

describe('DiscoveryPageComponent', () => {
  const searchPublishedListings = vi.fn();
  const getErrorMessage = vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong.',
  );
  const queryParams: Record<string, string> = {};

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(queryParams).forEach((key) => delete queryParams[key]);
    searchPublishedListings.mockResolvedValue(firstPage);
    getErrorMessage.mockImplementation((error: unknown) =>
      error instanceof Error ? error.message : 'Something went wrong.',
    );
    await TestBed.configureTestingModule({
      imports: [DiscoveryPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: (key: string) => queryParams[key] ?? null },
            },
          },
        },
        {
          provide: ListingService,
          useValue: { searchPublishedListings, getErrorMessage },
        },
      ],
    }).compileComponents();
  });

  it('initializes server filters from the URL and renders a public listing card', async () => {
    Object.assign(queryParams, {
      country: 'New Zealand',
      city: 'Wellington',
      accommodationType: 'private_room',
      minimumGuests: '2',
    });
    const fixture = TestBed.createComponent(DiscoveryPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(searchPublishedListings).toHaveBeenCalledWith({
      country: 'New Zealand',
      city: 'Wellington',
      accommodationType: 'private_room',
      minimumGuests: 2,
    }, 12, null);
    expect(fixture.nativeElement.textContent).toContain('A welcoming stay near the centre');
    expect(fixture.nativeElement.textContent).toContain('Wellington, New Zealand');
    expect(fixture.nativeElement.textContent).not.toContain('hostUid');
    expect(fixture.nativeElement.textContent).not.toContain('areaDescription');
  });

  it('submits changed filters to the server and appends cursor-paginated results', async () => {
    searchPublishedListings
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce({
        items: [{
          ...firstPage.items[0],
          listingId: 'published-listing-2',
          title: 'Another welcoming place to stay',
        }],
        nextCursor: 'next-page-cursor',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [{
          ...firstPage.items[0],
          listingId: 'published-listing-3',
          title: 'A third welcoming place to stay',
        }],
        nextCursor: null,
        hasMore: false,
      });
    const fixture = TestBed.createComponent(DiscoveryPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.form.patchValue({
      country: 'Australia',
      city: 'Melbourne',
      accommodationType: 'guest_house',
      minimumGuests: 4,
    });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const searchButton = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    searchButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: {
        country: 'Australia',
        city: 'Melbourne',
        accommodationType: 'guest_house',
        minimumGuests: 4,
        destination: null,
      },
    }));
    expect(searchPublishedListings).toHaveBeenLastCalledWith({
      country: 'Australia',
      city: 'Melbourne',
      accommodationType: 'guest_house',
      minimumGuests: 4,
    }, 12, null);

    await fixture.componentInstance.loadMore();
    fixture.detectChanges();
    expect(searchPublishedListings).toHaveBeenLastCalledWith({
      country: 'Australia',
      city: 'Melbourne',
      accommodationType: 'guest_house',
      minimumGuests: 4,
    }, 12, 'next-page-cursor');
    expect(fixture.nativeElement.textContent).toContain('Another welcoming place to stay');
    expect(fixture.nativeElement.textContent).toContain('A third welcoming place to stay');
  });

  it('does not let an older search response replace newer results', async () => {
    let resolveOlderSearch: ((page: PublicListingPage) => void) | undefined;
    searchPublishedListings.mockReturnValueOnce(new Promise<PublicListingPage>((resolve) => {
      resolveOlderSearch = resolve;
    }));
    const fixture = TestBed.createComponent(DiscoveryPageComponent);
    fixture.detectChanges();

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.form.patchValue({ city: 'Auckland' });
    searchPublishedListings.mockResolvedValueOnce({
      items: [{
        ...firstPage.items[0],
        listingId: 'newer-search-result',
        title: 'The current Auckland stay',
      }],
      nextCursor: null,
      hasMore: false,
    });
    await fixture.componentInstance.search();
    resolveOlderSearch?.(firstPage);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('The current Auckland stay');
    expect(fixture.nativeElement.textContent).not.toContain('A welcoming stay near the centre');
  });

  it('exposes loading, empty, error, and retry states', async () => {
    let rejectSearch: ((reason: Error) => void) | undefined;
    searchPublishedListings.mockReturnValueOnce(new Promise<PublicListingPage>((_resolve, reject) => {
      rejectSearch = reject;
    }));
    const fixture = TestBed.createComponent(DiscoveryPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent)
      .toContain('Loading published stays');

    rejectSearch?.(new Error('Search is temporarily unavailable.'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Search is temporarily unavailable.');

    searchPublishedListings.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
      hasMore: false,
    });
    const retryButton = fixture.nativeElement.querySelector(
      'section[aria-labelledby="search-error-heading"] button',
    ) as HTMLButtonElement;
    retryButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No published stays yet');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});
