import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase-admin/app";
import {
  FieldPath,
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const FIREBASE_CONFIG_PATH = path.resolve(
  SCRIPT_DIRECTORY,
  "../../../.firebaserc",
);
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const DEFAULT_PAGE_SIZE = 400;
const MAX_BATCH_SIZE = 450;
const PUBLIC_REQUIRED_FIELDS = [
  "uid",
  "displayName",
  "username",
  "languages",
  "interests",
  "roles",
  "accountStatus",
  "verificationStatus",
  "createdAt",
  "updatedAt",
];
const PUBLIC_OPTIONAL_FIELDS = ["photoURL", "bio", "country", "city"];
const PUBLIC_FIELDS = new Set([
  ...PUBLIC_REQUIRED_FIELDS,
  ...PUBLIC_OPTIONAL_FIELDS,
]);
const PRIVATE_REQUIRED_FIELDS = ["uid", "privatePreferences", "updatedAt"];
const PRIVATE_OPTIONAL_FIELDS = ["phoneNumber"];
const PRIVATE_FIELDS = new Set([
  ...PRIVATE_REQUIRED_FIELDS,
  ...PRIVATE_OPTIONAL_FIELDS,
]);
const USERNAME_REQUIRED_FIELDS = ["uid", "createdAt", "updatedAt"];
const USERNAME_FIELDS = new Set(USERNAME_REQUIRED_FIELDS);
const LEGACY_FIELDS = ["email", "emailVerified"];

export async function runMigration({
  db,
  projectId,
  apply = false,
  pageSize = DEFAULT_PAGE_SIZE,
  batchSize = MAX_BATCH_SIZE,
  emulatorHost = process.env.FIRESTORE_EMULATOR_HOST,
  logger = createLogger(),
}) {
  if (!db) throw new Error("A Firestore instance is required.");
  if (typeof projectId !== "string" || !projectId.trim()) {
    throw new Error("An explicit Firebase project ID is required.");
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new Error("Page size must be an integer between 1 and 1000.");
  }
  if (
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > MAX_BATCH_SIZE
  ) {
    throw new Error(
      `Batch size must be an integer between 1 and ${MAX_BATCH_SIZE}.`,
    );
  }

  await assertSafeTarget({ projectId, emulatorHost });

  const startedAt = new Date().toISOString();
  const collections = {};
  for (const name of ["users", "userPrivate", "usernames"]) {
    collections[name] = await readCollection(db, name, pageSize);
  }

  const usersById = new Map(
    collections.users.documents.map((record) => [record.id, record]),
  );
  const privateById = new Map(
    collections.userPrivate.documents.map((record) => [record.id, record]),
  );
  const reservationsByUsername = new Map(
    collections.usernames.documents.map((record) => [record.id, record]),
  );
  const profilesByUsername = new Map();
  for (const profile of collections.users.documents) {
    const username = profile.data.username;
    if (typeof username !== "string") continue;
    const profiles = profilesByUsername.get(username) ?? [];
    profiles.push(profile);
    profilesByUsername.set(username, profiles);
  }

  const records = [];
  for (const profile of collections.users.documents) {
    const issues = validatePublicProfile(profile);
    if (!privateById.has(profile.id))
      issues.push(issue("missing_private_profile"));

    const username = profile.data.username;
    if (typeof username === "string") {
      const competingProfiles = profilesByUsername.get(username) ?? [];
      if (competingProfiles.length > 1) {
        issues.push(issue("conflicting_username_ownership", ["username"]));
      }

      if (USERNAME_PATTERN.test(username)) {
        const reservation = reservationsByUsername.get(username);
        if (!reservation) {
          issues.push(issue("missing_username_reservation", ["username"]));
        } else if (reservation.data.uid !== profile.id) {
          issues.push(issue("reservation_owner_mismatch", ["username"]));
        }
      }
    }

    records.push(createRecord("users", profile, issues));
  }

  for (const privateProfile of collections.userPrivate.documents) {
    const issues = validatePrivateProfile(privateProfile);
    if (!usersById.has(privateProfile.id))
      issues.push(issue("orphan_private_profile"));
    records.push(createRecord("userPrivate", privateProfile, issues));
  }

  for (const reservation of collections.usernames.documents) {
    const issues = validateUsernameReservation(reservation);
    const profiles = profilesByUsername.get(reservation.id) ?? [];
    const ownerUid = reservation.data.uid;

    if (profiles.length === 0)
      issues.push(issue("orphan_username_reservation"));
    if (typeof ownerUid === "string" && !usersById.has(ownerUid)) {
      issues.push(issue("reservation_references_missing_user", ["uid"]));
    }
    if (
      typeof ownerUid === "string" &&
      usersById.has(ownerUid) &&
      usersById.get(ownerUid).data.username !== reservation.id
    ) {
      issues.push(issue("reservation_profile_username_mismatch", ["uid"]));
    }
    if (
      profiles.length > 1 ||
      profiles.some((profile) => profile.id !== ownerUid)
    ) {
      issues.push(issue("conflicting_username_ownership", ["uid"]));
    }

    records.push(createRecord("usernames", reservation, issues));
  }

  const plan = records.filter((record) => record.fieldsToRemove.length > 0);
  const report = {
    schemaVersion: 1,
    projectId,
    mode: apply ? "apply" : "dry-run",
    status: "completed",
    startedAt,
    completedAt: null,
    scanned: Object.fromEntries(
      Object.entries(collections).map(([name, result]) => [
        name,
        { documents: result.documents.length, pages: result.pages },
      ]),
    ),
    summary: {
      classifications: {
        SAFE_TO_MIGRATE: 0,
        NEEDS_REVIEW: 0,
        NO_CHANGE: 0,
      },
      plannedFieldRemovals: plan.reduce(
        (total, record) => total + record.fieldsToRemove.length,
        0,
      ),
      appliedFieldRemovals: 0,
      batchesAttempted: 0,
      batchesSucceeded: 0,
      failedRecords: 0,
    },
    records: records.map(({ ref, ...record }) => record),
    failures: [],
  };
  for (const record of records) {
    report.summary.classifications[record.classification] += 1;
  }

  logger.info({
    event: "profile_migration_scan_complete",
    projectId,
    mode: report.mode,
    scanned: report.scanned,
    classifications: report.summary.classifications,
  });

  if (apply) {
    for (
      let offset = 0, batchNumber = 1;
      offset < plan.length;
      offset += batchSize, batchNumber += 1
    ) {
      const batchRecords = plan.slice(offset, offset + batchSize);
      const batch = db.batch();
      report.summary.batchesAttempted += 1;
      for (const record of batchRecords) {
        const deletion = Object.fromEntries(
          record.fieldsToRemove.map((field) => [field, FieldValue.delete()]),
        );
        batch.update(record.ref, deletion);
      }

      try {
        await batch.commit();
        report.summary.appliedFieldRemovals += batchRecords.reduce(
          (total, record) => total + record.fieldsToRemove.length,
          0,
        );
        report.summary.batchesSucceeded += 1;
        logger.info({
          event: "profile_migration_batch_applied",
          projectId,
          batch: batchNumber,
          records: batchRecords.length,
        });
      } catch (error) {
        const failure = {
          batch: batchNumber,
          records: batchRecords.map((record) => record.documentPath),
          code: typeof error?.code === "string" ? error.code : "unknown",
          message: safeErrorMessage(error),
        };
        report.failures.push(failure);
        report.summary.failedRecords += batchRecords.length;
        logger.error({
          event: "profile_migration_batch_failed",
          projectId,
          batch: batchNumber,
          records: batchRecords.length,
          code: failure.code,
          message: failure.message,
        });
      }
    }
  }

  if (report.failures.length > 0) report.status = "partial_failure";
  report.completedAt = new Date().toISOString();
  return report;
}

async function readCollection(db, name, pageSize) {
  const documents = [];
  let pages = 0;
  let query = db
    .collection(name)
    .orderBy(FieldPath.documentId())
    .limit(pageSize);

  while (true) {
    const page = await query.get();
    pages += 1;
    for (const snapshot of page.docs) {
      documents.push({
        id: snapshot.id,
        ref: snapshot.ref,
        data: snapshot.data(),
        documentPath: snapshot.ref.path,
      });
    }
    if (page.size < pageSize) break;
    query = query.startAfter(page.docs[page.docs.length - 1]);
  }

  return { documents, pages };
}

function validatePublicProfile({ id, data }) {
  const issues = [];
  addMissingRequiredFields(issues, data, PUBLIC_REQUIRED_FIELDS);
  addUnexpectedFields(issues, data, PUBLIC_FIELDS);

  if (typeof data.uid !== "string" || data.uid !== id) {
    issues.push(issue("invalid_field", ["uid"]));
  }
  if (
    typeof data.displayName !== "string" ||
    data.displayName.trim().length === 0 ||
    data.displayName.length > 100
  ) {
    issues.push(issue("invalid_field", ["displayName"]));
  }
  if (
    typeof data.username !== "string" ||
    !USERNAME_PATTERN.test(data.username)
  ) {
    issues.push(issue("invalid_username", ["username"]));
  }
  for (const field of ["languages", "interests"]) {
    if (
      !Array.isArray(data[field]) ||
      data[field].length > 50 ||
      !data[field].every((value) => typeof value === "string")
    ) {
      issues.push(issue("invalid_field", [field]));
    }
  }
  if (
    !Array.isArray(data.roles) ||
    data.roles.length < 1 ||
    data.roles.length > 2 ||
    !data.roles.every((role) => role === "traveller" || role === "host")
  ) {
    issues.push(issue("invalid_field", ["roles"]));
  }
  if (!["active", "suspended", "deleted"].includes(data.accountStatus)) {
    issues.push(issue("invalid_field", ["accountStatus"]));
  }
  if (
    !["unverified", "pending", "verified"].includes(data.verificationStatus)
  ) {
    issues.push(issue("invalid_field", ["verificationStatus"]));
  }
  if (!(data.createdAt instanceof Timestamp)) {
    issues.push(issue("invalid_field", ["createdAt"]));
  }
  if (!(data.updatedAt instanceof Timestamp)) {
    issues.push(issue("invalid_field", ["updatedAt"]));
  }
  for (const field of PUBLIC_OPTIONAL_FIELDS) {
    if (data[field] === undefined) continue;
    const maxLength = {
      photoURL: 2048,
      bio: 500,
      country: 100,
      city: 100,
    }[field];
    if (typeof data[field] !== "string" || data[field].length > maxLength) {
      issues.push(issue("invalid_field", [field]));
    }
  }

  return issues;
}

function validatePrivateProfile({ id, data }) {
  const issues = [];
  addMissingRequiredFields(issues, data, PRIVATE_REQUIRED_FIELDS);
  addUnexpectedFields(issues, data, PRIVATE_FIELDS);

  if (typeof data.uid !== "string" || data.uid !== id) {
    issues.push(issue("invalid_field", ["uid"]));
  }
  if (
    data.phoneNumber !== undefined &&
    (typeof data.phoneNumber !== "string" || data.phoneNumber.length > 32)
  ) {
    issues.push(issue("invalid_field", ["phoneNumber"]));
  }
  if (
    !isPlainRecord(data.privatePreferences) ||
    Object.keys(data.privatePreferences).length > 50
  ) {
    issues.push(issue("invalid_field", ["privatePreferences"]));
  }
  if (!(data.updatedAt instanceof Timestamp)) {
    issues.push(issue("invalid_field", ["updatedAt"]));
  }
  return issues;
}

function validateUsernameReservation({ id, data }) {
  const issues = [];
  addMissingRequiredFields(issues, data, USERNAME_REQUIRED_FIELDS);
  addUnexpectedFields(issues, data, USERNAME_FIELDS);

  if (!USERNAME_PATTERN.test(id)) {
    issues.push(issue("invalid_username_format", ["documentId"]));
  }
  if (
    typeof data.uid !== "string" ||
    data.uid.length < 1 ||
    data.uid.length > 128
  ) {
    issues.push(issue("invalid_field", ["uid"]));
  }
  if (!(data.createdAt instanceof Timestamp)) {
    issues.push(issue("invalid_field", ["createdAt"]));
  }
  if (!(data.updatedAt instanceof Timestamp)) {
    issues.push(issue("invalid_field", ["updatedAt"]));
  }
  return issues;
}

function createRecord(collection, source, issues) {
  const { id, data, ref, documentPath } = source;
  const removals = LEGACY_FIELDS.filter(
    (field) =>
      (collection === "users" || collection === "userPrivate") &&
      Object.prototype.hasOwnProperty.call(data, field),
  );
  const uniqueIssues = deduplicateIssues(issues);
  const classification =
    uniqueIssues.length > 0
      ? "NEEDS_REVIEW"
      : removals.length > 0
        ? "SAFE_TO_MIGRATE"
        : "NO_CHANGE";

  return {
    collection,
    documentId: id,
    documentPath,
    classification,
    issues: uniqueIssues,
    fieldsToRemove: removals,
    ref,
  };
}

function issue(code, fields = []) {
  return { code, fields: [...fields].sort() };
}

function deduplicateIssues(issues) {
  const unique = new Map();
  for (const item of issues) {
    const key = `${item.code}:${item.fields.join(",")}`;
    unique.set(key, item);
  }
  return [...unique.values()].sort(
    (left, right) =>
      left.code.localeCompare(right.code) ||
      left.fields.join(",").localeCompare(right.fields.join(",")),
  );
}

function addMissingRequiredFields(issues, data, fields) {
  const missing = fields.filter(
    (field) => !Object.prototype.hasOwnProperty.call(data, field),
  );
  if (missing.length > 0)
    issues.push(issue("missing_required_fields", missing));
}

function addUnexpectedFields(issues, data, allowedFields) {
  const unexpected = Object.keys(data)
    .filter(
      (field) => !allowedFields.has(field) && !LEGACY_FIELDS.includes(field),
    )
    .sort();
  if (unexpected.length > 0)
    issues.push(issue("unexpected_fields", unexpected));
}

function isPlainRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

async function assertSafeTarget({ projectId, emulatorHost }) {
  const productionProjects = await readProductionProjectIds();
  if (productionProjects.has(projectId)) {
    throw new Error(
      "Refusing to run against a Firebase project configured as production.",
    );
  }

  if (!projectId.startsWith("demo-")) {
    throw new Error(
      "Migration is restricted to demo-* Firestore Emulator projects.",
    );
  }

  const loopbackEmulator = isLoopbackEmulator(emulatorHost);
  if (emulatorHost && !loopbackEmulator) {
    throw new Error("FIRESTORE_EMULATOR_HOST must use a loopback address.");
  }
  if (!loopbackEmulator) {
    throw new Error(
      "Migration requires FIRESTORE_EMULATOR_HOST on a loopback address.",
    );
  }
}

async function readProductionProjectIds() {
  let config;
  try {
    config = JSON.parse(await readFile(FIREBASE_CONFIG_PATH, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return new Set();
    throw new Error("Unable to read .firebaserc production aliases.");
  }
  const aliases = config.projects ?? {};
  return new Set(
    Object.entries(aliases)
      .filter(([alias]) => /^(prod|production)$/i.test(alias))
      .map(([, projectId]) => projectId)
      .filter((value) => typeof value === "string"),
  );
}

function isLoopbackEmulator(host) {
  if (typeof host !== "string" || !host.trim()) return false;
  try {
    const hostname = new URL(`http://${host}`).hostname.replace(/^\[|\]$/g, "");
    return (
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
    );
  } catch {
    return false;
  }
}

function createLogger() {
  return {
    info: (entry) => process.stderr.write(`${JSON.stringify(entry)}\n`),
    error: (entry) => process.stderr.write(`${JSON.stringify(entry)}\n`),
  };
}

function safeErrorMessage(error) {
  if (typeof error?.message !== "string")
    return "Firestore batch write failed.";
  return error.message.slice(0, 300);
}

function parseArguments(argv) {
  const options = {
    apply: false,
    pageSize: DEFAULT_PAGE_SIZE,
    batchSize: MAX_BATCH_SIZE,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") {
      options.help = true;
    } else if (argument === "--apply") {
      options.apply = true;
    } else if (
      ["--project-id", "--page-size", "--batch-size", "--report"].includes(
        argument,
      )
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      index += 1;
      if (argument === "--project-id") options.projectId = value;
      if (argument === "--report") options.reportPath = path.resolve(value);
      if (argument === "--page-size") options.pageSize = Number(value);
      if (argument === "--batch-size") options.batchSize = Number(value);
    } else if (argument.startsWith("--project-id=")) {
      options.projectId = argument.slice("--project-id=".length);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArguments(argv);
    if (options.help) {
      process.stdout.write(
        "Usage: node migrate-legacy-profiles.mjs --project-id <id> [--apply] [--page-size <n>] [--batch-size <n>] [--report <path>]\n",
      );
      return;
    }
    if (!options.projectId) {
      throw new Error(
        "Pass --project-id explicitly; no Firebase project is selected by default.",
      );
    }

    const app = initializeApp({ projectId: options.projectId });
    const report = await runMigration({
      db: getFirestore(app),
      ...options,
    });
    const json = `${JSON.stringify(report, null, 2)}\n`;
    if (options.reportPath)
      await writeFile(options.reportPath, json, { flag: "w" });
    process.stdout.write(json);
    if (report.status !== "completed") process.exitCode = 2;
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        event: "profile_migration_failed",
        code: typeof error?.code === "string" ? error.code : "migration_error",
        message: safeErrorMessage(error),
      })}\n`,
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
