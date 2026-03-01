export const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidDayKey(value: string): boolean {
  return DAY_KEY_PATTERN.test(value);
}

export function parseDayKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatReadableDate(dayKey: string): string {
  return parseDayKey(dayKey).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}