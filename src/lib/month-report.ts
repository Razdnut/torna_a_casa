import type { WorkDayEntry } from "../types/worklog.ts";
import type { LeaveEntry } from "../types/leave.ts";
import { dayIssues, summarizeDay } from "./day-summary.ts";
import { getCategoryLabel } from "./leave.ts";

export function buildMonthReport(
  month: string,
  days: WorkDayEntry[],
  leaves: LeaveEntry[],
) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new Error("Seleziona un mese valido");
  const byDay = new Map(
    days
      .filter((day) => day.dayKey.startsWith(`${month}-`))
      .map((day) => [day.dayKey, day]),
  );
  const dates = new Set(byDay.keys());
  const leaveByDay = new Map<string, LeaveEntry[]>();
  const last = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0),
  ).getUTCDate();
  for (let number = 1; number <= last; number++) {
    const key = `${month}-${String(number).padStart(2, "0")}`;
    const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
    const matches = leaves.filter(
      (leave) => leave.startDay <= key && leave.endDay >= key,
    );
    if (matches.length && weekday !== 0 && weekday !== 6) {
      dates.add(key);
      leaveByDay.set(key, matches);
    }
  }
  const rows = [...dates].sort().map((dayKey) => {
    const record = byDay.get(dayKey);
    const absences = leaveByDay.get(dayKey) ?? [];
    const issues = record ? dayIssues(record) : [];
    if (record?.morningIn && absences.length)
      issues.push("Presenza sovrapposta a un’assenza");
    if (absences.length > 1) issues.push("Più assenze sovrapposte");
    const totals = record && !issues.length ? summarizeDay(record) : null;
    return {
      dayKey,
      record,
      absences,
      issues,
      totals,
      label:
        absences.map((leave) => getCategoryLabel(leave.category)).join(", ") ||
        "Presenza",
    };
  });
  const totals = rows.reduce(
    (sum, row) => ({
      worked: sum.worked + (row.totals?.worked ?? 0),
      permit: sum.permit + (row.totals?.permit ?? 0),
      credit: sum.credit + (row.totals?.credit ?? 0),
      debt: sum.debt + (row.totals?.debt ?? 0),
      validDays: sum.validDays + (row.totals ? 1 : 0),
      leaveDays: sum.leaveDays + (row.absences.length ? 1 : 0),
    }),
    { worked: 0, permit: 0, credit: 0, debt: 0, validDays: 0, leaveDays: 0 },
  );
  return {
    month,
    rows,
    totals,
    anomalies: rows.filter((row) => row.issues.length),
  };
}
export type MonthReport = ReturnType<typeof buildMonthReport>;
function csvCell(value: string | number) {
  const raw = String(value);
  const safe =
    /^[\s]*[=+@-]/.test(raw) && typeof value !== "number" ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function reportCsv(report: MonthReport) {
  const rows: (string | number)[][] = [
    [
      "Data",
      "Tipo",
      "Ingresso",
      "Inizio pausa",
      "Fine pausa",
      "Uscita",
      "Lavoro (min)",
      "Permesso (min)",
      "Credito (min)",
      "Debito (min)",
      "Assenza (giorni)",
      "Anomalie",
      "Note",
    ],
  ];
  for (const row of report.rows)
    rows.push([
      row.dayKey,
      row.label,
      row.record?.morningIn ?? "",
      row.record?.pauseNoExit ? "Senza uscita" : (row.record?.lunchOut ?? ""),
      row.record?.lunchIn ?? "",
      row.record?.finalOut ?? "",
      row.totals?.worked ?? "",
      row.totals?.permit ?? "",
      row.totals?.credit ?? "",
      row.totals?.debt ?? "",
      row.absences.length ? 1 : 0,
      row.issues.join("; "),
      row.absences.map((leave) => leave.notes).join("; "),
    ]);
  rows.push([
    "TOTALE",
    "Solo presenze valide",
    "",
    "",
    "",
    "",
    report.totals.worked,
    report.totals.permit,
    report.totals.credit,
    report.totals.debt,
    report.totals.leaveDays,
    `${report.anomalies.length} giornate da verificare`,
    "",
  ]);
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
