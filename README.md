# Openstay

Community-based travel • Local hosting • Cultural exchange

Openstay connects travellers with local hosts for authentic stays, cultural
exchange, and meaningful community experiences.

## Product architecture

The proposed product requirements, MVP scope, system architecture, data model,
API inventory, security approach, milestones, and review checklist are in
[docs/phase-0-architecture.md](docs/phase-0-architecture.md).

Phase 1 foundation work is underway. This foundation does not implement account
flows or other product features; those remain subsequent, separately validated
work.

## Current implementation

The Angular 22 standalone app uses strict TypeScript, routing, SCSS, Angular
Material, and reusable Openstay design tokens. It includes a responsive starter
screen, production service-worker caching and installable PWA metadata, and a
browser-aware install button with manual installation guidance when a native
prompt is unavailable. The service worker is disabled in development. It also
includes Firebase Authentication with email/password and Google sign-in,
Firestore-backed user profiles, Firebase modular SDK initialization for
Storage and Functions, persistent Firebase Auth state, email-verification and
account-status route guards, App Check setup for configured non-emulator
environments, default-deny Firestore and Storage rules, and a compiled Cloud
Functions skeleton.
AngularFire is intentionally not installed: the Phase 0 architecture selected
one consistent integration pattern using the Firebase modular Web SDK, and the
latest AngularFire release does not declare compatibility with Angular 22 and
TypeScript 6.

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

Before using Firebase outside the emulator, set the App Check reCAPTCHA site
key in `appCheckSiteKey`; the Firebase Web App configuration does not include
that key. Analytics is not initialized until an appropriate consent flow is in
place. Do not deploy yet.

Google sign-in is implemented in the app and uses the configured Firebase
Authentication instance. In the Firebase Console for `open-stay`, enable the
Google provider under **Authentication → Sign-in method** and ensure the
deployed site's domain is listed under **Authentication → Settings →
Authorized domains**. These are Firebase project settings; the app does not
need a service-account key or elevated Firestore permissions for Google sign-in.
Local development continues to use the Auth and Firestore emulators.

### GitHub Actions deployment

The `Deploy to Firebase` workflow runs on pushes to `main` and can also be
started manually. Before it can deploy, add a repository Actions secret named
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
