import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AccommodationType,
  PublicListingFilters,
  PublicListingSummary,
} from '../../core/models/listing.model';
import { ListingService } from '../../core/services/listing.service';
import { PublicListingCardComponent } from '../../shared/components/public-listing-card/public-listing-card.component';

const ACCOMMODATION_OPTIONS: { value: AccommodationType; label: string }[] = [
  { value: 'private_room', label: 'Private room' },
  { value: 'shared_room', label: 'Shared room' },
  { value: 'entire_home', label: 'Entire home' },
  { value: 'guest_house', label: 'Guest house' },
  { value: 'farm_stay', label: 'Farm stay' },
  { value: 'other', label: 'Other' },
];

@Component({
  selector: 'app-discovery-page',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PublicListingCardComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './discovery-page.component.html',
  styles: `
    :host { display: block; min-height: calc(100vh - 76px); background: linear-gradient(145deg, var(--openstay-warm-white), var(--openstay-cream)); }
    .page { width: min(100%, 1120px); margin: 0 auto; padding: 40px 16px 72px; }
    .intro { max-width: 720px; margin: 0 auto 30px; text-align: center; }
    .eyebrow { color: var(--openstay-forest); font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    h1 { margin: 12px 0; font-size: clamp(38px, 7vw, 64px); line-height: 1.05; letter-spacing: -.035em; }
    .intro p:last-child { color: var(--openstay-muted); line-height: 1.65; }
    .search-panel, .state-panel { padding: clamp(18px, 4vw, 28px); border: 1px solid var(--openstay-border); border-radius: 22px; background: var(--openstay-warm-white); box-shadow: var(--openstay-soft-shadow); }
    .search-panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    mat-form-field { width: 100%; }
    .search-actions { display: flex; flex-wrap: wrap; grid-column: 1 / -1; gap: 10px; }
    .primary-action, .secondary-action { min-height: 46px; border-radius: 999px; }
    .primary-action { background: var(--openstay-forest); color: #fff; }
    .results-header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 12px; margin: 30px 0 16px; }
    .results-header h2 { margin: 0; font-size: 25px; }
    .results-header p { color: var(--openstay-muted); }
    .listing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 16px; }
    .state-panel { margin: 20px 0; }
    .state-panel h2 { margin-top: 0; }
    .state-panel p { color: var(--openstay-muted); line-height: 1.6; }
    .error { color: #a4262c; }
    .load-more { display: flex; justify-content: center; margin: 24px 0; }
    @media (max-width: 620px) {
      .search-panel { grid-template-columns: 1fr; }
      .search-actions { grid-column: auto; }
      .search-actions button { flex: 1; }
    }
  `,
})
export class DiscoveryPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(ListingService);
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  readonly accommodationOptions = ACCOMMODATION_OPTIONS;
  readonly guestOptions = Array.from({ length: 10 }, (_, index) => index + 1);
  readonly listings = signal<PublicListingSummary[]>([]);
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly errorMessage = signal('');
  readonly nextCursor = signal<string | null>(null);
  readonly hasMore = signal(false);
  readonly searchSubmitted = signal(false);
  private currentFilters: PublicListingFilters = {};
  private searchGeneration = 0;
  readonly form = this.formBuilder.group({
    country: [''],
    city: [''],
    accommodationType: ['' as '' | AccommodationType],
    minimumGuests: [0],
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.form.patchValue({
      country: params.get('country') ?? '',
      city: params.get('city') ?? params.get('destination') ?? '',
      accommodationType: this.parseAccommodationType(params.get('accommodationType')),
      minimumGuests: this.parseGuestCount(params.get('minimumGuests')),
    });
    this.currentFilters = this.buildFilters();
    this.searchSubmitted.set(Object.keys(this.currentFilters).length > 0);
    void this.searchListings(false);
  }

  async search(): Promise<void> {
    this.currentFilters = this.buildFilters();
    this.searchSubmitted.set(Object.keys(this.currentFilters).length > 0);
    this.listings.set([]);
    this.nextCursor.set(null);
    this.hasMore.set(false);
    let navigationError = '';
    try {
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          country: this.currentFilters.country ?? null,
          city: this.currentFilters.city ?? null,
          accommodationType: this.currentFilters.accommodationType ?? null,
          minimumGuests: this.currentFilters.minimumGuests ?? null,
          destination: null,
        },
      });
    } catch (error) {
      navigationError = this.service.getErrorMessage(error);
    }
    await this.searchListings(false);
    if (navigationError) this.errorMessage.set(navigationError);
  }

  async loadMore(): Promise<void> {
    if (this.isLoadingMore() || !this.hasMore() || !this.nextCursor()) return;
    await this.searchListings(true);
  }

  async retry(): Promise<void> {
    if (this.hasMore() && this.nextCursor() && this.listings().length > 0) {
      await this.searchListings(true);
    } else {
      await this.searchListings(false);
    }
  }

  clearFilters(): void {
    this.form.reset({ country: '', city: '', accommodationType: '', minimumGuests: 0 });
    void this.search();
  }

  accommodationLabel(value: string): string {
    return value.replaceAll('_', ' ');
  }

  private async searchListings(append: boolean): Promise<void> {
    const generation = ++this.searchGeneration;
    const cursor = append ? this.nextCursor() : null;
    if (append) this.isLoadingMore.set(true);
    else this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const page = await this.service.searchPublishedListings(
        this.currentFilters,
        12,
        cursor,
      );
      if (generation !== this.searchGeneration) return;
      this.listings.set(append ? [...this.listings(), ...page.items] : page.items);
      this.nextCursor.set(page.nextCursor);
      this.hasMore.set(page.hasMore);
    } catch (error) {
      if (generation !== this.searchGeneration) return;
      this.errorMessage.set(this.service.getErrorMessage(error));
    } finally {
      if (generation === this.searchGeneration) {
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      }
    }
  }

  private buildFilters(): PublicListingFilters {
    const values = this.form.getRawValue();
    const country = values.country.trim();
    const city = values.city.trim();
    return {
      ...(country ? { country } : {}),
      ...(city ? { city } : {}),
      ...(values.accommodationType ? { accommodationType: values.accommodationType } : {}),
      ...(values.minimumGuests > 0 ? { minimumGuests: values.minimumGuests } : {}),
    };
  }

  private parseAccommodationType(value: string | null): '' | AccommodationType {
    return ACCOMMODATION_OPTIONS.some((option) => option.value === value)
      ? value as AccommodationType
      : '';
  }

  private parseGuestCount(value: string | null): number {
    const guests = Number(value);
    return Number.isInteger(guests) && guests >= 1 && guests <= 10 ? guests : 0;
  }
}
