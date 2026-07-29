import { LEAVE_CATEGORY_IDS } from "../types/leave.ts";
import type {
  LeaveAllowanceField,
  LeaveAllowanceSettings,
  LeaveCategoryId,
  LeaveEntry,
} from "../types/leave.ts";

export const LEAVE_CATEGORIES: ReadonlyArray<{
  id: LeaveCategoryId;
  allowanceField: LeaveAllowanceField;
  label: string;
}> = [
  {
    id: "annual-current",
    allowanceField: "annualCurrent",
    label: "Ferie annuali",
  },
  {
    id: "annual-previous",
    allowanceField: "annualPrevious",
    label: "Ferie anno precedente residue",
  },
  {
    id: "former-holidays",
    allowanceField: "formerHolidays",
    label: "Ex festività",
  },
  {
    id: "serious-reasons",
    allowanceField: "seriousReasons",
    label: "Giorni per gravi motivi",
  },
  {
    id: "union-assembly",
    allowanceField: "unionAssembly",
    label: "Assemblea sindacale",
  },
  {
    id: "recovery-day",
    allowanceField: "recoveryDay",
    label: "Giornata a recupero",
  },
];

export function defaultLeaveAllowances(
  year = new Date().getFullYear(),
): LeaveAllowanceSettings {
  return {
    year,
    annualCurrent: 0,
    annualPrevious: 0,
    formerHolidays: 0,
    seriousReasons: 0,
    unionAssembly: 0,
    recoveryDay: 0,
  };
}

export function isLeaveCategory(value: unknown): value is LeaveCategoryId {
  return (
    typeof value === "string" &&
    (LEAVE_CATEGORY_IDS as readonly string[]).includes(value)
  );
}

function parseDay(dayKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) {
    return null;
  }

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );

  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    return null;
  }

  return date;
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function validateLeaveRange(
  startDay: string,
  endDay: string,
): string | null {
  const start = parseDay(startDay);
  const end = parseDay(endDay);

  if (!start || !end) {
    return "Inserisci due date valide.";
  }

  if (start > end) {
    return "La data iniziale non può essere successiva alla data finale.";
  }

  return null;
}

export function countWorkingDays(
  startDay: string,
  endDay: string,
  year?: number,
): number {
  const start = parseDay(startDay);
  const end = parseDay(endDay);
  if (!start || !end || start > end) {
    return 0;
  }

  const firstAllowed = year === undefined ? start : new Date(Date.UTC(year, 0, 1));
  const lastAllowed =
    year === undefined ? end : new Date(Date.UTC(year, 11, 31));
  const cursor = new Date(Math.max(start.getTime(), firstAllowed.getTime()));
  const last = new Date(Math.min(end.getTime(), lastAllowed.getTime()));

  if (cursor > last) {
    return 0;
  }

  let days = 0;
  while (cursor <= last) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      days += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

export function rangesOverlap(
  first: Pick<LeaveEntry, "startDay" | "endDay">,
  second: Pick<LeaveEntry, "startDay" | "endDay">,
): boolean {
  if (
    validateLeaveRange(first.startDay, first.endDay) ||
    validateLeaveRange(second.startDay, second.endDay)
  ) {
    return false;
  }

  return first.startDay <= second.endDay && second.startDay <= first.endDay;
}

export function findOverlappingLeave(
  entries: LeaveEntry[],
  candidate: Pick<LeaveEntry, "startDay" | "endDay">,
  ignoredId?: string,
): LeaveEntry | null {
  return (
    entries.find(
      (entry) => entry.id !== ignoredId && rangesOverlap(entry, candidate),
    ) ?? null
  );
}

export function getCategoryLabel(
  category: LeaveCategoryId,
  year?: number,
): string {
  const definition = LEAVE_CATEGORIES.find((item) => item.id === category);
  if (!definition) {
    return category;
  }

  return category === "annual-current" && year
    ? `${definition.label} ${year}`
    : definition.label;
}

export function calculateLeaveBalances(
  entries: LeaveEntry[],
  settings: LeaveAllowanceSettings,
) {
  return LEAVE_CATEGORIES.map((category) => {
    const available = settings[category.allowanceField];
    const used = entries
      .filter((entry) => entry.category === category.id)
      .reduce(
        (total, entry) =>
          total + countWorkingDays(entry.startDay, entry.endDay, settings.year),
        0,
      );

    return {
      category: category.id,
      label: getCategoryLabel(category.id, settings.year),
      available,
      used,
      remaining: available - used,
    };
  });
}

export function formatLeaveRange(entry: Pick<LeaveEntry, "startDay" | "endDay">) {
  const format = (dayKey: string) => {
    const date = parseDay(dayKey);
    return date
      ? date.toLocaleDateString("it-IT", {
          timeZone: "UTC",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : dayKey;
  };

  return entry.startDay === entry.endDay
    ? format(entry.startDay)
    : `${format(entry.startDay)} – ${format(entry.endDay)}`;
}

export function nextDayKey(dayKey: string): string {
  const date = parseDay(dayKey);
  if (!date) {
    return dayKey;
  }
  date.setUTCDate(date.getUTCDate() + 1);
  return toDayKey(date);
}
