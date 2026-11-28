import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicListingDetails } from '../../core/models/listing.model';
import { ListingService } from '../../core/services/listing.service';

@Component({
  selector: 'app-public-listing-detail-page',
  imports: [MatButtonModule, RouterLink],
  templateUrl: './public-listing-detail-page.component.html',
  styles: `
    :host { display: block; min-height: calc(100vh - 76px); background: var(--openstay-cream); }
    .page { width: min(100%, 920px); margin: 0 auto; padding: 36px 16px 72px; }
    .panel, .state-panel { padding: clamp(22px, 5vw, 42px); border: 1px solid var(--openstay-border); border-radius: 24px; background: var(--openstay-warm-white); box-shadow: var(--openstay-card-shadow); }
    .eyebrow { margin: 0 0 8px; color: var(--openstay-forest); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 12px 0; font-size: clamp(34px, 7vw, 54px); line-height: 1.05; letter-spacing: -.035em; }
    h2 { margin: 28px 0 10px; font-size: 22px; }
    .location, .description, .muted { color: var(--openstay-muted); line-height: 1.7; }
    .facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
    .fact { padding: 14px; border-radius: 14px; background: var(--openstay-cream); }
    .fact dt { color: var(--openstay-muted); font-size: 13px; }
    .fact dd { margin: 5px 0 0; font-weight: 700; }
    .tag-list { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; list-style: none; }
    .tag-list li { padding: 7px 11px; border-radius: 999px; background: var(--openstay-cream); }
    .rules { padding-left: 22px; color: var(--openstay-muted); line-height: 1.7; }
    .host { padding: 18px; border-radius: 16px; background: var(--openstay-cream); }
    .host h3 { margin: 0 0 8px; font-size: 19px; }
    .host p { margin: 0; color: var(--openstay-muted); line-height: 1.6; }
    .host-languages { margin-top: 10px !important; font-size: 13px; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
    .actions a, .actions button { min-height: 46px; border-radius: 999px; }
    .primary-action { background: var(--openstay-forest); color: #fff; }
    .error { color: #a4262c; }
    @media (max-width: 619px) {
      .actions { flex-direction: column; align-items: stretch; }
    }
    @media (min-width: 620px) {
      .page { padding: 56px 24px 88px; }
      .facts { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
  `,
})
export class PublicListingDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ListingService);
  readonly listing = signal<PublicListingDetails | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly isUnavailable = signal(false);
  private listingId = '';

  ngOnInit(): void {
    this.listingId = this.route.snapshot.paramMap.get('listingId') ?? '';
    if (!this.listingId) {
      this.isUnavailable.set(true);
      this.isLoading.set(false);
      return;
    }
    void this.loadListing();
  }

  async loadListing(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.isUnavailable.set(false);
    try {
      const listing = await this.service.getPublicListingDetails(this.listingId);
      if (listing) this.listing.set(listing);
      else {
        this.listing.set(null);
        this.isUnavailable.set(true);
      }
    } catch (error) {
      this.errorMessage.set(this.service.getErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  accommodationLabel(value: string): string {
    return value.replaceAll('_', ' ');
  }
}
