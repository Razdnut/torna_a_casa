import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAutoSaveEnabled, setAutoSaveEnabled } from "@/lib/worklog-storage";
import { showSuccess } from "@/utils/toast";

const SettingsPage = () => {
  const [autoSave, setAutoSave] = useState(false);

  useEffect(() => {
    getAutoSaveEnabled().then((value) => setAutoSave(value));
  }, []);

  const handleToggle = (checked: boolean) => {
    setAutoSave(checked);
    setAutoSaveEnabled(checked);
    showSuccess(checked ? "Autosalvataggio attivato" : "Autosalvataggio disattivato");
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto w-full max-w-3xl">
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
              <label htmlFor="autoSaveSetting" className="text-sm font-medium">
                Autosalvataggio dati giornata
              </label>
            </div>

            <p className="text-sm text-muted-foreground">
              Quando attivo, ogni modifica della giornata selezionata viene salvata
              automaticamente nel database locale.
            </p>

            <Button asChild className="w-full sm:w-auto">
              <Link to="/tracker">Vai al tracker</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default SettingsPage;