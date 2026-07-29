import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateLeaveBalances,
  countWorkingDays,
  findOverlappingLeave,
  rangesOverlap,
  validateLeaveRange,
} from "./leave.ts";
import type { LeaveEntry } from "../types/leave.ts";

function entry(
  id: string,
  startDay: string,
  endDay = startDay,
  category: LeaveEntry["category"] = "annual-current",
): LeaveEntry {
  return {
    id,
    category,
    startDay,
    endDay,
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("leave date ranges", () => {
  it("rejects invalid and inverted dates", () => {
    assert.match(validateLeaveRange("2026-02-30", "2026-03-01") ?? "", /valide/);
    assert.match(
      validateLeaveRange("2026-03-02", "2026-03-01") ?? "",
      /successiva/,
    );
    assert.equal(validateLeaveRange("2026-03-01", "2026-03-02"), null);
  });

  it("counts a single weekday and ignores a single weekend day", () => {
    assert.equal(countWorkingDays("2026-07-29", "2026-07-29"), 1);
    assert.equal(countWorkingDays("2026-08-01", "2026-08-01"), 0);
  });

  it("counts weekdays inclusively across weekends", () => {
    assert.equal(countWorkingDays("2026-07-31", "2026-08-03"), 2);
  });

  it("limits consumption to the configured year", () => {
    assert.equal(countWorkingDays("2025-12-29", "2026-01-02", 2026), 2);
    assert.equal(countWorkingDays("2025-12-29", "2026-01-02", 2025), 3);
  });

  it("detects touching and contained overlaps", () => {
    assert.equal(
      rangesOverlap(entry("a", "2026-05-01", "2026-05-03"), entry("b", "2026-05-03")),
      true,
    );
    assert.equal(
      rangesOverlap(entry("a", "2026-05-01", "2026-05-05"), entry("b", "2026-05-02", "2026-05-03")),
      true,
    );
    assert.equal(
      rangesOverlap(entry("a", "2026-05-01"), entry("b", "2026-05-02")),
      false,
    );
  });

  it("can ignore the entry currently being edited", () => {
    const rows = [entry("a", "2026-05-01"), entry("b", "2026-05-03")];
    assert.equal(findOverlappingLeave(rows, entry("a", "2026-05-01"), "a"), null);
    assert.equal(findOverlappingLeave(rows, entry("c", "2026-05-03"))?.id, "b");
  });
});

describe("leave balances", () => {
  it("keeps categories separate and reports negative balances", () => {
    const balances = calculateLeaveBalances(
      [
        entry("a", "2026-01-05", "2026-01-06"),
        entry("b", "2026-02-02", "2026-02-02", "former-holidays"),
      ],
      {
        year: 2026,
        annualCurrent: 1,
        annualPrevious: 0,
        formerHolidays: 2,
        seriousReasons: 0,
        unionAssembly: 0,
        recoveryDay: 0,
      },
    );

    assert.deepEqual(
      balances.map(({ category, used, remaining }) => ({
        category,
        used,
        remaining,
      })),
      [
        { category: "annual-current", used: 2, remaining: -1 },
        { category: "annual-previous", used: 0, remaining: 0 },
        { category: "former-holidays", used: 1, remaining: 1 },
        { category: "serious-reasons", used: 0, remaining: 0 },
        { category: "union-assembly", used: 0, remaining: 0 },
        { category: "recovery-day", used: 0, remaining: 0 },
      ],
    );
  });
});
