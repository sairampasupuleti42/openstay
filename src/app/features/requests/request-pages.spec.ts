import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ListingService } from '../../core/services/listing.service';
import { HostingRequestService } from '../../core/services/hosting-request.service';
import { RequestFormPageComponent } from './request-form-page.component';
import { RequestListPageComponent } from './request-list-page.component';
import { RequestDetailPageComponent } from './request-detail-page.component';

const listing = {
  listingId: 'listing-1', title: 'A lovely stay', city: 'Wellington', country: 'New Zealand',
  guestCapacity: 2,
};
const request = {
  requestId: 'request-1', listingId: 'listing-1', startDate: '2030-01-10', endDate: '2030-01-15',
  guestCount: 2, introductoryMessage: 'Hello', status: 'pending', createdAt: null, updatedAt: null,
};

describe('hosting request pages', () => {
  const create = vi.fn();
  const list = vi.fn();
  const details = vi.fn();
  const decide = vi.fn();
  const getPublicListingDetails = vi.fn();
  const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Error';
  let route: { snapshot: { paramMap: { get: () => string }; data: { kind: string } } };

  beforeEach(async () => {
    vi.resetAllMocks();
    getPublicListingDetails.mockResolvedValue(listing);
    list.mockResolvedValue({ items: [request], nextCursor: null });
    details.mockResolvedValue({ ...request, viewerIsHost: true, listingTitle: listing.title, traveller: { displayName: 'Traveller' } });
    route = { snapshot: { paramMap: { get: () => 'listing-1' }, data: { kind: 'mine' } } };
    await TestBed.configureTestingModule({
      imports: [RequestFormPageComponent, RequestListPageComponent, RequestDetailPageComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: ListingService, useValue: { getPublicListingDetails, getErrorMessage: errorMessage } },
        { provide: HostingRequestService, useValue: { create, list, details, decide, errorMessage } },
      ],
    }).compileComponents();
  });

  it('validates dates, capacity and message before submitting and prevents concurrent clicks', async () => {
    const fixture = TestBed.createComponent(RequestFormPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.form.setValue({ startDate: '2030-01-10', endDate: '2030-01-10', guestCount: 3, introductoryMessage: ' ' });
    await component.submit();
    expect(create).not.toHaveBeenCalled();
    expect(component.error()).toContain('valid dates');
    let resolve!: (value: { requestId: string }) => void;
    create.mockReturnValue(new Promise((done) => { resolve = done; }));
    component.form.setValue({ startDate: '2030-01-10', endDate: '2030-01-15', guestCount: 2, introductoryMessage: 'Hello' });
    const first = component.submit();
    await component.submit();
    expect(create).toHaveBeenCalledTimes(1);
    resolve({ requestId: 'request-1' });
    await first;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Request sent');
  });

  it('shows failures and supports retrying a request', async () => {
    create.mockRejectedValueOnce(new Error('Already requested')).mockResolvedValueOnce({ requestId: 'request-1' });
    const fixture = TestBed.createComponent(RequestFormPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.form.setValue({ startDate: '2030-01-10', endDate: '2030-01-15', guestCount: 1, introductoryMessage: 'Hello' });
    await fixture.componentInstance.submit();
    expect(fixture.componentInstance.error()).toBe('Already requested');
    await fixture.componentInstance.submit();
    expect(fixture.componentInstance.requestId()).toBe('request-1');
  });

  it('shows traveller history and incoming host requests from the corresponding API', async () => {
    for (const kind of ['mine', 'incoming']) {
      route.snapshot.data.kind = kind;
      const fixture = TestBed.createComponent(RequestListPageComponent);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(list).toHaveBeenCalledWith(kind, null);
      expect(fixture.nativeElement.textContent).toContain('2030-01-10');
      expect(fixture.nativeElement.textContent).toContain('pending');
      fixture.destroy();
    }
  });

  it('shows authorised details and the permitted traveller name', async () => {
    const fixture = TestBed.createComponent(RequestDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Traveller');
    expect(fixture.nativeElement.textContent).toContain('A lovely stay');
    expect(fixture.nativeElement.textContent).toContain('View your listing');
    expect(fixture.nativeElement.textContent).not.toContain('phoneNumber');
  });

  it('confirms host decisions, refreshes the status and exposes errors', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    decide.mockRejectedValueOnce(new Error('Dates overlap')).mockResolvedValueOnce(undefined);
    const fixture = TestBed.createComponent(RequestDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.decide('accept');
    expect(decide).not.toHaveBeenCalled();
    await fixture.componentInstance.decide('accept');
    expect(fixture.componentInstance.actionError()).toBe('Dates overlap');
    details.mockResolvedValueOnce({ ...request, status: 'accepted', viewerIsHost: true, listingTitle: listing.title, traveller: null });
    await fixture.componentInstance.decide('accept');
    expect(decide).toHaveBeenCalledWith('listing-1', 'accept');
    expect(fixture.componentInstance.details()?.status).toBe('accepted');
    expect(fixture.componentInstance.success()).toBe('Stay confirmed.');
    confirm.mockRestore();
  });

  it('prevents duplicate decisions and reports cancellation only after the callable confirms', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    let resolveDecision!: () => void;
    decide.mockReturnValueOnce(new Promise<void>((resolve) => { resolveDecision = resolve; }));
    details.mockResolvedValueOnce({
      ...request, viewerIsHost: false, listingTitle: listing.title, traveller: null,
    });
    details.mockResolvedValueOnce({
      ...request, status: 'cancelled', viewerIsHost: false, listingTitle: listing.title, traveller: null,
    });
    const fixture = TestBed.createComponent(RequestDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const first = fixture.componentInstance.decide('cancel');
    await fixture.componentInstance.decide('cancel');
    expect(decide).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.success()).toBe('');

    resolveDecision();
    await first;
    expect(fixture.componentInstance.success()).toBe('Cancelled.');
    expect(fixture.componentInstance.details()?.status).toBe('cancelled');
    confirm.mockRestore();
  });

  it('shows cancellation to travellers and hides host-only actions', async () => {
    details.mockResolvedValueOnce({ ...request, viewerIsHost: false, listingTitle: listing.title, traveller: null });
    const fixture = TestBed.createComponent(RequestDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cancel request');
    expect(fixture.nativeElement.textContent).not.toContain('Accept and confirm stay');
  });
});
