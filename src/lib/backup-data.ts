import { z } from "zod";
import { LEAVE_CATEGORY_IDS } from "../types/leave.ts";

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Data inesistente");
const time = z
  .string()
  .refine((value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value));
const timestamp = z.string().datetime({ offset: true });
const amount = z.number().finite().nonnegative().max(1000000);
const calculated = z
  .object({
    total: z.number().finite(),
    debt: amount,
    credit: amount,
    totalWithPermit: z.number().finite(),
    permitDuration: amount,
    totalRaw: z.number().finite(),
    totalWithPermitIfReached: z.number().finite(),
    reachedWorkTime: z.boolean(),
  })
  .nullable();
export const backupSchema = z
  .object({
    app: z.literal("torna-a-casa"),
    version: z.literal(1),
    createdAt: timestamp,
    days: z
      .array(
        z.object({
          dayKey: day,
          morningIn: time,
          lunchOut: time,
          lunchIn: time,
          finalOut: time,
          pauseNoExit: z.boolean(),
          usedPermit: z.boolean(),
          permitOut: time,
          permitIn: time,
          calculated,
          updatedAt: timestamp,
        }),
      )
      .max(50000),
    leaves: z
      .array(
        z
          .object({
            id: z.string().min(1).max(200),
            category: z.enum(LEAVE_CATEGORY_IDS),
            startDay: day,
            endDay: day,
            notes: z.string().max(10000),
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .refine((value) => value.startDay <= value.endDay),
      )
      .max(10000),
    settings: z.object({
      autoSave: z.boolean(),
      allowances: z.object({
        year: z.number().int().min(2000).max(2100),
        annualCurrent: amount,
        annualPrevious: amount,
        formerHolidays: amount,
        seriousReasons: amount,
        unionAssembly: amount,
        recoveryDay: amount,
      }),
    }),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.days.map((day) => day.dayKey)).size !== value.days.length)
      ctx.addIssue({ code: "custom", message: "Giornate duplicate" });
    if (
      new Set(value.leaves.map((leave) => leave.id)).size !==
      value.leaves.length
    )
      ctx.addIssue({ code: "custom", message: "Assenze duplicate" });
  });
export type BackupData = z.infer<typeof backupSchema>;
export function parseBackup(text: string): BackupData {
  if (text.length > 20 * 1024 * 1024)
    throw new Error("Il backup supera il limite di 20 MB.");
  try {
    return backupSchema.parse(JSON.parse(text));
  } catch {
    throw new Error(
      "Backup non valido: controlla formato, versione, date e dati duplicati. Nessun dato è stato modificato.",
    );
  }
}
