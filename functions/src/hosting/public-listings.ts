import {
  FieldPath,
  Timestamp,
  getFirestore,
} from 'firebase-admin/firestore';
import {
  CallableRequest,
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';
import {
  HOST_PARTICIPATION_TERMS_DIGEST,
  HOST_PARTICIPATION_TERMS_VERSION,
} from './host-participation.js';

const FUNCTIONS_REGION = 'us-central1';
const PAGE_SIZE_DEFAULT = 12;
const PAGE_SIZE_MAX = 20;
const SCAN_LIMIT = 100;
const SCAN_BATCH_SIZE = 25;
const LISTING_FIELDS = [
  'listingId',
  'hostUid',
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
  'status',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'pausedAt',
  'archivedAt',
] as const;
const ACCOMMODATION_TYPES = [
  'private_room',
  'shared_room',
  'entire_home',
  'guest_house',
  'farm_stay',
  'other',
] as const;
const APPROVED_AMENITIES = [
  'wifi',
  'kitchen',
  'ac',
  'heating',
  'tv',
  'laundry',
  'parking',
  'pool',
  'gym',
  'pet_friendly',
  'hot_water',
  'elevator',
  'bathtub',
  'shower',
  'dishwasher',
  'microwave',
  'oven',
  'refrigerator',
  'freezer',
  'balcony',
  'garden',
  'workspace',
  'iron',
  'games',
  'bbq',
  'outdoor_furniture',
  'fireplace',
  'safe',
  'crib',
  'high_chair',
] as const;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/i;
const PHONE_CANDIDATE_PATTERN = /\+?\d[\d ()./-]*\d/g;
const DATE_PATTERN = '(?:\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{4})';
const DATE_OR_YEAR_RANGE_PATTERN = new RegExp(
  `^(?:${DATE_PATTERN}(?:\\s*-\\s*${DATE_PATTERN})?|(?:19|20)\\d{2}\\s*-\\s*(?:19|20)\\d{2})$`,
);
const DECIMAL_DIGIT_ZERO_CODE_POINTS = [
  0x0030, 0x0660, 0x06f0, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66,
  0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0de6, 0x0e50, 0x0ed0, 0x0f20, 0x1040,
  0x1090, 0x17e0, 0x1810, 0x1946, 0x19d0, 0x1a80, 0x1a90, 0x1b50, 0x1bb0,
  0x1c40, 0x1c50, 0xa620, 0xa8d0, 0xa900, 0xa9d0, 0xa9f0, 0xaa50, 0xabf0,
  0xff10, 0x104a0, 0x10d30, 0x10d40, 0x11066, 0x110f0, 0x11136, 0x111d0,
  0x112f0, 0x11450, 0x114d0, 0x11650, 0x116c0, 0x11730, 0x118e0, 0x11950,
  0x11c50, 0x11d50, 0x11da0, 0x11f50, 0x16a60, 0x16ac0, 0x16b50, 0x1d7ce,
  0x1d7d8, 0x1d7e2, 0x1d7ec, 0x1d7f6, 0x1e140, 0x1e2f0, 0x1e4f0, 0x1e5f1,
  0x1e950, 0x1fbf0,
] as const;
const HOUSE_NUMBER_PATTERN = '\\d{1,6}[A-Z]?(?:[-/]\\d{1,6}[A-Z]?)?';
const STREET_TYPES = [
  'street', 'st', 'road', 'rd', 'avenue', 'ave', 'drive', 'dr', 'lane', 'ln',
  'boulevard', 'blvd', 'court', 'ct', 'place', 'pl', 'highway', 'hwy', 'terrace',
  'ter', 'close', 'crescent', 'cres', 'rue', 'chemin', 'route', 'calle', 'camino',
  'carretera', 'paseo', 'plaza', 'rua', 'estrada', 'travessa', 'alameda', 'via',
  'viale', 'piazza', 'corso', 'strada', 'straße', 'strasse', 'weg', 'platz', 'allee',
  'allée', 'gasse', 'straat', 'laan', 'plein', 'gata', 'gatan', 'väg', 'vei', 'gate',
  'ulica', 'prospekt', 'jalan',
] as const;
const STREET_TYPE_PATTERN = `(?:${STREET_TYPES.join('|')})`;
const STREET_NAME_PATTERN = '[\\p{L}\\p{N}][\\p{L}\\p{N}.\'’/-]*';
// Address screening is heuristic and cannot reliably identify every address format.
const PREFIX_STREET_ADDRESS_PATTERN = new RegExp(
  `\\b${HOUSE_NUMBER_PATTERN}\\s*,?\\s+(?:(?:bis|ter)\\s+)?${STREET_TYPE_PATTERN}\\s+(?:${STREET_NAME_PATTERN}\\s*){1,6}`,
  'iu',
);
const SUFFIX_STREET_ADDRESS_PATTERN = new RegExp(
  `\\b${HOUSE_NUMBER_PATTERN}(?:\\s*,\\s*|\\s+)(?:${STREET_NAME_PATTERN}\\s+){1,3}${STREET_TYPE_PATTERN}\\b`,
  'iu',
);
const UNIT_NUMBER_PATTERN = `\\b(?:house|door|flat|apt|apartment|plot|h|d)\\.?\\s*`
  + `(?:(?:no\\.?|number|#)\\s*)?(?:[A-Z]\\s*[-/]\\s*)?${HOUSE_NUMBER_PATTERN}`;
const UNIT_LOCALITY_ADDRESS_PATTERN = new RegExp(
  `${UNIT_NUMBER_PATTERN}\\s*,\\s*`
    + `[\\p{L}][\\p{L}.'’ -]*\\s*,\\s*[\\p{L}][\\p{L}.'’ -]*`,
  'iu',
);
const UNIT_FLOOR_STREET_ADDRESS_PATTERN = new RegExp(
  `${UNIT_NUMBER_PATTERN}\\s*,\\s*\\d+(?:st|nd|rd|th)?\\s*(?:floor|fl)\\.?\\s*,\\s*`
    + `(?:${STREET_NAME_PATTERN}\\s+){1,3}${STREET_TYPE_PATTERN}\\b`,
  'iu',
);
const INDIAN_NUMBERED_ROAD_ADDRESS_PATTERN = new RegExp(
  `\\b(?:no\\.?\\s*)?${HOUSE_NUMBER_PATTERN}\\s*,\\s*`
    + `\\d+(?:st|nd|rd|th)?\\s+(?:main|cross)(?:\\s+(?:road|rd|street|st))?\\s*,\\s*`
    + `[\\p{L}][\\p{L}.'’ -]*\\s*,\\s*[\\p{L}][\\p{L}.'’ -]*`,
  'iu',
);
const COORDINATES_PATTERN = /\b-?\d{1,2}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/;
const enforceAppCheck = process.env['FUNCTIONS_EMULATOR'] !== 'true';

type AccommodationType = typeof ACCOMMODATION_TYPES[number];

interface SearchFilters {
  country?: string;
  city?: string;
  accommodationType?: AccommodationType;
  minimumGuests?: number;
}

interface SearchCursor {
  filterKey: string;
  listingId: string;
  publishedAtMillis: number;
  guestCapacity: number;
}

export interface PublicListingSummary {
  listingId: string;
  title: string;
  country: string;
  city: string;
  region?: string;
  accommodationType: AccommodationType;
  guestCapacity: number;
}

export interface PublicHostProfile {
  displayName: string;
  introduction?: string;
  languages: string[];
}

export interface PublicListingDetails extends PublicListingSummary {
  description: string;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  houseRules: string[];
  host: PublicHostProfile | null;
}

export interface PublicListingPage {
  items: PublicListingSummary[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface ValidPublicListingData extends Record<string, unknown> {
  listingId: string;
  hostUid: string;
  title: string;
  description: string;
  accommodationType: AccommodationType;
  country: string;
  city: string;
  region?: string;
  guestCapacity: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  houseRules: string[];
  status: 'published';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt: Timestamp;
}

interface ValidPublicHostData extends Record<string, unknown> {
  displayName: string;
  introduction?: string;
  languages: string[];
}

export const searchPublishedListings = onCall(
  { enforceAppCheck, region: FUNCTIONS_REGION },
  (request) => searchPublicListings(request, getFirestore()),
);

export const getPublicListingDetails = onCall(
  { enforceAppCheck, region: FUNCTIONS_REGION },
  (request) => loadPublicListingDetails(request, getFirestore()),
);

export async function searchPublicListings(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
): Promise<PublicListingPage> {
  const { filters, pageSize, cursor } = parseSearchRequest(request.data);
  const filterKey = getFilterKey(filters);
  if (cursor && cursor.filterKey !== filterKey) {
    throw new HttpsError('invalid-argument', 'The listing search cursor does not match these filters.');
  }

  const items: PublicListingSummary[] = [];
  let currentCursor = cursor;
  let scanned = 0;
  let hasMore = false;

  while (items.length < pageSize && scanned < SCAN_LIMIT) {
    const batchLimit = Math.min(SCAN_BATCH_SIZE, SCAN_LIMIT - scanned);
    let query = db.collection('listings').where('status', '==', 'published');
    if (filters.country) query = query.where('country', '==', filters.country);
    if (filters.city) query = query.where('city', '==', filters.city);
    if (filters.accommodationType) {
      query = query.where('accommodationType', '==', filters.accommodationType);
    }
    if (filters.minimumGuests !== undefined) {
      query = query.where('guestCapacity', '>=', filters.minimumGuests);
      query = query.orderBy('guestCapacity', 'asc');
    }
    query = query.orderBy('publishedAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
    if (currentCursor) {
      query = filters.minimumGuests !== undefined
        ? query.startAfter(
          currentCursor.guestCapacity,
          Timestamp.fromMillis(currentCursor.publishedAtMillis),
          currentCursor.listingId,
        )
        : query.startAfter(
          Timestamp.fromMillis(currentCursor.publishedAtMillis),
          currentCursor.listingId,
        );
    }
    const { page, eligibleHosts } = await readEligibleBatch(db, query.limit(batchLimit));
    if (page.empty) {
      hasMore = false;
      break;
    }

    let processed = 0;
    for (const document of page.docs) {
      const data = document.data();
      const nextCursor = createCursor(document.id, data, filterKey);
      if (!nextCursor) {
        throw new HttpsError('failed-precondition', 'A published listing has invalid pagination data.');
      }
      currentCursor = nextCursor;
      scanned++;
      processed++;
      const hostUid = data['hostUid'];
      if (!eligibleHosts.has(hostUid) || !isValidPublicListing(data, document.id)) continue;
      const summary = toPublicSummary(data, document.id);
      if (!summary) continue;
      items.push(summary);
      if (items.length === pageSize) break;
    }

    hasMore = processed < page.size || page.size === batchLimit;
    if (page.size < batchLimit || items.length === pageSize) break;
  }

  if (scanned === SCAN_LIMIT && items.length < pageSize) hasMore = true;
  return {
    items,
    hasMore,
    nextCursor: hasMore && currentCursor ? encodeCursor(currentCursor) : null,
  };
}

export async function loadPublicListingDetails(
  request: CallableRequest<unknown>,
  db: FirebaseFirestore.Firestore,
): Promise<PublicListingDetails | null> {
  const listingId = parseListingDetailsRequest(request.data);
  const publicData = await db.runTransaction(async (transaction) => {
    const listingSnapshot = await transaction.get(db.doc(`listings/${listingId}`));
    const data = listingSnapshot.data();
    if (!listingSnapshot.exists || !data || !isValidPublicListing(data, listingSnapshot.id)) {
      return null;
    }
    const hostUid = data['hostUid'];
    const [userSnapshot, consentSnapshot, hostSnapshot] = await Promise.all([
      transaction.get(db.doc(`users/${hostUid}`)),
      transaction.get(db.doc(`hostPrivate/${hostUid}`)),
      transaction.get(db.doc(`hostProfiles/${hostUid}`)),
    ]);
    if (userSnapshot.data()?.['accountStatus'] !== 'active'
      || !hasCurrentConsent(consentSnapshot.data(), hostUid)) {
      return null;
    }
    return {
      listing: data,
      host: hostSnapshot.exists
        ? toPublicHostProfile(hostSnapshot.data(), hostUid)
        : null,
    };
  });
  if (!publicData) return null;
  const { listing: data, host } = publicData;
  return {
    ...toPublicSummary(data, listingId)!,
    description: data['description'],
    bedrooms: data['bedrooms'],
    beds: data['beds'],
    bathrooms: data['bathrooms'],
    amenities: [...data['amenities']],
    houseRules: [...data['houseRules']],
    host,
  };
}

export function isSafePublicText(value: string): boolean {
  const normalized = normalizeDecimalDigits(value);
  return !EMAIL_PATTERN.test(normalized)
    && !URL_PATTERN.test(normalized)
    && !hasPhoneNumber(normalized)
    && !PREFIX_STREET_ADDRESS_PATTERN.test(normalized)
    && !SUFFIX_STREET_ADDRESS_PATTERN.test(normalized)
    && !UNIT_LOCALITY_ADDRESS_PATTERN.test(normalized)
    && !UNIT_FLOOR_STREET_ADDRESS_PATTERN.test(normalized)
    && !INDIAN_NUMBERED_ROAD_ADDRESS_PATTERN.test(normalized)
    && !COORDINATES_PATTERN.test(normalized);
}

function normalizeDecimalDigits(value: string): string {
  return value.replace(/\p{Decimal_Number}/gu, (digit) => {
    const codePoint = digit.codePointAt(0)!;
    for (const zeroCodePoint of DECIMAL_DIGIT_ZERO_CODE_POINTS) {
      if (codePoint >= zeroCodePoint && codePoint <= zeroCodePoint + 9) {
        return String(codePoint - zeroCodePoint);
      }
    }
    return digit;
  });
}

function hasPhoneNumber(value: string): boolean {
  return [...value.matchAll(PHONE_CANDIDATE_PATTERN)].some(([candidate]) =>
    !DATE_OR_YEAR_RANGE_PATTERN.test(candidate)
      && candidate.replace(/\D/g, '').length >= 7,
  );
}

function parseSearchRequest(data: unknown): {
  filters: SearchFilters;
  pageSize: number;
  cursor: SearchCursor | null;
} {
  if (!isRecord(data) || !hasOnlyKeys(data, ['filters', 'pageSize', 'cursor'])) {
    throw new HttpsError('invalid-argument', 'The listing search request is invalid.');
  }
  const filterInput = data['filters'];
  if (!isRecord(filterInput)
    || !hasOnlyKeys(filterInput, ['country', 'city', 'accommodationType', 'minimumGuests'])) {
    throw new HttpsError('invalid-argument', 'The listing search filters are invalid.');
  }

  const filters: SearchFilters = {};
  for (const field of ['country', 'city'] as const) {
    const value = filterInput[field];
    if (value !== undefined) {
      if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 100) {
        throw new HttpsError('invalid-argument', `The ${field} filter is invalid.`);
      }
      filters[field] = value.trim();
    }
  }
  const accommodationType = filterInput['accommodationType'];
  if (accommodationType !== undefined) {
    if (!ACCOMMODATION_TYPES.includes(accommodationType as AccommodationType)) {
      throw new HttpsError('invalid-argument', 'The accommodation type filter is invalid.');
    }
    filters.accommodationType = accommodationType as AccommodationType;
  }
  const minimumGuests = filterInput['minimumGuests'];
  if (minimumGuests !== undefined) {
    if (typeof minimumGuests !== 'number'
      || !Number.isInteger(minimumGuests)
      || minimumGuests < 1
      || minimumGuests > 10) {
      throw new HttpsError('invalid-argument', 'The minimum guest count is invalid.');
    }
    filters.minimumGuests = minimumGuests;
  }

  const pageSize = data['pageSize'] ?? PAGE_SIZE_DEFAULT;
  if (typeof pageSize !== 'number'
    || !Number.isInteger(pageSize)
    || pageSize < 1
    || pageSize > PAGE_SIZE_MAX) {
    throw new HttpsError('invalid-argument', `The page size must be from 1 to ${PAGE_SIZE_MAX}.`);
  }
  const cursor = data['cursor'] === undefined || data['cursor'] === null
    ? null
    : decodeCursor(data['cursor']);
  return { filters, pageSize, cursor };
}

function parseListingDetailsRequest(data: unknown): string {
  if (!isRecord(data)
    || !hasOnlyKeys(data, ['listingId'])
    || typeof data['listingId'] !== 'string'
    || !/^[^/]{1,150}$/.test(data['listingId'])) {
    throw new HttpsError('invalid-argument', 'The listing detail request is invalid.');
  }
  return data['listingId'];
}

function getFilterKey(filters: SearchFilters): string {
  return JSON.stringify({
    country: filters.country ?? null,
    city: filters.city ?? null,
    accommodationType: filters.accommodationType ?? null,
    minimumGuests: filters.minimumGuests ?? null,
  });
}

function createCursor(
  listingId: string,
  data: Record<string, unknown>,
  filterKey: string,
): SearchCursor | null {
  if (!(data['publishedAt'] instanceof Timestamp)
    || typeof data['guestCapacity'] !== 'number'
    || !Number.isInteger(data['guestCapacity'])) return null;
  return {
    filterKey,
    listingId,
    publishedAtMillis: data['publishedAt'].toMillis(),
    guestCapacity: data['guestCapacity'],
  };
}

function encodeCursor(cursor: SearchCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(value: unknown): SearchCursor {
  if (typeof value !== 'string'
    || value.length > 1024
    || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new HttpsError('invalid-argument', 'The listing search cursor is invalid.');
  }
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const cursor = JSON.parse(decoded) as unknown;
    if (!isRecord(cursor)
      || !hasOnlyKeys(cursor, ['filterKey', 'listingId', 'publishedAtMillis', 'guestCapacity'])
      || typeof cursor['filterKey'] !== 'string'
      || typeof cursor['listingId'] !== 'string'
      || !/^[^/]{1,150}$/.test(cursor['listingId'])
      || typeof cursor['publishedAtMillis'] !== 'number'
      || !Number.isFinite(cursor['publishedAtMillis'])
      || typeof cursor['guestCapacity'] !== 'number'
      || !Number.isInteger(cursor['guestCapacity'])
      || cursor['guestCapacity'] < 1
      || cursor['guestCapacity'] > 10
      || Buffer.from(decoded, 'utf8').toString('base64url') !== value) {
      throw new Error('Invalid cursor.');
    }
    return cursor as unknown as SearchCursor;
  } catch {
    throw new HttpsError('invalid-argument', 'The listing search cursor is invalid.');
  }
}

async function readEligibleBatch(
  db: FirebaseFirestore.Firestore,
  query: FirebaseFirestore.Query,
): Promise<{ page: FirebaseFirestore.QuerySnapshot; eligibleHosts: Set<string> }> {
  return db.runTransaction(async (transaction) => {
    const page = await transaction.get(query);
    const hostUids = page.docs.map((document) => document.data()['hostUid']);
  const uniqueUids = [...new Set(hostUids.filter(
    (uid): uid is string => typeof uid === 'string' && uid.length > 0,
  ))];
    const eligibility = await Promise.all(uniqueUids.map(async (uid) => {
      const [user, consent] = await Promise.all([
        transaction.get(db.doc(`users/${uid}`)),
        transaction.get(db.doc(`hostPrivate/${uid}`)),
      ]);
      return user.data()?.['accountStatus'] === 'active'
        && hasCurrentConsent(consent.data(), uid)
        ? uid
        : null;
    }));
    return {
      page,
      eligibleHosts: new Set(eligibility.filter((uid): uid is string => uid !== null)),
    };
  });
}

function hasCurrentConsent(
  consent: Record<string, unknown> | undefined,
  hostUid: string,
): boolean {
  return consent?.['uid'] === hostUid
    && consent['termsVersion'] === HOST_PARTICIPATION_TERMS_VERSION
    && consent['termsDigest'] === HOST_PARTICIPATION_TERMS_DIGEST
    && consent['consentState'] === 'accepted'
    && typeof consent['eventId'] === 'string'
    && /^[a-f0-9]{64}$/.test(consent['eventId']);
}

function isValidPublicListing(
  data: Record<string, unknown>,
  listingId: string,
): data is ValidPublicListingData {
  if (Object.keys(data).some((field) => !LISTING_FIELDS.includes(field as typeof LISTING_FIELDS[number]))
    || data['listingId'] !== listingId
    || typeof data['hostUid'] !== 'string'
    || data['hostUid'].length < 1
    || data['hostUid'].length > 128
    || data['hostUid'].includes('/')
    || data['status'] !== 'published'
    || !(data['publishedAt'] instanceof Timestamp)
    || !(data['createdAt'] instanceof Timestamp)
    || !(data['updatedAt'] instanceof Timestamp)
    || typeof data['title'] !== 'string'
    || data['title'].trim().length < 10
    || data['title'].trim().length > 100
    || typeof data['description'] !== 'string'
    || data['description'].trim().length < 50
    || data['description'].trim().length > 2000
    || !isSafeListingText(data)
    || !ACCOMMODATION_TYPES.includes(data['accommodationType'] as AccommodationType)
    || !isBoundedString(data['country'], 2, 100)
    || !isBoundedString(data['city'], 2, 100)
    || (data['region'] !== undefined && !isBoundedString(data['region'], 1, 100))
    || !isIntegerInRange(data['guestCapacity'], 1, 10)
    || !isIntegerInRange(data['bedrooms'], 0, 10)
    || !isIntegerInRange(data['beds'], 1, 15)
    || typeof data['bathrooms'] !== 'number'
    || !Number.isFinite(data['bathrooms'])
    || data['bathrooms'] < 1
    || data['bathrooms'] > 10
    || !Array.isArray(data['amenities'])
    || data['amenities'].length > 30
    || !data['amenities'].every((amenity) =>
      typeof amenity === 'string'
        && APPROVED_AMENITIES.includes(amenity as typeof APPROVED_AMENITIES[number]),
    )
    || !Array.isArray(data['houseRules'])
    || data['houseRules'].length > 15
    || !data['houseRules'].every((rule) =>
      typeof rule === 'string' && rule.length >= 5 && rule.length <= 200,
    )) {
    return false;
  }
  return true;
}

function isSafeListingText(data: Record<string, unknown>): boolean {
  const values = [
    data['title'],
    data['description'],
    data['country'],
    data['city'],
    data['region'],
    data['areaDescription'],
    ...(Array.isArray(data['houseRules']) ? data['houseRules'] : []),
  ];
  return values.every((value) => value === undefined
    || (typeof value === 'string' && isSafePublicText(value)));
}

function toPublicSummary(
  data: Record<string, unknown>,
  listingId: string,
): PublicListingSummary | null {
  if (!isValidPublicListing(data, listingId)) return null;
  return {
    listingId,
    title: data['title'],
    country: data['country'],
    city: data['city'],
    ...(typeof data['region'] === 'string' ? { region: data['region'] } : {}),
    accommodationType: data['accommodationType'] as AccommodationType,
    guestCapacity: data['guestCapacity'],
  };
}

function toPublicHostProfile(
  data: Record<string, unknown> | undefined,
  hostUid: string,
): PublicHostProfile | null {
  if (!data
    || Object.keys(data).some((key) => ![
      'uid',
      'displayName',
      'introduction',
      'languages',
      'visibility',
      'createdAt',
      'updatedAt',
    ].includes(key))
    || data['uid'] !== hostUid
    || data['visibility'] !== 'public'
    || typeof data['displayName'] !== 'string'
    || !data['displayName'].trim()
    || data['displayName'].length > 100
    || !isSafePublicText(data['displayName'])
    || (data['introduction'] !== undefined
      && (typeof data['introduction'] !== 'string'
        || data['introduction'].length > 500
        || !isSafePublicText(data['introduction'])))
    || !Array.isArray(data['languages'])
    || data['languages'].length > 10
    || !data['languages'].every((language) =>
      typeof language === 'string' && /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(language),
    )
    || !(data['createdAt'] instanceof Timestamp)
    || !(data['updatedAt'] instanceof Timestamp)) {
    return null;
  }
  const safeProfile = data as ValidPublicHostData;
  return {
    displayName: safeProfile.displayName,
    ...(safeProfile.introduction !== undefined
      ? { introduction: safeProfile.introduction }
      : {}),
    languages: [...safeProfile.languages],
  };
}

function isBoundedString(value: unknown, min: number, max: number): value is string {
  if (typeof value !== 'string') return false;
  const length = value.trim().length;
  return length >= min && length <= max;
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}
