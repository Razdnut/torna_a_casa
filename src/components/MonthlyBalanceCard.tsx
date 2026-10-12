import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateMonthBalance, formatSignedDuration } from "@/lib/month-balance";
import { showSuccess } from "@/utils/toast";

type Balance = ReturnType<typeof calculateMonthBalance>;

export default function MonthlyBalanceCard({ balance, hasAdjustment, onSave }: {
  balance: Balance;
  hasAdjustment: boolean;
  onSave: (adjustment: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState("credit");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const monthly = balance.earned + balance.adjustment;

  function edit() {
    setKind(monthly < 0 ? "debt" : "credit");
    setHours(String(Math.floor(Math.abs(monthly) / 60)));
    setMinutes(String(Math.abs(monthly) % 60));
    setError("");
    setEditing(true);
  }
  async function save(adjustment: number | null) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onSave(adjustment);
      setEditing(false);
      showSuccess(adjustment === null ? "Saldo automatico ripristinato" : "Saldo mensile aggiornato");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito. Riprova.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>Credito e debito da riportare</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Riporto dai mesi precedenti", balance.opening],
            ["Saldo delle giornate", balance.earned],
            ["Rettifica manuale", balance.adjustment],
            ["Saldo disponibile", balance.closing],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className={`mt-1 text-xl font-semibold ${Number(value) < 0 ? "text-destructive" : "text-emerald-700"}`}>{formatSignedDuration(Number(value))}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">
          Il saldo disponibile passa al mese successivo, anche senza registrazioni.
          Il riporto riparte da zero a gennaio; lo storico degli anni precedenti resta consultabile.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={edit}>Modifica saldo del mese</Button>
          {hasAdjustment && <Button variant="outline" disabled={busy} onClick={() => void save(null)}>Ripristina saldo automatico</Button>}
        </div>
        {editing && (
          <form className="space-y-4 rounded-xl border p-4" onSubmit={(event) => {
            event.preventDefault();
            const h = Number(hours), m = Number(minutes);
            if (!hours.trim() || !minutes.trim() || !Number.isSafeInteger(h) || h < 0 || !Number.isInteger(m) || m < 0 || m > 59 || h * 60 + m > 1000000) {
              setError("Inserisci ore intere positive e minuti da 0 a 59 (massimo 1.000.000 minuti).");
              return;
            }
            const desired = (h * 60 + m) * (kind === "debt" ? -1 : 1);
            void save(desired - balance.earned);
          }}>
            <p className="font-medium">Saldo del mese, senza riporto</p>
            <p className="text-sm text-muted-foreground">Imposta il credito o debito complessivo del mese. La differenza viene salvata come rettifica; il riporto precedente si aggiunge automaticamente. Le successive modifiche alle giornate aggiornano il saldo mantenendo la rettifica.</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label htmlFor="balance-kind">Tipo</Label><select id="balance-kind" className="h-10 w-full rounded-md border bg-background px-2" value={kind} disabled={busy} onChange={(event) => setKind(event.target.value)}><option value="credit">Credito</option><option value="debt">Debito</option></select></div>
              <div className="space-y-2"><Label htmlFor="balance-hours">Ore</Label><Input id="balance-hours" type="number" min="0" max="16666" step="1" required value={hours} disabled={busy} onChange={(event) => setHours(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="balance-minutes">Minuti</Label><Input id="balance-minutes" type="number" min="0" max="59" step="1" required value={minutes} disabled={busy} onChange={(event) => setMinutes(event.target.value)} /></div>
            </div>
            <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? "Salvataggio…" : "Salva saldo"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => { setEditing(false); setError(""); }}>Annulla</Button></div>
          </form>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
