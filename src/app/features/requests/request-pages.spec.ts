import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ListingService } from '../../core/services/listing.service';
import { BlockService } from '../../core/services/block.service';
import { ConversationService } from '../../core/services/conversation.service';
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
  guestCount: 2, introductoryMessage: 'Hello', status: 'pending',
  viewerHasBlockedOther: false,
  completion: {
    status: 'not_started', reason: null, viewerConfirmed: false,
    otherParticipantConfirmed: false, responseDeadline: null, completedAt: null,
  },
  otherParticipantReviews: [],
  createdAt: null, updatedAt: null,
};

describe('hosting request pages', () => {
  const create = vi.fn();
  const list = vi.fn();
  const details = vi.fn();
  const decide = vi.fn();
  const initiateCompletion = vi.fn();
  const confirmCompletion = vi.fn();
  const disputeCompletion = vi.fn();
  const submitReview = vi.fn();
  const blockParticipant = vi.fn();
  const openConversation = vi.fn();
  const getPublicListingDetails = vi.fn();
  const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Error';
  let route: { snapshot: { paramMap: { get: () => string }; data: { kind: string } } };

  beforeEach(async () => {
    vi.resetAllMocks();
    openConversation.mockResolvedValue({
      conversationId: 'c'.repeat(64), requestId: 'c'.repeat(64), listingId: 'listing-1',
      status: 'accepted', otherParticipantName: 'Traveller',
    });
    getPublicListingDetails.mockResolvedValue(listing);
    list.mockResolvedValue({ items: [request], nextCursor: null });
    details.mockResolvedValue({
      ...request, viewerIsHost: true, listingTitle: listing.title,
      listingLocation: 'Wellington, New Zealand', otherParticipantName: 'Traveller',
      traveller: { displayName: 'Traveller' }, viewerReviewSubmitted: false,
      otherParticipantReviewStats: null, otherParticipantReviews: [],
    });
    route = { snapshot: { paramMap: { get: () => 'listing-1' }, data: { kind: 'mine' } } };
    await TestBed.configureTestingModule({
      imports: [RequestFormPageComponent, RequestListPageComponent, RequestDetailPageComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: ListingService, useValue: { getPublicListingDetails, getErrorMessage: errorMessage } },
        { provide: HostingRequestService, useValue: {
          create, list, details, decide, initiateCompletion, confirmCompletion,
          disputeCompletion, submitReview, errorMessage,
        } },
        { provide: BlockService, useValue: { block: blockParticipant, errorMessage } },
        { provide: ConversationService, useValue: { open: openConversation, errorMessage } },
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

  it('groups accepted, pending and terminal requests without presenting completion', async () => {
    list.mockResolvedValueOnce({
      items: [
        { ...request, requestId: 'pending', startDate: '2030-02-01', endDate: '2030-02-05', status: 'pending' },
        { ...request, requestId: 'upcoming', startDate: '2030-03-01', endDate: '2030-03-05', status: 'accepted' },
        { ...request, requestId: 'past', startDate: '2020-03-01', endDate: '2020-03-05', status: 'accepted' },
        { ...request, requestId: 'cancelled', startDate: '2030-04-01', endDate: '2030-04-05', status: 'cancelled' },
        { ...request, requestId: 'declined', startDate: '2030-05-01', endDate: '2030-05-05', status: 'declined' },
      ],
      nextCursor: null,
    });
    const fixture = TestBed.createComponent(RequestListPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const sections = fixture.componentInstance.sections();
    expect(sections.find((section) => section.key === 'upcoming')?.items.map((item) => item.requestId)).toEqual(['upcoming']);
    expect(sections.find((section) => section.key === 'past')?.items.map((item) => item.requestId)).toEqual(['past']);
    expect(sections.find((section) => section.key === 'cancelled')?.items.map((item) => item.requestId)).toEqual(['cancelled']);
    expect(fixture.nativeElement.textContent).toContain('Past-dated accepted stays');
    expect(fixture.nativeElement.textContent).not.toContain('completed');
    fixture.destroy();
  });

  it('distinguishes who must confirm an awaiting completion', async () => {
    list.mockResolvedValueOnce({
      items: [
        { ...request, requestId: 'mine', status: 'accepted',
          completion: { ...request.completion, status: 'pending', reason: 'awaiting_confirmation', viewerConfirmed: true } },
        { ...request, requestId: 'theirs', status: 'accepted',
          completion: { ...request.completion, status: 'pending', reason: 'awaiting_confirmation', viewerConfirmed: false } },
      ],
      nextCursor: null,
    });
    const fixture = TestBed.createComponent(RequestListPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Awaiting the other participant’s confirmation.');
    expect(fixture.nativeElement.textContent).toContain('Your confirmation is needed.');
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

  it('integrates mutual completion into the stay detail and reloads server state', async () => {
    details.mockReset();
    details
      .mockResolvedValueOnce({
        ...request, status: 'accepted', endDate: '2020-01-15', viewerIsHost: true,
        listingTitle: listing.title, traveller: null, viewerReviewSubmitted: false,
        otherParticipantReviewStats: null, otherParticipantReviews: [],
      })
      .mockResolvedValueOnce({
        ...request, status: 'accepted', endDate: '2020-01-15', viewerIsHost: true,
        listingTitle: listing.title, traveller: null, viewerReviewSubmitted: false,
        otherParticipantReviewStats: null, otherParticipantReviews: [],
        completion: { ...request.completion, status: 'pending', reason: 'awaiting_confirmation', viewerConfirmed: true },
      });
    initiateCompletion.mockResolvedValueOnce({ ...request.completion, status: 'pending' });
    const fixture = TestBed.createComponent(RequestDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.canStartCompletion()).toBe(true);
    await fixture.componentInstance.initiateCompletion();
    fixture.detectChanges();
    expect(initiateCompletion).toHaveBeenCalledWith('listing-1');
    expect(fixture.componentInstance.details()?.completion.status).toBe('pending');
    expect(fixture.nativeElement.textContent).toContain('Waiting for the other participant');
  });

  it('submits reviews only after mutual completion and shows the submitted state', async () => {
    details.mockReset();
    details
      .mockResolvedValueOnce({
        ...request, status: 'accepted', viewerIsHost: false, listingTitle: listing.title,
        traveller: null, viewerReviewSubmitted: false, otherParticipantReviewStats: null, otherParticipantReviews: [],
        completion: { ...request.completion, status: 'completed' },
      })
      .mockResolvedValueOnce({
        ...request, status: 'accepted', viewerIsHost: false, listingTitle: listing.title,
        traveller: null, viewerReviewSubmitted: true, otherParticipantReviewStats: null, otherParticipantReviews: [],
        completion: { ...request.completion, status: 'completed' },
      });
    submitReview.mockResolvedValueOnce({ reviewId: 'review-1', submitted: true });
    const fixture = TestBed.createComponent(RequestDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Optional private review note');
    expect(fixture.nativeElement.textContent).toContain('Your rating is public');
    await fixture.componentInstance.submitReview();
    fixture.detectChanges();
    expect(submitReview).toHaveBeenCalledWith('listing-1', 5, '');
    expect(fixture.nativeElement.textContent).toContain('Your review was submitted.');
  });

  it('opens the deterministic conversation only for an accepted stay', async () => {
    details.mockResolvedValueOnce({
      ...request, status: 'accepted', viewerIsHost: true, listingTitle: listing.title,
      listingLocation: 'Wellington, New Zealand', otherParticipantName: 'Traveller', traveller: null,
      viewerReviewSubmitted: false, otherParticipantReviewStats: null, otherParticipantReviews: [],
    });
    const fixture = TestBed.createComponent(RequestDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    expect(fixture.nativeElement.textContent).toContain('Message Traveller');
    await fixture.componentInstance.openConversation();
    expect(openConversation).toHaveBeenCalledWith('listing-1');
    expect(navigate).toHaveBeenCalledWith(`/messages/${'c'.repeat(64)}`);
  });

  it('confirms blocking and explains that existing stay history remains available', async () => {
    details.mockReset();
    details
      .mockResolvedValueOnce({
        ...request, status: 'accepted', viewerIsHost: true, listingTitle: listing.title,
        otherParticipantName: 'Traveller', viewerHasBlockedOther: false,
        traveller: null, viewerReviewSubmitted: false, otherParticipantReviewStats: null,
        otherParticipantReviews: [],
      })
      .mockResolvedValueOnce({
        ...request, status: 'accepted', viewerIsHost: true, listingTitle: listing.title,
        otherParticipantName: 'Traveller', viewerHasBlockedOther: true,
        traveller: null, viewerReviewSubmitted: false, otherParticipantReviewStats: null,
        otherParticipantReviews: [],
      });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const fixture = TestBed.createComponent(RequestDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.blockParticipant(fixture.componentInstance.details()!);
    expect(blockParticipant).not.toHaveBeenCalled();
    await fixture.componentInstance.blockParticipant(fixture.componentInstance.details()!);
    fixture.detectChanges();
    expect(blockParticipant).toHaveBeenCalledWith('request-1');
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('will not be cancelled'));
    expect(fixture.nativeElement.textContent).toContain('Existing history remains available');
    expect(fixture.nativeElement.textContent).toContain('You blocked this participant');
    confirm.mockRestore();
    fixture.destroy();
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
    details.mockResolvedValueOnce({
      ...request, status: 'accepted', viewerIsHost: true, listingTitle: listing.title,
      traveller: null, viewerReviewSubmitted: false, otherParticipantReviewStats: null,
      otherParticipantReviews: [],
    });
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
      viewerReviewSubmitted: false, otherParticipantReviewStats: null, otherParticipantReviews: [],
    });
    details.mockResolvedValueOnce({
      ...request, status: 'cancelled', viewerIsHost: false, listingTitle: listing.title, traveller: null,
      viewerReviewSubmitted: false, otherParticipantReviewStats: null, otherParticipantReviews: [],
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
