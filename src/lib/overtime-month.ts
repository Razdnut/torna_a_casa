import type { LeaveEntry } from "../types/leave.ts";
import type { WorkDayEntry } from "../types/worklog.ts";
import { MONTH_PATTERN } from "./month-balance.ts";
import { buildMonthReport } from "./month-report.ts";

export type OvertimeGoals = Record<string, number>;

export interface OvertimeMonth {
  month: string;
  done: number;
  goal: number | null;
  remaining: number | null;
  reached: boolean;
}

const MAX_GOAL_MINUTES = 1_000_000;

/** Overtime never carries over: only the requested month counts. */
export function calculateOvertimeMonth(
  month: string,
  days: WorkDayEntry[],
  leaves: LeaveEntry[],
  goals: OvertimeGoals = {},
): OvertimeMonth {
  const done = buildMonthReport(month, days, leaves).totals.overtime;
  const goal = goals[month] ?? null;
  return {
    month,
    done,
    goal,
    remaining: goal === null ? null : Math.max(0, goal - done),
    reached: goal !== null && done >= goal,
  };
}

export function validateOvertimeGoals(value: unknown): OvertimeGoals {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Obiettivi straordinario non validi");
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("Obiettivi straordinario non validi");
  }

  const validated: OvertimeGoals = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !MONTH_PATTERN.test(key)) {
      throw new Error("Obiettivi straordinario non validi");
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new Error("Obiettivi straordinario non validi");
    }

    const amount = descriptor.value;
    if (
      typeof amount !== "number" ||
      !Number.isSafeInteger(amount) ||
      amount < 1 ||
      amount > MAX_GOAL_MINUTES
    ) {
      throw new Error("Obiettivi straordinario non validi");
    }

    validated[key] = amount;
  }

  return validated;
}
