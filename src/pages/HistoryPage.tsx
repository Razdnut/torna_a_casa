import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDayKey, formatReadableDate } from "@/lib/worklog-date";
import { formatDuration } from "@/lib/worklog-progress";
import { listWorkDays } from "@/lib/worklog-storage";
import { WorkDayEntry } from "@/types/worklog";

const HistoryPage = () => {
  const [entries, setEntries] = useState<WorkDayEntry[]>([]);
  const [monthFilter, setMonthFilter] = useState(() => formatDayKey(new Date()).slice(0, 7));

  const refreshHistory = useCallback(() => {
    listWorkDays().then((rows) => setEntries(rows));
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const visibleEntries = entries.filter((entry) => entry.dayKey.startsWith(monthFilter));
  const totals = visibleEntries.reduce(
    (summary, entry) => ({
      credit: summary.credit + (entry.calculated?.credit ?? 0),
      debt: summary.debt + (entry.calculated?.debt ?? 0),
    }),
    { credit: 0, debt: 0 },
  );

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Archivio giornate</h1>
            <p className="mt-1 text-sm text-muted-foreground">Riepilogo mensile di ore, crediti e debiti.</p>
          </div>
          <div className="flex items-center gap-2">
            <input aria-label="Filtra archivio per mese" className="h-10 rounded-md border bg-background px-3 text-sm" type="month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} />
            <Button variant="outline" onClick={refreshHistory}>Aggiorna</Button>
          </div>
        </div>

        {entries.length === 0 ? (
          <Card><CardHeader><CardTitle>Nessun dato salvato</CardTitle><CardDescription>Salva almeno una giornata dal tracker per popolare l'archivio.</CardDescription></CardHeader></Card>
        ) : visibleEntries.length === 0 ? (
          <Card><CardHeader><CardTitle>Nessuna giornata in questo mese</CardTitle><CardDescription>Prova un altro mese o torna al tracker per salvare una giornata.</CardDescription></CardHeader></Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Giornate salvate</p><p className="text-2xl font-bold">{visibleEntries.length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Credito del mese</p><p className="text-2xl font-bold text-emerald-700">{formatDuration(totals.credit)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Debito del mese</p><p className="text-2xl font-bold text-rose-700">{formatDuration(totals.debt)}</p></CardContent></Card>
            </div>
            <div className="grid gap-3">
              {visibleEntries.map((entry) => (
                <Card key={entry.dayKey}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{formatReadableDate(entry.dayKey)}</p>
                      <p className="text-sm text-muted-foreground">Ultimo aggiornamento: {new Date(entry.updatedAt).toLocaleString("it-IT")}</p>
                      {entry.calculated && (
                        <p className="mt-1 text-sm font-medium">
                          {entry.calculated.credit > 0 ? <span className="text-emerald-700">Credito: {formatDuration(entry.calculated.credit)}</span> : entry.calculated.debt > 0 ? <span className="text-rose-700">Debito: {formatDuration(entry.calculated.debt)}</span> : "Giornata regolare"}
                        </p>
                      )}
                    </div>
                    <Button asChild><Link to={`/tracker/${entry.dayKey}`}>Apri giornata</Link></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default HistoryPage;
