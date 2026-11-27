import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Listing } from '../../../core/models/listing.model';
import { ListingService } from '../../../core/services/listing.service';

@Component({
  selector: 'app-listing-detail-page',
  imports: [DatePipe, MatButtonModule, RouterLink],
  templateUrl: './listing-detail-page.component.html',
  styles: `
    :host { display: block; min-height: calc(100vh - 76px); background: var(--openstay-cream); }
    .page { width: min(100%, 900px); margin: 0 auto; padding: 36px 16px 64px; }
    .preview, .state-panel { padding: clamp(22px, 5vw, 42px); border: 1px solid var(--openstay-border); border-radius: 24px; background: var(--openstay-warm-white); box-shadow: var(--openstay-card-shadow); }
    .eyebrow { margin: 0 0 8px; color: var(--openstay-forest); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 14px 0; font-size: clamp(34px, 7vw, 52px); line-height: 1.05; letter-spacing: -.035em; }
    h2 { margin: 26px 0 10px; font-size: 21px; }
    .description, .location, .muted { color: var(--openstay-muted); line-height: 1.7; }
    .status { display: inline-flex; min-height: 28px; align-items: center; padding: 4px 11px; border-radius: 999px; background: var(--openstay-sage); color: var(--openstay-forest); font-size: 13px; font-weight: 800; }
    .facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 24px 0; }
    .fact { padding: 14px; border-radius: 14px; background: var(--openstay-cream); }
    .fact dt { color: var(--openstay-muted); font-size: 13px; }
    .fact dd { margin: 5px 0 0; font-weight: 700; }
    .tag-list { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; list-style: none; }
    .tag-list li { padding: 7px 11px; border-radius: 999px; background: var(--openstay-cream); }
    .house-rules { padding-left: 22px; color: var(--openstay-muted); line-height: 1.7; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
    .actions a { min-height: 46px; border-radius: 999px; }
    .primary-action { background: var(--openstay-forest); color: #fff; }
    @media (min-width: 600px) {
      .page { padding: 56px 24px 80px; }
      .facts { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
  `,
})
export class ListingDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly listingsService = inject(ListingService);
  readonly listing = signal<Listing | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    const listingId = this.route.snapshot.paramMap.get('listingId');
    if (!listingId) {
      this.errorMessage.set('This listing could not be found.');
      this.isLoading.set(false);
      return;
    }
    try {
      const listing = await this.listingsService.getOwnListing(listingId);
      if (!listing) this.errorMessage.set('This listing could not be found.');
      else this.listing.set(listing);
    } catch (error) {
      this.errorMessage.set(this.listingsService.getErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  statusLabel(status: Listing['status']): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  accommodationLabel(value: string): string {
    return value.replaceAll('_', ' ');
  }
}
