import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createBackup,
  getLastBackup,
  restoreBackup,
  setLastBackup,
} from "@/lib/worklog-storage";
import { parseBackup, type BackupData } from "@/lib/backup-data";
import { exportFile } from "@/lib/export-file";
import { showSuccess } from "@/utils/toast";

export default function BackupCard({ onRestored }: { onRestored: () => void }) {
  const [last, setLast] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    data: BackupData;
    conflicts: number;
    newDays: number;
    newLeaves: number;
  } | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    getLastBackup()
      .then(setLast)
      .catch(() => setError("Impossibile leggere la data dell’ultimo backup."));
  }, []);
  async function download() {
    setBusy(true);
    setError("");
    try {
      const data = await createBackup();
      await exportFile(
        `torna-a-casa-backup-${data.createdAt.slice(0, 10)}.json`,
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      await setLastBackup(data.createdAt);
      setLast(data.createdAt);
      showSuccess(
        "Backup esportato. Conserva il file per ripristinare i dati.",
      );
    } catch {
      setError(
        "Esportazione non completata. Riprova e scegli dove salvare il file.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function inspect(file?: File) {
    setPreview(null);
    setOverwrite(false);
    setError("");
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("Il backup supera il limite di 20 MB.");
      const data = parseBackup(await file.text());
      const current = await createBackup();
      const dayKeys = new Set(current.days.map((day) => day.dayKey)),
        leaveIds = new Set(current.leaves.map((leave) => leave.id));
      const newDays = data.days.filter(
        (day) => !dayKeys.has(day.dayKey),
      ).length;
      const newLeaves = data.leaves.filter(
        (leave) => !leaveIds.has(leave.id),
      ).length;
      setPreview({
        data,
        newDays,
        newLeaves,
        conflicts: data.days.length + data.leaves.length - newDays - newLeaves,
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossibile leggere il backup.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      await restoreBackup(preview.data, overwrite);
      setPreview(null);
      onRestored();
      showSuccess("Ripristino completato. Dati e impostazioni aggiornati.");
    } catch {
      setError("Ripristino non riuscito. Nessuna modifica applicata: riprova.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Backup e ripristino</CardTitle>
        <CardDescription>
          Porta con te giornate, ferie, permessi, plafond e impostazioni.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
          <strong>Ultima esportazione:</strong>{" "}
          {last
            ? new Date(last).toLocaleString("it-IT")
            : "Nessun backup esportato"}
          <p className="mt-1">
            Il file contiene i tuoi dati in chiaro. Conservalo in un luogo
            privato.
          </p>
        </div>
        <Button disabled={busy} onClick={download}>
          <Download className="mr-2 h-4 w-4" />
          Esporta backup completo
        </Button>
        <div className="space-y-2 border-t pt-5">
          <Label htmlFor="backup-file" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importa un backup
          </Label>
          <Input
            id="backup-file"
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(event) => {
              void inspect(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <p className="text-xs text-muted-foreground">
            File JSON di Torna a Casa, massimo 20 MB. Prima del ripristino
            vedrai un’anteprima.
          </p>
        </div>
        {busy && (
          <p role="status" className="text-sm">
            Operazione in corso…
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {preview && (
          <section
            aria-label="Anteprima ripristino"
            className="space-y-4 rounded-xl border p-4"
          >
            <h3 className="font-semibold">
              Backup del{" "}
              {new Date(preview.data.createdAt).toLocaleString("it-IT")}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p>
                <strong>{preview.data.days.length}</strong> giornate (
                {preview.newDays} nuove)
              </p>
              <p>
                <strong>{preview.data.leaves.length}</strong> assenze (
                {preview.newLeaves} nuove)
              </p>
            </div>
            <p className="text-sm">
              {preview.conflicts} registrazioni già presenti. Le registrazioni
              non contenute nel file saranno mantenute. Autosalvataggio e
              plafond saranno aggiornati con quelli del backup (anno{" "}
              {preview.data.settings.allowances.year}).
            </p>
            <div className="flex items-start gap-2">
              <Checkbox
                id="backup-overwrite"
                checked={overwrite}
                disabled={busy}
                onCheckedChange={(value) => setOverwrite(value === true)}
              />
              <Label htmlFor="backup-overwrite" className="leading-5">
                Sostituisci anche le registrazioni già presenti. Se disattivato,
                mantieni quelle attuali.
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={restore}>
                Conferma ripristino
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setPreview(null)}
              >
                Annulla
              </Button>
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
