import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dayIssues,
  emptyDay,
  overtimeWarning,
  summarizeDay,
  todayState,
} from "./day-summary.ts";
import type { WorkDayEntry, WorkDayRecord } from "../types/worklog.ts";
import type { LeaveEntry } from "../types/leave.ts";
import { buildMonthReport, reportCsv } from "./month-report.ts";
import { calculateMonthBalance } from "./month-balance.ts";
import {
  calculateOvertimeMonth,
  validateOvertimeGoals,
} from "./overtime-month.ts";

const day = (overrides: Partial<WorkDayRecord> = {}): WorkDayRecord => ({
  ...emptyDay(),
  morningIn: "07:30",
  lunchOut: "12:00",
  lunchIn: "12:30",
  finalOut: "15:12",
  overtimeEnabled: true,
  ...overrides,
});

const WARNING =
  "Non stai facendo il minimo di 1 ora per lo straordinario. Queste ore finiscono nel saldo, non nello straordinario.";

describe("straordinario giornaliero", () => {
  it("59 minuti di extra non sono straordinario", () => {
    const result = summarizeDay(day({ finalOut: "16:11" }))!;
    assert.equal(result.overtime, 0);
    assert.equal(result.credit, 59);
  });

  it("60 minuti di extra sono straordinario e non entrano nel credito", () => {
    const result = summarizeDay(day({ finalOut: "16:12" }))!;
    assert.equal(result.overtime, 60);
    assert.equal(result.credit, 0);
    assert.equal(result.balance, 0);
  });

  it("75 minuti contano per intero", () => {
    const result = summarizeDay(day({ finalOut: "16:27" }))!;
    assert.equal(result.overtime, 75);
    assert.equal(result.credit, 0);
  });

  it("senza flag l'extra resta credito", () => {
    const result = summarizeDay(
      day({ finalOut: "16:27", overtimeEnabled: false }),
    )!;
    assert.equal(result.overtime, 0);
    assert.equal(result.credit, 75);
    assert.equal(result.balance, 75);
  });

  it("pausa senza uscita", () => {
    const result = summarizeDay(
      day({ pauseNoExit: true, lunchOut: "", lunchIn: "", finalOut: "16:12" }),
    )!;
    assert.equal(result.overtime, 60);
  });

  it("permesso e pausa lunga", () => {
    const permit = summarizeDay(
      day({
        usedPermit: true,
        permitOut: "10:00",
        permitIn: "10:30",
        finalOut: "16:42",
      }),
    )!;
    assert.equal(permit.overtime, 60);
    const longPause = summarizeDay(
      day({ lunchIn: "13:00", finalOut: "17:12" }),
    )!;
    assert.equal(longPause.overtime, 90);
  });

  it("il debito non cambia", () => {
    const result = summarizeDay(day({ finalOut: "15:00" }))!;
    assert.equal(result.overtime, 0);
    assert.equal(result.debt, 12);
  });

  it("uscita consigliata include lo straordinario", () => {
    const base = {
      lunchOut: "",
      lunchIn: "",
      finalOut: "",
    };
    assert.equal(
      todayState(day({ ...base, overtimePlannedMinutes: 135 }), 480).exit,
      1047,
    );
    assert.equal(
      todayState(day({ ...base, overtimeEnabled: false }), 480).exit,
      912,
    );
    assert.equal(
      todayState(day({ ...base, overtimePlannedMinutes: 0 }), 480).exit,
      972,
    );
  });

  it("ore previste non valide", () => {
    const has = (record: WorkDayRecord) =>
      dayIssues(record).some((issue) => issue.includes("Straordinario previsto"));
    assert.equal(has(day({ overtimePlannedMinutes: 59 })), true);
    assert.equal(has(day({ overtimePlannedMinutes: 361 })), true);
    assert.equal(has(day({ overtimePlannedMinutes: 60 })), false);
    assert.equal(has(day({ overtimePlannedMinutes: 360 })), false);
    assert.equal(
      has(day({ overtimeEnabled: false, overtimePlannedMinutes: 59 })),
      false,
    );
  });

  it("avviso", () => {
    assert.equal(overtimeWarning(day({ finalOut: "16:11" })), WARNING);
    assert.equal(overtimeWarning(day({ finalOut: "16:12" })), null);
    assert.equal(
      overtimeWarning(day({ finalOut: "16:11", overtimeEnabled: false })),
      null,
    );
    assert.equal(overtimeWarning(day({ finalOut: "" })), null);
    assert.equal(
      overtimeWarning(day({ finalOut: "16:11", morningIn: "" })),
      null,
    );
  });
});

const entry = (
  dayKey: string,
  overrides: Partial<WorkDayRecord> = {},
): WorkDayEntry => ({ ...day(overrides), dayKey });

const leaveOn = (date: string): LeaveEntry => ({
  id: `leave-${date}`,
  category: "annual-current",
  startDay: date,
  endDay: date,
  notes: "",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
});

describe("straordinario mensile", () => {
  const valid = [
    entry("2026-11-02", { finalOut: "16:12" }),
    entry("2026-11-03", { finalOut: "16:27" }),
    entry("2026-11-04", { finalOut: "" }),
  ];

  it("il totale mensile somma solo giornate valide", () => {
    const report = buildMonthReport("2026-11", valid, []);
    assert.equal(report.totals.overtime, 135);
    assert.equal(report.rows[0].totals?.overtime, 60);
  });

  it("giornate senza flag non contano", () => {
    const days = [entry("2026-11-02", { finalOut: "16:12", overtimeEnabled: false })];
    assert.equal(buildMonthReport("2026-11", days, []).totals.overtime, 0);
  });

  it("una assenza nello stesso giorno non genera straordinario", () => {
    const days = [entry("2026-11-02", { finalOut: "16:12" })];
    const report = buildMonthReport("2026-11", days, [leaveOn("2026-11-02")]);
    assert.equal(report.totals.overtime, 0);
  });

  it("nessun riporto tra mesi", () => {
    const days = [entry("2026-10-05", { finalOut: "16:12" })];
    assert.equal(calculateOvertimeMonth("2026-10", days, []).done, 60);
    assert.equal(calculateOvertimeMonth("2026-11", days, []).done, 0);
  });

  it("obiettivo", () => {
    const goals = { "2026-11": 600 };
    const partial = calculateOvertimeMonth("2026-11", valid, [], goals);
    assert.deepEqual(partial, {
      month: "2026-11",
      done: 135,
      goal: 600,
      remaining: 465,
      reached: false,
    });
    const many = Array.from({ length: 10 }, (_, i) =>
      entry(`2026-11-${String(i + 2).padStart(2, "0")}`, { finalOut: "16:12" }),
    ).filter((d) => !["2026-11-07", "2026-11-08"].includes(d.dayKey));
    const reached = calculateOvertimeMonth("2026-11", many, [], goals);
    assert.equal(reached.done, 480);
    const exact = calculateOvertimeMonth("2026-11", valid, [], { "2026-11": 135 });
    assert.equal(exact.reached, true);
    assert.equal(exact.remaining, 0);
    const over = calculateOvertimeMonth("2026-11", valid, [], { "2026-11": 100 });
    assert.equal(over.reached, true);
    assert.equal(over.remaining, 0);
    const none = calculateOvertimeMonth("2026-11", valid, []);
    assert.equal(none.goal, null);
    assert.equal(none.remaining, null);
    assert.equal(none.reached, false);
  });

  it("il saldo mensile non cambia con lo straordinario", () => {
    const withFlag = [entry("2026-11-02", { finalOut: "16:42" })];
    const without = [entry("2026-11-02", { finalOut: "16:42", overtimeEnabled: false })];
    assert.equal(calculateMonthBalance("2026-11", withFlag, []).earned, 0);
    assert.equal(calculateMonthBalance("2026-11", without, []).earned, 90);
  });

  it("validateOvertimeGoals rifiuta valori non validi", () => {
    const message = /Obiettivi straordinario non validi/;
    assert.throws(() => validateOvertimeGoals({ "2026-13": 600 }), message);
    assert.throws(() => validateOvertimeGoals({ "2026-11": 0 }), message);
    assert.throws(() => validateOvertimeGoals({ "2026-11": 1_000_001 }), message);
    assert.throws(() => validateOvertimeGoals({ "2026-11": 1.5 }), message);
    assert.throws(() => validateOvertimeGoals([]), message);
    assert.deepEqual(validateOvertimeGoals({ "2026-11": 600 }), { "2026-11": 600 });
  });

  it("il CSV ha la colonna e il totale", () => {
    const csv = reportCsv(buildMonthReport("2026-11", valid, []));
    const lines = csv.split("\r\n");
    const header = lines[0].replace("\uFEFF", "").split(";");
    const index = header.indexOf('"Straordinario (min)"');
    assert.equal(index, header.indexOf('"Debito (min)"') + 1);
    const total = lines.find((line) => line.startsWith('"TOTALE"'))!.split(";");
    assert.equal(total[index], '"135"');
  });
});
