import { Capacitor } from "@capacitor/core";
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from "@capacitor-community/sqlite";
import { WorkDayEntry, WorkDayRecord } from "@/types/worklog";

const DAYS_STORAGE_KEY = "worklog:v1:days";
const SETTINGS_STORAGE_KEY = "worklog:v1:settings";
const AUTO_SAVE_KEY = "auto_save";

const ENCRYPTION_SECRET_STORAGE_KEY = "worklog:v1:secret";
const ENCRYPTION_PREFIX = "enc";
const ENCRYPTION_VERSION = "v1";
const ENCRYPTION_SALT = "worklog-storage-salt-v1";
const ENCRYPTION_ITERATIONS = 150000;

const DB_NAME = "worklog_db";
const DB_VERSION = 1;

const CREATE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS work_days (
  day_key TEXT PRIMARY KEY,
  morning_in TEXT,
  lunch_out TEXT,
  lunch_in TEXT,
  final_out TEXT,
  pause_no_exit INTEGER NOT NULL DEFAULT 0,
  used_permit INTEGER NOT NULL DEFAULT 0,
  permit_out TEXT,
  permit_in TEXT,
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
type LocalDaysValue = string | WorkDayRecord;
type LocalDaysMap = Record<string, LocalDaysValue>;
type LocalSettingsMap = Record<string, string>;

let sqliteConnection: SQLiteConnection | null = null;
let dbConnection: SQLiteDBConnection | null = null;
let encryptionKeyPromise: Promise<CryptoKey> | null = null;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function isNativePlatform(): boolean {
  return Capacitor.getPlatform() !== "web";
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

function generateRandomSecret(): string {
  const random = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(random);
}

function getStorageSecret(): string {
  const envSecret = import.meta.env.VITE_WORKLOG_STORAGE_SECRET;
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }

  const existing = localStorage.getItem(ENCRYPTION_SECRET_STORAGE_KEY);
  if (existing && existing.length >= 16) {
    return existing;
  }

  const generated = generateRandomSecret();
  localStorage.setItem(ENCRYPTION_SECRET_STORAGE_KEY, generated);
  return generated;
}

async function getEncryptionKey(): Promise<CryptoKey> {
  if (!encryptionKeyPromise) {
    encryptionKeyPromise = (async () => {
      const secret = getStorageSecret();
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        textEncoder.encode(secret),
        "PBKDF2",
        false,
        ["deriveKey"],
      );

      return crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: textEncoder.encode(ENCRYPTION_SALT),
          iterations: ENCRYPTION_ITERATIONS,
          hash: "SHA-256",
        },
        keyMaterial,
        {
          name: "AES-GCM",
          length: 256,
        },
        false,
        ["encrypt", "decrypt"],
      );
    })();
  }

  return encryptionKeyPromise;
}

function isEncryptedPayload(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(`${ENCRYPTION_PREFIX}:${ENCRYPTION_VERSION}:`)
  );
}

async function encryptRecord(record: WorkDayRecord): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = textEncoder.encode(JSON.stringify(record));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );
  const ciphertext = new Uint8Array(ciphertextBuffer);

  return `${ENCRYPTION_PREFIX}:${ENCRYPTION_VERSION}:${bytesToBase64(iv)}:${bytesToBase64(ciphertext)}`;
}

async function decryptRecord(payload: string): Promise<WorkDayRecord> {
  const parts = payload.split(":");
  if (
    parts.length !== 4 ||
    parts[0] !== ENCRYPTION_PREFIX ||
    parts[1] !== ENCRYPTION_VERSION
  ) {
    throw new Error("Encrypted payload format is invalid.");
  }

  const iv = base64ToBytes(parts[2]);
  const ciphertext = base64ToBytes(parts[3]);
  const key = await getEncryptionKey();

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return JSON.parse(textDecoder.decode(plaintextBuffer)) as WorkDayRecord;
}

function normalizeRecord(record: WorkDayRecord): WorkDayRecord {
  return {
    ...record,
    updatedAt: record.updatedAt || new Date().toISOString(),
  };
}

function getLocalDaysMap(): LocalDaysMap {
  const raw = localStorage.getItem(DAYS_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as LocalDaysMap) : {};
}

function setLocalDaysMap(data: LocalDaysMap): void {
  localStorage.setItem(DAYS_STORAGE_KEY, JSON.stringify(data));
}

function getLocalSettingsMap(): LocalSettingsMap {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as LocalSettingsMap) : {};
}

function setLocalSettingsMap(data: LocalSettingsMap): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
}

function mapLegacyRowToRecord(row: DbRow): WorkDayRecord {
  const calculatedRaw = row.calculated_json;

  return {
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
  };
}

async function mapDbRowToEntry(row: DbRow): Promise<WorkDayEntry> {
  const dayKey = String(row.day_key ?? "");
  const encryptedPayload = row.encrypted_payload;

  if (isEncryptedPayload(encryptedPayload)) {
    const record = await decryptRecord(encryptedPayload);
    return {
      dayKey,
      ...normalizeRecord(record),
    };
  }

  return {
    dayKey,
    ...normalizeRecord(mapLegacyRowToRecord(row)),
  };
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
    FROM work_days
    WHERE encrypted_payload IS NULL OR encrypted_payload = '';
    `,
  );

  const rows = (result.values ?? []) as DbRow[];
  for (const row of rows) {
    const dayKey = String(row.day_key ?? "");
    const record = normalizeRecord(mapLegacyRowToRecord(row));
    const encryptedPayload = await encryptRecord(record);

    await db.run(
      `
      UPDATE work_days
      SET
        morning_in = '',
        lunch_out = '',
        lunch_in = '',
        final_out = '',
        pause_no_exit = 0,
        used_permit = 0,
        permit_out = '',
        permit_in = '',
        calculated_json = NULL,
        encrypted_payload = ?,
        updated_at = ?
      WHERE day_key = ?;
      `,
      [encryptedPayload, record.updatedAt, dayKey],
    );
  }
}

async function getNativeDb(): Promise<SQLiteDBConnection | null> {
  if (!isNativePlatform()) {
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

  return dbConnection;
}

async function decodeLocalDaysValue(
  value: LocalDaysValue,
): Promise<WorkDayRecord | null> {
  if (isEncryptedPayload(value)) {
    return normalizeRecord(await decryptRecord(value));
  }

  if (value && typeof value === "object") {
    return normalizeRecord(value as WorkDayRecord);
  }

  return null;
}

export async function saveWorkDay(
  dayKey: string,
  record: WorkDayRecord,
): Promise<void> {
  const normalized = normalizeRecord(record);
  const encryptedPayload = await encryptRecord(normalized);
  const db = await getNativeDb();

  if (db) {
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
      ) VALUES (?, '', '', '', '', 0, 0, '', '', NULL, ?, ?)
      ON CONFLICT(day_key) DO UPDATE SET
        morning_in = '',
        lunch_out = '',
        lunch_in = '',
        final_out = '',
        pause_no_exit = 0,
        used_permit = 0,
        permit_out = '',
        permit_in = '',
        calculated_json = NULL,
        encrypted_payload = excluded.encrypted_payload,
        updated_at = excluded.updated_at;
      `,
      [dayKey, encryptedPayload, normalized.updatedAt],
    );
    return;
  }

  const days = getLocalDaysMap();
  days[dayKey] = encryptedPayload;
  setLocalDaysMap(days);
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

    if (!isEncryptedPayload(row.encrypted_payload)) {
      await saveWorkDay(dayKey, entryToRecord(entry));
    }

    return entryToRecord(entry);
  }

  const days = getLocalDaysMap();
  const rawValue = days[dayKey];

  if (rawValue === undefined) {
    return null;
  }

  const record = await decodeLocalDaysValue(rawValue);
  if (!record) {
    return null;
  }

  if (!isEncryptedPayload(rawValue)) {
    days[dayKey] = await encryptRecord(record);
    setLocalDaysMap(days);
  }

  return record;
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
      if (!isEncryptedPayload(rows[index].encrypted_payload)) {
        await saveWorkDay(entries[index].dayKey, entryToRecord(entries[index]));
      }
    }

    return entries;
  }

  const days = getLocalDaysMap();
  const entries: WorkDayEntry[] = [];
  let mapWasUpdated = false;

  const sorted = Object.entries(days).sort(([dayA], [dayB]) =>
    dayA < dayB ? 1 : -1,
  );

  for (const [dayKey, value] of sorted) {
    const record = await decodeLocalDaysValue(value);
    if (!record) {
      continue;
    }

    entries.push({
      dayKey,
      ...record,
    });

    if (!isEncryptedPayload(value)) {
      days[dayKey] = await encryptRecord(record);
      mapWasUpdated = true;
    }
  }

  if (mapWasUpdated) {
    setLocalDaysMap(days);
  }

  return entries;
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

  const settings = getLocalSettingsMap();
  return settings[AUTO_SAVE_KEY] === "1";
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

  const settings = getLocalSettingsMap();
  settings[AUTO_SAVE_KEY] = serialized;
  setLocalSettingsMap(settings);
}

export async function clearAllWorklogData(): Promise<void> {
  const db = await getNativeDb();

  if (db) {
    await db.execute(`
      DELETE FROM work_days;
      DELETE FROM app_settings;
    `);
    return;
  }

  localStorage.removeItem(DAYS_STORAGE_KEY);
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
  localStorage.removeItem(ENCRYPTION_SECRET_STORAGE_KEY);
}