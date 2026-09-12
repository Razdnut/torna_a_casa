import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  clearAllWorklogData,
  getAutoSaveEnabled,
  getLeaveAllowances,
  setLeaveAllowances,
  setAutoSaveEnabled,
} from "@/lib/worklog-storage";
import { defaultLeaveAllowances, LEAVE_CATEGORIES } from "@/lib/leave";
import { LeaveAllowanceSettings } from "@/types/leave";
import { showError, showSuccess } from "@/utils/toast";
import BackupCard from "@/components/BackupCard";

const SettingsPage = () => {
  const [autoSave, setAutoSave] = useState(false);
  const [allowances, setAllowances] = useState<LeaveAllowanceSettings>(
    defaultLeaveAllowances(),
  );
  const [isSavingAllowances, setIsSavingAllowances] = useState(false);

  useEffect(() => {
    getAutoSaveEnabled().then((value) => setAutoSave(value));
    getLeaveAllowances().then(setAllowances);
  }, []);

  const handleToggle = (checked: boolean) => {
    setAutoSave(checked);
    setAutoSaveEnabled(checked);
    showSuccess(
      checked ? "Autosalvataggio attivato" : "Autosalvataggio disattivato",
    );
  };

  const updateAllowance = (
    field: keyof LeaveAllowanceSettings,
    rawValue: string,
  ) => {
    const parsed = Number(rawValue);
    setAllowances((current) => ({
      ...current,
      [field]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
    }));
  };

  const handleSaveAllowances = async () => {
    if (
      !Number.isInteger(allowances.year) ||
      allowances.year < 2000 ||
      allowances.year > 2100
    ) {
      showError("Inserisci un anno compreso tra 2000 e 2100");
      return;
    }

    setIsSavingAllowances(true);
    try {
      await setLeaveAllowances(allowances);
      showSuccess("Plafond ferie e permessi salvati");
    } catch {
      showError("Impossibile salvare i plafond");
    } finally {
      setIsSavingAllowances(false);
    }
  };

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      "Vuoi eliminare tutti i dati locali salvati? Questa azione non è reversibile.",
    );

    if (!confirmed) {
      return;
    }

    await clearAllWorklogData();
    setAutoSave(false);
    setAllowances(defaultLeaveAllowances());
    showSuccess("Tutti i dati locali sono stati eliminati");
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="space-y-4">
          <BackupCard
            onRestored={() => {
              getAutoSaveEnabled().then(setAutoSave);
              getLeaveAllowances().then(setAllowances);
            }}
          />
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni</CardTitle>
              <CardDescription>
                Configura il comportamento del salvataggio giornaliero.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoSaveSetting"
                  checked={autoSave}
                  onCheckedChange={(checked) => handleToggle(!!checked)}
                />
                <label
                  htmlFor="autoSaveSetting"
                  className="text-sm font-medium"
                >
                  Autosalvataggio dati giornata
                </label>
              </div>

              <p className="text-sm text-muted-foreground">
                Quando attivo, ogni modifica della giornata selezionata viene
                salvata automaticamente nel database locale.
              </p>

              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p className="mb-3 text-sm text-destructive">
                  Elimina cronologia e impostazioni locali da questo
                  dispositivo.
                </p>
                <Button variant="destructive" onClick={handleClearAllData}>
                  Elimina tutti i dati locali
                </Button>
              </div>

              <Button asChild className="w-full sm:w-auto">
                <Link to="/tracker">Vai al tracker</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plafond ferie e permessi</CardTitle>
              <CardDescription>
                Imposta i giorni disponibili. I residui vengono calcolati nella
                sezione Ferie usando solo i giorni lavorativi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-48 space-y-2">
                <Label htmlFor="leave-year">Anno di riferimento</Label>
                <Input
                  id="leave-year"
                  type="number"
                  min={2000}
                  max={2100}
                  step={1}
                  inputMode="numeric"
                  value={allowances.year}
                  onChange={(event) =>
                    updateAllowance("year", event.target.value)
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {LEAVE_CATEGORIES.map((category) => (
                  <div key={category.id} className="space-y-2">
                    <Label htmlFor={`allowance-${category.id}`}>
                      {category.id === "annual-current"
                        ? `${category.label} ${allowances.year}`
                        : category.label}
                    </Label>
                    <div className="relative">
                      <Input
                        id={`allowance-${category.id}`}
                        type="number"
                        min={0}
                        step={0.5}
                        inputMode="decimal"
                        className="pr-16"
                        value={allowances[category.allowanceField]}
                        onChange={(event) =>
                          updateAllowance(
                            category.allowanceField,
                            event.target.value,
                          )
                        }
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                        giorni
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                onClick={handleSaveAllowances}
                disabled={isSavingAllowances}
              >
                {isSavingAllowances ? "Salvataggio…" : "Salva plafond"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default SettingsPage;
