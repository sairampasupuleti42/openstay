# Listing Management, Discovery, and Hosting Requests

**Status: M3.3 listing management and discovery and M4.1–M4.3 stay
coordination are implemented locally.** This implementation
record supplements
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
| Document ID | Per-attempt SHA-256 hex request ID; legacy M4.1 deterministic IDs remain supported. It is returned as `requestId`, not stored as a field. |
| `listingId`, `hostUid`, `travellerUid` | Strings identifying the listing and participants; UIDs come from the stored listing and authentication |
| `startDate`, `endDate` | Valid ISO `YYYY-MM-DD` calendar-date strings; arrival is inclusive and checkout is exclusive |
| `guestCount` | Integer from 1 to 10, no greater than the listing capacity at creation |
| `introductoryMessage` | Trimmed, non-empty string; input is at most 2,000 characters and screened for common contact and address patterns |
| `status` | `pending`, `accepted`, `declined` or `cancelled` |
| `createdAt`, `updatedAt` | Firestore server timestamps; `createdAt` is set at creation and `updatedAt` at creation and each successful transition |
| `lastAction`, `lastActorUid` | Most recent successful transition action and actor UID; absent before the first transition |

The end date must be after the start date. The current implementation does not
require future dates or offer a calendar or availability search.

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
when available, not phone numbers or private profile fields. Request details
also return only the other participant's screened public display name and
screened city/country. Message, name and title screening is heuristic and
cannot guarantee that free text contains no contact information or other
sensitive content.

### Callable contracts and concurrency

The callables run in `us-central1` and enforce App Check outside the Functions
emulator. Inputs are objects; unexpected fields are rejected.

| Callable | Input | Output |
|---|---|---|
| `createHostingRequest` | `listingId`, `startDate`, `endDate`, `guestCount`, `introductoryMessage` | `{ requestId }` |
| `listTravellerHostingRequests` | optional `cursor` (null or a request ID) | `{ items, nextCursor }` for the caller as traveller |
| `listHostHostingRequests` | optional `cursor` (null or a request ID) | `{ items, nextCursor }` for the caller as host |
| `getHostingRequest` | `requestId` | projected request plus `viewerIsHost`, nullable `listingTitle`, and nullable `traveller: { displayName }` |
| `decideHostingRequest` | `requestId`, `action` (`accept`, `decline` or `cancel`) | `{ status }` |

Each projected request includes `requestId`, `listingId`, the dates, guest
count, introduction, status, and ISO timestamp strings (`createdAt` and
`updatedAt`, nullable if unavailable). Lists return up to 20 items ordered by
`startDate` ascending and document ID; the request-ID cursor is resolved to a
participant-owned snapshot before continuing. Composite indexes cover
`hostUid + startDate` and `travellerUid + startDate`. The client groups the
loaded pages by lifecycle and date; it does not fetch all historical requests.

Creation validates the same published listing shape and public-text safety
used by discovery, capacity, an active traveller and host, current host
consent, and the host withdrawal lock. It reads these documents in the same
transaction as the request and a server-only `hostingRequestRateLimits/{uid}`
counter. A server-only `hostingRequestReservations/{tupleHash}` document
allows at most one active request for the same traveller, listing and exact
date range. New attempts receive distinct request IDs; the reservation's
`activeRequestId` is cleared atomically when a request is declined or cancelled,
so the tuple can be requested again while all historical requests remain
available. Concurrent duplicate submissions still yield one active request
and `already-exists` for the others. Different or overlapping ranges are not
deduplicated and are not availability reservations. For compatibility,
creation also checks the legacy deterministic M4.1 request document and rejects
an existing active request before permitting a new attempt after a terminal
state.

Creation permits ten successful requests per traveller in an hour-long window
starting with the first successful request in that window. The counter is
updated transactionally; rejected duplicates do not consume quota. Common
callable errors include `unauthenticated`, `invalid-argument`,
`permission-denied`, `failed-precondition`, `already-exists`,
`resource-exhausted`, and `not-found` for missing or unauthorized details.

## M4.2 decisions and stays

The existing request is the authoritative stay record after acceptance; there
is no second participant-facing stay document. Creation enters `pending`.
Only the stored host can move `pending` to `accepted` (which confirms the
stay) or `declined`. The traveller can cancel a pending request, and either
participant can cancel an accepted stay. Both transitions produce `cancelled`.
There is no time cutoff for cancellation: the existing product defines none,
and inventing one could prevent participants from correcting a stay. This
also means a stay can be cancelled after its dates. Completion is not exposed
because there is no existing product rule establishing when completion is
legitimate; `accepted → completed` requires a future, explicitly defined rule.
There is no automatic transition based on the server clock.

| Actor | Accept / decline pending | Cancel pending | Cancel accepted | Read |
|---|---|---|---|---|
| Stored host | Yes | No | Yes | Own requests and stays |
| Stored traveller | No | Yes | Yes | Own requests and stays |
| Other or unauthenticated | No | No | No | No |

Operations require verified authentication and an active actor account.
Acceptance additionally transactionally checks the active traveller and host,
published valid listing and stored ownership, current consent and withdrawal
lock, capacity, and valid ordered dates. Pause, archive, withdrawal, suspension,
or capacity changes committed before acceptance force a retry or rejection.
Decline and cancellation remain available to an active participant even when
the listing or the other participant is no longer eligible. The callable
`decideHostingRequest` accepts only `{ requestId, action }`, with action
`accept`, `decline` or `cancel`; identities and state are never client inputs.
A retry of the same most recent action by the same actor returns its result;
different or stale transitions fail. All client lifecycle writes remain denied.

For each listing, server-only `listingSchedules/{listingId}` is a shared
serialization document, and its `confirmed/{requestId}` subcollection holds
the dates of accepted stays. Acceptance reads and writes the shared document
and reads every confirmed entry in the same transaction. On contention the
transaction retries and rechecks all conflicts and eligibility. Cancellation
of an accepted stay updates the same document and removes its entry in the
same transaction as the request change. Invalid schedule entries or missing
entries on cancellation fail closed. Every trusted writer must follow this
protocol; direct Admin SDK writes bypass it and are unsupported. The query
alone is not the concurrency guard.

Dates are validated calendar strings `YYYY-MM-DD`, not local timestamps.
Intervals are start-inclusive and end-exclusive; `[a,b)` conflicts with
`[c,d)` exactly when `a < d && c < b`, so checkout and arrival on the same
date are allowed. As in M4.1, dates need not be in the future. Reading the
entire confirmed subcollection provides correctness but is unbounded: large
schedules can hit Firestore transaction size, time or contention limits and
fail rather than accept without checking. This is not an availability calendar.

Each successful transition records its actor, action, previous and new state,
and server timestamp in a server-only request event subcollection. Request
records, including declined and cancelled records, are retained; no retention
or deletion job is implemented. New request attempts use distinct IDs, while
the per-tuple reservation prevents duplicate active requests and is released
atomically at a terminal transition. Legacy deterministic M4.1 request IDs
remain readable and active legacy requests continue to reserve their tuple.
The existing participant request lists and details also show accepted stays
and their actions. M4.3 adds private messaging, in-app notifications and
status-grouped stay sections without creating a second stay record.

## M4.3 stay coordination

### Conversations and messages

There is one deterministic `conversations/{requestId}` document per accepted
request; the hosting request ID is also the conversation ID. A new accepted
request creates the conversation in the same transaction as the trusted
`pending → accepted` transition. An older accepted request without a
conversation gets one on its participant's first conversation open; this
avoids a data migration. Concurrent opens converge on the same document.
Declined and pending requests cannot create a conversation. A cancelled
conversation is retained for participant history, but the callable refuses
new messages unless the linked request remains `accepted`.

The conversation document contains only `conversationId`, `requestId`,
`listingId`, `hostUid`, `travellerUid`, the server-derived `participantUids`,
per-participant unread message counts, timestamps and last-message sender/time
metadata. It does not contain a message preview or copied profile/contact
fields. Messages are stored at
`conversations/{requestId}/messages/{messageId}` and contain only the linked
conversation ID, authenticated sender UID, normalized text and server
`createdAt`. The message ID is a SHA-256 digest of request ID, authenticated
sender and a client-generated idempotency key; reusing a key with identical
content returns the existing message, while a conflicting reuse is rejected.
There is no edit or attachment support.

`sendConversationMessage` accepts only `{ requestId, text, idempotencyKey }`.
It derives the sender from verified callable authentication and transactionally
checks the request status, deterministic conversation participants, both
active accounts, current host participation consent and the withdrawal lock.
The transaction creates the message, increments only the recipient's unread
count, updates conversation metadata and a server-only per-sender/conversation
rate counter together. A concurrent cancellation writes the request status in
the same Firestore consistency boundary: whichever transaction commits first
defines whether the message was sent before cancellation; a retry after
cancellation is rejected. Messages are normalized with NFKC, trimmed, limited
to 2,000 UTF-16 code units, screened for common contact/address patterns and
rate-limited to 20 successful messages per sender per conversation per minute.
The screening is heuristic, not a content moderation or privacy guarantee.

The client listens to the latest 50 messages ordered by `createdAt` descending
and displays them chronologically; older messages are fetched in 50-message
pages using a Firestore document cursor. The live listener is bounded and
continues to receive newer messages. Firestore Rules permit only linked
participants with active accounts and current host consent to read the
conversation or message subcollection. Conversation documents themselves
cannot be listed directly; the `listConversations` callable returns the
participant's bounded page and batch-loads only public display names. The
callable uses a short-lived opaque cursor token backed by server-only state, so
page boundaries do not disclose ineligible conversation IDs or timestamps.
Cursor state is private to the authenticated user and expires after 15
minutes. Multiple tabs can use their cursors independently; at most 100
unexpired cursors per user are retained, and new cursors are rejected until
one expires when the limit is reached. All conversation and message writes
are denied to clients.

### Notifications and delivery

Notification documents are private top-level
`notifications/{sha256(sourcePath)}` records with recipient UID, a fixed
notification type, request ID, optional conversation ID, trusted generic
title/message, server creation timestamp, `read` and optional `readAt`. No
message body or personal display data is copied into notification text.
`notificationCounts/{recipientUid}` stores the exact unread count for that
recipient. Conversation message unread counts are separate from notification
unread state.

The retry-enabled Firestore create triggers handle (1) a new hosting request,
(2) a trusted request transition event in
`hostingRequests/{requestId}/events/{eventId}`, or (3) a new conversation
message. They map only supported transitions to a recipient and fixed text.
Each trigger derives a deterministic notification ID from the source document
path. A Firestore transaction checks that notification ID and atomically
creates the notification and increments its recipient counter only once.
Duplicate delivery therefore does not duplicate notification rows or counts.
Triggers are asynchronous: request transitions and message sends commit
independently of notification delivery, so notification infrastructure cannot
invalidate those successful operations. Failed trigger execution is retried
by the Functions event retry policy; recipients may see notifications
eventually rather than in the request/message transaction. There is no separate
dead-letter or manual replay UI, so sustained trigger failure requires
operational repair and replay.

`markNotificationRead` atomically marks one recipient-owned notification and
decrements the counter only if it was unread. `markAllNotificationsRead`
queries that recipient's unread rows in pages of 400 and applies each page in
a transaction with the counter. Concurrent and repeated read operations are
idempotent. Rules permit notification reads only for `recipientUid`; client
notification writes and counter writes are denied. The recipient can read
their own counter document. No push, email, SMS or third-party notification
delivery is configured.

### Stay dashboards, indexes and lifecycle boundaries

`/requests/mine` and `/requests/incoming` remain the traveller and host stay
dashboards. Each displays pending, upcoming accepted, cancelled, declined and
past-dated accepted records, with bounded 20-request pages ordered by start
date. A past-dated request remains `accepted`; it is never described as
completed. A stay whose exclusive `endDate` is on or before the current UTC
date is grouped as past-dated; cancelled requests never appear in the
upcoming-accepted section. Detail pages expose screened public participant
names and city/country, existing listing links and the existing trusted
cancellation action. The authenticated dashboard and global navigation link
to `/messages` and `/notifications`; request details link directly to a
conversation only for accepted stays, with backend authorization still
required. Existing accept/decline/cancel logic is not duplicated.

Composite indexes in `firebase/firestore.indexes.json` support the
participant/date request queries, participant-array/updated-time conversation
page, notification recipient/created-time pages and recipient/read unread
queries. Message history uses the automatic single-field `createdAt` index.
All new collections are deny-by-default except the explicit participant or
recipient read paths described above. Notifications, counts, conversations,
messages and message rate-limit state are never client-writable. Existing
M4.1/M4.2 request lifecycle rules remain unchanged.

This milestone does not add a completion transition, date availability,
attachments, message editing, moderation/reporting, retention jobs, or
payment features. Notification counters serialize updates per recipient and
may become a write hotspot at high message volume. Accepted schedules still
read the existing full confirmed subcollection; its scale limitation is
unchanged. All verification for this milestone is emulator/local only; no
production Firebase access or deployment was performed.

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

`archived` is terminal. Pausing or archiving a listing does not cancel
existing confirmed stays; it prevents new acceptance while the listing is
unpublished.

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
  `functions/test/hosting-requests.test.mjs`,
  `functions/test/conversations.test.mjs`, and
  `functions/test/notifications.test.mjs`. It covers lifecycle retries and
  concurrency, authorization failures, malformed inputs, App Check, bounded
  withdrawal and suspension behavior, published-only search, filtering,
  pagination, public projection safety, stale lifecycle visibility, and
  private/unsafe host or listing text, request validation, participant
  authorization, concurrent conversation creation and message submission,
  cancellation races, message rate limits, notification event recipients,
  duplicate delivery, read-counter consistency, pagination and projections.
  Firestore Rules tests cover participant-only request/conversation/message
  reads, recipient-only notification reads and denial of direct writes.
- Angular coverage is in the host listing page, editor, detail, and
  `ListingService` specs, plus request, messaging and notification page specs.
  Firestore rule behavior remains covered by
  `firebase/firestore.rules.test.mjs`.
- Photo uploads, photo readiness requirements, date availability, completion,
  message edits/attachments, moderation, retention jobs and payments remain
  deferred.
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
  an approved availability model. Query transaction cost and scale limits
  described above remain known constraints.
- On 2026-11-27, Hosting, Firestore rules, and index definitions were deployed
  to the `open-stay` development project. The listed composite indexes report
  `READY`. Functions deployment previously failed because enabling required
  APIs required the Blaze billing plan, and Functions were not included in the
  latest deployment. The hosting-request decision UI depends on
  `decideHostingRequest`; verify that the deployed backend provides it before
  using request decisions. Following authorized billing approval, deploy
  Functions separately and verify callable availability and compatibility
  before using this environment.
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
