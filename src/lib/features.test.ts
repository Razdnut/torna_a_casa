import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateRecord,
  dayIssues,
  emptyDay,
  summarizeDay,
  todayState,
} from "./day-summary.ts";
import { parseBackup } from "./backup-data.ts";
import { buildMonthReport, reportCsv } from "./month-report.ts";
import { defaultLeaveAllowances } from "./leave.ts";

const stamp = "2026-09-12T08:00:00.000Z";
const complete = () => ({
  ...emptyDay(),
  morningIn: "07:30",
  lunchOut: "12:00",
  lunchIn: "12:30",
  finalOut: "15:12",
  updatedAt: stamp,
});
const leave = {
  id: "leave-1",
  category: "annual-current" as const,
  startDay: "2026-09-14",
  endDay: "2026-09-15",
  notes: "Vacanza",
  createdAt: stamp,
  updatedAt: stamp,
};
const backup = () => ({
  app: "torna-a-casa",
  version: 1,
  createdAt: stamp,
  days: [{ ...complete(), dayKey: "2026-09-11" }],
  leaves: [leave],
  settings: { autoSave: true, allowances: defaultLeaveAllowances(2026) },
});

describe("Today and consistent hour totals", () => {
  it("moves through entry, lunch, return and exit", () => {
    const record = emptyDay();
    assert.equal(todayState(record, 450).action, "morningIn");
    record.morningIn = "07:30";
    assert.equal(todayState(record, 450).exit, 912);
    assert.equal(todayState(record, 700).action, "lunchOut");
    record.lunchOut = "12:00";
    assert.equal(todayState(record, 780).action, "lunchIn");
    assert.equal(todayState(record, 780).worked, 270);
    assert.equal(todayState(record, 780).exit, 942);
    record.lunchIn = "13:00";
    assert.equal(todayState(record, 800).action, "finalOut");
    record.finalOut = "15:42";
    assert.equal(todayState(record, 1100).action, null);
    assert.equal(summarizeDay(record)?.balance, 0);
  });
  it("applies minimum pause and permits once, preserving recovery rules", () => {
    const record = {
      ...complete(),
      lunchIn: "12:15",
      usedPermit: true,
      permitOut: "10:00",
      permitIn: "10:30",
      finalOut: "15:42",
    };
    assert.equal(summarizeDay(record)?.worked, 432);
    assert.equal(calculateRecord(record)?.credit, 0);
    assert.equal(todayState({ ...record, finalOut: "" }, 900).exit, 942);
    assert.equal(summarizeDay({ ...record, pauseNoExit: true })?.balance, 0);
  });
  it("detects incomplete, reversed and overlapping intervals", () => {
    assert.equal(summarizeDay({ ...complete(), finalOut: "" }), null);
    assert.ok(dayIssues({ ...complete(), lunchIn: "11:00" }).length);
    assert.ok(
      dayIssues({
        ...complete(),
        usedPermit: true,
        permitOut: "12:10",
        permitIn: "12:40",
      }).some((x) => x.includes("sovrapposto")),
    );
    assert.equal(
      todayState(
        {
          ...complete(),
          finalOut: "",
          usedPermit: true,
          permitOut: "14:00",
          permitIn: "",
        },
        870,
      ).action,
      "permitIn",
    );
  });
});
describe("Backup validation", () => {
  it("round-trips complete data including settings and notes", () =>
    assert.deepEqual(parseBackup(JSON.stringify(backup())), backup()));
  it("rejects foreign, future, duplicate, corrupt and impossible-date backups", () => {
    assert.throws(() => parseBackup("not json"));
    for (const change of [
      { app: "other" },
      { version: 2 },
      { days: [...backup().days, ...backup().days] },
      { days: [{ ...backup().days[0], dayKey: "2026-02-30" }] },
      { days: [{ ...backup().days[0], morningIn: "25:00" }] },
      { settings: {} },
    ])
      assert.throws(() =>
        parseBackup(JSON.stringify({ ...backup(), ...change })),
      );
  });
});
describe("Monthly report", () => {
  it("recalculates from source times even when cached results are missing", () => {
    const report = buildMonthReport("2026-09", backup().days, []);
    assert.equal(report.totals.worked, 432);
    assert.equal(report.totals.validDays, 1);
  });
  it("excludes anomalies from totals and finds work-leave conflicts", () => {
    const report = buildMonthReport(
      "2026-09",
      [
        ...backup().days,
        { ...complete(), finalOut: "", dayKey: "2026-09-10" },
        { ...complete(), dayKey: "2026-09-14" },
      ],
      [leave],
    );
    assert.equal(report.anomalies.length, 2);
    assert.equal(report.totals.worked, 432);
    assert.equal(report.totals.leaveDays, 2);
  });
  it("clips leaves to month, excludes weekends and supports leave-only months", () => {
    const report = buildMonthReport(
      "2026-09",
      [],
      [{ ...leave, startDay: "2026-08-31", endDay: "2026-09-06" }],
    );
    assert.equal(report.totals.leaveDays, 4);
    assert.equal(report.rows.length, 4);
    assert.throws(() => buildMonthReport("2026-13", [], []));
  });
  it("exports UTF-8 CSV with totals and protects spreadsheet formulas", () => {
    const csv = reportCsv(
      buildMonthReport("2026-09", backup().days, [
        { ...leave, notes: '=HYPERLINK("test")\nè una nota;' },
      ]),
    );
    assert.ok(csv.startsWith("\uFEFF"));
    assert.ok(csv.includes('"TOTALE"'));
    assert.ok(csv.includes("'=HYPERLINK"));
    assert.ok(csv.includes('""test""'));
  });
});
