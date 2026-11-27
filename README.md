# Openstay

Community-based travel • Local hosting • Cultural exchange

Openstay connects travellers with local hosts for authentic stays, cultural
exchange, and meaningful community experiences.

## Product architecture

The proposed product requirements, MVP scope, system architecture, data model,
API inventory, security approach, milestones, and review checklist are in
[docs/phase-0-architecture.md](docs/phase-0-architecture.md).

Implementation has progressed through host listing management and an initial
public discovery experience. The roadmap remains a proposal; implementation
and deployment of a feature do not by themselves establish launch readiness.

## Current implementation

The Angular 22 standalone app uses strict TypeScript, routing, SCSS, Angular
Material, and reusable Openstay design tokens. It includes a responsive starter
screen, production service-worker caching and installable PWA metadata, and a
browser-aware install button with manual installation guidance when a native
prompt is unavailable. The service worker is disabled in development. It also
includes Firebase Authentication with email/password and Google sign-in,
Firestore-backed user profiles, Firebase modular SDK initialization for
Storage and Functions, persistent Firebase Auth state, email-verification and
account-status route guards, and App Check setup for configured non-emulator
environments. Host participation includes opt-in private profiles and consent
history managed by trusted callables. Hosts can create drafts and use trusted
lifecycle actions; public discovery and detail use bounded, screened callable
responses. Direct listing and host-profile document reads are owner-only.

See [M3.3 host listings](docs/m3.3-host-listings-architecture.md) for the
implemented behavior, limitations, and outstanding work. In particular,
availability, hosting requests, bookings, photos, and an independent
moderation/reporting workflow are not implemented by M3.3.

### Prerequisites

- Node.js 24.22.2 (verified with Angular 22; the Functions deploy runtime is Node 22)
- npm 11.6 or later (npm 11.19.1 verified)
- Java 21 or later for Firebase emulators (Java 25 verified)

### Run locally

```bash
npm install
npm --prefix functions install
```

In one terminal, run the Angular development server:

```bash
npm start
```

In another terminal, build the local Hosting and Functions artifacts and start
all configured emulators:

```bash
npm run emulators
```

The checked-in `.firebaserc` keeps `demo-openstay` as the local default, and the
emulator script explicitly uses that demo ID so it cannot access production
Firebase resources. The `development` alias points to the `open-stay` Firebase
project.

The `open-stay` project has a registered Web App and a Cloud Firestore database
in `asia-south1`. The verified Web App configuration is in
`src/environments/environment.ts`. Its Firebase values, including the API key,
are public client identifiers, not service-account credentials. Never commit
service-account private keys or other secrets.

The non-emulator configuration includes an App Check reCAPTCHA site key.
Verify the provider, enforcement, and authorized domains in the target project
before relying on App Check. The host consent and listing callables enforce
App Check outside the emulator. Consent changes, including withdrawals,
are limited to ten events per account in any rolling hour; idempotent retries
do not consume quota. Withdrawal can be delayed until a slot opens.
Monitor abuse and establish additional controls before public launch. Analytics
is not initialized until an appropriate consent flow is in
place. Production deployment remains subject to the launch prerequisites below
and in the M3.3 implementation record.

### Outstanding M3 and deployment work

- **Content safety:** Screening is heuristic and host confirmation is a
  self-attestation, not proof of review or independent moderation. Implement
  and staff independent moderation, reporting, and abuse-handling processes
  before public launch; sensitive or harmful text can still evade screening.
- **Discovery and future features:** Initial discovery supports exact country
  and city, accommodation type, and minimum guest filters with bounded
  pagination. Date availability needs an approved availability model; remaining
  discovery acceptance, including privacy review and cost measurement, belongs
  to M4. M4 feature development may proceed; this is not production deployment
  approval. Photos, availability, requests, bookings, and messaging require
  separate implementation and approval.
- **Development deployment (2026-11-27):** Hosting, Firestore rules, and index
  definitions were deployed to `open-stay`. Index build readiness was not
  confirmed. Functions deployment failed because required APIs could not be
  enabled without the Blaze billing plan; the deployed app must not be assumed
  to have the current callable backend. After authorized billing approval,
  deploy the Functions and verify their availability and compatibility with
  the deployed client and rules.
- **External controls:** Verify App Check and production deployment protections,
  restrict deployment credentials, and complete operational safety and abuse
  readiness before production release. The development deployments above are
  not production approval.

Google sign-in is implemented in the app and uses the configured Firebase
Authentication instance. In the Firebase Console for `open-stay`, enable the
Google provider under **Authentication → Sign-in method** and ensure the
deployed site's domain is listed under **Authentication → Settings →
Authorized domains**. These are Firebase project settings; the app does not
need a service-account key or elevated Firestore permissions for Google sign-in.
Local development continues to use the Auth and Firestore emulators.

### GitHub Actions deployment

The `Deploy to Firebase` workflow runs only when manually dispatched from
`main`. Before enabling deployment, create the GitHub `production`
environment with required reviewers, prevent self-review and administrator
bypass, restrict its deployment branches to `main`, and restrict who can
dispatch workflows. GitHub can automatically create a missing environment
without protection; the environment name alone does not enforce approval. Add
an Actions secret named
`FIREBASE_SERVICE_ACCOUNT_OPENSTAY` containing the Firebase service-account
JSON for the `open-stay` project. The legacy name `FIREBASE_SERVICE_ACCOUNT`
is also accepted. Do not commit the JSON key or expose it in logs. Without
either secret, the workflow stops at its credential check and does not deploy.

### Verify

```bash
npm run build
npm test -- --watch=false
npm run test:rules
npm --prefix functions run build
```

`npm run test:rules` runs the Firestore security-rule tests against the local
Firestore Emulator and uses the `demo-openstay` project ID.

### Legacy profile migration utility

The profile migration utility is a separate Admin SDK tool. It scans
`users/{uid}`, `userPrivate/{uid}`, and `usernames/{normalizedUsername}` using
paginated reads. Dry-run is the default and never writes. Reports classify each
record as `SAFE_TO_MIGRATE`, `NEEDS_REVIEW`, or `NO_CHANGE`; only the legacy
`email` and `emailVerified` fields are eligible for automatic removal. All
other inconsistencies are reported for manual review and are never guessed or
rewritten. Logs and reports do not include email addresses, phone numbers,
private preferences, or profile field values.

Run the emulator-backed automated tests with:

```bash
npm run test:migration
```

For an isolated manual dry run, start only the Firestore Emulator with the demo
project ID, then run the utility in another terminal. No project is selected
implicitly:

```bash
firebase emulators:start --only firestore --project demo-openstay
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run migrate:profiles -- \
  --project-id demo-openstay --report ./profile-migration-report.json
```

To test writes, run the command through the emulator environment and include
`--apply` explicitly:

```bash
firebase emulators:exec --only firestore --project demo-openstay \
  "npm run migrate:profiles -- --project-id demo-openstay --apply --report ./profile-migration-report.json"
```

Both dry-run and apply reject non-`demo-*` project IDs and require a loopback
`FIRESTORE_EMULATOR_HOST`; neither mode can read from a live Firebase project.
The utility also refuses project IDs assigned to `prod` or `production` aliases
in `.firebaserc`. This stage does not provide production execution or an
approval bypass.

Review the JSON report's `summary`, `records[].classification`,
`records[].issues`, and `records[].fieldsToRemove`. Record paths are included
to locate documents, but no profile values are emitted. Review and resolve
`NEEDS_REVIEW` items manually; do not transfer contested usernames, delete
contested reservations, or invent account/verification state. A record needing
review may still have the explicitly approved legacy fields removed; no other
field is changed.

Reports and batch failure details may contain Firestore document IDs or paths.
Treat retained reports as sensitive operational metadata and restrict access.
Report file saving happens after migration batches. If saving the report fails
after successful writes, documents may already have changed even though the
command exits unsuccessfully. Inspect Firestore and investigate the failure
before rerunning the utility.

### Legacy profile inventory (Phase 3.5, Stage G)

The separate inventory utility performs a read-only, paginated inventory of
`users`, `userPrivate`, and `usernames`. It validates the public and private
profile fields and reconciles public usernames with their reservation
documents. It never writes, updates, deletes, creates, batches, transacts, or
repairs Firestore data.

The inventory validates against the current application model, service, and
Firestore rules. Private profiles require `privatePreferences` as a map and
`updatedAt` as a timestamp; username reservations require `uid`, `createdAt`,
and `updatedAt`, all with their canonical types.

Inventory records use these classifications:

- `SAFE_TO_MIGRATE`: only the approved legacy `email` and/or `emailVerified`
  fields are present for removal; no schema or ownership issue was detected.
- `NEEDS_REVIEW`: a schema, username, reservation, ownership, or incomplete-scan
  issue exists. Cross-collection inconsistencies are attached to the relevant
  profile and/or reservation; a missing/orphan result is emitted only when the
  collection required to verify it was completely scanned.
- `NO_CHANGE`: no approved legacy field removal or manual review is indicated.

Run the emulator-backed inventory tests (also included in
`npm run test:migration`) with:

```bash
npm run test:inventory
```

For a manual emulator-only inventory, start Firestore Emulator with the demo
project and set its loopback host explicitly:

```bash
firebase emulators:start --only firestore --project demo-openstay
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm --prefix functions run inventory:profiles -- \
  --project-id demo-openstay --emulator --page-size 400 --max-pages 10000 \
  --report ./legacy-profile-inventory-report.json
```

The JSON report is printed and optionally saved at the requested report path.
Reports contain document IDs/paths where useful for reconciliation and are
sensitive operational metadata; restrict access and retention. They exclude
email addresses, phone numbers, private preferences, document contents, and
credentials. A failed page or pagination bound makes the inventory incomplete
and identifies the affected collection without silently treating its omitted
documents as absent.

The utility does not access a live project unless separately and explicitly
invoked with `--project-id <id> --live-read-only`; that mode requires separate
explicit user approval and is not authorized by this stage. No live inventory
is part of G1–G5. Inventory findings do not approve a migration, Firestore
changes, or deployment of security rules. Stage G does not approve migration
or security-rules deployment.

Stage I preparation for any future production read-only inventory—including
project confirmation, least-privilege IAM, credential controls, backup and
recovery, report handling, approval gates, execution checklist, and risks—is
documented in
[docs/production-inventory-preparation-stage-i.md](docs/production-inventory-preparation-stage-i.md).
The guide is not authorization to connect to production or run the inventory.

Any backup/export for a future migration is a separate operation requiring
separate backup/export approval. The following is an illustrative command
template only, not a current operational instruction or approval to export.
Do not execute it without that separate approval and confirmation of the
source, destination, identity, and retention controls. The commented command
and bracketed placeholders are intentionally non-executable as shown:

```bash
# ILLUSTRATIVE TEMPLATE ONLY — NOT APPROVED; DO NOT EXECUTE.
# gcloud firestore export \
#   [APPROVED_BUCKET_URI/UNIQUE_EXPORT_PREFIX] \
#   --project=[APPROVED_PROJECT_ID]
```

Under a separately approved backup procedure, the project owner must confirm
the project and bucket, export completion, retention/access controls, and
restore procedure. This example does not authorize or direct a production
export; the migration utility itself will not apply to a production project.

Before deploying the new Firestore rules, run a dry-run against the approved
isolated target, inspect the complete JSON report, resolve every
`NEEDS_REVIEW` record, apply only the approved legacy-field removals in a
non-production environment, and run the scan again. Confirm zero missing
reservations and no unresolved schema or ownership conflicts before requesting
the separately approved rules deployment. This utility does not deploy rules.

## Development roadmap

The roadmap below reflects the proposed architecture in
[docs/phase-0-architecture.md](docs/phase-0-architecture.md). Phases are
delivery areas, not approvals to collect sensitive data or launch features;
scope and launch decisions remain subject to product, safety, and legal review.

| Phase | Focus | Key outcomes |
|---|---|---|
| 0 - Product requirements and architecture | Define the product, users, MVP, modules, data model, and technical architecture. | Approve the product boundaries, privacy and safety decisions, architecture, and Phase 1 entry criteria. |
| 1 - Project foundation | Angular setup, Firebase configuration, design system, and authentication. | Establish the Angular application, Firebase environments and emulators, shared design foundations, and account lifecycle with email verification. |
| 2 - User and host profiles | Profile creation, host onboarding, and preferences. | Deliver privacy-aware traveller and host profiles, host setup, and profile/preferences management. |
| 3 - Discovery and hosting | Host listings, search, availability, and hosting requests. | Deliver listing management and publication, bounded discovery, saved hosts, host-managed availability, and the hosting-request flow. |
| 4 - Bookings and communication | Booking lifecycle, messaging, and notifications. | Deliver conflict-safe booking decisions and essential in-app/email notifications. Direct messaging is gated on approved safety, moderation, and abuse-handling plans; it is not part of the initial MVP. |
| 5 - Community | Stories, posts, followers, and travel experiences. | Define and deliver community features only after separate product approval, including visibility, moderation, reporting, and retention requirements. |
| 6 - Trust, dashboards, and launch | Verification, reviews, admin, testing, and deployment. | Complete launch testing, production deployment, and operational readiness. Provide the minimal safety-report/admin workflow before public launch; expand dashboards and admin tools as approved. Reviews require an eligible completed-stay workflow. Identity verification requires an approved provider, consent, legal basis, and retention policy; do not collect identity documents before then. |

### MVP and phase gates

The proposed MVP centers on accounts and profiles, host listings, discovery,
saved hosts, hosting requests and bookings, essential notifications, and safety
reporting. Community features, direct messaging, post-stay reviews, and identity
verification are not assumed to be MVP requirements. Features deferred from the
MVP need explicit product approval and their own acceptance criteria before
implementation.

Testing, security-rule validation, accessibility, and documentation are
continuous throughout delivery. Production launch also requires approved
retention/deletion policies, staffed safety operations, monitoring, and recovery
procedures. See the Phase 0 architecture for detailed milestones, requirements,
and launch gates.
