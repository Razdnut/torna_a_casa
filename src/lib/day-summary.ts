import type { WorkDayRecord, WorkDayCalculated } from "../types/worklog.ts";

export const TARGET = 432;
export const MIN_BREAK = 30;
export const OVERTIME_MIN = 60;
export const OVERTIME_MAX_PLANNED = 360;
export function plannedOvertime(
  record: Pick<WorkDayRecord, "overtimeEnabled" | "overtimePlannedMinutes">,
): number {
  return record.overtimeEnabled
    ? record.overtimePlannedMinutes || OVERTIME_MIN
    : 0;
}
export function minutes(value: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
export function clockTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export function emptyDay(): WorkDayRecord {
  return {
    morningIn: "",
    lunchOut: "",
    lunchIn: "",
    finalOut: "",
    pauseNoExit: false,
    usedPermit: false,
    permitOut: "",
    permitIn: "",
    overtimeEnabled: false,
    overtimePlannedMinutes: 0,
    calculated: null,
    updatedAt: new Date().toISOString(),
  };
}

/** Validates the existing 07:30–19:00 / lunch 12:00–15:00 schedule. */
export function dayIssues(
  record: WorkDayRecord,
  requireComplete = true,
): string[] {
  const issues: string[] = [];
  const start = minutes(record.morningIn),
    end = minutes(record.finalOut);
  const out = minutes(record.lunchOut),
    back = minutes(record.lunchIn);
  const permitOut = minutes(record.permitOut),
    permitIn = minutes(record.permitIn);
  for (const [label, value] of [
    ["Ingresso", record.morningIn],
    ["Uscita", record.finalOut],
    ...(!record.pauseNoExit
      ? [
          ["Inizio pausa", record.lunchOut],
          ["Fine pausa", record.lunchIn],
        ]
      : []),
    ...(record.usedPermit
      ? [
          ["Inizio permesso", record.permitOut],
          ["Fine permesso", record.permitIn],
        ]
      : []),
  ]) {
    if (value && minutes(value) === null)
      issues.push(`${label}: orario non valido`);
  }
  if (
    start === null &&
    (requireComplete || record.finalOut || record.lunchOut || record.permitOut)
  )
    issues.push("Ingresso mancante");
  if (requireComplete && end === null) issues.push("Uscita finale mancante");
  if (start !== null && (start < 450 || start > 1140))
    issues.push("Ingresso fuori fascia 07:30–19:00");
  const exitLimit = record.overtimeEnabled ? 1439 : 1140;
  if (end !== null && (end > exitLimit || (start !== null && end <= start)))
    issues.push(
      record.overtimeEnabled
        ? "Uscita non successiva all’ingresso o oltre le 23:59"
        : "Uscita non successiva all’ingresso o oltre le 19:00",
    );
  if (!record.pauseNoExit) {
    if (requireComplete && (out === null || back === null))
      issues.push("Pausa pranzo incompleta");
    if (back !== null && out === null) issues.push("Inizio pausa mancante");
    if (
      out !== null &&
      (out < 720 || out >= 900 || (start !== null && out <= start))
    )
      issues.push("Inizio pausa fuori sequenza o fascia 12:00–15:00");
    if (back !== null && (back > 900 || (out !== null && back <= out)))
      issues.push("Rientro pausa fuori sequenza o oltre le 15:00");
    if (end !== null && back !== null && end <= back)
      issues.push("Uscita finale precedente al rientro pausa");
  }
  if (record.usedPermit) {
    if (
      (requireComplete || end !== null) &&
      (permitOut === null || permitIn === null)
    )
      issues.push("Permesso incompleto");
    if (permitIn !== null && permitOut === null)
      issues.push("Inizio permesso mancante");
    if (
      permitOut !== null &&
      (permitOut < 450 ||
        permitOut > 1140 ||
        (start !== null && permitOut < start))
    )
      issues.push("Inizio permesso fuori giornata");
    if (
      permitIn !== null &&
      (permitIn > 1140 ||
        (permitOut !== null && permitIn <= permitOut) ||
        (end !== null && permitIn > end))
    )
      issues.push("Rientro permesso fuori sequenza o giornata");
    if (
      !record.pauseNoExit &&
      out !== null &&
      back !== null &&
      permitOut !== null &&
      permitIn !== null &&
      permitOut < back &&
      permitIn > out
    )
      issues.push("Permesso sovrapposto alla pausa pranzo");
  }
  if (record.overtimeEnabled) {
    const planned = record.overtimePlannedMinutes;
    if (
      planned &&
      (!Number.isInteger(planned) ||
        planned < OVERTIME_MIN ||
        planned > OVERTIME_MAX_PLANNED)
    )
      issues.push("Straordinario previsto: da 1h00 a 6h00");
  }
  return [...new Set(issues)];
}

export function summarizeDay(record: WorkDayRecord) {
  if (dayIssues(record).length) return null;
  const pause = record.pauseNoExit
    ? MIN_BREAK
    : Math.max(MIN_BREAK, minutes(record.lunchIn)! - minutes(record.lunchOut)!);
  const permit = record.usedPermit
    ? minutes(record.permitIn)! - minutes(record.permitOut)!
    : 0;
  const worked = Math.max(
    0,
    minutes(record.finalOut)! - minutes(record.morningIn)! - pause - permit,
  );
  const extra = worked - TARGET;
  const overtime = record.overtimeEnabled && extra >= OVERTIME_MIN ? extra : 0;
  return {
    worked,
    pause,
    permit,
    overtime,
    credit: overtime > 0 ? 0 : Math.max(0, extra),
    debt: Math.max(0, TARGET - worked),
    balance: worked - TARGET - overtime,
  };
}

export const OVERTIME_WARNING =
  "Non stai facendo il minimo di 1 ora per lo straordinario. Queste ore finiscono nel saldo, non nello straordinario.";

export function overtimeWarning(record: WorkDayRecord): string | null {
  if (!record.overtimeEnabled || !record.finalOut) return null;
  const result = summarizeDay(record);
  if (!result) return null;
  return result.worked - TARGET < OVERTIME_MIN ? OVERTIME_WARNING : null;
}

export function calculateRecord(
  record: WorkDayRecord,
): WorkDayCalculated | null {
  const result = summarizeDay(record);
  if (!result) return null;
  return {
    total: result.worked,
    totalRaw: minutes(record.finalOut)! - minutes(record.morningIn)!,
    totalWithPermit: result.worked + result.permit,
    permitDuration: result.permit,
    credit: result.credit,
    debt: result.debt,
    overtime: result.overtime,
    totalWithPermitIfReached: result.worked + result.permit,
    reachedWorkTime: result.worked >= TARGET,
  };
}

export function todayState(record: WorkDayRecord, nowMinutes: number) {
  const start = minutes(record.morningIn),
    out = minutes(record.lunchOut),
    back = minutes(record.lunchIn);
  const pOut = minutes(record.permitOut),
    pIn = minutes(record.permitIn);
  const inPermit = record.usedPermit && pOut !== null && pIn === null;
  const inPause = !record.pauseNoExit && out !== null && back === null;
  const done = !!record.finalOut;
  const status = done
    ? "Giornata conclusa"
    : start === null
      ? "Da iniziare"
      : inPermit
        ? "In permesso"
        : inPause
          ? "In pausa"
          : "Al lavoro";
  const action:
    "morningIn" | "permitIn" | "lunchIn" | "lunchOut" | "finalOut" | null = done
    ? null
    : start === null
      ? "morningIn"
      : inPermit
        ? "permitIn"
        : inPause
          ? "lunchIn"
          : !record.pauseNoExit && out === null
            ? "lunchOut"
            : "finalOut";
  const pause =
    record.pauseNoExit || out === null
      ? MIN_BREAK
      : Math.max(MIN_BREAK, (back ?? nowMinutes) - out);
  const permit =
    record.usedPermit && pOut !== null
      ? Math.max(0, (pIn ?? nowMinutes) - pOut)
      : 0;
  const exit = start === null ? null : start + TARGET + pause + permit + plannedOvertime(record);
  const end = minutes(record.finalOut) ?? nowMinutes;
  const actualPause = record.pauseNoExit
    ? MIN_BREAK
    : out === null
      ? 0
      : Math.max(
          back === null ? 0 : MIN_BREAK,
          Math.min(end, back ?? end) - out,
        );
  const elapsedPermit =
    record.usedPermit && pOut !== null
      ? Math.max(0, Math.min(end, pIn ?? end) - pOut)
      : 0;
  const worked =
    start === null ? 0 : Math.max(0, end - start - actualPause - elapsedPermit);
  return { status, action, exit, worked, done, inPause, inPermit };
}
