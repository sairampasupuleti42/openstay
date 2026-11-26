# Stage I — Production Inventory Preparation

**Status: preparation only. This guide is not production-readiness approval.**
Stage I documents a possible future, explicitly approved production read-only
inventory of legacy profiles. It does not authorize running the inventory,
migrating data, deploying code or rules, or changing IAM.

The Stage G inventory reads the `users`, `userPrivate`, and `usernames`
collections in pages. The report identifies schema and username-reservation
findings and approved legacy fields; it does not repair or change records. The
separate migration utility is restricted to the Firestore Emulator and
`demo-*` projects.

The project owner reports that Stage H included a synthetic emulator rehearsal
and that its results were reported in the project conversation. No
corresponding Stage H report or other evidence artifact is available in this
repository, so those results are owner-reported and are not independently
verifiable from repository artifacts. This guide does not reproduce or
independently validate those results; do not treat them as production approval.

## Scope and safeguards

- The only future production operation covered here is the Stage G inventory
  with `--live-read-only`. Never use the migration utility or `--apply` against
  production.
- The approved project ID for this inventory is `open-stay`; live mode rejects
  any other project ID and requires an explicit project ID, mode, and
  `GOOGLE_APPLICATION_CREDENTIALS` configuration. It rejects a configured
  `FIRESTORE_EMULATOR_HOST`, but does not independently verify the configured
  credential principal or its effective IAM permissions.
- The scan is paginated, sequential across collections, and not a single
  point-in-time snapshot. Concurrent application writes can produce transient
  cross-collection mismatches. It can read up to `page-size × max-pages`
  documents per collection; the defaults allow up to four million per
  collection. Confirm expected volume, read cost, and operational impact with
  the data owner before approval.
- A complete inventory requires `status: "complete"` and
  `paginationComplete: true`. Any partial read, error, or page limit makes the
  result incomplete; do not interpret unscanned records as absent.
- Read-only IAM is a backstop, not proof of harmlessness. Confirm the script,
  exact command, target, identity, report destination, and approval before any
  future run.

## Required project ID confirmation

The inventory procedure is restricted to the Firestore `(default)` database.
The current utility calls `getFirestore(app)` and does not support selecting a
different database. If another database is required, stop: database-selection
support must first be implemented, tested, and independently reviewed before
this procedure or its command template is used.

Before any future invocation:

1. The production project owner confirms the exact **project ID** in an
   independent authoritative source (for example, the Cloud Console project
   selector or organization inventory), not from a developer's local
   `.firebaserc`, shell default, or memory.
2. A second authorized reviewer compares that ID with the approved change or
   inventory request. Record the project ID, project number, database ID
   (which must be `(default)`), environment, and confirmation time in the
   approval record.
3. Confirm that the ID is exactly `open-stay`, the approved project for this
   inventory, and is the intended production project. The utility rejects any
   other project ID. Do not infer the production target from a checked-in
   Firebase alias; obtain independent owner confirmation.
4. Stop if the project, database, or identity is ambiguous, if reviewers
   disagree, or if the command target differs from the approved record. Do not
   probe Firebase to resolve uncertainty.

## IAM permissions and credential controls

The inventory uses Firestore server/Admin SDK reads. Firestore documents that
`runQuery` requires `datastore.entities.get` and
`datastore.entities.list`; those are the data permissions used by this
collection scan. Confirm requirements against the current Firestore IAM
documentation and a non-production rehearsal when preparing a future IAM
request:
[Firestore IAM permissions](https://cloud.google.com/firestore/docs/security/iam).

- Prefer a narrowly scoped custom read-only role containing only
  `datastore.entities.get` and `datastore.entities.list`, assigned at the
  narrowest supported resource/database scope. These permissions are not
  inherently limited to the three inventory collections; depending on the IAM
  grant scope, they may allow reading other collections or databases too.
  Review the current Firestore IAM resource hierarchy and any supported
  database-level conditions before assignment. If only a project-level grant
  is available, account for its broader read scope and obtain explicit
  data-owner and security approval. Validate the actual API calls and
  effective scope before granting anything.
- If policy does not permit a custom role, `roles/datastore.viewer` is a
  predefined read-only alternative but grants broader read access (including
  metadata); the data owner and security reviewer must explicitly approve that
  broader scope. Do not use `roles/datastore.user`, `roles/datastore.owner`,
  Editor, Owner, or a deploy/admin service account for inventory.
- Do not add permissions or create/modify IAM principals as part of Stage I.
  The project owner/security team must provision and review any future
  least-privilege access through its normal process. No backup/export
  permissions are needed by the inventory identity.
- The Admin SDK initializes with Application Default Credentials (ADC); it
  does not take a credential argument in this script. Live mode requires
  `GOOGLE_APPLICATION_CREDENTIALS` to be explicitly set, preventing fallback
  to local ADC or workload/metadata credentials. The script does not inspect
  the config file or verify its principal or permissions.
- For a future approved run, use an approved isolated execution environment
  and explicit, short-lived Workload Identity Federation / impersonated
  credential configuration, with the read-only principal verified by the
  owner. Do not use developer-default ADC, a personal user credential, a
  downloaded long-lived service-account key, an inherited VM/workstation
  identity, or credentials from the deployment workflow. Do not print tokens,
  credential contents, or private keys.
- Before execution, verify the credential configuration's principal and
  source through the approved identity/IAM process, verify that it has no
  effective write permissions, and ensure the explicit credential
  configuration is the one the Node process will use. Remove or unset
  unintended inherited credential variables and verify that
  `FIRESTORE_EMULATOR_HOST` is unset. If identity cannot be positively
  verified without making an unapproved production request, stop and ask the
  owner/security team.

## Backup and recovery checklist

The inventory itself does not write Firestore, so an export is not a recovery
mechanism for the inventory. A verified backup and recovery path are mandatory
before any separately proposed production migration or other data-changing
operation. The owner may also require one before inventory as a local policy.

- [ ] Data owner approves a Firestore managed backup or export plan, including
      the exact source project/database and a unique destination.
- [ ] Use a dedicated, approved Cloud Storage bucket/prefix with encryption,
      least-privilege access, audit logging, retention/lifecycle controls, and
      protection against accidental deletion. Confirm region and policy
      requirements with the owner.
- [ ] Schedule and run export only under a separately approved backup
      procedure and identity. The inventory identity must not receive export
      permissions. Do not execute an export as part of Stage I.
- [ ] Verify the completed operation in the approved control plane, including
      source project/database, completion status/time, export metadata/files,
      and that the destination objects are readable by the recovery role.
- [ ] Test recovery in an isolated, approved non-production project/database;
      never test by importing over production. Verify import completion,
      expected collections and representative document counts, application
      invariants, and access/rules behavior with the recovery owner.
- [ ] Record recovery-test evidence, restore owner, RTO/RPO expectations,
      retention expiry, and any limitations. Reconfirm export freshness before
      a migration approval.
- [ ] Keep backup/export and restore permissions separate from inventory
      permissions and approvals.

## Future production inventory checklist

This checklist is a future control, not authorization to proceed now.

### Before requesting approval

- [ ] Review the current Stage G inventory implementation, tests, and this
      guide; rehearse only against the emulator using synthetic data.
- [ ] Confirm the inventory's read volume, expected duration/cost, operational
      impact, target `(default)` database, and a suitable low-write window with
      the application/data owner.
- [ ] Name the operator, independent target reviewer, data owner, security/IAM
      reviewer, and report custodian.
- [ ] Confirm the production project ID and database independently as above.
- [ ] Confirm a dedicated, verified, short-lived read-only identity and
      effective permissions. Confirm no write, deploy, export, or IAM
      administration permissions.
- [ ] Approve the report destination, recipients, encryption/access controls,
      exact retention period, and redaction/handling procedure before running.
- [ ] Capture separate written approval for the inventory gate below.

### Immediately before and during the approved run

- [ ] Use a clean, approved execution environment; review the exact command
      with a second reviewer. Verify the source revision and that no local
      edits alter inventory behavior.
- [ ] Confirm the approved project ID, `(default)` database, credential
      principal, and report path again. Ensure the credential is explicit,
      valid, short-lived, read-only, and not a developer default. Ensure
      `FIRESTORE_EMULATOR_HOST` is unset.
- [ ] Use only the command template below, replacing every placeholder with
      values from the approval record. Do not run until all checks and approval
      signatures are complete.
- [ ] Monitor only approved operational signals. Stop on target/identity
      mismatch, unexpected load, access errors, report destination error, or
      any unexpected behavior; notify the owner. Do not retry blindly.
- [ ] Preserve the command, source revision, operator/reviewer, start/end
      times, exit status, target confirmation, and report checksum in the
      restricted audit record. Never include credential material.

### After the run

- [ ] Confirm exit status is successful and report status is `complete`, with
      `paginationComplete: true` for all three collections. Incomplete results
      are not a clean inventory and require investigation/approval before any
      rerun.
- [ ] Check the project ID, mode (`live-read-only`), timestamp, collection
      page/document counts, and summary. Secure the report before review.
- [ ] Review all findings using the investigation process below. Treat
      username and ownership conflicts as unresolved; inventory does not
      select an owner or authorize a repair.
- [ ] Confirm no data writes occurred using approved audit/monitoring evidence.
      Escalate any unexpected write event immediately.
- [ ] Restrict access to the report, record its custody and approved retention
      expiry, and remove temporary/local copies according to policy.
- [ ] Close the inventory approval record. Do not treat its completion as
      migration approval.

## Production command template

**Template only; not an instruction to execute.** Every angle-bracketed value
must be supplied from a separate approval record. The credential configuration
must be an approved, short-lived WIF/impersonated ADC configuration; it must
not be a developer-default credential or a long-lived key.

```bash
env -u FIRESTORE_EMULATOR_HOST \
  GOOGLE_APPLICATION_CREDENTIALS="<APPROVED_SHORT_LIVED_ADC_CONFIG>" \
  node functions/scripts/migrations/inventory-legacy-profiles.mjs \
  --project-id "open-stay" \
  --live-read-only \
  --page-size 400 \
  --max-pages 10000 \
  --report "<RESTRICTED_REPORT_PATH>"
```

Do not add `--apply` or use the migration script. The template does not
configure access controls on the report path; its parent storage location
must already be approved and restricted. Avoid capturing stdout/stderr in
general-purpose logs. The report contains sensitive operational metadata.

## Report storage, access, retention, and redaction

The inventory report identifies itself as **Sensitive operational metadata**.
It contains project ID, timestamps, scan counts, issue codes, classifications,
legacy field names, and document IDs/paths. Username reservation document IDs
can themselves be usernames. The script omits profile values, email addresses,
phone numbers, private preference values, and credentials. It redacts IDs
containing `@` or at least seven digits; shorter or otherwise encoded
identifiers may still be sensitive, so this is not comprehensive
de-identification.

- Store the report only in the pre-approved encrypted location with access
  limited to named reviewers and the report custodian. Do not put it in the
  source repository, an issue/PR, chat, shared drive, unapproved workstation
  folder, or broad log aggregation.
- Avoid shell transcript capture and CI logs. Standard output contains the
  full JSON report, and the human summary goes to standard error. The report
  file is written with overwrite semantics; use a unique approved path to
  avoid overwriting evidence.
- Do not assume IDs are anonymous. Apply the organization's data
  classification, access logging, and incident reporting requirements.
  Redact IDs before sharing extracts outside the approved review group; retain
  the original only in the restricted evidence store.
- The owner must set a specific retention period and disposal date before the
  run. Delete working copies and derived extracts at expiry, retaining only
  the minimum approved audit evidence. If retention is not decided, do not run.

## Username reservation investigation

The report can indicate `missing_username_reservation`,
`duplicate_username_claim`, `reservation_owner_mismatch`,
`orphan_username_reservation`, `reservation_references_missing_user`, or
`reservation_profile_username_mismatch`. An incomplete scan can also prevent
the tool from establishing that a reservation is missing or orphaned.

1. First establish scan completeness for both relevant collections. If
   incomplete, treat absence-based findings as indeterminate; resolve the scan
   failure through the owner and do not infer that a record does not exist.
2. Have the authorized account/data owner verify the public profile UID and
   normalized username, reservation document ID and stored UID, account
   lifecycle/status, and relevant approved audit history. Use only separately
   approved read access; do not broaden the inventory principal's permissions.
3. Compare the records and timestamps, account for concurrent application
   writes and the scan's sequential timing, and determine whether the report
   reflects a transient state, legacy data, deleted/disabled account, or
   genuine conflict. Do not assume an identity from display name or username.
4. Record evidence and a disposition per finding with the owner. If ownership
   remains ambiguous or two profiles claim a username, preserve the current
   records and escalate to the data/security owner. Do not transfer a
   reservation, delete an orphan, recreate a missing reservation, or change
   account state as part of inventory.
5. If a repeat inventory is proposed to distinguish a transient mismatch,
   obtain approval for that additional read, use the same validated target and
   credential controls, and preserve each report separately. A clean repeat
   does not itself authorize a migration.

## Approval gates

### Gate A — production read-only inventory

Written, recorded approval is required from the production data owner and
security/IAM reviewer, with the operator and independent project-ID reviewer
identified. Approval must name the exact project ID and `(default)` database,
purpose, code revision, read-only principal and permissions, execution window,
expected read volume/cost, report destination/custodian/retention, and
rollback/stop contact. All pre-run checklist items must be complete.

No approval in Stage I, G, or H grants this gate. Stage H results reported by
the project owner are not independently verifiable from repository artifacts
and do not substitute for any Gate A control. If any fact changes, approval
must be reconfirmed. Failure to confirm target, identity, read-only scope, or
report controls means stop.

### Gate B — any production migration (separate decision)

Inventory completion is not migration approval. Any future data-changing
migration requires a new, explicit approval from the data owner and
security/change approvers after a complete report has been reviewed and every
`NEEDS_REVIEW` item has an owner-approved disposition. The approval must
specify the exact fields/documents/actions, tested implementation and
non-production evidence, least-privilege write identity, execution plan,
monitoring, stop/rollback plan, verified backup/export and recovery evidence,
and post-change validation. Unresolved identity/username conflicts block the
migration. No migration, `--apply`, deployment, or IAM change is authorized by
this guide.

## Risk register

| Risk | Control / stop condition |
|---|---|
| Wrong Firebase project or database | Independent project ID and `(default)` database confirmation; second reviewer; stop on mismatch, unsupported database, or ambiguity. |
| Wrong or overly privileged credentials | Explicit, short-lived approved ADC configuration; verify principal/effective permissions; no developer ADC, keys, or deploy identity; stop if unverifiable. |
| Accidental write or unrelated command | Inventory script only, with `--live-read-only`; read-only IAM backstop; no migration script, `--apply`, deployment, or write grants. |
| Incomplete scan mistaken for absence | Require complete status and pagination for all collections; stop review conclusions on errors or page cap. |
| Concurrent updates create false conflict | Scan is sequential, not a consistent snapshot; coordinate a low-write window and validate findings with owner/audit evidence. |
| Read load, latency, or cost | Estimate volume and run window; page limits are bounded but can still read millions of documents; monitor approved signals and stop on impact. |
| Sensitive report disclosure | Restricted encrypted destination, named access, no general logs/repository/sharing, explicit retention and disposal. |
| Incomplete ID redaction | Treat IDs/usernames/paths as sensitive; redaction is heuristic, not anonymization. |
| Incorrect resolution of username conflict | Owner-led investigation; no automatic/manual ownership guess, reservation transfer, deletion, or repair during inventory. |
| Migration without recoverability or approval | Separate Gate B; tested export recovery, complete findings review, explicit scope and rollback approval before any write. |

## Stage I completion statement

Stage I supplies preparation documentation only. **No live Firebase connection,
production Firestore query, `--live-read-only` execution, `--apply`, Firestore
write, export, deployment, or IAM/account-permission change occurred as part of
this documentation work.** This statement does not certify production
readiness or grant either approval gate.
