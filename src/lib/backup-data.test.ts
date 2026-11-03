import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBackup } from "./backup-data.ts";
import { defaultLeaveAllowances } from "./leave.ts";

const stamp = "2026-11-03T08:00:00.000Z";
const baseDay = {
  dayKey: "2026-11-02",
  morningIn: "07:30",
  lunchOut: "12:00",
  lunchIn: "12:30",
  finalOut: "17:00",
  pauseNoExit: false,
  usedPermit: false,
  permitOut: "",
  permitIn: "",
  calculated: null,
  updatedAt: stamp,
};
const make = (day: object = {}, settings: object = {}) => ({
  app: "torna-a-casa",
  version: 1,
  createdAt: stamp,
  days: [{ ...baseDay, ...day }],
  leaves: [],
  settings: { autoSave: true, allowances: defaultLeaveAllowances(2026), ...settings },
});
const roundTrip = (data: object) => parseBackup(JSON.stringify(data));

describe("backup straordinario", () => {
  it("un backup senza i campi nuovi si importa", () => {
    const result = roundTrip(make());
    assert.doesNotThrow(() => roundTrip(make()));
    assert.equal("overtimeEnabled" in result.days[0], false);
    assert.equal("overtimePlannedMinutes" in result.days[0], false);
    assert.equal("overtimeGoals" in result.settings, false);
  });
  it("round-trip con i campi nuovi", () => {
    const data = make(
      {
        overtimeEnabled: true,
        overtimePlannedMinutes: 135,
        calculated: {
          total: 1, debt: 0, credit: 0, totalWithPermit: 1, permitDuration: 0,
          totalRaw: 1, totalWithPermitIfReached: 1, reachedWorkTime: true, overtime: 75,
        },
      },
      { overtimeGoals: { "2026-11": 600 } },
    );
    assert.deepEqual(roundTrip(data), data);
  });
  it("valori non validi", () => {
    assert.throws(() => roundTrip(make({ overtimePlannedMinutes: 361 })));
    assert.throws(() => roundTrip(make({ overtimePlannedMinutes: -1 })));
    assert.throws(() => roundTrip(make({}, { overtimeGoals: { "2026-13": 60 } })));
    assert.throws(() => roundTrip(make({}, { overtimeGoals: { "2026-11": 0 } })));
  });
});
