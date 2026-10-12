import type { LeaveEntry } from "../types/leave.ts";
import type { WorkDayEntry } from "../types/worklog.ts";
import { buildMonthReport } from "./month-report.ts";

export type MonthlyBalanceAdjustments = Record<string, number>;

export interface MonthBalance {
  month: string;
  earned: number;
  adjustment: number;
  opening: number;
  closing: number;
}

const MONTH_PATTERN = /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/;
const MAX_ADJUSTMENT_MINUTES = 1_000_000;

function assertMonth(month: string): void {
  if (!MONTH_PATTERN.test(month)) {
    throw new Error("Seleziona un mese valido");
  }
}

function earnedForMonth(
  month: string,
  days: WorkDayEntry[],
  leaves: LeaveEntry[],
): number {
  const totals = buildMonthReport(month, days, leaves).totals;
  return totals.credit - totals.debt;
}

/**
 * Calculates the selected month's balance and the carry accumulated since
 * January of the same calendar year. Months from other years never carry over.
 */
export function calculateMonthBalance(
  month: string,
  days: WorkDayEntry[],
  leaves: LeaveEntry[],
  adjustments: MonthlyBalanceAdjustments = {},
): MonthBalance {
  assertMonth(month);

  const year = month.slice(0, 4);
  const requestedMonth = Number(month.slice(5));
  let opening = 0;
  let earned = 0;

  for (let number = 1; number <= requestedMonth; number += 1) {
    const currentMonth = `${year}-${String(number).padStart(2, "0")}`;
    const currentEarned = earnedForMonth(currentMonth, days, leaves);

    if (number === requestedMonth) {
      earned = currentEarned;
    } else {
      opening += currentEarned + (adjustments[currentMonth] ?? 0);
    }
  }

  const adjustment = adjustments[month] ?? 0;
  return {
    month,
    earned,
    adjustment,
    opening,
    closing: opening + earned + adjustment,
  };
}

export function validateMonthlyBalanceAdjustments(
  value: unknown,
): MonthlyBalanceAdjustments {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Rettifiche mensili non valide");
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("Rettifiche mensili non valide");
  }

  const validated: MonthlyBalanceAdjustments = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !MONTH_PATTERN.test(key)) {
      throw new Error("Rettifiche mensili non valide");
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new Error("Rettifiche mensili non valide");
    }

    const amount = descriptor.value;
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      !Number.isSafeInteger(amount) ||
      Math.abs(amount) > MAX_ADJUSTMENT_MINUTES
    ) {
      throw new Error("Rettifiche mensili non valide");
    }

    validated[key] = amount;
  }

  return validated;
}

export function formatSignedDuration(minutes: number): string {
  if (minutes === 0) return "0h 0m";

  const rounded = Math.round(Math.abs(minutes));
  const duration = `${Math.floor(rounded / 60)}h ${rounded % 60}m`;
  return `${minutes < 0 ? "−" : "+"}${duration}`;
}
