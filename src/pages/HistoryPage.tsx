import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listWorkDays } from "@/lib/worklog-storage";
import { WorkDayEntry } from "@/types/worklog";
import { formatReadableDate } from "@/lib/worklog-date";

const HistoryPage = () => {
  const [entries, setEntries] = useState<WorkDayEntry[]>([]);

  const refreshHistory = useCallback(() => {
    listWorkDays().then((rows) => setEntries(rows));
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-bold">Archivio giornate</h1>
          <Button variant="outline" onClick={refreshHistory}>
            Aggiorna
          </Button>
        </div>

        {entries.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nessun dato salvato</CardTitle>
              <CardDescription>
                Salva almeno una giornata dal tracker per popolare l'archivio.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-3">
            {entries.map((entry) => (
              <Card key={entry.dayKey}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{formatReadableDate(entry.dayKey)}</p>
                    <p className="text-sm text-muted-foreground">
                      Ultimo aggiornamento:{" "}
                      {new Date(entry.updatedAt).toLocaleString("it-IT")}
                    </p>
                  </div>
                  <Button asChild>
                    <Link to={`/tracker/${entry.dayKey}`}>Apri giornata</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default HistoryPage;