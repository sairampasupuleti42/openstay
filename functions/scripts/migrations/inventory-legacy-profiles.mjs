import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase-admin/app";
import { FieldPath, Timestamp, getFirestore } from "firebase-admin/firestore";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const DEFAULT_PAGE_SIZE = 400;
const DEFAULT_MAX_PAGES = 10000;
const LEGACY_FIELDS = ["email", "emailVerified"];
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
  ...LEGACY_FIELDS,
]);
const PRIVATE_REQUIRED_FIELDS = ["uid", "updatedAt"];
const PRIVATE_OPTIONAL_FIELDS = ["phoneNumber", "privatePreferences"];
const PRIVATE_FIELDS = new Set([
  ...PRIVATE_REQUIRED_FIELDS,
  ...PRIVATE_OPTIONAL_FIELDS,
  ...LEGACY_FIELDS,
]);
const USERNAME_REQUIRED_FIELDS = ["uid", "createdAt"];
const USERNAME_FIELDS = new Set(USERNAME_REQUIRED_FIELDS);
const COLLECTION_NAMES = ["users", "userPrivate", "usernames"];
const READ_ERROR_CATEGORIES = new Set([
  "aborted",
  "already-exists",
  "cancelled",
  "deadline-exceeded",
  "failed-precondition",
  "internal",
  "invalid-argument",
  "not-found",
  "permission-denied",
  "resource-exhausted",
  "unauthenticated",
  "unavailable",
  "unimplemented",
  "unknown",
]);

export async function runInventory({
  db,
  projectId,
  mode,
  emulatorHost = process.env.FIRESTORE_EMULATOR_HOST,
  pageSize = DEFAULT_PAGE_SIZE,
  maxPages = DEFAULT_MAX_PAGES,
  logger = createLogger(),
}) {
  validateExecutionOptions({
    projectId,
    mode,
    emulatorHost,
    pageSize,
    maxPages,
  });
  if (!db) throw new Error("A Firestore instance is required.");

  const inventoryTimestamp = new Date().toISOString();
  logger.info({ event: "profile_inventory_target", projectId, mode });

  const collections = {};
  for (const name of COLLECTION_NAMES) {
    collections[name] = await readCollection(db, name, pageSize, maxPages);
  }

  const records = buildRecords(collections);
  const inventoryComplete = Object.values(collections).every(
    (collection) => collection.paginationComplete,
  );
  if (!inventoryComplete) {
    for (const record of records)
      record.issues.push(issue("inventory_incomplete"));
  }

  for (const record of records) {
    record.issues = deduplicateIssues(record.issues);
    record.classification =
      record.issues.length > 0
        ? "NEEDS_REVIEW"
        : record.legacyFieldsPresent.length > 0
          ? "SAFE_TO_MIGRATE"
          : "NO_CHANGE";
  }

  const findingsByIssueType = {};
  const classifications = {
    SAFE_TO_MIGRATE: 0,
    NEEDS_REVIEW: 0,
    NO_CHANGE: 0,
  };
  for (const record of records) {
    classifications[record.classification] += 1;
    for (const finding of record.issues) {
      findingsByIssueType[finding.code] =
        (findingsByIssueType[finding.code] ?? 0) + 1;
    }
  }

  const report = {
    schemaVersion: 1,
    reportSensitivity: "Sensitive operational metadata",
    inventoryTimestamp,
    projectId,
    mode,
    pageSize,
    maxPages,
    status: inventoryComplete ? "complete" : "incomplete",
    paginationComplete: inventoryComplete,
    scanned: Object.fromEntries(
      Object.entries(collections).map(([name, result]) => [
        name,
        {
          documents: result.documents.length,
          pages: result.pages,
          pageSize,
          paginationComplete: result.paginationComplete,
        },
      ]),
    ),
    summary: {
      scannedDocuments: records.length,
      classifications,
      findingsByIssueType,
    },
    scanErrors: Object.entries(collections)
      .filter(([, result]) => result.errorCategory)
      .map(([collection, result]) => ({
        collection,
        category: result.errorCategory,
      })),
    records,
  };

  logger.info({
    event: "profile_inventory_scan_complete",
    projectId,
    mode,
    status: report.status,
    scanned: report.scanned,
    classifications,
  });
  return report;
}

export function validateExecutionOptions({
  projectId,
  mode,
  emulatorHost,
  pageSize = DEFAULT_PAGE_SIZE,
  maxPages = DEFAULT_MAX_PAGES,
}) {
  if (typeof projectId !== "string" || !projectId.trim()) {
    throw new Error("Pass an explicit --project-id.");
  }
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(projectId)) {
    throw new Error("The explicit Firebase project ID has an invalid format.");
  }
  if (mode !== "emulator" && mode !== "live-read-only") {
    throw new Error(
      "Choose exactly one explicit mode: --emulator or --live-read-only.",
    );
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new Error("Page size must be an integer between 1 and 1000.");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 10000) {
    throw new Error("Max pages must be an integer between 1 and 10000.");
  }

  if (mode === "emulator") {
    if (!projectId.startsWith("demo-")) {
      throw new Error("Emulator mode is restricted to demo-* project IDs.");
    }
    if (!isLoopbackEmulator(emulatorHost)) {
      throw new Error(
        "Emulator mode requires FIRESTORE_EMULATOR_HOST on a loopback address.",
      );
    }
  } else if (emulatorHost) {
    throw new Error(
      "Live-read-only mode refuses FIRESTORE_EMULATOR_HOST; remove the emulator endpoint to verify the target.",
    );
  }
}

async function readCollection(db, name, pageSize, maxPages) {
  const documents = [];
  let pages = 0;
  let query;
  try {
    query = db.collection(name).orderBy(FieldPath.documentId()).limit(pageSize);
  } catch (error) {
    return {
      documents,
      pages,
      paginationComplete: false,
      errorCategory: errorCategory(error),
    };
  }

  while (pages < maxPages) {
    let page;
    try {
      page = await query.get();
    } catch (error) {
      return {
        documents,
        pages,
        paginationComplete: false,
        errorCategory: errorCategory(error),
      };
    }

    pages += 1;
    for (const snapshot of page.docs) {
      documents.push({ id: snapshot.id, data: snapshot.data() });
    }
    if (page.size < pageSize) {
      return {
        documents,
        pages,
        paginationComplete: true,
        errorCategory: null,
      };
    }
    if (pages === maxPages) break;
    try {
      query = query.startAfter(page.docs[page.docs.length - 1]);
    } catch (error) {
      return {
        documents,
        pages,
        paginationComplete: false,
        errorCategory: errorCategory(error),
      };
    }
  }

  return {
    documents,
    pages,
    paginationComplete: false,
    errorCategory: "max_pages_reached",
  };
}

function buildRecords(collections) {
  const users = collections.users.documents;
  const privateProfiles = collections.userPrivate.documents;
  const reservations = collections.usernames.documents;
  const usersById = new Map(users.map((record) => [record.id, record]));
  const reservationsById = new Map(
    reservations.map((record) => [record.id, record]),
  );
  const usersByUsername = new Map();
  for (const profile of users) {
    const username = profile.data?.username;
    if (typeof username !== "string") continue;
    const profiles = usersByUsername.get(username) ?? [];
    profiles.push(profile);
    usersByUsername.set(username, profiles);
  }

  const records = [];
  for (const profile of users) {
    const issues = validatePublicProfile(profile);
    const username = profile.data?.username;
    if (typeof username === "string") {
      const competingProfiles = usersByUsername.get(username) ?? [];
      if (competingProfiles.length > 1) {
        issues.push(issue("duplicate_username_claim"));
      }

      if (USERNAME_PATTERN.test(username)) {
        const reservation = reservationsById.get(username);
        if (!reservation && collections.usernames.paginationComplete) {
          issues.push(issue("missing_username_reservation"));
        } else if (reservation && reservation.data?.uid !== profile.id) {
          issues.push(issue("reservation_owner_mismatch"));
        }
      }
    }
    records.push(createRecord("users", profile, issues));
  }

  for (const privateProfile of privateProfiles) {
    records.push(
      createRecord(
        "userPrivate",
        privateProfile,
        validatePrivateProfile(privateProfile),
      ),
    );
  }

  for (const reservation of reservations) {
    const reservationProfiles = usersByUsername.get(reservation.id) ?? [];
    const ownerUid = reservation.data?.uid;
    const issues = validateUsernameReservation(reservation);
    if (
      reservationProfiles.length === 0 &&
      collections.users.paginationComplete
    ) {
      issues.push(issue("orphan_username_reservation"));
    }
    if (typeof ownerUid === "string") {
      const ownerProfile = usersById.get(ownerUid);
      if (!ownerProfile && collections.users.paginationComplete) {
        issues.push(issue("reservation_references_missing_user"));
      }
      if (ownerProfile && ownerProfile.data?.username !== reservation.id) {
        issues.push(issue("reservation_profile_username_mismatch"));
      }
    }
    if (
      reservationProfiles.length > 1 ||
      reservationProfiles.some((profile) => profile.id !== ownerUid)
    ) {
      issues.push(issue("duplicate_username_claim"));
    }
    records.push(createRecord("usernames", reservation, issues));
  }

  return records;
}

function validatePublicProfile({ id, data }) {
  const issues = [];
  const fields = isPlainRecord(data) ? data : {};
  addMissingRequiredFields(issues, fields, PUBLIC_REQUIRED_FIELDS);
  addUnexpectedFields(issues, fields, PUBLIC_FIELDS);

  if (
    Object.hasOwn(fields, "uid") &&
    (typeof fields.uid !== "string" || fields.uid !== id)
  ) {
    issues.push(issue("uid_mismatch", ["uid"]));
  }
  if (
    typeof fields.displayName !== "string" ||
    fields.displayName.trim().length === 0 ||
    fields.displayName.length > 100
  ) {
    issues.push(issue("invalid_field", ["displayName"]));
  }
  if (
    typeof fields.username !== "string" ||
    !USERNAME_PATTERN.test(fields.username)
  ) {
    issues.push(issue("invalid_username", ["username"]));
  }
  if (
    typeof fields.username === "string" &&
    fields.username !== fields.username.toLowerCase()
  ) {
    issues.push(issue("username_not_normalized", ["username"]));
  }
  for (const field of ["languages", "interests"]) {
    if (
      !Array.isArray(fields[field]) ||
      fields[field].length > 50 ||
      !fields[field].every((value) => typeof value === "string")
    ) {
      issues.push(issue("invalid_field", [field]));
    }
  }
  if (
    !Array.isArray(fields.roles) ||
    fields.roles.length < 1 ||
    fields.roles.length > 2 ||
    !fields.roles.every((role) => role === "traveller" || role === "host")
  ) {
    issues.push(issue("invalid_field", ["roles"]));
  }
  if (!["active", "suspended", "deleted"].includes(fields.accountStatus)) {
    issues.push(issue("invalid_field", ["accountStatus"]));
  }
  if (
    !["unverified", "pending", "verified"].includes(fields.verificationStatus)
  ) {
    issues.push(issue("invalid_field", ["verificationStatus"]));
  }
  if (!(fields.createdAt instanceof Timestamp)) {
    issues.push(issue("invalid_field", ["createdAt"]));
  }
  if (!(fields.updatedAt instanceof Timestamp)) {
    issues.push(issue("invalid_field", ["updatedAt"]));
  }

  const maximumLengths = {
    photoURL: 2048,
    bio: 500,
    country: 100,
    city: 100,
  };
  for (const field of PUBLIC_OPTIONAL_FIELDS) {
    if (
      fields[field] !== undefined &&
      (typeof fields[field] !== "string" ||
        fields[field].length > maximumLengths[field])
    ) {
      issues.push(issue("invalid_field", [field]));
    }
  }
  return issues;
}

function validatePrivateProfile({ id, data }) {
  const issues = [];
  const fields = isPlainRecord(data) ? data : {};
  addMissingRequiredFields(issues, fields, PRIVATE_REQUIRED_FIELDS);
  addUnexpectedFields(issues, fields, PRIVATE_FIELDS);

  if (
    Object.hasOwn(fields, "uid") &&
    (typeof fields.uid !== "string" || fields.uid !== id)
  ) {
    issues.push(issue("uid_mismatch", ["uid"]));
  }
  if (
    fields.phoneNumber !== undefined &&
    (typeof fields.phoneNumber !== "string" || fields.phoneNumber.length > 32)
  ) {
    issues.push(issue("invalid_field", ["phoneNumber"]));
  }
  if (
    fields.privatePreferences !== undefined &&
    (!isPlainRecord(fields.privatePreferences) ||
      Object.keys(fields.privatePreferences).length > 50)
  ) {
    issues.push(issue("invalid_field", ["privatePreferences"]));
  }
  if (!(fields.updatedAt instanceof Timestamp)) {
    issues.push(issue("invalid_field", ["updatedAt"]));
  }
  return issues;
}

function validateUsernameReservation({ id, data }) {
  const issues = [];
  const fields = isPlainRecord(data) ? data : {};
  addMissingRequiredFields(issues, fields, USERNAME_REQUIRED_FIELDS);
  addUnexpectedFields(issues, fields, USERNAME_FIELDS);

  if (!USERNAME_PATTERN.test(id)) {
    issues.push(issue("invalid_username_reservation_id"));
  }
  if (
    typeof fields.uid !== "string" ||
    fields.uid.length < 1 ||
    fields.uid.length > 128
  ) {
    issues.push(issue("invalid_field", ["uid"]));
  }
  if (!(fields.createdAt instanceof Timestamp)) {
    issues.push(issue("invalid_field", ["createdAt"]));
  }
  return issues;
}

function createRecord(collection, { id, data }, issues) {
  const legacyFieldsPresent = LEGACY_FIELDS.filter(
    (field) =>
      (collection === "users" || collection === "userPrivate") &&
      isPlainRecord(data) &&
      Object.hasOwn(data, field),
  );
  return {
    collection,
    documentId: safeDocumentId(id),
    documentPath: `${collection}/${safeDocumentId(id)}`,
    classification: null,
    issues,
    legacyFieldsPresent,
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

function addMissingRequiredFields(issues, data, requiredFields) {
  const missing = requiredFields.filter((field) => !Object.hasOwn(data, field));
  if (missing.length > 0) {
    issues.push(issue("missing_required_fields", missing));
  }
}

function addUnexpectedFields(issues, data, allowedFields) {
  const unexpectedCount = Object.keys(data).filter(
    (field) => !allowedFields.has(field),
  ).length;
  if (unexpectedCount > 0) {
    issues.push({
      code: "unexpected_fields",
      count: unexpectedCount,
      fields: [],
    });
  }
}

function isPlainRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeDocumentId(id) {
  if (
    typeof id !== "string" ||
    id.includes("@") ||
    /\+?\d[\d ()-]{6,}\d/.test(id)
  ) {
    return "[redacted]";
  }
  return id;
}

function errorCategory(error) {
  if (typeof error?.code === "string") {
    const category = error.code
      .toLowerCase()
      .replace(/^firestore\//, "")
      .replaceAll("_", "-");
    if (READ_ERROR_CATEGORIES.has(category)) return category;
  }
  return "firestore_read_error";
}

function isLoopbackEmulator(host) {
  if (typeof host !== "string" || !host.trim()) return false;
  try {
    const target = new URL(`http://${host}`);
    const hostname = target.hostname.replace(/^\[|\]$/g, "");
    return (
      (hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1") &&
      target.port !== "" &&
      target.pathname === "/" &&
      !target.username &&
      !target.password &&
      !target.search &&
      !target.hash
    );
  } catch {
    return false;
  }
}

function createLogger() {
  return {
    info: (entry) => process.stderr.write(`${JSON.stringify(entry)}\n`),
  };
}

export function parseArguments(argv) {
  const options = {
    pageSize: DEFAULT_PAGE_SIZE,
    maxPages: DEFAULT_MAX_PAGES,
    modes: [],
  };
  const valuedFlags = new Set([
    "--project-id",
    "--page-size",
    "--max-pages",
    "--report",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") {
      options.help = true;
    } else if (argument === "--emulator" || argument === "--live-read-only") {
      options.modes.push(
        argument === "--emulator" ? "emulator" : "live-read-only",
      );
    } else if (valuedFlags.has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      index += 1;
      if (argument === "--project-id") options.projectId = value;
      if (argument === "--page-size") options.pageSize = Number(value);
      if (argument === "--max-pages") options.maxPages = Number(value);
      if (argument === "--report") options.reportPath = path.resolve(value);
    } else if (argument.startsWith("--project-id=")) {
      options.projectId = argument.slice("--project-id=".length);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (options.modes.length > 1) {
    throw new Error("Conflicting execution mode flags are not allowed.");
  }
  if (!options.help && options.modes.length !== 1) {
    throw new Error(
      "Choose exactly one explicit mode: --emulator or --live-read-only.",
    );
  }
  options.mode = options.modes[0];
  return options;
}

function printUsage() {
  return [
    "Usage: node inventory-legacy-profiles.mjs --project-id <id> (--emulator | --live-read-only)",
    "       [--page-size <1-1000>] [--max-pages <1-10000>] [--report <path>]",
    "Live mode is read-only and requires separate explicit user approval.",
  ].join("\n");
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArguments(argv);
    if (options.help) {
      process.stdout.write(`${printUsage()}\n`);
      return;
    }
    if (options.modes.length !== 1) {
      throw new Error(
        "Choose exactly one explicit mode: --emulator or --live-read-only.",
      );
    }
    validateExecutionOptions({
      projectId: options.projectId,
      mode: options.mode,
      emulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
      pageSize: options.pageSize,
      maxPages: options.maxPages,
    });

    const app = initializeApp(
      { projectId: options.projectId },
      `legacy-profile-inventory-${options.projectId}-${process.pid}`,
    );
    const report = await runInventory({
      db: getFirestore(app),
      ...options,
    });
    const json = `${JSON.stringify(report, null, 2)}\n`;
    if (options.reportPath) {
      await writeFile(options.reportPath, json, { flag: "w" });
    }
    process.stderr.write(`${formatHumanSummary(report)}\n`);
    process.stdout.write(json);
    if (report.status !== "complete") process.exitCode = 2;
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        event: "profile_inventory_failed",
        category: errorCategory(error),
      })}\n`,
    );
    process.exitCode = 1;
  }
}

export function formatHumanSummary(report) {
  return [
    "Sensitive operational metadata: legacy profile inventory",
    `Project: ${report.projectId}`,
    `Mode: ${report.mode}`,
    `Inventory timestamp: ${report.inventoryTimestamp}`,
    `Status: ${report.status}`,
    `Pagination complete: ${report.paginationComplete}`,
    `Documents scanned: ${report.summary.scannedDocuments}`,
    `Classifications: ${JSON.stringify(report.summary.classifications)}`,
    `Findings by issue type: ${JSON.stringify(report.summary.findingsByIssueType)}`,
    `Scan errors: ${JSON.stringify(report.scanErrors)}`,
  ].join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  await main();
}
