import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LeaveEntry } from "../types/leave.ts";
import type { WorkDayEntry } from "../types/worklog.ts";
import {
  calculateMonthBalance,
  formatSignedDuration,
  validateMonthlyBalanceAdjustments,
} from "./month-balance.ts";

const stamp = "2026-01-01T00:00:00.000Z";

function workDay(dayKey: string, finalOut: string): WorkDayEntry {
  return {
    dayKey,
    morningIn: "07:30",
    lunchOut: "12:00",
    lunchIn: "12:30",
    finalOut,
    pauseNoExit: false,
    usedPermit: false,
    permitOut: "",
    permitIn: "",
    calculated: null,
    updatedAt: stamp,
  };
}

function leave(day: string): LeaveEntry {
  return {
    id: `leave-${day}`,
    category: "annual-current",
    startDay: day,
    endDay: day,
    notes: "",
    createdAt: stamp,
    updatedAt: stamp,
  };
}

describe("monthly balance", () => {
  it("carries positive and negative monthly results and adjustments through empty gaps", () => {
    const days = [
      workDay("2026-01-12", "16:12"), // +60
      workDay("2026-02-09", "14:42"), // -30
    ];
    const adjustments = {
      "2026-01": -15,
      "2026-02": 10,
      "2026-03": 0,
      "2026-04": 500,
      "2025-12": 900,
    };

    assert.deepEqual(calculateMonthBalance("2026-02", days, [], adjustments), {
      month: "2026-02",
      earned: -30,
      adjustment: 10,
      opening: 45,
      closing: 25,
    });
    assert.deepEqual(calculateMonthBalance("2026-03", days, [], adjustments), {
      month: "2026-03",
      earned: 0,
      adjustment: 0,
      opening: 25,
      closing: 25,
    });
  });

  it("resets carry in January while archived prior-year months remain calculable", () => {
    const days = [
      workDay("2025-12-15", "16:12"),
      workDay("2026-01-12", "14:42"),
    ];
    const adjustments = { "2025-12": 15, "2026-01": -5 };

    assert.deepEqual(calculateMonthBalance("2025-12", days, [], adjustments), {
      month: "2025-12",
      earned: 60,
      adjustment: 15,
      opening: 0,
      closing: 75,
    });
    assert.deepEqual(calculateMonthBalance("2026-01", days, [], adjustments), {
      month: "2026-01",
      earned: -30,
      adjustment: -5,
      opening: 0,
      closing: -35,
    });
  });

  it("matches month-report rules for valid days, anomalies and leave overlap", () => {
    const days = [
      workDay("2026-05-04", "16:12"), // valid: +60
      { ...workDay("2026-05-05", "16:12"), finalOut: "" }, // incomplete
      workDay("2026-05-06", "16:12"), // conflicts with leave
      workDay("2026-06-01", "18:12"), // future month
    ];

    assert.deepEqual(
      calculateMonthBalance("2026-05", days, [leave("2026-05-06")], {
        "2026-06": -1_000,
      }),
      {
        month: "2026-05",
        earned: 60,
        adjustment: 0,
        opening: 0,
        closing: 60,
      },
    );
  });
});

describe("monthly adjustment validation", () => {
  it("accepts signed safe integer minutes, including zero and boundary values", () => {
    const input = Object.assign(Object.create(null), {
      "0001-01": -1_000_000,
      "2026-02": 0,
      "9999-12": 1_000_000,
    });
    assert.deepEqual(validateMonthlyBalanceAdjustments(input), {
      "0001-01": -1_000_000,
      "2026-02": 0,
      "9999-12": 1_000_000,
    });
  });

  it("rejects invalid containers, month keys and amounts", () => {
    const invalid: unknown[] = [
      null,
      [],
      new Date(),
      { "0000-01": 1 },
      { "2026-00": 1 },
      { "2026-13": 1 },
      { "26-01": 1 },
      { "2026-01": Number.NaN },
      { "2026-01": Number.POSITIVE_INFINITY },
      { "2026-01": 1.5 },
      { "2026-01": 1_000_001 },
      { "2026-01": Number.MAX_SAFE_INTEGER + 1 },
    ];

    for (const value of invalid) {
      assert.throws(() => validateMonthlyBalanceAdjustments(value));
    }

    const accessor = Object.defineProperty({}, "2026-01", {
      enumerable: true,
      get: () => 10,
    });
    assert.throws(() => validateMonthlyBalanceAdjustments(accessor));
  });
});

describe("signed duration formatting", () => {
  it("uses explicit signs and a signless zero", () => {
    assert.equal(formatSignedDuration(150), "+2h 30m");
    assert.equal(formatSignedDuration(-150), "−2h 30m");
    assert.equal(formatSignedDuration(0), "0h 0m");
  });
});
