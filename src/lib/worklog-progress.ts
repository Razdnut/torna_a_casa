import type { WorkDayRecord } from "@/types/worklog";

export const WORK_TARGET_MINUTES = 7 * 60 + 12;
export const MINIMUM_BREAK_MINUTES = 30;

function toMinutes(value: string): number | null {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function clampNonNegative(value: number): number {
  return Math.max(0, value);
}

export function formatDuration(minutes: number): string {
  const rounded = Math.round(clampNonNegative(minutes));
  return `${Math.floor(rounded / 60)}h ${rounded % 60}m`;
}

export interface WorkProgress {
  workedMinutes: number;
  permitMinutes: number;
  countedMinutes: number;
  targetMinutes: number;
  percentage: number;
  status: "not-started" | "in-progress" | "complete";
  detail: string;
}

/**
 * Calculates the progress visible during a workday. If no final exit exists,
 * `referenceMinutes` is normally the current time; for past/future days the
 * caller passes the morning entry so the card never invents time worked.
 */
export function getWorkProgress(
  record: Pick<
    WorkDayRecord,
    "morningIn" | "lunchOut" | "lunchIn" | "finalOut" | "pauseNoExit" | "usedPermit" | "permitOut" | "permitIn"
  >,
  referenceMinutes: number,
): WorkProgress | null {
  const morningIn = toMinutes(record.morningIn);
  if (morningIn === null) return null;

  const finalOut = toMinutes(record.finalOut);
  const end = finalOut !== null && finalOut >= morningIn ? finalOut : Math.max(morningIn, referenceMinutes);
  const lunchOut = toMinutes(record.lunchOut);
  const lunchIn = toMinutes(record.lunchIn);

  let workedMinutes = end - morningIn;
  let detail = "Tempo trascorso dall'ingresso";

  if (record.pauseNoExit) {
    workedMinutes -= MINIMUM_BREAK_MINUTES;
    detail = "Include la pausa minima di 30 minuti";
  } else if (lunchOut !== null && lunchOut > morningIn) {
    if (end <= lunchOut) {
      workedMinutes = end - morningIn;
      detail = "Lavoro prima della pausa pranzo";
    } else if (lunchIn !== null && lunchIn > lunchOut) {
      const actualBreak = lunchIn - lunchOut;
      workedMinutes = end - morningIn - Math.max(actualBreak, MINIMUM_BREAK_MINUTES);
      detail = actualBreak < MINIMUM_BREAK_MINUTES ? "Pausa minima di 30 minuti applicata" : "Pausa pranzo esclusa";
    } else {
      workedMinutes = lunchOut - morningIn;
      detail = "Pausa pranzo in corso: il tempo successivo non è ancora conteggiato";
    }
  }

  let permitMinutes = 0;
  const permitOut = toMinutes(record.permitOut);
  const permitIn = toMinutes(record.permitIn);
  if (record.usedPermit && permitOut !== null && permitIn !== null && permitIn > permitOut) {
    permitMinutes = permitIn - permitOut;
  }

  const safeWorkedMinutes = clampNonNegative(workedMinutes);
  const countedMinutes = safeWorkedMinutes + permitMinutes;
  const percentage = Math.min(100, Math.round((countedMinutes / WORK_TARGET_MINUTES) * 100));

  return {
    workedMinutes: safeWorkedMinutes,
    permitMinutes,
    countedMinutes,
    targetMinutes: WORK_TARGET_MINUTES,
    percentage,
    status: countedMinutes >= WORK_TARGET_MINUTES ? "complete" : countedMinutes > 0 ? "in-progress" : "not-started",
    detail,
  };
}
