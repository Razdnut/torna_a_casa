export const LEAVE_CATEGORY_IDS = [
  "annual-current",
  "annual-previous",
  "former-holidays",
  "serious-reasons",
  "union-assembly",
  "recovery-day",
] as const;

export type LeaveCategoryId = (typeof LEAVE_CATEGORY_IDS)[number];

export interface LeaveEntry {
  id: string;
  category: LeaveCategoryId;
  startDay: string;
  endDay: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveAllowanceSettings {
  year: number;
  annualCurrent: number;
  annualPrevious: number;
  formerHolidays: number;
  seriousReasons: number;
  unionAssembly: number;
  recoveryDay: number;
}

export type LeaveAllowanceField = Exclude<keyof LeaveAllowanceSettings, "year">;
