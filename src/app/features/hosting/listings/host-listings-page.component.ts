import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Listing, ListingStatus } from '../../../core/models/listing.model';
import { ListingService } from '../../../core/services/listing.service';

type ListingAction = 'publish' | 'pause' | 'resume' | 'archive';
type PublicationAction = 'publish' | 'resume';

@Component({
  selector: 'app-host-listings-page',
  imports: [DatePipe, MatButtonModule, RouterLink],
  templateUrl: './host-listings-page.component.html',
  styles: `
    :host { display: block; min-height: calc(100vh - 76px); background: var(--openstay-cream); }
    .page { width: min(100%, 1040px); margin: 0 auto; padding: 36px 16px 64px; }
    .page-header { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
    .eyebrow { margin: 0 0 8px; color: var(--openstay-forest); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(34px, 7vw, 52px); line-height: 1.05; letter-spacing: -.035em; }
    .intro { max-width: 580px; margin: 12px 0 0; color: var(--openstay-muted); line-height: 1.6; }
    .primary-action, .secondary-action, .text-action { min-height: 44px; border-radius: 999px; }
    .primary-action { background: var(--openstay-forest); color: #fff; }
    .listing-list { display: grid; gap: 16px; }
    .listing-card, .state-panel { padding: clamp(20px, 5vw, 28px); border: 1px solid var(--openstay-border); border-radius: 22px; background: var(--openstay-warm-white); box-shadow: var(--openstay-soft-shadow); }
    .listing-heading { display: flex; flex-wrap: wrap; align-items: start; justify-content: space-between; gap: 16px; }
    .listing-heading h2 { margin: 0; font-size: clamp(21px, 4vw, 28px); line-height: 1.2; }
    .location, .updated { color: var(--openstay-muted); }
    .location { margin: 8px 0 0; }
    .status { display: inline-flex; min-height: 28px; align-items: center; padding: 4px 11px; border-radius: 999px; font-size: 13px; font-weight: 800; }
    .status--draft { background: #f5eddb; color: #785715; }
    .status--published { background: #e4f1e9; color: #245c3b; }
    .status--paused { background: #e9edf0; color: #394b55; }
    .status--archived { background: #eee9e6; color: #62514a; }
    .updated { margin: 14px 0 0; font-size: 13px; }
    .card-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
    .empty-state { text-align: center; }
    .empty-state h2, .state-panel h2 { margin: 0 0 10px; font-size: 25px; }
    .empty-state p, .state-panel p { color: var(--openstay-muted); line-height: 1.6; }
    .state-panel { margin: 18px 0; }
    .error { color: #a4262c; }
    .success { color: var(--openstay-forest); }
    .load-more { display: flex; justify-content: center; margin: 24px 0 0; }
    @media (min-width: 700px) { .page { padding: 56px 24px 80px; } }
  `,
})
export class HostListingsPageComponent implements OnInit {
  private readonly listingsService = inject(ListingService);
  readonly listings = signal<Listing[]>([]);
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly hasMore = signal(false);
  readonly pendingAction = signal<string | null>(null);
  readonly publicationReview = signal<{ listingId: string; action: PublicationAction } | null>(null);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  private readonly requestKeys = new Map<string, string>();

  ngOnInit(): void {
    void this.loadListings();
  }

  async loadListings(loadMore = false): Promise<void> {
    if (loadMore && (this.isLoadingMore() || !this.hasMore())) return;
    if (loadMore) this.isLoadingMore.set(true);
    else this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const current = this.listings();
      const lastListing = loadMore ? current[current.length - 1] : undefined;
      const page = await this.listingsService.getOwnListings(20, lastListing);
      this.listings.set(loadMore ? [...current, ...page] : page);
      this.hasMore.set(page.length === 20);
    } catch (error) {
      this.errorMessage.set(this.listingsService.getErrorMessage(error));
    } finally {
      this.isLoading.set(false);
      this.isLoadingMore.set(false);
    }
  }

  statusLabel(status: ListingStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  isActionPendingFor(listingId: string): boolean {
    return this.pendingAction()?.startsWith(`${listingId}:`) ?? false;
  }

  requestPublicationReview(listing: Listing, action: PublicationAction): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.publicationReview.set({ listingId: listing.listingId, action });
  }

  confirmPublicationReview(listing: Listing, action: PublicationAction): void {
    const review = this.publicationReview();
    if (review?.listingId !== listing.listingId || review.action !== action) return;
    this.publicationReview.set(null);
    void this.performReviewedAction(listing, action);
  }

  cancelPublicationReview(): void {
    this.publicationReview.set(null);
  }

  actionLabel(listing: Listing, action: ListingAction): string {
    if (this.pendingAction() === `${listing.listingId}:${action}`) {
      return action === 'publish' ? 'Publishing…'
        : action === 'pause' ? 'Pausing…'
          : action === 'resume' ? 'Resuming…'
            : 'Archiving…';
    }
    return action === 'publish' ? 'Publish'
      : action === 'pause' ? 'Pause'
        : action === 'resume' ? 'Resume'
          : 'Archive';
  }

  async performAction(listing: Listing, action: ListingAction): Promise<void> {
    if (action === 'publish' || action === 'resume') {
      this.errorMessage.set('Review the public listing text before publishing or resuming.');
      return;
    }
    await this.runAction(listing, action);
  }

  private async performReviewedAction(
    listing: Listing,
    action: PublicationAction,
  ): Promise<void> {
    await this.runAction(listing, action, true);
  }

  private async runAction(
    listing: Listing,
    action: ListingAction,
    publicContentReviewed?: true,
  ): Promise<void> {
    if (
      (action === 'publish' || action === 'resume')
      && publicContentReviewed !== true
    ) {
      this.errorMessage.set('Review the public listing text before publishing or resuming.');
      return;
    }
    const operationId = `${listing.listingId}:${action}`;
    if (this.pendingAction()) return;

    this.errorMessage.set('');
    this.successMessage.set('');
    this.pendingAction.set(operationId);
    const idempotencyKey = this.requestKeys.get(operationId) ?? globalThis.crypto.randomUUID();
    this.requestKeys.set(operationId, idempotencyKey);
    try {
      switch (action) {
        case 'publish':
          await this.listingsService.publishListing(
            listing.listingId,
            idempotencyKey,
            true,
          );
          break;
        case 'pause':
          await this.listingsService.pauseListing(listing.listingId, idempotencyKey);
          break;
        case 'resume':
          await this.listingsService.resumeListing(
            listing.listingId,
            idempotencyKey,
            true,
          );
          break;
        case 'archive':
          await this.listingsService.archiveListing(listing.listingId, idempotencyKey);
          break;
      }
      this.requestKeys.delete(operationId);
      const completed = action === 'publish' ? 'published'
        : action === 'pause' ? 'paused'
          : action === 'resume' ? 'resumed'
            : 'archived';
      this.successMessage.set(`Listing ${completed}.`);
      await this.loadListings();
    } catch (error) {
      if (this.isStaleListingRequest(error)) {
        this.requestKeys.delete(operationId);
        await this.loadListings();
        if (!this.errorMessage()) {
          this.errorMessage.set('This listing changed. Review its current status before trying again.');
        }
        return;
      }
      this.errorMessage.set(this.listingsService.getErrorMessage(error));
    } finally {
      this.pendingAction.set(null);
    }
  }

  private isStaleListingRequest(error: unknown): boolean {
    return typeof error === 'object'
      && error !== null
      && 'details' in error
      && typeof error.details === 'object'
      && error.details !== null
      && 'reason' in error.details
      && error.details.reason === 'stale-listing-request';
  }
}
