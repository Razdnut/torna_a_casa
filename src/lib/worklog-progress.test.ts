import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDuration,
  getWorkProgress,
  WORK_TARGET_MINUTES,
} from "./worklog-progress.ts";

type ProgressRecord = Parameters<typeof getWorkProgress>[0];

function record(overrides: Partial<ProgressRecord> = {}): ProgressRecord {
  return {
    morningIn: "07:30",
    lunchOut: "",
    lunchIn: "",
    finalOut: "",
    pauseNoExit: false,
    usedPermit: false,
    permitOut: "",
    permitIn: "",
    ...overrides,
  };
}

describe("getWorkProgress", () => {
  it("does not show progress without a valid morning entry", () => {
    assert.equal(getWorkProgress(record({ morningIn: "" }), 600), null);
    assert.equal(getWorkProgress(record({ morningIn: "25:10" }), 600), null);
  });

  it("tracks elapsed time from the morning entry", () => {
    const progress = getWorkProgress(record(), 8 * 60);

    assert.equal(progress?.workedMinutes, 30);
    assert.equal(progress?.countedMinutes, 30);
    assert.equal(progress?.percentage, 7);
    assert.equal(progress?.status, "in-progress");
  });

  it("never invents worked time when the reference precedes the entry", () => {
    const progress = getWorkProgress(record(), 6 * 60);

    assert.equal(progress?.workedMinutes, 0);
    assert.equal(progress?.percentage, 0);
    assert.equal(progress?.status, "not-started");
  });

  it("uses a valid final exit instead of the current time", () => {
    const progress = getWorkProgress(record({ finalOut: "14:42" }), 18 * 60);

    assert.equal(progress?.countedMinutes, WORK_TARGET_MINUTES);
    assert.equal(progress?.percentage, 100);
    assert.equal(progress?.status, "complete");
  });

  it("applies the mandatory break when lunch is shorter than 30 minutes", () => {
    const progress = getWorkProgress(
      record({ lunchOut: "12:00", lunchIn: "12:15", finalOut: "15:12" }),
      18 * 60,
    );

    assert.equal(progress?.workedMinutes, WORK_TARGET_MINUTES);
    assert.match(progress?.detail ?? "", /Pausa minima/);
  });

  it("subtracts the real break when lunch lasts more than 30 minutes", () => {
    const progress = getWorkProgress(
      record({ lunchOut: "12:00", lunchIn: "13:00", finalOut: "15:42" }),
      18 * 60,
    );

    assert.equal(progress?.workedMinutes, WORK_TARGET_MINUTES);
    assert.match(progress?.detail ?? "", /Pausa pranzo esclusa/);
  });

  it("freezes progress at lunch-out while the break is in progress", () => {
    const progress = getWorkProgress(record({ lunchOut: "12:00" }), 13 * 60);

    assert.equal(progress?.workedMinutes, 270);
    assert.match(progress?.detail ?? "", /Pausa pranzo in corso/);
  });

  it("subtracts 30 minutes for a lunch break without exit", () => {
    const progress = getWorkProgress(
      record({ pauseNoExit: true, finalOut: "15:12" }),
      18 * 60,
    );

    assert.equal(progress?.workedMinutes, WORK_TARGET_MINUTES);
    assert.match(progress?.detail ?? "", /pausa minima/);
  });

  it("never produces negative progress for a no-exit break", () => {
    const progress = getWorkProgress(record({ pauseNoExit: true }), 7 * 60 + 40);

    assert.equal(progress?.workedMinutes, 0);
    assert.equal(progress?.percentage, 0);
  });

  it("adds only a complete and valid permit interval", () => {
    const valid = getWorkProgress(
      record({ usedPermit: true, permitOut: "10:00", permitIn: "10:30" }),
      8 * 60,
    );
    const incomplete = getWorkProgress(
      record({ usedPermit: true, permitOut: "10:30", permitIn: "10:00" }),
      8 * 60,
    );

    assert.equal(valid?.permitMinutes, 30);
    assert.equal(valid?.countedMinutes, 60);
    assert.equal(incomplete?.permitMinutes, 0);
  });

  it("caps percentage at 100 while preserving overtime minutes", () => {
    const progress = getWorkProgress(record({ finalOut: "19:00" }), 19 * 60);

    assert.equal(progress?.percentage, 100);
    assert.ok((progress?.countedMinutes ?? 0) > WORK_TARGET_MINUTES);
  });
});

describe("formatDuration", () => {
  it("formats minutes and clamps negative values", () => {
    assert.equal(formatDuration(432), "7h 12m");
    assert.equal(formatDuration(90.6), "1h 31m");
    assert.equal(formatDuration(-10), "0h 0m");
  });
});
