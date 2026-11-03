import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { OvertimeMonth } from "@/lib/overtime-month";
import { formatDuration } from "@/lib/worklog-progress";
import { showSuccess } from "@/utils/toast";

export default function OvertimeCard({ overtime, onSaveGoal }: {
  overtime: OvertimeMonth;
  onSaveGoal: (minutes: number | null) => Promise<void>;
}) {
  const goal = overtime.goal;
  const [hours, setHours] = useState(String(Math.floor((goal ?? 0) / 60)));
  const [minutes, setMinutes] = useState(String((goal ?? 0) % 60));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const percent = goal ? Math.min(100, Math.round((overtime.done / goal) * 100)) : 0;

  async function save(value: number | null) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onSaveGoal(value);
      if (value === null) {
        setHours("0");
        setMinutes("0");
      }
      showSuccess(value === null ? "Obiettivo rimosso" : "Obiettivo salvato");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>Straordinario del mese</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Ore fatte</p>
          <p className="mt-1 text-2xl font-semibold">{formatDuration(overtime.done)}</p>
        </div>
        {goal !== null && (
          <div className="space-y-2">
            <Progress value={percent} aria-label="Avanzamento obiettivo straordinario" />
            <p className="text-sm">
              Obiettivo {formatDuration(goal)} · {overtime.reached ? "Obiettivo raggiunto" : `Mancano ${formatDuration(overtime.remaining ?? 0)}`}
            </p>
          </div>
        )}
        <form className="space-y-3 rounded-xl border p-4" onSubmit={(event) => {
          event.preventDefault();
          const h = Number(hours), m = Number(minutes);
          const total = h * 60 + m;
          if (!hours.trim() || !minutes.trim() || !Number.isSafeInteger(h) || h < 0 || !Number.isInteger(m) || m < 0 || m > 59 || total < 1 || total > 1000000) {
            setError("Inserisci ore intere e minuti da 0 a 59, per almeno 1 minuto (massimo 1.000.000 minuti).");
            return;
          }
          void save(total);
        }}>
          <p className="font-medium">Obiettivo del mese</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="overtime-hours">Ore</Label><Input id="overtime-hours" type="number" min="0" max="16666" step="1" required value={hours} disabled={busy} onChange={(event) => setHours(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="overtime-minutes">Minuti</Label><Input id="overtime-minutes" type="number" min="0" max="59" step="1" required value={minutes} disabled={busy} onChange={(event) => setMinutes(event.target.value)} /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Salvataggio…" : "Salva obiettivo"}</Button>
            {goal !== null && <Button type="button" variant="outline" disabled={busy} onClick={() => void save(null)}>Rimuovi obiettivo</Button>}
          </div>
        </form>
        <p className="text-sm text-muted-foreground">Il contatore riparte da zero ogni mese.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
