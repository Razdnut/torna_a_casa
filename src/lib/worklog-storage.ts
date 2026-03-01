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
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_days_updated_at ON work_days(updated_at);
`;

type LocalDaysMap = Record<string, WorkDayRecord>;
type LocalSettingsMap = Record<string, string>;

let sqliteConnection: SQLiteConnection | null = null;
let dbConnection: SQLiteDBConnection | null = null;

function isNativePlatform(): boolean {
  return Capacitor.getPlatform() !== "web";
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
    await dbConnection.execute(CREATE_SCHEMA_SQL);
  }

  return dbConnection;
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

function mapRowToEntry(row: Record<string, unknown>): WorkDayEntry {
  const calculatedRaw = row.calculated_json;
  return {
    dayKey: String(row.day_key ?? ""),
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

export async function saveWorkDay(
  dayKey: string,
  record: WorkDayRecord,
): Promise<void> {
  const db = await getNativeDb();

  if (db) {
    const calculatedJson = record.calculated
      ? JSON.stringify(record.calculated)
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
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        updated_at = excluded.updated_at;
      `,
      [
        dayKey,
        record.morningIn,
        record.lunchOut,
        record.lunchIn,
        record.finalOut,
        record.pauseNoExit ? 1 : 0,
        record.usedPermit ? 1 : 0,
        record.permitOut,
        record.permitIn,
        calculatedJson,
        record.updatedAt,
      ],
    );
    return;
  }

  const days = getLocalDaysMap();
  days[dayKey] = record;
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
        updated_at
      FROM work_days
      WHERE day_key = ?;
      `,
      [dayKey],
    );

    const row = result.values?.[0];
    if (!row) {
      return null;
    }

    return entryToRecord(mapRowToEntry(row as Record<string, unknown>));
  }

  const days = getLocalDaysMap();
  return days[dayKey] ?? null;
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
        updated_at
      FROM work_days
      ORDER BY day_key DESC;
      `,
    );

    return (result.values ?? []).map((row) =>
      mapRowToEntry(row as Record<string, unknown>),
    );
  }

  const days = getLocalDaysMap();
  return Object.entries(days)
    .sort(([dayA], [dayB]) => (dayA < dayB ? 1 : -1))
    .map(([dayKey, record]) => ({
      dayKey,
      ...record,
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