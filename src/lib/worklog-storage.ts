import { Capacitor } from "@capacitor/core";
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from "@capacitor-community/sqlite";
import { WorkDayEntry, WorkDayRecord } from "@/types/worklog";

const LEGACY_DAYS_STORAGE_KEY = "worklog:v1:days";
const LEGACY_SETTINGS_STORAGE_KEY = "worklog:v1:settings";
const LEGACY_ENCRYPTION_SECRET_STORAGE_KEY = "worklog:v1:secret";

const LEGACY_ENCRYPTION_PREFIX = "enc";
const LEGACY_ENCRYPTION_VERSION = "v1";
const LEGACY_ENCRYPTION_SALT = "worklog-storage-salt-v1";
const LEGACY_ENCRYPTION_ITERATIONS = 150000;

const AUTO_SAVE_KEY = "auto_save";

const DB_NAME = "worklog_db";
const DB_VERSION = 1;

const CREATE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS work_days (
  day_key TEXT PRIMARY KEY,
  morning_in TEXT NOT NULL DEFAULT '',
  lunch_out TEXT NOT NULL DEFAULT '',
  lunch_in TEXT NOT NULL DEFAULT '',
  final_out TEXT NOT NULL DEFAULT '',
  pause_no_exit INTEGER NOT NULL DEFAULT 0,
  used_permit INTEGER NOT NULL DEFAULT 0,
  permit_out TEXT NOT NULL DEFAULT '',
  permit_in TEXT NOT NULL DEFAULT '',
  calculated_json TEXT,
  encrypted_payload TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_days_updated_at ON work_days(updated_at);
`;

type DbRow = Record<string, unknown>;

let sqliteConnection: SQLiteConnection | null = null;
let dbConnection: SQLiteDBConnection | null = null;

const webDaysStore = new Map<string, WorkDayRecord>();
const webSettingsStore = new Map<string, string>();

let legacyWebStorageCleared = false;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function isNativePlatform(): boolean {
  return Capacitor.getPlatform() !== "web";
}

function clearLegacyWebStorage(): void {
  if (legacyWebStorageCleared) {
    return;
  }

  localStorage.removeItem(LEGACY_DAYS_STORAGE_KEY);
  localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
  localStorage.removeItem(LEGACY_ENCRYPTION_SECRET_STORAGE_KEY);

  legacyWebStorageCleared = true;
}

function normalizeRecord(record: WorkDayRecord): WorkDayRecord {
  return {
    ...record,
    updatedAt: record.updatedAt || new Date().toISOString(),
  };
}

function mapPlainRowToRecord(row: DbRow): WorkDayRecord {
  const calculatedRaw = row.calculated_json;

  return normalizeRecord({
    morningIn: String(row.morning_in ?? ""),
    lunchOut: String(row.lunch_out ?? ""),
    lunchIn: String(row.lunch_in ?? ""),
    finalOut: String(row.final_out ?? ""),
    pauseNoExit: Number(row.pause_no_exit ?? 0) === 1,
    usedPermit: Number(row.used_permit ?? 0) === 1,
    permitOut: String(row.permit_out ?? ""),
    permitIn: String(row.permit_in ?? ""),
    calculated:
      typeof calculatedRaw === "string" && calculatedRaw.length > 0
        ? (JSON.parse(calculatedRaw) as WorkDayRecord["calculated"])
        : null,
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  });
}

function entryToRecord(entry: WorkDayEntry): WorkDayRecord {
  return {
    morningIn: entry.morningIn,
    lunchOut: entry.lunchOut,
    lunchIn: entry.lunchIn,
    finalOut: entry.finalOut,
    pauseNoExit: entry.pauseNoExit,
    usedPermit: entry.usedPermit,
    permitOut: entry.permitOut,
    permitIn: entry.permitIn,
    calculated: entry.calculated,
    updatedAt: entry.updatedAt,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function isLegacyEncryptedPayload(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(`${LEGACY_ENCRYPTION_PREFIX}:${LEGACY_ENCRYPTION_VERSION}:`)
  );
}

async function decryptLegacyPayload(payload: string): Promise<WorkDayRecord | null> {
  if (!isLegacyEncryptedPayload(payload)) {
    return null;
  }

  const secret = localStorage.getItem(LEGACY_ENCRYPTION_SECRET_STORAGE_KEY);
  if (!secret) {
    return null;
  }

  const parts = payload.split(":");
  if (
    parts.length !== 4 ||
    parts[0] !== LEGACY_ENCRYPTION_PREFIX ||
    parts[1] !== LEGACY_ENCRYPTION_VERSION
  ) {
    return null;
  }

  const iv = base64ToBytes(parts[2]);
  const ciphertext = base64ToBytes(parts[3]);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: textEncoder.encode(LEGACY_ENCRYPTION_SALT),
      iterations: LEGACY_ENCRYPTION_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"],
  );

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  const parsed = JSON.parse(textDecoder.decode(plaintextBuffer)) as WorkDayRecord;
  return normalizeRecord(parsed);
}

async function mapDbRowToEntry(row: DbRow): Promise<WorkDayEntry> {
  const dayKey = String(row.day_key ?? "");
  const encryptedPayload = row.encrypted_payload;

  if (isLegacyEncryptedPayload(encryptedPayload)) {
    const legacyRecord = await decryptLegacyPayload(encryptedPayload);
    if (legacyRecord) {
      return {
        dayKey,
        ...legacyRecord,
      };
    }
  }

  return {
    dayKey,
    ...mapPlainRowToRecord(row),
  };
}

async function ensureNativeSchema(db: SQLiteDBConnection): Promise<void> {
  await db.execute(CREATE_SCHEMA_SQL);

  const tableInfo = await db.query("PRAGMA table_info(work_days);");
  const hasEncryptedPayloadColumn = (tableInfo.values ?? []).some(
    (row) => String((row as DbRow).name ?? "") === "encrypted_payload",
  );

  if (!hasEncryptedPayloadColumn) {
    await db.execute("ALTER TABLE work_days ADD COLUMN encrypted_payload TEXT;");
  }
}

async function upsertPlainWorkDay(
  db: SQLiteDBConnection,
  dayKey: string,
  record: WorkDayRecord,
): Promise<void> {
  const normalized = normalizeRecord(record);
  const calculatedJson = normalized.calculated
    ? JSON.stringify(normalized.calculated)
    : null;

  await db.run(
    `
    INSERT INTO work_days (
      day_key,
      morning_in,
      lunch_out,
      lunch_in,
      final_out,
      pause_no_exit,
      used_permit,
      permit_out,
      permit_in,
      calculated_json,
      encrypted_payload,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    ON CONFLICT(day_key) DO UPDATE SET
      morning_in = excluded.morning_in,
      lunch_out = excluded.lunch_out,
      lunch_in = excluded.lunch_in,
      final_out = excluded.final_out,
      pause_no_exit = excluded.pause_no_exit,
      used_permit = excluded.used_permit,
      permit_out = excluded.permit_out,
      permit_in = excluded.permit_in,
      calculated_json = excluded.calculated_json,
      encrypted_payload = NULL,
      updated_at = excluded.updated_at;
    `,
    [
      dayKey,
      normalized.morningIn,
      normalized.lunchOut,
      normalized.lunchIn,
      normalized.finalOut,
      normalized.pauseNoExit ? 1 : 0,
      normalized.usedPermit ? 1 : 0,
      normalized.permitOut,
      normalized.permitIn,
      calculatedJson,
      normalized.updatedAt,
    ],
  );
}

async function migrateLegacyNativeRows(db: SQLiteDBConnection): Promise<void> {
  const result = await db.query(
    `
    SELECT
      day_key,
      morning_in,
      lunch_out,
      lunch_in,
      final_out,
      pause_no_exit,
      used_permit,
      permit_out,
      permit_in,
      calculated_json,
      encrypted_payload,
      updated_at
    FROM work_days;
    `,
  );

  const rows = (result.values ?? []) as DbRow[];

  for (const row of rows) {
    const dayKey = String(row.day_key ?? "");
    if (!dayKey) {
      continue;
    }

    let record: WorkDayRecord | null = mapPlainRowToRecord(row);

    if (isLegacyEncryptedPayload(row.encrypted_payload)) {
      const legacyRecord = await decryptLegacyPayload(row.encrypted_payload);
      if (!legacyRecord) {
        continue;
      }
      record = legacyRecord;
    }

    if (!record) {
      continue;
    }

    await upsertPlainWorkDay(db, dayKey, record);
  }

  clearLegacyWebStorage();
}

async function getNativeDb(): Promise<SQLiteDBConnection | null> {
  if (!isNativePlatform()) {
    clearLegacyWebStorage();
    return null;
  }

  if (!sqliteConnection) {
    sqliteConnection = new SQLiteConnection(CapacitorSQLite);
  }

  if (!dbConnection) {
    const consistency = await sqliteConnection.checkConnectionsConsistency();
    const hasConnection = await sqliteConnection.isConnection(DB_NAME, false);

    if (consistency.result && hasConnection.result) {
      dbConnection = await sqliteConnection.retrieveConnection(DB_NAME, false);
    } else {
      dbConnection = await sqliteConnection.createConnection(
        DB_NAME,
        false,
        "no-encryption",
        DB_VERSION,
        false,
      );
    }

    await dbConnection.open();
    await ensureNativeSchema(dbConnection);
    await migrateLegacyNativeRows(dbConnection);
  }

  clearLegacyWebStorage();
  return dbConnection;
}

export async function saveWorkDay(
  dayKey: string,
  record: WorkDayRecord,
): Promise<void> {
  const normalized = normalizeRecord(record);
  const db = await getNativeDb();

  if (db) {
    await upsertPlainWorkDay(db, dayKey, normalized);
    return;
  }

  clearLegacyWebStorage();
  webDaysStore.set(dayKey, normalized);
}

export async function loadWorkDay(dayKey: string): Promise<WorkDayRecord | null> {
  const db = await getNativeDb();

  if (db) {
    const result = await db.query(
      `
      SELECT
        day_key,
        morning_in,
        lunch_out,
        lunch_in,
        final_out,
        pause_no_exit,
        used_permit,
        permit_out,
        permit_in,
        calculated_json,
        encrypted_payload,
        updated_at
      FROM work_days
      WHERE day_key = ?;
      `,
      [dayKey],
    );

    const row = (result.values?.[0] ?? null) as DbRow | null;
    if (!row) {
      return null;
    }

    const entry = await mapDbRowToEntry(row);

    if (isLegacyEncryptedPayload(row.encrypted_payload)) {
      await upsertPlainWorkDay(db, dayKey, entryToRecord(entry));
    }

    return entryToRecord(entry);
  }

  clearLegacyWebStorage();
  return webDaysStore.get(dayKey) ?? null;
}

export async function listWorkDays(): Promise<WorkDayEntry[]> {
  const db = await getNativeDb();

  if (db) {
    const result = await db.query(
      `
      SELECT
        day_key,
        morning_in,
        lunch_out,
        lunch_in,
        final_out,
        pause_no_exit,
        used_permit,
        permit_out,
        permit_in,
        calculated_json,
        encrypted_payload,
        updated_at
      FROM work_days
      ORDER BY day_key DESC;
      `,
    );

    const rows = (result.values ?? []) as DbRow[];
    const entries = await Promise.all(rows.map((row) => mapDbRowToEntry(row)));

    for (let index = 0; index < rows.length; index += 1) {
      if (isLegacyEncryptedPayload(rows[index].encrypted_payload)) {
        await upsertPlainWorkDay(
          db,
          entries[index].dayKey,
          entryToRecord(entries[index]),
        );
      }
    }

    return entries;
  }

  clearLegacyWebStorage();

  return Array.from(webDaysStore.entries())
    .sort(([dayA], [dayB]) => (dayA < dayB ? 1 : -1))
    .map(([dayKey, record]) => ({
      dayKey,
      ...normalizeRecord(record),
    }));
}

export async function listSavedDayKeys(): Promise<string[]> {
  const days = await listWorkDays();
  return days.map((day) => day.dayKey);
}

export async function getAutoSaveEnabled(): Promise<boolean> {
  const db = await getNativeDb();

  if (db) {
    const result = await db.query(
      `
      SELECT value
      FROM app_settings
      WHERE key = ?;
      `,
      [AUTO_SAVE_KEY],
    );

    const value = result.values?.[0]?.value;
    return value === "1";
  }

  clearLegacyWebStorage();
  return webSettingsStore.get(AUTO_SAVE_KEY) === "1";
}

export async function setAutoSaveEnabled(value: boolean): Promise<void> {
  const db = await getNativeDb();
  const serialized = value ? "1" : "0";

  if (db) {
    await db.run(
      `
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;
      `,
      [AUTO_SAVE_KEY, serialized],
    );
    return;
  }

  clearLegacyWebStorage();
  webSettingsStore.set(AUTO_SAVE_KEY, serialized);
}

export async function clearAllWorklogData(): Promise<void> {
  const db = await getNativeDb();

  if (db) {
    await db.execute(`
      DELETE FROM work_days;
      DELETE FROM app_settings;
    `);
  }

  webDaysStore.clear();
  webSettingsStore.clear();
  clearLegacyWebStorage();
}