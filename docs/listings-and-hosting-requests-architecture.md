# Listing Management, Discovery, and Hosting Requests

**Status: M3.3 listing management and discovery and the M4.1 hosting request
foundation are implemented.** This implementation record supplements
[M3.1 host management architecture](./m3.1-host-management-architecture.md).
The M3.3.1 listing model and Firestore rules in the repository are
authoritative; this document does not define a replacement listing schema.

## M4.1 hosting request foundation

The public listing detail links to `/requests/new/:listingId`. Authenticated
users can use `/requests/mine` for traveller history, `/requests/incoming` for
host requests, and `/requests/:requestId` for participant-only details. The
dashboard links to both lists. A submitted request is **not a confirmed stay**.
The form provides validation, submission and error states; the lists provide
bounded pagination, loading, empty and error states.

### Schema and state

Requests are stored as top-level `hostingRequests/{requestId}` documents. This
allows either participant to query by UID without collection-group queries.
The trusted server writes the following fields:

| Field | Type and meaning |
|---|---|
| `requestId` | SHA-256 hex ID derived from the traveller UID, listing ID, and exact start and end dates |
| `listingId`, `hostUid`, `travellerUid` | Strings identifying the listing and participants; UIDs come from the stored listing and authentication |
| `startDate`, `endDate` | Valid ISO `YYYY-MM-DD` calendar-date strings; arrival is inclusive and checkout is exclusive |
| `guestCount` | Integer from 1 to 10, no greater than the listing capacity at creation |
| `introductoryMessage` | Trimmed, non-empty string; input is at most 2,000 characters and screened for common contact and address patterns |
| `status` | `pending` |
| `createdAt`, `updatedAt` | Firestore server timestamps set at creation |

The end date must be after the start date. The current implementation does not
require future dates or check a calendar or availability. M4.1 has one state:
creation enters `pending`; no state transitions, acceptance, rejection,
cancellation or stay confirmation are implemented.

### Authorization and privacy

| Actor | Create via callable | Callable read | Direct Firestore read | Direct write |
|---|---|---|---|---|
| Active, verified-email traveller | Another host's eligible listing | Own requests | Own requests | Denied |
| Active, verified-email host | Another host's eligible listing | Requests addressed to them | Requests addressed to them | Denied |
| Unrelated signed-in user | May create their own eligible request if active and email-verified | Cannot read others' requests | Cannot read others' requests | Denied |
| Unauthenticated user | Denied | Denied | Denied | Denied |

All request callables require authentication, verified email and an active
account. Direct Firestore rules check authentication and stored participant
UIDs; they do not themselves check email verification or account status. Rules
permit participant document reads and participant-constrained queries, but
deny every client create, update and delete. Server-only rate-limit documents
are not client-readable. No client-supplied identity, status, timestamp or
extra input field is accepted by creation.

Request messages are visible to both participants, not the public. Direct
participant reads expose the stored request, including participant UIDs; the
callable projections omit those UIDs and never return private profiles. Detail
responses include only a screened traveller display name and listing title
when available, not phone numbers or private profile fields. Message, name and
title screening is heuristic and cannot guarantee that free text contains no
contact information or other sensitive content.

### Callable contracts and concurrency

The callables run in `us-central1` and enforce App Check outside the Functions
emulator. Inputs are objects; unexpected fields are rejected.

| Callable | Input | Output |
|---|---|---|
| `createHostingRequest` | `listingId`, `startDate`, `endDate`, `guestCount`, `introductoryMessage` | `{ requestId }` |
| `listTravellerHostingRequests` | optional `cursor` (null or a request ID) | `{ items, nextCursor }` for the caller as traveller |
| `listHostHostingRequests` | optional `cursor` (null or a request ID) | `{ items, nextCursor }` for the caller as host |
| `getHostingRequest` | `requestId` | projected request plus `viewerIsHost`, nullable `listingTitle`, and nullable `traveller: { displayName }` |

Each projected request includes `requestId`, `listingId`, the dates, guest
count, introduction, status, and ISO timestamp strings (`createdAt` and
`updatedAt`, nullable if unavailable). Lists return up to 20 items ordered by
document ID, **not** by date or creation time. `nextCursor` is the last
returned ID when another page exists, otherwise null. Queries constrain the
relevant participant UID; automatic single-field indexes suffice, so no
composite request index is defined.

Creation validates the same published listing shape and public-text safety
used by discovery, capacity, an active traveller and host, current host
consent, and the host withdrawal lock. It reads these documents in the same
transaction as the request and a server-only `hostingRequestRateLimits/{uid}`
counter. Concurrent submissions for the same traveller, listing and exact
date range compete for one deterministic ID, so only one succeeds. Different
or overlapping ranges are not deduplicated and are not availability
reservations. A repeated tuple returns `already-exists`; after a lost response
the traveller can check request history. The deterministic ID must be
reconsidered when future terminal states allow a new request for the same
tuple.

Creation permits ten successful requests per traveller in an hour-long window
starting with the first successful request in that window. The counter is
updated transactionally; rejected duplicates do not consume quota. Common
callable errors include `unauthenticated`, `invalid-argument`,
`failed-precondition`, `already-exists`, `resource-exhausted`, and `not-found`
for missing or unauthorized details.

Host decisions, cancellation, stay confirmation, availability, messaging,
notifications, reviews and payments are outside M4.1 and require separate
implementation.

## Listing workflow and routes

- `/hosting` continues host profile and participation-consent onboarding.
- `/hosting/listings` shows the signed-in host’s paginated listings, status,
  preview/edit links, and available lifecycle actions.
- `/hosting/listings/new` creates an unpublished draft.
- `/hosting/listings/:listingId/edit` edits draft content only.
- `/hosting/listings/:listingId` is the owner-only host preview.

The dashboard loads 20 listings per page and offers a cursor-based “Load more”
action. Empty, loading, error, and success states are exposed to assistive
technology. Forms validate the existing model’s bounds and warn hosts not to
enter exact addresses, coordinates, access instructions, or private contact
details. The host preview is not a public traveller page.

The public routes are `/explore` and `/listings/:listingId`. Discovery supports
exact country and city filters, accommodation type, minimum guest capacity,
and bounded cursor pagination. It has loading, empty, retry, and error states.
Listing detail uses a separate public response model and never reads the owner
listing document directly.

## Public discovery and privacy boundary

`searchPublishedListings` and `getPublicListingDetails` are public callable
Functions with App Check enforcement outside the Functions emulator. They use
the Admin SDK to select only `published` listings and verify the host account
is active and current participation consent is accepted. Search is server
filtered, page size is capped at 20, and each request scans at most 100 listing
candidates. Composite indexes cover the supported equality-filter and
minimum-capacity combinations.

Firestore Rules permit direct listing reads and queries only for the owner.
Host profile document reads are also owner-only. Public listing and host data
is returned solely through explicit callable projections: the listing response
omits `hostUid`, `areaDescription`, lifecycle status/timestamps, and other
unapproved fields; the optional host response contains only an explicitly
public display name, introduction, and language list. Draft, paused, archived,
suspended-host, and withdrawn-consent listings are unavailable to these
callables. Rules tests verify that clients cannot bypass the callable boundary
with direct document reads or collection queries.

Publishing and resuming reject common patterns that look like email addresses,
URLs, phone numbers, street addresses, or coordinates. The callable also
filters legacy documents containing these patterns. Regex-based screening and
host publication confirmation cannot guarantee content safety: free text can
still contain sensitive or harmful information that does not match these
patterns. Independent moderation, reporting, and abuse-handling ownership and
processes are production launch requirements; these checks are not a moderation
system. Hosts must not include private contact details, exact addresses, or
access instructions in titles, descriptions, host introductions, or house
rules. There is no dedicated exact-address field or collection flow, but the existing
owner-editable `areaDescription` is arbitrary free text and could contain an
address. It is screened on publication and public reads, intentionally omitted
from all public responses, and remains owner-only in Firestore; this
implementation does not guarantee that no exact address is stored there.

## Trusted lifecycle and authorization

Only the following transitions are accepted:

| Action | Transition |
|---|---|
| Publish | `draft → published` |
| Pause | `published → paused` |
| Resume | `paused → published` |
| Archive | `draft → archived`, `paused → archived`, or `published → archived` |

`archived` is terminal. Archiving a published listing is allowed without
booking-related checks; bookings are outside this milestone.

The `publishListing`, `pauseListing`, `resumeListing`, and `archiveListing`
callables run in `us-central1` with App Check enforcement outside the
Functions emulator. They accept `listingId` and `idempotencyKey`; publish and
resume additionally require `publicContentReviewed: true`. This server-checked
acknowledgment is a workflow guard, not proof that a person read the content:
an authenticated caller can assert it directly. Each operation derives the
UID from callable authentication and checks verified email, an active account,
a valid host profile, current participation consent, stored listing ownership,
the complete current listing data, and the requested state transition. The
client cannot provide owner, role, status, or timestamp values. Firestore
Rules remain responsible for denying all direct client lifecycle writes.

Successful requests and their resulting statuses are recorded in the
server-only `hostPrivate/{uid}/listingLifecycleRequests` subcollection using a
UID-scoped hash of the request key. A server-only per-listing request pointer
under `hostPrivate/{uid}/listingLifecycleVersions/{listingId}` identifies the
latest lifecycle action. A matching retry returns its original result only
while both its status and request pointer remain current; an intervening
transition makes it stale even if the status later cycles back. Older requests
created before the pointer existed are conservatively rejected as stale.
The dashboard refreshes before a new request. Reusing a key for another listing
or action is rejected. Firestore Rules do not grant clients access to these
records.

Lifecycle timestamps and `updatedAt` use Firestore server timestamps. Resume
refreshes `publishedAt`; pause and archive set `pausedAt` and `archivedAt`
respectively. The client refreshes its dashboard after a successful operation.

## Consent withdrawal and suspended accounts

Consent withdrawal acquires a server-only, leased lock in
`hostPrivate/{uid}/listingLifecycleState/current` before pausing listings.
Lifecycle callables check the same lock in their Firestore transaction, which
prevents a concurrent publish/resume from escaping a completed withdrawal.
Published listings are scanned in ordered pages of 200. A successful retry
for the same consent request resumes safely; a failed pause leaves consent
accepted, releases the lock when possible, and allows a later retry. Listings
paused by already-completed batches remain paused after a failure. Expired
leases can be taken over, and a per-attempt worker ID prevents an old worker
from renewing or releasing a replacement lock.

Account suspension administration is deferred: no authorized administrator
workflow currently invokes these helpers with verified authorization.
Future trusted account administration must use `suspendAccount` and
`reactivateAccount` from `functions/src/hosting/account-suspension.ts`; direct
Admin SDK status writes bypass this safety protocol and are unsupported. The
suspension helper atomically records a pending suspension generation and sets
the account status. The retry-enabled `pauseListingsOnAccountSuspension`
trigger pauses published listings in bounded batches and marks that generation
complete. Reactivation is rejected until it completes. The helpers require the
expected previous or current suspension generation, so delayed administration
requests cannot act on a later suspension. Every batch checks the generation
and account state, so delayed workers cannot pause a later session.
Firestore Rules deny direct public listing document reads and queries. The
public callables independently deny results when an account is suspended or
current consent is withdrawn, even if the trigger has not yet updated the
listing status.
Reactivating the account does not republish listings; the host must resume them
through the trusted lifecycle operation. Lifecycle callables reject suspended
accounts. The public listing callables independently verify current account
and consent state, so eligibility changes hide a listing without waiting for
the asynchronous pause worker.

## Tests and known limitations

- Functions emulator coverage is in
  `functions/test/listing-lifecycle.test.mjs`,
  `functions/test/host-participation.test.mjs`,
  `functions/test/public-listings.test.mjs`, and
  `functions/test/hosting-requests.test.mjs`. It covers lifecycle retries and
  concurrency, authorization failures, malformed inputs, App Check, bounded
  withdrawal and suspension behavior, published-only search, filtering,
  pagination, public projection safety, stale lifecycle visibility, and
  private/unsafe host or listing text, request validation, participant
  authorization, concurrent duplicates, rate limits, pagination and
  projections. Firestore Rules tests also cover participant-only request reads
  and denial of direct request writes.
- Angular coverage is in the host listing page, editor, detail, and
  `ListingService` specs, plus request-page and request-service specs. Firestore
  rule behavior remains covered by `firebase/firestore.rules.test.mjs`.
- Photo uploads, photo readiness requirements, availability, request decisions,
  bookings, messaging, and payments remain out of scope.
  The current M3.3.1 schema has no photo fields, so publication validates the
  existing listing fields and does not require photos.
- Pausing is asynchronous; public reads are denied while the account is
  suspended. There is no administrator UI or authenticated admin endpoint.
  Before using account administration, integrate the helpers into a separately
  authorized, audited workflow, prevent direct status writes, and reconcile
  existing unmanaged suspensions. These helpers are not a complete production
  suspension workflow. Suspensions without a valid generation fail
  closed and require administrative reconciliation.
- The dashboard loads all listings through bounded 20-item pages; it does not
  provide status filters or deletion. Archived listings remain visible to
  their owner and cannot be restored.
- Initial discovery does not implement date-availability filtering. It requires
  an approved availability model; remaining M4 acceptance includes privacy
  review and query cost measurement.
- On 2026-11-27, Hosting, Firestore rules, and index definitions were deployed
  to the `open-stay` development project; index build readiness was not
  confirmed. Functions deployment failed because enabling required APIs
  required the Blaze billing plan. The currently deployed callable versions
  were not verified and may not match the client and rules. Following
  authorized billing approval, deploy Functions separately and verify
  callable availability and compatibility before using this environment.
- The Firestore rules deployment compiled with four nullable-map type warnings
  at lines 227, 238, 497, and 508 of
  [`firebase/firestore.rules`](../firebase/firestore.rules). Review these
  diagnostics without weakening the rules.
- Production release remains blocked on external controls that were not
  changed or verified by this implementation: a GitHub `production`
  environment with required reviewers, a deployment-branch restriction to
  `main`, disabled administrator bypass, verified production App Check
  configuration, and appropriately restricted deployment credentials. No
  production operation was performed; emulator verification is not production
  readiness.
