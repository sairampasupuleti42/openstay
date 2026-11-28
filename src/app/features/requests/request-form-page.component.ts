import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicListingDetails } from '../../core/models/listing.model';
import { HostingRequestService } from '../../core/services/hosting-request.service';
import { ListingService } from '../../core/services/listing.service';

@Component({
  selector: 'app-request-form-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, RouterLink],
  templateUrl: './request-form-page.component.html',
  styles: `
    :host { display: block; background: var(--openstay-cream); min-height: 80vh; }
    .page { max-width: 720px; margin: auto; padding: 40px 20px; }
    .panel { padding: clamp(20px, 5vw, 36px); border: 1px solid var(--openstay-border); border-radius: var(--openstay-card-radius); background: var(--openstay-warm-white); box-shadow: var(--openstay-soft-shadow); }
    h1 { margin-top: 0; font-size: clamp(32px, 6vw, 48px); line-height: 1.1; }
    form { display: grid; gap: 12px; }
    mat-form-field { width: 100%; }
    .error { color: #a4262c; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; }
    .actions a, .actions button { min-height: 48px; }
    @media (max-width: 600px) { .actions { flex-direction: column; align-items: stretch; } }
  `,
})
export class RequestFormPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly listings = inject(ListingService);
  private readonly requests = inject(HostingRequestService);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly listing = signal<PublicListingDetails | null>(null);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly requestId = signal('');
  readonly form = this.fb.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    guestCount: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    introductoryMessage: ['', [Validators.required, Validators.maxLength(2000)]],
  });
  private listingId = '';

  ngOnInit(): void {
    this.listingId = this.route.snapshot.paramMap.get('listingId') ?? '';
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const listing = await this.listings.getPublicListingDetails(this.listingId);
      this.listing.set(listing);
      if (!listing) this.error.set('This listing is no longer available.');
    } catch (error) {
      this.error.set(this.listings.getErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async submit(): Promise<void> {
    const listing = this.listing();
    if (this.submitting() || this.requestId() || !listing) return;
    this.form.markAllAsTouched();
    const values = this.form.getRawValue();
    if (this.form.invalid || values.endDate <= values.startDate
      || !Number.isInteger(values.guestCount) || values.guestCount > listing.guestCapacity
      || !values.introductoryMessage.trim()) {
      this.error.set('Enter valid dates (checkout after arrival), a guest count within the capacity, and a message.');
      return;
    }
    this.error.set('');
    this.submitting.set(true);
    try {
      const result = await this.requests.create({ listingId: this.listingId, ...values });
      this.requestId.set(result.requestId);
    } catch (error) {
      this.error.set(this.requests.errorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
