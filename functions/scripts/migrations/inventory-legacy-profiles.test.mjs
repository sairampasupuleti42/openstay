import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import {
  formatHumanSummary,
  parseArguments,
  runInventory,
  validateExecutionOptions,
} from "./inventory-legacy-profiles.mjs";

const projectId = "demo-openstay";
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const app = initializeApp({ projectId }, "profile-inventory-emulator-tests");
const db = getFirestore(app);
const silentLogger = { info() {} };
const collections = ["users", "userPrivate", "usernames"];

before(async () => {
  if (!emulatorHost) {
    throw new Error("Inventory tests require FIRESTORE_EMULATOR_HOST.");
  }
  const hostname = new URL(`http://${emulatorHost}`).hostname;
  assert.ok(
    ["localhost", "127.0.0.1", "[::1]"].includes(hostname),
    "Inventory tests must use a loopback Firestore Emulator.",
  );
});

after(async () => {
  await deleteApp(app);
});

beforeEach(async () => {
  for (const name of collections) {
    const snapshot = await db.collection(name).get();
    await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
  }
});

function validProfile(uid, username, overrides = {}) {
  const timestamp = Timestamp.now();
  return {
    uid,
    displayName: "Test Traveller",
    username,
    languages: ["en"],
    interests: ["culture"],
    roles: ["traveller"],
    accountStatus: "active",
    verificationStatus: "unverified",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function validPrivateProfile(uid, overrides = {}) {
  return { uid, updatedAt: Timestamp.now(), ...overrides };
}

function reservation(uid, overrides = {}) {
  return { uid, createdAt: Timestamp.now(), ...overrides };
}

async function seed(collection, id, data) {
  await db.collection(collection).doc(id).set(data);
}

async function seedAccount(
  uid,
  username,
  { profile = {}, privateProfile = {} } = {},
) {
  await seed("users", uid, validProfile(uid, username, profile));
  await seed("userPrivate", uid, validPrivateProfile(uid, privateProfile));
  await seed("usernames", username, reservation(uid));
}

function run(options = {}) {
  return runInventory({
    db,
    projectId,
    mode: "emulator",
    emulatorHost,
    logger: silentLogger,
    ...options,
  });
}

function getRecord(report, collection, documentId) {
  return report.records.find(
    (record) =>
      record.collection === collection && record.documentId === documentId,
  );
}

function hasIssue(record, code) {
  return record.issues.some((item) => item.code === code);
}

test("valid public, private, and reservation records need no review", async () => {
  await seedAccount("valid-user", "valid_user");

  const report = await run();

  assert.equal(
    getRecord(report, "users", "valid-user").classification,
    "NO_CHANGE",
  );
  assert.equal(
    getRecord(report, "userPrivate", "valid-user").classification,
    "NO_CHANGE",
  );
  assert.equal(
    getRecord(report, "usernames", "valid_user").classification,
    "NO_CHANGE",
  );
  assert.equal(report.status, "complete");
});

test("legacy public email fields are classified as safe to migrate", async () => {
  await seedAccount("legacy-public", "legacy_public", {
    profile: { email: "private-person@example.test", emailVerified: true },
  });

  const report = await run();
  const record = getRecord(report, "users", "legacy-public");

  assert.equal(record.classification, "SAFE_TO_MIGRATE");
  assert.deepEqual(record.legacyFieldsPresent, ["email", "emailVerified"]);
  assert.equal(hasIssue(record, "unexpected_fields"), false);
});

test("legacy private email fields are classified as safe to migrate", async () => {
  await seedAccount("legacy-private", "legacy_private", {
    privateProfile: {
      email: "private-person@example.test",
      emailVerified: false,
    },
  });

  const report = await run();
  const record = getRecord(report, "userPrivate", "legacy-private");

  assert.equal(record.classification, "SAFE_TO_MIGRATE");
  assert.deepEqual(record.legacyFieldsPresent, ["email", "emailVerified"]);
});

test("missing required public fields require review", async () => {
  await seed("users", "missing-fields", {
    uid: "missing-fields",
    username: "missing_fields",
  });

  const report = await run();
  const record = getRecord(report, "users", "missing-fields");

  assert.equal(record.classification, "NEEDS_REVIEW");
  assert.ok(hasIssue(record, "missing_required_fields"));
});

test("unexpected public and private fields require review", async () => {
  await seedAccount("unexpected-fields", "unexpected_fields", {
    profile: { surprise: "do-not-report-value" },
    privateProfile: { surprisePrivate: "private-preference-secret" },
  });
  await seed(
    "usernames",
    "extra-reservation-field",
    reservation("unmatched-owner", { updatedAt: Timestamp.now() }),
  );

  const report = await run();

  assert.ok(
    hasIssue(
      getRecord(report, "users", "unexpected-fields"),
      "unexpected_fields",
    ),
  );
  assert.ok(
    hasIssue(
      getRecord(report, "userPrivate", "unexpected-fields"),
      "unexpected_fields",
    ),
  );
  assert.ok(
    hasIssue(
      getRecord(report, "usernames", "extra-reservation-field"),
      "unexpected_fields",
    ),
  );
});

test("invalid and non-normalized usernames require review", async () => {
  await seed(
    "users",
    "uppercase-name",
    validProfile("uppercase-name", "Mixed_name"),
  );
  await seed("users", "bad-name", validProfile("bad-name", "bad-name"));

  const report = await run();

  assert.ok(
    hasIssue(getRecord(report, "users", "uppercase-name"), "invalid_username"),
  );
  assert.ok(
    hasIssue(
      getRecord(report, "users", "uppercase-name"),
      "username_not_normalized",
    ),
  );
  assert.ok(
    hasIssue(getRecord(report, "users", "bad-name"), "invalid_username"),
  );
});

test("duplicate username claims are reported across public records", async () => {
  await seed(
    "users",
    "first-owner",
    validProfile("first-owner", "shared_name"),
  );
  await seed(
    "users",
    "second-owner",
    validProfile("second-owner", "shared_name"),
  );

  const report = await run();

  assert.ok(
    hasIssue(
      getRecord(report, "users", "first-owner"),
      "duplicate_username_claim",
    ),
  );
  assert.ok(
    hasIssue(
      getRecord(report, "users", "second-owner"),
      "duplicate_username_claim",
    ),
  );
});

test("missing username reservations require review", async () => {
  await seed(
    "users",
    "no-reservation",
    validProfile("no-reservation", "no_reservation"),
  );

  const report = await run();

  assert.ok(
    hasIssue(
      getRecord(report, "users", "no-reservation"),
      "missing_username_reservation",
    ),
  );
});

test("orphan username reservations require review", async () => {
  await seed("usernames", "orphan_name", reservation("orphan-owner"));

  const report = await run();

  assert.ok(
    hasIssue(
      getRecord(report, "usernames", "orphan_name"),
      "orphan_username_reservation",
    ),
  );
  assert.ok(
    hasIssue(
      getRecord(report, "usernames", "orphan_name"),
      "reservation_references_missing_user",
    ),
  );
});

test("reservation ownership mismatch is reported on the profile and reservation", async () => {
  await seed(
    "users",
    "actual-owner",
    validProfile("actual-owner", "owner_name"),
  );
  await seed("usernames", "owner_name", reservation("different-owner"));

  const report = await run();

  assert.ok(
    hasIssue(
      getRecord(report, "users", "actual-owner"),
      "reservation_owner_mismatch",
    ),
  );
  assert.ok(
    hasIssue(
      getRecord(report, "usernames", "owner_name"),
      "duplicate_username_claim",
    ),
  );
  assert.ok(
    hasIssue(
      getRecord(report, "usernames", "owner_name"),
      "reservation_references_missing_user",
    ),
  );
});

test("reservation document ID must match its owner's profile username", async () => {
  await seed(
    "users",
    "reservation-owner",
    validProfile("reservation-owner", "profile_name"),
  );
  await seed("usernames", "different_name", reservation("reservation-owner"));

  const report = await run();
  const record = getRecord(report, "usernames", "different_name");

  assert.ok(hasIssue(record, "orphan_username_reservation"));
  assert.ok(hasIssue(record, "reservation_profile_username_mismatch"));
});

test("multiple simultaneous findings are retained without exposing values", async () => {
  await seed("users", "multiple-findings", {
    uid: "mismatched-uid",
    username: "INVALID",
    email: "hidden@example.test",
    emailVerified: true,
    unexpected: "private-value",
  });
  await seed("usernames", "BAD-NAME", {
    uid: "missing-owner",
    createdAt: Timestamp.now(),
    email: "reservation@example.test",
  });

  const report = await run();
  const profile = getRecord(report, "users", "multiple-findings");
  const reservationRecord = getRecord(report, "usernames", "BAD-NAME");

  assert.equal(profile.classification, "NEEDS_REVIEW");
  assert.ok(hasIssue(profile, "uid_mismatch"));
  assert.ok(hasIssue(profile, "invalid_username"));
  assert.ok(hasIssue(profile, "unexpected_fields"));
  assert.ok(hasIssue(reservationRecord, "invalid_username_reservation_id"));
  assert.ok(hasIssue(reservationRecord, "unexpected_fields"));
});

test("scans every collection across bounded pagination pages", async () => {
  for (let index = 0; index < 5; index += 1) {
    const uid = `page-user-${index}`;
    const username = `page_user_${index}`;
    await seedAccount(uid, username);
  }

  const report = await run({ pageSize: 2 });

  assert.equal(report.scanned.users.documents, 5);
  assert.equal(report.scanned.users.pages, 3);
  assert.equal(report.scanned.userPrivate.pages, 3);
  assert.equal(report.scanned.usernames.pages, 3);
  assert.equal(report.scanned.users.paginationComplete, true);
  assert.equal(report.pageSize, 2);
});

test("stops at the configured page bound and marks the inventory incomplete", async () => {
  const mockDb = createMockDb({
    users: {
      pages: [
        [
          {
            id: "bounded-one",
            data: validProfile("bounded-one", "bounded_one"),
          },
          {
            id: "bounded-two",
            data: validProfile("bounded-two", "bounded_two"),
          },
        ],
        [
          {
            id: "bounded-three",
            data: validProfile("bounded-three", "bounded_three"),
          },
        ],
      ],
    },
    userPrivate: { pages: [[]] },
    usernames: { pages: [[]] },
  });

  const report = await run({ db: mockDb, pageSize: 2, maxPages: 1 });

  assert.equal(report.status, "incomplete");
  assert.equal(report.scanned.users.documents, 2);
  assert.equal(report.scanned.users.pages, 1);
  assert.deepEqual(report.scanErrors, [
    { collection: "users", category: "max_pages_reached" },
  ]);
});

test("partial page failure marks the scan incomplete without dropping earlier records", async () => {
  const docs = [
    { id: "partial-user", data: validProfile("partial-user", "partial_user") },
  ];
  const mockDb = createMockDb({
    users: {
      pages: [docs],
      failOnPage: 2,
      code: "private-person@example.test",
    },
    userPrivate: { pages: [[]] },
    usernames: { pages: [[]] },
  });

  const report = await run({
    db: mockDb,
    pageSize: 1,
  });

  assert.equal(report.status, "incomplete");
  assert.equal(report.paginationComplete, false);
  assert.equal(report.scanned.users.documents, 1);
  assert.equal(report.scanned.users.paginationComplete, false);
  assert.deepEqual(report.scanErrors, [
    { collection: "users", category: "firestore_read_error" },
  ]);
  assert.equal(
    JSON.stringify(report).includes("private-person@example.test"),
    false,
  );
  assert.equal(
    getRecord(report, "users", "partial-user").classification,
    "NEEDS_REVIEW",
  );
  assert.ok(
    hasIssue(
      getRecord(report, "users", "partial-user"),
      "inventory_incomplete",
    ),
  );
});

test("classifications distinguish safe removal, review, and no change", async () => {
  await seed(
    "users",
    "safe-user",
    validProfile("safe-user", "safe_user", {
      email: "hidden@example.test",
    }),
  );
  await seed("users", "review-user", {
    uid: "review-user",
    username: "review_user",
    email: "hidden@example.test",
  });
  await seed(
    "users",
    "unchanged-user",
    validProfile("unchanged-user", "unchanged_user"),
  );
  await seed("usernames", "safe_user", reservation("safe-user"));
  await seed("usernames", "unchanged_user", reservation("unchanged-user"));

  const report = await run();

  assert.equal(
    getRecord(report, "users", "safe-user").classification,
    "SAFE_TO_MIGRATE",
  );
  assert.equal(
    getRecord(report, "users", "review-user").classification,
    "NEEDS_REVIEW",
  );
  assert.equal(
    getRecord(report, "users", "unchanged-user").classification,
    "NO_CHANGE",
  );
  assert.deepEqual(report.summary.classifications, {
    SAFE_TO_MIGRATE: 1,
    NEEDS_REVIEW: 1,
    NO_CHANGE: 3,
  });
});

test("JSON and human-readable output exclude email, phone, and private preference values", async () => {
  await seedAccount("redaction-user", "redaction_user", {
    profile: { email: "redact-me@example.test", emailVerified: true },
    privateProfile: {
      email: "redact-me@example.test",
      phoneNumber: "+12025550123",
      privatePreferences: { secret: "preference-secret-value" },
    },
  });
  await seed(
    "users",
    "person@example.test",
    validProfile("person@example.test", "person_email"),
  );
  await seed(
    "users",
    "+12025550123",
    validProfile("+12025550123", "person_phone"),
  );
  const report = await run();
  const output = `${JSON.stringify(report)}\n${formatHumanSummary(report)}`;

  for (const value of [
    "redact-me@example.test",
    "+12025550123",
    "preference-secret-value",
  ]) {
    assert.equal(output.includes(value), false);
  }
  assert.equal(report.reportSensitivity, "Sensitive operational metadata");
  assert.equal(report.projectId, projectId);
  assert.equal(report.mode, "emulator");
  assert.ok(report.inventoryTimestamp);
  assert.equal(
    getRecord(report, "users", "[redacted]").documentId,
    "[redacted]",
  );
});

test("execution modes, explicit project IDs, and conflicting flags are validated", () => {
  assert.throws(
    () => parseArguments(["--project-id", projectId]),
    /exactly one explicit mode/,
  );
  assert.throws(
    () =>
      parseArguments([
        "--project-id",
        projectId,
        "--emulator",
        "--live-read-only",
      ]),
    /Conflicting execution mode/,
  );
  assert.throws(
    () => parseArguments(["--project-id", projectId, "--emulator", "--apply"]),
    /Unknown argument: --apply/,
  );
  assert.throws(
    () =>
      validateExecutionOptions({
        projectId: "",
        mode: "emulator",
        emulatorHost,
      }),
    /explicit --project-id/,
  );
  assert.throws(
    () =>
      validateExecutionOptions({
        projectId: "bad project",
        mode: "emulator",
        emulatorHost,
      }),
    /invalid format/,
  );
  assert.throws(
    () =>
      validateExecutionOptions({ projectId, mode: "unknown", emulatorHost }),
    /exactly one explicit mode/,
  );
});

test("emulator mode requires demo project ID and verified loopback endpoint", () => {
  assert.throws(
    () =>
      validateExecutionOptions({
        projectId: "open-stay",
        mode: "emulator",
        emulatorHost,
      }),
    /demo-\*/,
  );
  assert.throws(
    () =>
      validateExecutionOptions({
        projectId,
        mode: "emulator",
        emulatorHost: undefined,
      }),
    /requires FIRESTORE_EMULATOR_HOST/,
  );
  assert.throws(
    () =>
      validateExecutionOptions({
        projectId,
        mode: "emulator",
        emulatorHost: "firestore.example.test:8080",
      }),
    /loopback address/,
  );
  assert.throws(
    () =>
      validateExecutionOptions({
        projectId,
        mode: "emulator",
        emulatorHost: "localhost:8080/path",
      }),
    /loopback address/,
  );
  assert.doesNotThrow(() =>
    validateExecutionOptions({
      projectId: "open-stay",
      mode: "live-read-only",
      emulatorHost: undefined,
    }),
  );
  assert.throws(
    () =>
      validateExecutionOptions({
        projectId: "open-stay",
        mode: "live-read-only",
        emulatorHost: "127.0.0.1:8080",
      }),
    /refuses FIRESTORE_EMULATOR_HOST/,
  );
});

test("inventory calls only read APIs on the injected Firestore client", async () => {
  const calls = { reads: 0, writes: 0 };
  const mockDb = createMockDb({
    users: { pages: [[]] },
    userPrivate: { pages: [[]] },
    usernames: { pages: [[]] },
    calls,
  });
  const guardedDb = new Proxy(mockDb, {
    get(target, property, receiver) {
      if (
        [
          "batch",
          "runTransaction",
          "doc",
          "set",
          "update",
          "delete",
          "create",
        ].includes(property)
      ) {
        calls.writes += 1;
        throw new Error(`Write API accessed: ${String(property)}`);
      }
      if (property === "collection") {
        return (name) => guardReadOnly(target.collection(name), calls);
      }
      return Reflect.get(target, property, receiver);
    },
  });

  await run({ db: guardedDb });

  assert.ok(calls.reads > 0);
  assert.equal(calls.writes, 0);
});

function guardReadOnly(target, calls) {
  const writeApis = new Set([
    "batch",
    "create",
    "delete",
    "doc",
    "runTransaction",
    "set",
    "update",
  ]);
  return new Proxy(target, {
    get(object, property, receiver) {
      if (writeApis.has(property)) {
        calls.writes += 1;
        throw new Error(`Write API accessed: ${String(property)}`);
      }
      const value = Reflect.get(object, property, receiver);
      if (typeof value !== "function") return value;
      return (...args) => {
        const result = value.apply(object, args);
        return result === object ? receiver : result;
      };
    },
  });
}

function createMockDb(collectionData) {
  return {
    collection(name) {
      const config = collectionData[name] ?? { pages: [[]] };
      let pageIndex = 0;
      const query = {
        orderBy() {
          return query;
        },
        limit() {
          return query;
        },
        startAfter() {
          return query;
        },
        async get() {
          if (collectionData.calls) collectionData.calls.reads += 1;
          pageIndex += 1;
          if (config.failOnPage === pageIndex) {
            throw Object.assign(new Error("error details are not reportable"), {
              code: config.code,
            });
          }
          const docs = config.pages[pageIndex - 1] ?? [];
          return {
            docs: docs.map(({ id, data }) => ({
              id,
              data: () => data,
            })),
            size: docs.length,
          };
        },
      };
      return query;
    },
  };
}
