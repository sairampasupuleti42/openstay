import { Timestamp } from 'firebase/firestore';

export type ListingStatus = 'draft' | 'published' | 'paused' | 'archived';
export type AccommodationType =
  | 'private_room'
  | 'shared_room'
  | 'entire_home'
  | 'guest_house'
  | 'farm_stay'
  | 'other';

export interface Listing {
  listingId: string;
  hostUid: string;
  title: string;
  description: string;
  accommodationType: AccommodationType;
  country: string;
  city: string;
  region?: string;
  areaDescription?: string;
  guestCapacity: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  houseRules: string[];
  status: ListingStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp | null;
  pausedAt?: Timestamp | null;
  archivedAt?: Timestamp | null;
}

export interface ListingInput {
  title: string;
  description: string;
  accommodationType: AccommodationType;
  country: string;
  city: string;
  region?: string;
  areaDescription?: string;
  guestCapacity: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  houseRules: string[];
}

export type ListingUpdates = Partial<
  Pick<
    Listing,
    | 'title'
    | 'description'
    | 'accommodationType'
    | 'country'
    | 'city'
    | 'region'
    | 'areaDescription'
    | 'guestCapacity'
    | 'bedrooms'
    | 'beds'
    | 'bathrooms'
    | 'amenities'
    | 'houseRules'
  >
>;

const ACCOMMODATION_TYPES: readonly AccommodationType[] = [
  'private_room',
  'shared_room',
  'entire_home',
  'guest_house',
  'farm_stay',
  'other',
];

const APPROVED_AMENITIES: readonly string[] = [
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
];

export function validateListingInput(input: ListingInput): ListingInput {
  const allowedFields = [
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
  ];

  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
    || Object.keys(input).some((key) => !allowedFields.includes(key))
  ) {
    throw new Error('A listing field is not allowed.');
  }

  const title = validateTitle(input.title);
  const description = validateDescription(input.description);
  const accommodationType = validateAccommodationType(input.accommodationType);
  const country = validateCountry(input.country);
  const city = validateCity(input.city);
  const region = input.region === undefined ? undefined : validateRegion(input.region);
  const areaDescription =
    input.areaDescription === undefined ? undefined : validateAreaDescription(input.areaDescription);
  const guestCapacity = validateGuestCapacity(input.guestCapacity);
  const bedrooms = validateBedrooms(input.bedrooms);
  const beds = validateBeds(input.beds);
  const bathrooms = validateBathrooms(input.bathrooms);
  const amenities = validateAmenities(input.amenities);
  const houseRules = validateHouseRules(input.houseRules);

  return {
    title,
    description,
    accommodationType,
    country,
    city,
    ...(region !== undefined ? { region } : {}),
    ...(areaDescription !== undefined ? { areaDescription } : {}),
    guestCapacity,
    bedrooms,
    beds,
    bathrooms,
    amenities,
    houseRules,
  };
}

export function validateListingData(
  data: Record<string, unknown>,
  documentId: string,
): Listing {
  const allowedFields = [
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
  ];

  if (Object.keys(data).some((key) => !allowedFields.includes(key))) {
    throw new Error('A listing field is not allowed.');
  }

  if (data['listingId'] !== documentId || typeof data['listingId'] !== 'string') {
    throw new Error('The saved listing ID is invalid.');
  }

  if (typeof data['hostUid'] !== 'string' || data['hostUid'].length === 0) {
    throw new Error('The saved listing owner is invalid.');
  }

  if (typeof data['title'] !== 'string' || !isValidTitle(data['title'])) {
    throw new Error('The saved listing title is invalid.');
  }

  if (typeof data['description'] !== 'string' || !isValidDescription(data['description'])) {
    throw new Error('The saved listing description is invalid.');
  }

  if (!ACCOMMODATION_TYPES.includes(data['accommodationType'] as AccommodationType)) {
    throw new Error('The saved accommodation type is invalid.');
  }

  if (typeof data['country'] !== 'string' || !isValidCountry(data['country'])) {
    throw new Error('The saved country is invalid.');
  }

  if (typeof data['city'] !== 'string' || !isValidCity(data['city'])) {
    throw new Error('The saved city is invalid.');
  }

  if (
    data['region'] !== undefined
    && (typeof data['region'] !== 'string' || !isValidRegion(data['region']))
  ) {
    throw new Error('The saved region is invalid.');
  }

  if (
    data['areaDescription'] !== undefined
    && (typeof data['areaDescription'] !== 'string' || !isValidAreaDescription(data['areaDescription']))
  ) {
    throw new Error('The saved area description is invalid.');
  }

  if (
    typeof data['guestCapacity'] !== 'number'
    || !Number.isInteger(data['guestCapacity'])
    || data['guestCapacity'] < 1
    || data['guestCapacity'] > 10
  ) {
    throw new Error('The saved guest capacity is invalid.');
  }

  if (
    typeof data['bedrooms'] !== 'number'
    || !Number.isInteger(data['bedrooms'])
    || data['bedrooms'] < 0
    || data['bedrooms'] > 10
  ) {
    throw new Error('The saved bedroom count is invalid.');
  }

  if (
    typeof data['beds'] !== 'number'
    || !Number.isInteger(data['beds'])
    || data['beds'] < 1
    || data['beds'] > 15
  ) {
    throw new Error('The saved bed count is invalid.');
  }

  if (
    typeof data['bathrooms'] !== 'number'
    || data['bathrooms'] < 1
    || data['bathrooms'] > 10
  ) {
    throw new Error('The saved bathroom count is invalid.');
  }

  if (!Array.isArray(data['amenities']) || data['amenities'].length > 30) {
    throw new Error('The saved amenities are invalid.');
  }

  if (
    !data['amenities'].every(
      (amenity: unknown) => typeof amenity === 'string' && APPROVED_AMENITIES.includes(amenity),
    )
  ) {
    throw new Error('A saved amenity is not approved.');
  }

  if (!Array.isArray(data['houseRules']) || data['houseRules'].length > 15) {
    throw new Error('The saved house rules are invalid.');
  }

  if (
    !data['houseRules'].every(
      (rule: unknown) =>
        typeof rule === 'string' && rule.length >= 5 && rule.length <= 200,
    )
  ) {
    throw new Error('A saved house rule is invalid.');
  }

  const status = data['status'] as string;
  if (!['draft', 'published', 'paused', 'archived'].includes(status)) {
    throw new Error('The saved listing status is invalid.');
  }

  if (!(data['createdAt'] instanceof Timestamp)) {
    throw new Error('The saved listing creation timestamp is invalid.');
  }

  if (!(data['updatedAt'] instanceof Timestamp)) {
    throw new Error('The saved listing update timestamp is invalid.');
  }

  if (
    data['publishedAt'] !== null
    && data['publishedAt'] !== undefined
    && !(data['publishedAt'] instanceof Timestamp)
  ) {
    throw new Error('The saved publication timestamp is invalid.');
  }

  if (
    data['pausedAt'] !== null
    && data['pausedAt'] !== undefined
    && !(data['pausedAt'] instanceof Timestamp)
  ) {
    throw new Error('The saved pause timestamp is invalid.');
  }

  if (
    data['archivedAt'] !== null
    && data['archivedAt'] !== undefined
    && !(data['archivedAt'] instanceof Timestamp)
  ) {
    throw new Error('The saved archive timestamp is invalid.');
  }

  return data as unknown as Listing;
}

function isValidTitle(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 10 && trimmed.length <= 100;
}

function validateTitle(value: string): string {
  if (typeof value !== 'string') {
    throw new Error('Enter a listing title of 10–100 characters.');
  }
  const trimmed = value.trim();
  if (!isValidTitle(value)) {
    throw new Error('Enter a listing title of 10–100 characters.');
  }
  return trimmed;
}

function isValidDescription(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 50 && trimmed.length <= 2000;
}

function validateDescription(value: string): string {
  if (typeof value !== 'string') {
    throw new Error('Enter a listing description of 50–2,000 characters.');
  }
  const trimmed = value.trim();
  if (!isValidDescription(value)) {
    throw new Error('Enter a listing description of 50–2,000 characters.');
  }
  return trimmed;
}

function validateAccommodationType(value: AccommodationType): AccommodationType {
  if (!ACCOMMODATION_TYPES.includes(value)) {
    throw new Error('Select an accommodation type.');
  }
  return value;
}

function isValidCountry(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
}

function validateCountry(value: string): string {
  if (typeof value !== 'string') {
    throw new Error('Enter a country of 2–100 characters.');
  }
  const trimmed = value.trim();
  if (!isValidCountry(value)) {
    throw new Error('Enter a country of 2–100 characters.');
  }
  return trimmed;
}

function isValidCity(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
}

function validateCity(value: string): string {
  if (typeof value !== 'string') {
    throw new Error('Enter a city of 2–100 characters.');
  }
  const trimmed = value.trim();
  if (!isValidCity(value)) {
    throw new Error('Enter a city of 2–100 characters.');
  }
  return trimmed;
}

function isValidRegion(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 100;
}

function validateRegion(value: string): string {
  if (typeof value !== 'string') {
    throw new Error('The region must be 100 characters or fewer.');
  }
  const trimmed = value.trim();
  if (!isValidRegion(value)) {
    throw new Error('The region must be 100 characters or fewer.');
  }
  return trimmed;
}

function isValidAreaDescription(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 200;
}

function validateAreaDescription(value: string): string {
  if (typeof value !== 'string') {
    throw new Error('The area description must be 200 characters or fewer.');
  }
  const trimmed = value.trim();
  if (!isValidAreaDescription(value)) {
    throw new Error('The area description must be 200 characters or fewer.');
  }
  return trimmed;
}

function validateGuestCapacity(value: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10) {
    throw new Error('Enter guest capacity from 1–10.');
  }
  return value;
}

function validateBedrooms(value: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 10) {
    throw new Error('Enter bedrooms from 0–10.');
  }
  return value;
}

function validateBeds(value: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 15) {
    throw new Error('Enter beds from 1–15.');
  }
  return value;
}

function validateBathrooms(value: number): number {
  if (typeof value !== 'number' || value < 1 || value > 10) {
    throw new Error('Enter bathrooms from 1–10.');
  }
  return value;
}

function validateAmenities(values: string[]): string[] {
  if (!Array.isArray(values) || values.length > 30) {
    throw new Error('Select up to 30 amenities.');
  }
  if (!values.every((val) => typeof val === 'string' && APPROVED_AMENITIES.includes(val))) {
    throw new Error('An amenity is not approved.');
  }
  return [...values];
}

function validateHouseRules(values: string[]): string[] {
  if (!Array.isArray(values) || values.length > 15) {
    throw new Error('Enter up to 15 house rules.');
  }
  if (
    !values.every(
      (val) => typeof val === 'string' && val.length >= 5 && val.length <= 200,
    )
  ) {
    throw new Error('Each house rule must be 5–200 characters.');
  }
  return values.map((val) => val.trim());
}

export const APPROVED_AMENITIES_LIST = APPROVED_AMENITIES;
