import { Injectable, inject } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  deleteField,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import {
  Listing,
  ListingInput,
  ListingUpdates,
  PublicListingDetails,
  PublicListingFilters,
  PublicListingPage,
  validateListingInput,
  validateListingData,
} from '../models/listing.model';
import { environment } from '../../../environments/environment';

const FUNCTIONS_REGION = 'us-central1';
type LifecycleCallableName =
  | 'publishListing'
  | 'pauseListing'
  | 'resumeListing'
  | 'archiveListing';

const EDITABLE_FIELDS = [
  'title',
  'description',
  'accommodationType',
  'country',
  'city',
  'region',
  'areaDescription',
  'guestCapacity',
  'bedrooms',
  'beds',
  'bathrooms',
  'amenities',
  'houseRules',
] as const;

function validatePageSize(pageSize: number): void {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 20) {
    throw new Error('Listing page size must be an integer from 1 to 20.');
  }
}

@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly auth = inject(Auth);
  private readonly firebaseApp = inject(FirebaseApp);
  private readonly firestore = inject(Firestore);
  private listingFunctions?: ReturnType<typeof import('firebase/functions').getFunctions>;

  async createDraft(input: ListingInput): Promise<string> {
    const uid = this.requireCurrentUid();
    const validated = validateListingInput(input);
    const listingRef = doc(collection(this.firestore, 'listings'));

    await setDoc(listingRef, {
      listingId: listingRef.id,
      hostUid: uid,
      ...validated,
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: null,
      pausedAt: null,
      archivedAt: null,
    });

    return listingRef.id;
  }

  async getOwnListing(listingId: string): Promise<Listing | null> {
    const uid = this.requireCurrentUid();
    const snapshot = await getDoc(doc(this.firestore, 'listings', listingId));

    if (!snapshot.exists()) return null;

    const listing = validateListingData(snapshot.data(), snapshot.id);

    if (listing.hostUid !== uid) {
      throw new Error('NO_ACCESS');
    }

    return listing;
  }

  async getOwnListings(pageSize: number = 20, lastListing?: Listing): Promise<Listing[]> {
    const uid = this.requireCurrentUid();
    validatePageSize(pageSize);
    const constraints: QueryConstraint[] = [
      where('hostUid', '==', uid),
      orderBy('updatedAt', 'desc'),
      orderBy(documentId(), 'desc'),
      limit(pageSize),
    ];

    if (lastListing) {
      constraints.push(startAfter(lastListing.updatedAt, lastListing.listingId));
    }

    const q = query(collection(this.firestore, 'listings'), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs
      .slice(0, pageSize)
      .map((doc) => validateListingData(doc.data(), doc.id));
  }

  async updateOwnDraft(listingId: string, updates: ListingUpdates): Promise<void> {
    const uid = this.requireCurrentUid();

    // Verify ownership first
    const snapshot = await getDoc(doc(this.firestore, 'listings', listingId));
    if (!snapshot.exists()) {
      throw new Error('NO_SUCH_LISTING');
    }

    const listing = validateListingData(snapshot.data(), snapshot.id);
    if (listing.hostUid !== uid) {
      throw new Error('NO_ACCESS');
    }

    if (listing.status !== 'draft') {
      throw new Error('LISTING_NOT_DRAFT');
    }

    const keys = Object.keys(updates);
    const editableFields: readonly string[] = EDITABLE_FIELDS;

    if (keys.some((key) => !editableFields.includes(key))) {
      throw new Error('A listing field is not editable.');
    }

    const safeUpdates: Record<string, unknown> = {};
    for (const key of keys) {
      const field = key as keyof ListingUpdates;
      const value = updates[field];

      switch (field) {
        case 'title':
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.length < 10 || trimmed.length > 100) {
              throw new Error('Enter a listing title of 10–100 characters.');
            }
            safeUpdates['title'] = trimmed;
          }
          break;

        case 'description':
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.length < 50 || trimmed.length > 2000) {
              throw new Error('Enter a listing description of 50–2,000 characters.');
            }
            safeUpdates['description'] = trimmed;
          }
          break;

        case 'accommodationType':
          if (
            typeof value === 'string'
            && ['private_room', 'shared_room', 'entire_home', 'guest_house', 'farm_stay', 'other'].includes(
              value,
            )
          ) {
            safeUpdates['accommodationType'] = value;
          } else {
            throw new Error('Select an accommodation type.');
          }
          break;

        case 'country':
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.length < 2 || trimmed.length > 100) {
              throw new Error('Enter a country of 2–100 characters.');
            }
            safeUpdates['country'] = trimmed;
          }
          break;

        case 'city':
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.length < 2 || trimmed.length > 100) {
              throw new Error('Enter a city of 2–100 characters.');
            }
            safeUpdates['city'] = trimmed;
          }
          break;

        case 'region':
          if (value === undefined) {
            safeUpdates['region'] = deleteField();
          } else if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.length < 1 || trimmed.length > 100) {
              throw new Error('The region must be 100 characters or fewer.');
            }
            safeUpdates['region'] = trimmed;
          }
          break;

        case 'areaDescription':
          if (value === undefined) {
            safeUpdates['areaDescription'] = deleteField();
          } else if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.length < 1 || trimmed.length > 200) {
              throw new Error('The area description must be 200 characters or fewer.');
            }
            safeUpdates['areaDescription'] = trimmed;
          }
          break;

        case 'guestCapacity':
          if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10) {
            safeUpdates['guestCapacity'] = value;
          } else {
            throw new Error('Enter guest capacity from 1–10.');
          }
          break;

        case 'bedrooms':
          if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10) {
            safeUpdates['bedrooms'] = value;
          } else {
            throw new Error('Enter bedrooms from 0–10.');
          }
          break;

        case 'beds':
          if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 15) {
            safeUpdates['beds'] = value;
          } else {
            throw new Error('Enter beds from 1–15.');
          }
          break;

        case 'bathrooms':
          if (typeof value === 'number' && value >= 1 && value <= 10) {
            safeUpdates['bathrooms'] = value;
          } else {
            throw new Error('Enter bathrooms from 1–10.');
          }
          break;

        case 'amenities':
          if (Array.isArray(value) && value.length <= 30) {
            const approved = [
              'wifi', 'kitchen', 'ac', 'heating', 'tv', 'laundry', 'parking', 'pool', 'gym',
              'pet_friendly', 'hot_water', 'elevator', 'bathtub', 'shower', 'dishwasher',
              'microwave', 'oven', 'refrigerator', 'freezer', 'balcony', 'garden', 'workspace',
              'iron', 'games', 'bbq', 'outdoor_furniture', 'fireplace', 'safe', 'crib', 'high_chair',
            ];
            if (value.every((amenity) => typeof amenity === 'string' && approved.includes(amenity))) {
              safeUpdates['amenities'] = [...value];
            } else {
              throw new Error('An amenity is not approved.');
            }
          } else {
            throw new Error('Select up to 30 amenities.');
          }
          break;

        case 'houseRules':
          if (Array.isArray(value) && value.length <= 15) {
            if (
              value.every(
                (rule) => typeof rule === 'string' && rule.length >= 5 && rule.length <= 200,
              )
            ) {
              safeUpdates['houseRules'] = value.map((rule) => rule.trim());
            } else {
              throw new Error('Each house rule must be 5–200 characters.');
            }
          } else {
            throw new Error('Enter up to 15 house rules.');
          }
          break;
      }
    }

    safeUpdates['updatedAt'] = serverTimestamp();

    await updateDoc(doc(this.firestore, 'listings', listingId), safeUpdates);
  }

  publishListing(
    listingId: string,
    idempotencyKey: string,
    publicContentReviewed: true,
  ): Promise<void> {
    return this.runLifecycleAction(
      'publishListing',
      listingId,
      idempotencyKey,
      publicContentReviewed,
    );
  }

  pauseListing(listingId: string, idempotencyKey: string): Promise<void> {
    return this.runLifecycleAction('pauseListing', listingId, idempotencyKey);
  }

  resumeListing(
    listingId: string,
    idempotencyKey: string,
    publicContentReviewed: true,
  ): Promise<void> {
    return this.runLifecycleAction(
      'resumeListing',
      listingId,
      idempotencyKey,
      publicContentReviewed,
    );
  }

  archiveListing(listingId: string, idempotencyKey: string): Promise<void> {
    return this.runLifecycleAction('archiveListing', listingId, idempotencyKey);
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message === 'NO_ACCESS') {
      return 'This listing is unavailable or you do not have permission to view it.';
    }
    if (error instanceof Error && error.message === 'NO_SUCH_LISTING') {
      return 'This listing could not be found.';
    }
    if (error instanceof Error && error.message.trim()) return error.message;
    return 'Something went wrong. Please try again.';
  }

  async searchPublishedListings(
    filters: PublicListingFilters,
    pageSize = 12,
    cursor: string | null = null,
  ): Promise<PublicListingPage> {
    const { sdk, functions } = await this.getListingFunctions();
    const search = sdk.httpsCallable<
      { filters: PublicListingFilters; pageSize: number; cursor: string | null },
      PublicListingPage
    >(functions, 'searchPublishedListings');
    const result = await search({ filters, pageSize, cursor });
    return result.data;
  }

  async getPublicListingDetails(listingId: string): Promise<PublicListingDetails | null> {
    const { sdk, functions } = await this.getListingFunctions();
    const getDetails = sdk.httpsCallable<
      { listingId: string },
      PublicListingDetails | null
    >(functions, 'getPublicListingDetails');
    const result = await getDetails({ listingId });
    return result.data;
  }

  private requireCurrentUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('NO_SIGNED_IN_USER');
    return uid;
  }

  private async runLifecycleAction(
    callableName: LifecycleCallableName,
    listingId: string,
    idempotencyKey: string,
    publicContentReviewed?: true,
  ): Promise<void> {
    if (!listingId || !/^[A-Za-z0-9-]{16,128}$/.test(idempotencyKey)) {
      throw new Error('The listing action request is invalid.');
    }
    if (
      (callableName === 'publishListing' || callableName === 'resumeListing')
      && publicContentReviewed !== true
    ) {
      throw new Error('Review the public listing text before publishing or resuming.');
    }

    const { sdk, functions } = await this.getListingFunctions();
    const data = {
      listingId,
      idempotencyKey,
      ...(publicContentReviewed === true ? { publicContentReviewed: true } : {}),
    };
    const call = sdk.httpsCallable<
      typeof data,
      { listingId: string; status: string }
    >(functions, callableName);
    await call(data);
  }

  private async getListingFunctions() {
    const sdk = await import('firebase/functions');
    if (!this.listingFunctions) {
      this.listingFunctions = sdk.getFunctions(this.firebaseApp, FUNCTIONS_REGION);
      if (environment.useEmulators) {
        sdk.connectFunctionsEmulator(this.listingFunctions, '127.0.0.1', 5001);
      }
    }
    return { sdk, functions: this.listingFunctions };
  }
}
