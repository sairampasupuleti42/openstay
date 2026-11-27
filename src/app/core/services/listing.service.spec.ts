import { TestBed } from '@angular/core/testing';
import { FirebaseApp } from '@angular/fire/app';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { Timestamp } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Listing } from '../models/listing.model';
import { ListingService } from './listing.service';

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
  deleteField: vi.fn(),
  doc: vi.fn(),
  documentId: vi.fn(),
  Firestore: class Firestore {},
  getDoc: vi.fn(),
  getDocFromServer: vi.fn(),
  getDocs: vi.fn(),
  getFirestore: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  provideFirestore: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  startAfter: vi.fn(),
  Timestamp: class Timestamp {
    constructor(
      readonly seconds: number,
      readonly nanoseconds = 0,
    ) {}

    static fromMillis(milliseconds: number): InstanceType<typeof firestoreMocks.Timestamp> {
      const seconds = Math.floor(milliseconds / 1000);
      return new firestoreMocks.Timestamp(
        seconds,
        Math.floor((milliseconds - seconds * 1000) * 1_000_000),
      );
    }

    static fromDate(value: Date): InstanceType<typeof firestoreMocks.Timestamp> {
      return firestoreMocks.Timestamp.fromMillis(value.getTime());
    }

    static now(): InstanceType<typeof firestoreMocks.Timestamp> {
      return firestoreMocks.Timestamp.fromMillis(Date.now());
    }

    toMillis(): number {
      return this.seconds * 1000 + this.nanoseconds / 1_000_000;
    }

    toDate(): Date {
      return new Date(this.toMillis());
    }
  },
  updateDoc: vi.fn(),
  where: vi.fn(),
}));

const functionsMocks = vi.hoisted(() => ({
  connectFunctionsEmulator: vi.fn(),
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));

vi.mock('@angular/fire/firestore', () => ({
    Firestore: firestoreMocks.Firestore,
    Timestamp: firestoreMocks.Timestamp,
    collection: firestoreMocks.collection,
    connectFirestoreEmulator: firestoreMocks.connectFirestoreEmulator,
    deleteField: firestoreMocks.deleteField,
    doc: firestoreMocks.doc,
    documentId: firestoreMocks.documentId,
    getDoc: firestoreMocks.getDoc,
    getDocFromServer: firestoreMocks.getDocFromServer,
    getDocs: firestoreMocks.getDocs,
    getFirestore: firestoreMocks.getFirestore,
    limit: firestoreMocks.limit,
    orderBy: firestoreMocks.orderBy,
    provideFirestore: firestoreMocks.provideFirestore,
    query: firestoreMocks.query,
    serverTimestamp: firestoreMocks.serverTimestamp,
    setDoc: firestoreMocks.setDoc,
    startAfter: firestoreMocks.startAfter,
    updateDoc: firestoreMocks.updateDoc,
    where: firestoreMocks.where,
}));

vi.mock('firebase/functions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/functions')>();
  return {
    ...actual,
    connectFunctionsEmulator: functionsMocks.connectFunctionsEmulator,
    getFunctions: functionsMocks.getFunctions,
    httpsCallable: functionsMocks.httpsCallable,
  };
});

const ownerUid = 'owner-uid';
const listingId = 'listing-id';
const timestamp = Timestamp.fromMillis(1_000);

function listingData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    listingId,
    hostUid: ownerUid,
    title: 'A valid listing title',
    description: 'A sufficiently descriptive listing text that meets the minimum length requirement.',
    accommodationType: 'private_room',
    country: 'New Zealand',
    city: 'Wellington',
    guestCapacity: 1,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    amenities: [],
    houseRules: [],
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: null,
    pausedAt: null,
    archivedAt: null,
    ...overrides,
  };
}

function snapshot(data: Record<string, unknown> | null, id = listingId) {
  return {
    id,
    exists: () => data !== null,
    data: () => data ?? {},
  };
}

function listingDoc(data: Record<string, unknown>, id = listingId) {
  return { id, data: () => data };
}

describe('ListingService', () => {
  let service: ListingService;
  let auth: { currentUser: { uid: string } | null };

  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.collection.mockReturnValue({ collection: 'listings' });
    firestoreMocks.doc.mockReturnValue({ id: listingId, path: `listings/${listingId}` });
    firestoreMocks.documentId.mockReturnValue('document-id');
    firestoreMocks.deleteField.mockReturnValue({ sentinel: 'deleteField' });
    firestoreMocks.serverTimestamp.mockReturnValue({ sentinel: 'serverTimestamp' });
    firestoreMocks.where.mockImplementation((...args: unknown[]) => ({ type: 'where', args }));
    firestoreMocks.orderBy.mockImplementation((...args: unknown[]) => ({ type: 'orderBy', args }));
    firestoreMocks.limit.mockImplementation((...args: unknown[]) => ({ type: 'limit', args }));
    firestoreMocks.startAfter.mockImplementation((...args: unknown[]) => ({ type: 'startAfter', args }));
    firestoreMocks.query.mockImplementation((_collection: unknown, ...constraints: unknown[]) => ({
      constraints,
    }));
    functionsMocks.getFunctions.mockReturnValue({ functions: 'functions' });
    functionsMocks.httpsCallable.mockImplementation((_functions: unknown, name: string) =>
      vi.fn().mockResolvedValue({ data: { listingId, status: name === 'pauseListing' ? 'paused' : 'published' } }),
    );

    auth = { currentUser: { uid: ownerUid } };
    TestBed.configureTestingModule({
      providers: [
        ListingService,
        { provide: Auth, useValue: auth },
        { provide: FirebaseApp, useValue: {} },
        { provide: Firestore, useValue: {} },
      ],
    });
    service = TestBed.inject(ListingService);
  });

  it('requires an authenticated owner and creates a draft bound to the generated document ID', async () => {
    auth.currentUser = null;

    await expect(service.createDraft({
      title: 'A valid listing title',
      description: 'A sufficiently descriptive listing text that meets the minimum length requirement.',
      accommodationType: 'private_room',
      country: 'New Zealand',
      city: 'Wellington',
      guestCapacity: 1,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: [],
      houseRules: [],
    })).rejects.toThrow('NO_SIGNED_IN_USER');
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();

    auth.currentUser = { uid: ownerUid };
    const id = await service.createDraft({
      title: 'A valid listing title',
      description: 'A sufficiently descriptive listing text that meets the minimum length requirement.',
      accommodationType: 'private_room',
      country: 'New Zealand',
      city: 'Wellington',
      guestCapacity: 1,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: [],
      houseRules: [],
    });

    expect(id).toBe(listingId);
    const written = firestoreMocks.setDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(written).toMatchObject({
      listingId,
      hostUid: ownerUid,
      status: 'draft',
    });
    expect(written).not.toHaveProperty('phoneNumber');
    expect(written).not.toHaveProperty('exactAddress');
    expect(written).not.toHaveProperty('privatePreferences');
  });

  it('reads only the owner listing and rejects a different owner', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce(snapshot(listingData()));
    await expect(service.getOwnListing(listingId)).resolves.toMatchObject({
      listingId,
      hostUid: ownerUid,
    });
    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      expect.anything(),
      'listings',
      listingId,
    );

    firestoreMocks.getDoc.mockResolvedValueOnce(snapshot(listingData({ hostUid: 'other-owner' })));
    await expect(service.getOwnListing(listingId)).rejects.toThrow('NO_ACCESS');

    firestoreMocks.getDoc.mockResolvedValueOnce(snapshot(listingData({ listingId: 'different-id' })));
    await expect(service.getOwnListing(listingId)).rejects.toThrow('saved listing ID is invalid');
  });

  it('queries owner listings by authenticated UID, orders and paginates them', async () => {
    const nextListing = listingData({ listingId: 'next-id' });
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [listingDoc(listingData()), listingDoc(nextListing, 'next-id'), listingDoc(nextListing, 'extra-id')],
    });
    const cursor = { ...listingData({ listingId: 'cursor-id' }), updatedAt: timestamp } as Listing;

    const results = await service.getOwnListings(2, cursor);

    expect(results).toHaveLength(2);
    expect(firestoreMocks.where).toHaveBeenCalledWith('hostUid', '==', ownerUid);
    expect(firestoreMocks.orderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    expect(firestoreMocks.orderBy).toHaveBeenCalledWith('document-id', 'desc');
    expect(firestoreMocks.limit).toHaveBeenCalledWith(2);
    expect(firestoreMocks.startAfter).toHaveBeenCalledWith(timestamp, 'cursor-id');
  });

  it('rejects invalid page sizes before querying owner listings', async () => {
    for (const pageSize of [0, -1, 21, 1.5, NaN, Infinity]) {
      await expect(service.getOwnListings(pageSize)).rejects.toThrow('page size');
    }
    expect(firestoreMocks.getDocs).not.toHaveBeenCalled();
  });

  it('accepts page sizes from 1 to 20 and defaults to 20 without fetching an extra record', async () => {
    firestoreMocks.getDocs.mockResolvedValue({ docs: [] });
    await service.getOwnListings(1);
    await service.getOwnListings();
    expect(firestoreMocks.limit.mock.calls).toEqual([[1], [20]]);
  });

  it('queries public listing pages through the trusted discovery callable', async () => {
    const page = { items: [], nextCursor: null, hasMore: false };
    const call = vi.fn().mockResolvedValue({ data: page });
    functionsMocks.httpsCallable.mockReturnValueOnce(call);
    const filters = {
      country: 'New Zealand',
      city: 'Wellington',
      accommodationType: 'private_room' as const,
      minimumGuests: 2,
    };

    await expect(service.searchPublishedListings(filters, 8, 'cursor-1')).resolves.toEqual(page);
    expect(functionsMocks.httpsCallable).toHaveBeenCalledWith(
      expect.anything(),
      'searchPublishedListings',
    );
    expect(call).toHaveBeenCalledWith({ filters, pageSize: 8, cursor: 'cursor-1' });
    expect(firestoreMocks.getDocs).not.toHaveBeenCalled();
  });

  it('loads public listing details through the sanitized detail callable', async () => {
    const details = {
      listingId,
      title: 'A valid listing title',
      description: 'A comfortably sized public description without private contact information.',
      country: 'New Zealand',
      city: 'Wellington',
      accommodationType: 'private_room',
      guestCapacity: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: ['wifi'],
      houseRules: [],
      host: { displayName: 'Host', languages: ['en'] },
    };
    const call = vi.fn().mockResolvedValue({ data: details });
    functionsMocks.httpsCallable.mockReturnValueOnce(call);

    await expect(service.getPublicListingDetails(listingId)).resolves.toEqual(details);
    expect(functionsMocks.httpsCallable).toHaveBeenCalledWith(
      expect.anything(),
      'getPublicListingDetails',
    );
    expect(call).toHaveBeenCalledWith({ listingId });
    expect(firestoreMocks.getDoc).not.toHaveBeenCalled();
  });

  it('rejects protected field updates without writing and preserves optional-field deletion', async () => {
    firestoreMocks.getDoc.mockResolvedValue(snapshot(listingData()));
    await expect(service.updateOwnDraft(listingId, {
      status: 'published',
    } as Parameters<ListingService['updateOwnDraft']>[1])).rejects.toThrow(
      'A listing field is not editable.',
    );
    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();

    await service.updateOwnDraft(listingId, { title: 'Updated listing title' });
    const editableUpdate = firestoreMocks.updateDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(editableUpdate).toMatchObject({
      title: 'Updated listing title',
      updatedAt: { sentinel: 'serverTimestamp' },
    });
    expect(editableUpdate).not.toHaveProperty('hostUid');
    expect(editableUpdate).not.toHaveProperty('status');
    expect(editableUpdate).not.toHaveProperty('createdAt');
    expect(editableUpdate).not.toHaveProperty('publishedAt');

    await service.updateOwnDraft(listingId, { region: undefined });
    const updates = firestoreMocks.updateDoc.mock.calls[1][1] as Record<string, unknown>;
    expect(updates['region']).toEqual({ sentinel: 'deleteField' });
    expect(updates['updatedAt']).toEqual({ sentinel: 'serverTimestamp' });
  });

  it('propagates Firestore errors from writes and listing queries', async () => {
    const firestoreError = new Error('Firestore unavailable');
    firestoreMocks.setDoc.mockRejectedValueOnce(firestoreError);
    await expect(service.createDraft({
      title: 'A valid listing title',
      description: 'A sufficiently descriptive listing text that meets the minimum length requirement.',
      accommodationType: 'private_room',
      country: 'New Zealand',
      city: 'Wellington',
      guestCapacity: 1,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: [],
      houseRules: [],
    })).rejects.toBe(firestoreError);

    firestoreMocks.getDocs.mockRejectedValueOnce(firestoreError);
    await expect(service.getOwnListings()).rejects.toBe(firestoreError);
  });

  it('uses trusted lifecycle callables and preserves the idempotency key', async () => {
    await service.publishListing(listingId, 'publish-service-request-001', true);
    await service.pauseListing(listingId, 'pause-service-request-01');
    await service.resumeListing(listingId, 'resume-service-request-01', true);
    await service.archiveListing(listingId, 'archive-service-request-01');

    expect(functionsMocks.httpsCallable.mock.calls.map((call) => call[1])).toEqual([
      'publishListing',
      'pauseListing',
      'resumeListing',
      'archiveListing',
    ]);
    expect(functionsMocks.getFunctions).toHaveBeenCalledWith({}, 'us-central1');
    expect(functionsMocks.httpsCallable.mock.results[0].value).toHaveBeenCalledWith({
      listingId,
      idempotencyKey: 'publish-service-request-001',
      publicContentReviewed: true,
    });
    expect(functionsMocks.httpsCallable.mock.results[1].value).toHaveBeenCalledWith({
      listingId,
      idempotencyKey: 'pause-service-request-01',
    });
    expect(functionsMocks.httpsCallable.mock.results[2].value).toHaveBeenCalledWith({
      listingId,
      idempotencyKey: 'resume-service-request-01',
      publicContentReviewed: true,
    });
  });

  it('rejects invalid lifecycle request keys before calling a Function', async () => {
    await expect(service.publishListing(listingId, 'short', true))
      .rejects.toThrow('request is invalid');
    expect(functionsMocks.httpsCallable).not.toHaveBeenCalled();
  });
});
