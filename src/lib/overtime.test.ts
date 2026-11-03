import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dayIssues,
  emptyDay,
  overtimeWarning,
  summarizeDay,
  todayState,
} from "./day-summary.ts";
import type { WorkDayRecord } from "../types/worklog.ts";

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
