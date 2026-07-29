import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDayKey, formatReadableDate, parseDayKey } from "@/lib/worklog-date";
import { formatDuration } from "@/lib/worklog-progress";
import { listWorkDays, loadWorkDay } from "@/lib/worklog-storage";
import { WorkDayEntry, WorkDayRecord } from "@/types/worklog";

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [savedDays, setSavedDays] = useState<WorkDayEntry[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<WorkDayRecord | null>(null);
  const selectedDayKey = formatDayKey(selectedDate);

  const refreshSavedDays = useCallback(() => { listWorkDays().then((days) => setSavedDays(days)); }, []);
  useEffect(() => { refreshSavedDays(); }, [refreshSavedDays]);
  useEffect(() => { loadWorkDay(selectedDayKey).then((record) => setSelectedRecord(record)); }, [selectedDayKey]);

  const savedDates = useMemo(() => savedDays.map((day) => parseDayKey(day.dayKey)), [savedDays]);
  const selectedMonth = selectedDayKey.slice(0, 7);
  const monthEntries = savedDays.filter((day) => day.dayKey.startsWith(selectedMonth));
  const monthTotals = monthEntries.reduce(
    (summary, entry) => ({ credit: summary.credit + (entry.calculated?.credit ?? 0), debt: summary.debt + (entry.calculated?.debt ?? 0) }),
    { credit: 0, debt: 0 },
  );

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Calendario giornate</CardTitle><CardDescription>Seleziona un giorno per recuperare i dati salvati.</CardDescription></CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Calendar mode="single" selected={selectedDate} onSelect={(date) => { if (date) setSelectedDate(date); }} modifiers={{ saved: savedDates }} modifiersClassNames={{ saved: "bg-primary/20 rounded-md" }} className="rounded-md border" />
            <Button variant="outline" onClick={refreshSavedDays}>Aggiorna giorni salvati</Button>
            <div className="grid w-full grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-md bg-muted p-2"><strong className="block text-base">{monthEntries.length}</strong>giorni</div>
              <div className="rounded-md bg-emerald-50 p-2 text-emerald-800"><strong className="block text-base">{formatDuration(monthTotals.credit)}</strong>credito</div>
              <div className="rounded-md bg-rose-50 p-2 text-rose-800"><strong className="block text-base">{formatDuration(monthTotals.debt)}</strong>debito</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{formatReadableDate(selectedDayKey)}</CardTitle><CardDescription>{selectedRecord ? "Dati trovati per questa giornata." : "Nessun dato salvato per questa data."}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {selectedRecord ? (
              <>
                <p><strong>Ingresso:</strong> {selectedRecord.morningIn || "-"}</p>
                <p><strong>Pausa:</strong> {selectedRecord.pauseNoExit ? "Senza uscita" : `${selectedRecord.lunchOut || "-"} → ${selectedRecord.lunchIn || "-"}`}</p>
                <p><strong>Uscita finale:</strong> {selectedRecord.finalOut || "-"}</p>
                <p><strong>Permessi:</strong> {selectedRecord.usedPermit ? "Sì" : "No"}</p>
                {selectedRecord.calculated && <div className="rounded-md bg-muted p-3 text-sm"><strong>Esito:</strong> {selectedRecord.calculated.credit > 0 ? `Credito ${formatDuration(selectedRecord.calculated.credit)}` : selectedRecord.calculated.debt > 0 ? `Debito ${formatDuration(selectedRecord.calculated.debt)}` : "Giornata regolare"}</div>}
                <p><strong>Ultimo salvataggio:</strong> {new Date(selectedRecord.updatedAt).toLocaleString("it-IT")}</p>
              </>
            ) : <p className="text-sm text-muted-foreground">Apri il tracker e salva la giornata per vederla qui.</p>}
            <Button asChild className="w-full"><Link to={`/tracker/${selectedDayKey}`}>Apri nel tracker</Link></Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default CalendarPage;
