import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AccommodationType,
  Listing,
  ListingInput,
  validateListingInput,
} from '../../../core/models/listing.model';
import { APPROVED_AMENITIES_LIST } from '../../../core/models/listing.model';
import { ListingService } from '../../../core/services/listing.service';

const ACCOMMODATION_OPTIONS: { value: AccommodationType; label: string }[] = [
  { value: 'private_room', label: 'Private room' },
  { value: 'shared_room', label: 'Shared room' },
  { value: 'entire_home', label: 'Entire home' },
  { value: 'guest_house', label: 'Guest house' },
  { value: 'farm_stay', label: 'Farm stay' },
  { value: 'other', label: 'Other' },
];

@Component({
  selector: 'app-listing-editor-page',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './listing-editor-page.component.html',
  styles: `
    :host { display: block; min-height: calc(100vh - 76px); background: var(--openstay-cream); }
    .page { width: min(100%, 900px); margin: 0 auto; padding: 36px 16px 64px; }
    .panel, .state-panel { padding: clamp(22px, 5vw, 42px); border: 1px solid var(--openstay-border); border-radius: 24px; background: var(--openstay-warm-white); box-shadow: var(--openstay-card-shadow); }
    .eyebrow { margin: 0 0 8px; color: var(--openstay-forest); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(34px, 7vw, 50px); line-height: 1.05; letter-spacing: -.035em; }
    .intro, .privacy-note { color: var(--openstay-muted); line-height: 1.65; }
    .privacy-note { margin: 20px 0; padding: 14px 16px; border-left: 3px solid var(--openstay-lime); background: var(--openstay-cream); }
    form { display: grid; gap: 12px; margin-top: 24px; }
    mat-form-field { width: 100%; }
    textarea { resize: vertical; }
    .field-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
    .primary-action, .secondary-action { min-height: 48px; border-radius: 999px; }
    .primary-action { background: var(--openstay-forest); color: #fff; }
    .error { color: #a4262c; }
    .success { color: var(--openstay-forest); }
    .amenity-hint { margin: -4px 0 0; color: var(--openstay-muted); font-size: 13px; }
    @media (min-width: 650px) {
      .page { padding: 56px 24px 80px; }
      .field-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    }
  `,
})
export class ListingEditorPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly listingsService = inject(ListingService);
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  readonly accommodationOptions = ACCOMMODATION_OPTIONS;
  readonly amenityOptions = APPROVED_AMENITIES_LIST;
  readonly listingId = signal<string | null>(null);
  readonly isEditRoute = signal(false);
  readonly editUnavailable = signal(false);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly createdListingId = signal<string | null>(null);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly form = this.formBuilder.group({
    title: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(2000)]],
    accommodationType: ['private_room' as AccommodationType, Validators.required],
    country: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    region: ['', Validators.maxLength(100)],
    areaDescription: ['', Validators.maxLength(200)],
    guestCapacity: [1, [Validators.required, integerRange(1, 10)]],
    bedrooms: [0, [Validators.required, integerRange(0, 10)]],
    beds: [1, [Validators.required, integerRange(1, 15)]],
    bathrooms: [1, [Validators.required, numericRange(1, 10)]],
    amenities: this.formBuilder.control<string[]>([]),
    houseRulesText: ['', houseRulesValidator],
  });

  async ngOnInit(): Promise<void> {
    const listingId = this.route.snapshot.paramMap.get('listingId');
    if (!listingId) return;
    this.listingId.set(listingId);
    this.isEditRoute.set(true);
    this.isLoading.set(true);
    try {
      const listing = await this.listingsService.getOwnListing(listingId);
      if (!listing) {
        this.editUnavailable.set(true);
        this.errorMessage.set('This listing could not be found.');
      } else if (listing.status !== 'draft') {
        this.editUnavailable.set(true);
        this.errorMessage.set('Only draft listings can be edited. You can preview the current listing instead.');
      } else {
        this.populateForm(listing);
      }
    } catch (error) {
      this.editUnavailable.set(true);
      this.errorMessage.set(this.listingsService.getErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveDraft(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      const input = this.toListingInput();
      const listingId = this.listingId();
      if (listingId) {
        await this.listingsService.updateOwnDraft(listingId, input);
        this.successMessage.set('Your draft has been saved.');
      } else {
        const newListingId = await this.listingsService.createDraft(input);
        this.listingId.set(newListingId);
        this.createdListingId.set(newListingId);
      }
      this.form.markAsPristine();
    } catch (error) {
      this.errorMessage.set(this.listingsService.getErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  private populateForm(listing: Listing): void {
    this.form.patchValue({
      title: listing.title,
      description: listing.description,
      accommodationType: listing.accommodationType,
      country: listing.country,
      city: listing.city,
      region: listing.region ?? '',
      areaDescription: listing.areaDescription ?? '',
      guestCapacity: listing.guestCapacity,
      bedrooms: listing.bedrooms,
      beds: listing.beds,
      bathrooms: listing.bathrooms,
      amenities: listing.amenities,
      houseRulesText: listing.houseRules.join('\n'),
    });
  }

  private toListingInput(): ListingInput {
    const values = this.form.getRawValue();
    const validated = validateListingInput({
      title: values.title,
      description: values.description,
      accommodationType: values.accommodationType,
      country: values.country,
      city: values.city,
      region: values.region.trim() || undefined,
      areaDescription: values.areaDescription.trim() || undefined,
      guestCapacity: values.guestCapacity,
      bedrooms: values.bedrooms,
      beds: values.beds,
      bathrooms: values.bathrooms,
      amenities: values.amenities,
      houseRules: values.houseRulesText
        .split(/\r?\n/)
        .map((rule) => rule.trim())
        .filter(Boolean),
    });
    return {
      ...validated,
      region: values.region.trim() || undefined,
      areaDescription: values.areaDescription.trim() || undefined,
    };
  }
}

function integerRange(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value);
    return Number.isInteger(value) && value >= min && value <= max
      ? null
      : { integerRange: { min, max } };
  };
}

function numericRange(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value);
    return Number.isFinite(value) && value >= min && value <= max
      ? null
      : { numericRange: { min, max } };
  };
}

const houseRulesValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = typeof control.value === 'string' ? control.value : '';
  const rules = value.split(/\r?\n/).map((rule) => rule.trim()).filter(Boolean);
  return rules.length <= 15
    && rules.every((rule) => rule.length >= 5 && rule.length <= 200)
    ? null
    : { houseRules: true };
};
