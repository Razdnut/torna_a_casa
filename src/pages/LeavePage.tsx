import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateLeaveBalances,
  countWorkingDays,
  findOverlappingLeave,
  formatLeaveRange,
  getCategoryLabel,
  LEAVE_CATEGORIES,
  validateLeaveRange,
} from "@/lib/leave";
import { formatDayKey } from "@/lib/worklog-date";
import {
  deleteLeaveEntry,
  getLeaveAllowances,
  listLeaveEntries,
  saveLeaveEntry,
} from "@/lib/worklog-storage";
import { LeaveAllowanceSettings, LeaveCategoryId, LeaveEntry } from "@/types/leave";
import { showError, showSuccess } from "@/utils/toast";

function createEntryId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const LeavePage = () => {
  const today = formatDayKey(new Date());
  const [entries, setEntries] = useState<LeaveEntry[]>([]);
  const [allowances, setAllowances] = useState<LeaveAllowanceSettings | null>(null);
  const [category, setCategory] = useState<LeaveCategoryId>("annual-current");
  const [startDay, setStartDay] = useState(today);
  const [endDay, setEndDay] = useState(today);
  const [isRange, setIsRange] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    const [savedEntries, savedAllowances] = await Promise.all([
      listLeaveEntries(),
      getLeaveAllowances(),
    ]);
    setEntries(savedEntries);
    setAllowances(savedAllowances);
  }, []);

  useEffect(() => {
    refresh().catch(() => showError("Impossibile caricare ferie e permessi"));
  }, [refresh]);

  const effectiveEndDay = isRange ? endDay : startDay;
  const selectedDays = countWorkingDays(startDay, effectiveEndDay);
  const balances = useMemo(
    () => (allowances ? calculateLeaveBalances(entries, allowances) : []),
    [allowances, entries],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const rangeError = validateLeaveRange(startDay, effectiveEndDay);
    if (rangeError) {
      showError(rangeError);
      return;
    }

    if (selectedDays === 0) {
      showError("L'intervallo non contiene giorni lavorativi (lunedì–venerdì).");
      return;
    }

    const overlap = findOverlappingLeave(entries, {
      startDay,
      endDay: effectiveEndDay,
    });
    if (overlap) {
      showError(`Periodo già occupato: ${formatLeaveRange(overlap)}.`);
      return;
    }

    const timestamp = new Date().toISOString();
    const entry: LeaveEntry = {
      id: createEntryId(),
      category,
      startDay,
      endDay: effectiveEndDay,
      notes: notes.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setIsSaving(true);
    try {
      await saveLeaveEntry(entry);
      setNotes("");
      setEndDay(startDay);
      setIsRange(false);
      await refresh();
      showSuccess(
        selectedDays === 1
          ? "Assenza registrata"
          : `${selectedDays} giorni lavorativi registrati`,
      );
    } catch {
      showError("Non è stato possibile salvare l'assenza");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entry: LeaveEntry) => {
    if (!window.confirm(`Eliminare l'assenza del ${formatLeaveRange(entry)}?`)) {
      return;
    }

    try {
      await deleteLeaveEntry(entry.id);
      await refresh();
      showSuccess("Assenza eliminata");
    } catch {
      showError("Non è stato possibile eliminare l'assenza");
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Ferie e permessi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registra un singolo giorno o un intervallo. Il conteggio considera
            soltanto i giorni da lunedì a venerdì.
          </p>
        </div>

        {allowances && (
          <section
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            aria-label={`Residui ${allowances.year}`}
          >
            {balances.map((balance) => (
              <Card key={balance.category}>
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {balance.label}
                  </p>
                  <p
                    className={`mt-1 text-2xl font-bold ${
                      balance.remaining < 0 ? "text-destructive" : "text-emerald-700"
                    }`}
                  >
                    {balance.remaining}{" "}
                    {Math.abs(balance.remaining) === 1 ? "giorno" : "giorni"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usati {balance.used} su {balance.available}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Nuova assenza</CardTitle>
            <CardDescription>
              I plafond disponibili si configurano dalla schermata Impostazioni.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="leave-category">Tipo di assenza</Label>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as LeaveCategoryId)}
                >
                  <SelectTrigger id="leave-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_CATEGORIES.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {getCategoryLabel(item.id, allowances?.year)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="leave-range"
                  checked={isRange}
                  onCheckedChange={(checked) => {
                    const enabled = Boolean(checked);
                    setIsRange(enabled);
                    if (!enabled) {
                      setEndDay(startDay);
                    }
                  }}
                />
                <Label htmlFor="leave-range">Intervallo di più giorni</Label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="leave-start">{isRange ? "Da" : "Giorno"}</Label>
                  <Input
                    id="leave-start"
                    type="date"
                    value={startDay}
                    onChange={(event) => {
                      setStartDay(event.target.value);
                      if (!isRange) {
                        setEndDay(event.target.value);
                      }
                    }}
                    required
                  />
                </div>
                {isRange && (
                  <div className="space-y-2">
                    <Label htmlFor="leave-end">A</Label>
                    <Input
                      id="leave-end"
                      type="date"
                      min={startDay}
                      value={endDay}
                      onChange={(event) => setEndDay(event.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="leave-notes">Note (facoltative)</Label>
                <Textarea
                  id="leave-notes"
                  maxLength={300}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Motivo o annotazioni personali"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted p-3">
                <p className="text-sm">
                  Giorni lavorativi selezionati:{" "}
                  <strong>{selectedDays}</strong>
                </p>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Salvataggio…" : "Registra assenza"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assenze registrate</CardTitle>
            <CardDescription>
              Gli intervalli sono ordinati dal più recente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nessuna assenza registrata.
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold">{formatLeaveRange(entry)}</p>
                        <Badge variant="secondary">
                          {countWorkingDays(entry.startDay, entry.endDay)}{" "}
                          {countWorkingDays(entry.startDay, entry.endDay) === 1
                            ? "giorno"
                            : "giorni"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getCategoryLabel(entry.category, allowances?.year)}
                      </p>
                      {entry.notes && (
                        <p className="mt-1 break-words text-sm">{entry.notes}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(entry)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Elimina
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default LeavePage;
