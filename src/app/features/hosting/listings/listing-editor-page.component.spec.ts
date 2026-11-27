import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Timestamp } from 'firebase/firestore';
import { vi } from 'vitest';
import { Listing } from '../../../core/models/listing.model';
import { ListingService } from '../../../core/services/listing.service';
import { ListingEditorPageComponent } from './listing-editor-page.component';

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
    region: 'Te Aro',
    areaDescription: 'Near the waterfront',
    guestCapacity: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    amenities: ['wifi'],
    houseRules: ['Quiet hours after ten'],
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: null,
    pausedAt: null,
    archivedAt: null,
    ...overrides,
  };
}

describe('ListingEditorPageComponent', () => {
  const createDraft = vi.fn();
  const getOwnListing = vi.fn();
  const updateOwnDraft = vi.fn();
  const getErrorMessage = vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong.',
  );
  let listingId: string | null;

  beforeEach(async () => {
    vi.clearAllMocks();
    listingId = null;
    createDraft.mockResolvedValue('new-listing');
    getOwnListing.mockResolvedValue(listing());
    updateOwnDraft.mockResolvedValue(undefined);
    getErrorMessage.mockImplementation((error: unknown) =>
      error instanceof Error ? error.message : 'Something went wrong.',
    );
    await TestBed.configureTestingModule({
      imports: [ListingEditorPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => listingId },
            },
          },
        },
        {
          provide: ListingService,
          useValue: { createDraft, getOwnListing, updateOwnDraft, getErrorMessage },
        },
      ],
    }).compileComponents();
  });

  it('marks invalid fields and does not create an incomplete listing', async () => {
    const fixture = TestBed.createComponent(ListingEditorPageComponent);
    fixture.detectChanges();
    await fixture.componentInstance.saveDraft();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.title.touched).toBe(true);
    expect(fixture.componentInstance.form.controls.description.invalid).toBe(true);
    expect(createDraft).not.toHaveBeenCalled();
  });

  it('creates a validated draft and offers a host preview', async () => {
    const fixture = TestBed.createComponent(ListingEditorPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.patchValue({
      title: '  A welcoming stay near the centre  ',
      description: '  A comfortable place to stay with a welcoming host and shared kitchen.  ',
      country: ' New Zealand ',
      city: ' Wellington ',
      region: ' Te Aro ',
      areaDescription: ' Near the waterfront ',
      amenities: ['wifi', 'kitchen'],
      houseRulesText: 'Quiet hours after ten\n  ',
    });

    await component.saveDraft();
    fixture.detectChanges();

    expect(createDraft).toHaveBeenCalledWith(expect.objectContaining({
      title: 'A welcoming stay near the centre',
      country: 'New Zealand',
      city: 'Wellington',
      amenities: ['wifi', 'kitchen'],
      houseRules: ['Quiet hours after ten'],
    }));
    expect(createDraft.mock.calls[0][0]).not.toHaveProperty('hostUid');
    expect(createDraft.mock.calls[0][0]).not.toHaveProperty('status');
    expect(fixture.nativeElement.textContent).toContain('Your listing draft is ready to preview');
    expect(fixture.nativeElement.textContent).toContain('Preview your listing');
  });

  it('loads and updates only a draft, deleting cleared optional fields', async () => {
    listingId = 'listing-1';
    const fixture = TestBed.createComponent(ListingEditorPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    expect(component.form.controls.title.value).toBe('A welcoming stay near the centre');
    component.form.controls.region.setValue('');
    component.form.controls.areaDescription.setValue('');

    await component.saveDraft();

    expect(updateOwnDraft).toHaveBeenCalledWith('listing-1', expect.objectContaining({
      region: undefined,
      areaDescription: undefined,
    }));
    expect(component.successMessage()).toBe('Your draft has been saved.');
  });

  it('refuses to edit a listing that is no longer a draft', async () => {
    listingId = 'listing-1';
    getOwnListing.mockResolvedValue(listing({ status: 'published' }));
    const fixture = TestBed.createComponent(ListingEditorPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.errorMessage()).toContain('Only draft listings can be edited');
    expect(updateOwnDraft).not.toHaveBeenCalled();
  });

  it('shows backend save errors accessibly', async () => {
    const fixture = TestBed.createComponent(ListingEditorPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.patchValue({
      title: 'A welcoming stay near the centre',
      description: 'A comfortable place to stay with a welcoming host and shared kitchen.',
      country: 'New Zealand',
      city: 'Wellington',
    });
    createDraft.mockRejectedValueOnce(new Error('Your host consent is no longer current.'));

    await component.saveDraft();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Your host consent is no longer current.');
  });
});
