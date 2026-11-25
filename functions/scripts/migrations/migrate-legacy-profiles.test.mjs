import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { runMigration } from "./migrate-legacy-profiles.mjs";

const projectId = "demo-openstay";
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const app = initializeApp({ projectId }, "profile-migration-emulator-tests");
const db = getFirestore(app);
const silentLogger = { info() {}, error() {} };

before(async () => {
  if (!emulatorHost) {
    throw new Error("Migration tests require FIRESTORE_EMULATOR_HOST.");
  }
  const hostname = new URL(`http://${emulatorHost}`).hostname;
  assert.ok(
    ["localhost", "127.0.0.1", "[::1]"].includes(hostname),
    "Migration tests must use a loopback Firestore Emulator.",
  );
});

after(async () => {
  await deleteApp(app);
});

beforeEach(async () => {
  const endpoint = `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`;
  const response = await fetch(endpoint, { method: "DELETE" });
  assert.equal(
    response.ok,
    true,
    "Could not clear Firestore Emulator fixtures.",
  );
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
    accountStatus: "suspended",
    verificationStatus: "pending",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function validPrivateProfile(uid, overrides = {}) {
  return {
    uid,
    privatePreferences: {},
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

function reservation(uid) {
  const timestamp = Timestamp.now();
  return { uid, createdAt: timestamp, updatedAt: timestamp };
}

async function seedUser(
  uid,
  username,
  { profile = {}, privateProfile = {} } = {},
) {
  await db
    .collection("users")
    .doc(uid)
    .set(validProfile(uid, username, profile));
  await db
    .collection("userPrivate")
    .doc(uid)
    .set(validPrivateProfile(uid, privateProfile));
  await db.collection("usernames").doc(username).set(reservation(uid));
}

function run(options = {}) {
  return runMigration({
    db,
    projectId,
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

test("removes legacy email fields and preserves schema and trusted values", async () => {
  await seedUser("trusted-user", "trusted_user", {
    profile: {
      email: "must-not-appear-in-report@example.test",
      emailVerified: true,
    },
    privateProfile: {
      email: "must-not-appear-in-report@example.test",
      emailVerified: false,
      phoneNumber: "+12025550123",
      privatePreferences: { notifications: true },
    },
  });

  const report = await run({ apply: true });
  const publicData = (await db.doc("users/trusted-user").get()).data();
  const privateData = (await db.doc("userPrivate/trusted-user").get()).data();

  assert.equal(publicData.email, undefined);
  assert.equal(publicData.emailVerified, undefined);
  assert.equal(publicData.displayName, "Test Traveller");
  assert.equal(publicData.username, "trusted_user");
  assert.equal(publicData.accountStatus, "suspended");
  assert.equal(publicData.verificationStatus, "pending");
  assert.deepEqual(privateData.phoneNumber, "+12025550123");
  assert.deepEqual(privateData.privatePreferences, { notifications: true });
  assert.equal(privateData.email, undefined);
  assert.equal(privateData.emailVerified, undefined);
  assert.equal(
    getRecord(report, "users", "trusted-user").classification,
    "SAFE_TO_MIGRATE",
  );
  assert.equal(
    getRecord(report, "userPrivate", "trusted-user").classification,
    "SAFE_TO_MIGRATE",
  );
  assert.equal(JSON.stringify(report).includes("@example.test"), false);
});

test("reports missing fields, invalid usernames, and unexpected fields without repairing them", async () => {
  await db.doc("users/malformed-user").set({
    uid: "malformed-user",
    username: "Not Valid!",
    email: "legacy@example.test",
    emailVerified: false,
    unexpected: "preserve",
  });
  await db
    .doc("users/malformed-private-user")
    .set(validProfile("malformed-private-user", "malformed_private_user"));
  await db
    .doc("usernames/malformed_private_user")
    .set(reservation("malformed-private-user"));
  await db.doc("userPrivate/malformed-private-user").set({
    uid: "malformed-private-user",
    phoneNumber: 123,
    privatePreferences: ["not", "a", "map"],
    updatedAt: Timestamp.now(),
    email: "legacy-private@example.test",
    emailVerified: false,
    unexpected: "preserve",
  });

  const report = await run({ apply: true });
  const record = getRecord(report, "users", "malformed-user");
  const privateRecord = getRecord(
    report,
    "userPrivate",
    "malformed-private-user",
  );
  const stored = (await db.doc("users/malformed-user").get()).data();
  const privateStored = (
    await db.doc("userPrivate/malformed-private-user").get()
  ).data();

  assert.equal(record.classification, "NEEDS_REVIEW");
  assert.ok(
    record.issues.some((item) => item.code === "missing_required_fields"),
  );
  assert.ok(record.issues.some((item) => item.code === "invalid_username"));
  assert.ok(record.issues.some((item) => item.code === "unexpected_fields"));
  assert.equal(stored.email, undefined);
  assert.equal(stored.emailVerified, undefined);
  assert.equal(stored.unexpected, "preserve");
  assert.equal(stored.accountStatus, undefined);
  assert.equal(stored.verificationStatus, undefined);
  assert.equal(privateRecord.classification, "NEEDS_REVIEW");
  assert.ok(privateRecord.issues.some((item) => item.code === "invalid_field"));
  assert.ok(
    privateRecord.issues.some((item) => item.code === "unexpected_fields"),
  );
  assert.equal(privateStored.email, undefined);
  assert.equal(privateStored.emailVerified, undefined);
  assert.equal(privateStored.phoneNumber, 123);
  assert.deepEqual(privateStored.privatePreferences, ["not", "a", "map"]);
  assert.equal(privateStored.unexpected, "preserve");
});

test("detects missing, orphaned, mismatched, invalid, and conflicting username reservations", async () => {
  await seedUser("first-owner", "shared_name");
  await seedUser("second-owner", "shared_name");
  await db
    .doc("users/missing-reservation-owner")
    .set(validProfile("missing-reservation-owner", "missing_reservation"));
  await db
    .doc("userPrivate/missing-reservation-owner")
    .set(validPrivateProfile("missing-reservation-owner"));
  await db.doc("usernames/shared_name").set(reservation("missing-user"));
  await db.doc("usernames/orphan_name").set(reservation("first-owner"));
  await db.doc("usernames/invalid-name").set(reservation("missing-user"));

  const report = await run();
  const firstProfile = getRecord(report, "users", "first-owner");
  const missingReservationProfile = getRecord(
    report,
    "users",
    "missing-reservation-owner",
  );
  const sharedReservation = getRecord(report, "usernames", "shared_name");
  const orphanReservation = getRecord(report, "usernames", "orphan_name");
  const invalidReservation = getRecord(report, "usernames", "invalid-name");

  assert.ok(
    firstProfile.issues.some(
      (item) => item.code === "conflicting_username_ownership",
    ),
  );
  assert.ok(
    firstProfile.issues.some(
      (item) => item.code === "reservation_owner_mismatch",
    ),
  );
  assert.ok(
    missingReservationProfile.issues.some(
      (item) => item.code === "missing_username_reservation",
    ),
  );
  assert.ok(
    sharedReservation.issues.some(
      (item) => item.code === "reservation_references_missing_user",
    ),
  );
  assert.ok(
    sharedReservation.issues.some(
      (item) => item.code === "conflicting_username_ownership",
    ),
  );
  assert.ok(
    orphanReservation.issues.some(
      (item) => item.code === "orphan_username_reservation",
    ),
  );
  assert.ok(
    orphanReservation.issues.some(
      (item) => item.code === "reservation_profile_username_mismatch",
    ),
  );
  assert.ok(
    invalidReservation.issues.some(
      (item) => item.code === "invalid_username_format",
    ),
  );
  assert.ok(
    invalidReservation.issues.some(
      (item) => item.code === "reservation_references_missing_user",
    ),
  );
});

test("dry-run reports planned removals but performs no writes", async () => {
  await seedUser("dry-run-user", "dry_run_user", {
    profile: { email: "not-logged@example.test", emailVerified: true },
  });

  const report = await run();
  const stored = (await db.doc("users/dry-run-user").get()).data();

  assert.equal(report.mode, "dry-run");
  assert.equal(report.summary.plannedFieldRemovals, 2);
  assert.equal(report.summary.appliedFieldRemovals, 0);
  assert.equal(stored.email, "not-logged@example.test");
  assert.equal(stored.emailVerified, true);
});

test("repeated apply is idempotent and only removes approved legacy fields", async () => {
  await seedUser("repeat-user", "repeat_user", {
    profile: {
      email: "remove-me@example.test",
      emailVerified: false,
      unexpected: "untouched",
    },
    privateProfile: {
      email: "remove-me@example.test",
      emailVerified: true,
      phoneNumber: "+12025550124",
      privatePreferences: { theme: "dark" },
    },
  });

  const firstReport = await run({ apply: true });
  const secondReport = await run({ apply: true });
  const publicData = (await db.doc("users/repeat-user").get()).data();
  const privateData = (await db.doc("userPrivate/repeat-user").get()).data();

  assert.equal(firstReport.summary.appliedFieldRemovals, 4);
  assert.equal(secondReport.summary.plannedFieldRemovals, 0);
  assert.equal(
    getRecord(secondReport, "users", "repeat-user").classification,
    "NEEDS_REVIEW",
  );
  assert.equal(publicData.unexpected, "untouched");
  assert.equal(publicData.accountStatus, "suspended");
  assert.equal(privateData.phoneNumber, "+12025550124");
  assert.deepEqual(privateData.privatePreferences, { theme: "dark" });
  assert.equal(publicData.email, undefined);
  assert.equal(privateData.emailVerified, undefined);
});

test("paginates collections and commits deletions in bounded batches", async () => {
  for (let index = 0; index < 5; index += 1) {
    const uid = `batch-user-${index}`;
    const username = `batch_user_${index}`;
    await seedUser(uid, username, {
      profile: { email: `private-${index}@example.test` },
    });
  }

  const report = await run({ apply: true, pageSize: 2, batchSize: 2 });

  assert.equal(report.scanned.users.documents, 5);
  assert.equal(report.scanned.users.pages, 3);
  assert.equal(report.scanned.usernames.pages, 3);
  assert.equal(report.summary.plannedFieldRemovals, 5);
  assert.equal(report.summary.appliedFieldRemovals, 5);
  assert.equal(report.summary.batchesAttempted, 3);
  assert.equal(report.summary.batchesSucceeded, 3);
  for (let index = 0; index < 5; index += 1) {
    const data = (await db.doc(`users/batch-user-${index}`).get()).data();
    assert.equal(data.email, undefined);
  }
});

test("reports failed write batches without claiming the removals succeeded", async () => {
  await seedUser("failed-batch-user", "failed_batch_user", {
    profile: { email: "not-written@example.test" },
  });
  const failingDb = {
    collection: (name) => db.collection(name),
    batch: () => ({
      update() {},
      async commit() {
        throw Object.assign(new Error("simulated emulator write failure"), {
          code: "unavailable",
        });
      },
    }),
  };

  const report = await runMigration({
    db: failingDb,
    projectId,
    apply: true,
    emulatorHost,
    logger: silentLogger,
  });

  assert.equal(report.status, "partial_failure");
  assert.equal(report.summary.appliedFieldRemovals, 0);
  assert.equal(report.summary.failedRecords, 1);
  assert.equal(report.failures[0].code, "unavailable");
  assert.equal(report.failures[0].records[0], "users/failed-batch-user");
  assert.equal(
    (await db.doc("users/failed-batch-user").get()).data().email,
    "not-written@example.test",
  );
});

test("apply refuses non-demo projects and non-loopback emulator endpoints", async () => {
  await assert.rejects(
    runMigration({
      db,
      projectId: "open-stay",
      apply: true,
      emulatorHost,
      logger: silentLogger,
    }),
    /restricted to demo-\* Firestore Emulator/,
  );
  await assert.rejects(
    runMigration({
      db,
      projectId: "open-stay",
      emulatorHost: null,
      logger: silentLogger,
    }),
    /restricted to demo-\* Firestore Emulator/,
  );
  await assert.rejects(
    runMigration({
      db,
      projectId,
      apply: true,
      emulatorHost: "firestore.example.test:8080",
      logger: silentLogger,
    }),
    /loopback address/,
  );
  await assert.rejects(
    runMigration({
      db,
      projectId,
      emulatorHost: null,
      logger: silentLogger,
    }),
    /Migration requires FIRESTORE_EMULATOR_HOST on a loopback address/,
  );
});
