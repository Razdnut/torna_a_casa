import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDayKey, formatReadableDate } from "@/lib/worklog-date";
import { formatDuration } from "@/lib/worklog-progress";
import { listLeaveEntries, listWorkDays } from "@/lib/worklog-storage";
import { buildMonthReport, reportCsv } from "@/lib/month-report";
import { exportFile } from "@/lib/export-file";
import type { WorkDayEntry } from "@/types/worklog";
import type { LeaveEntry } from "@/types/leave";
import { showError } from "@/utils/toast";

export default function HistoryPage() {
  const [entries, setEntries] = useState<WorkDayEntry[]>([]);
  const [leaves, setLeaves] = useState<LeaveEntry[]>([]);
  const [month, setMonth] = useState(() =>
    formatDayKey(new Date()).slice(0, 7),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportChoice, setExportChoice] = useState<"csv" | "pdf" | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEntries(await listWorkDays());
      setLeaves(await listLeaveEntries());
    } catch {
      setError("Impossibile caricare l’archivio. Riprova.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const report = useMemo(
    () => buildMonthReport(month, entries, leaves),
    [month, entries, leaves],
  );
  const balance = report.totals.credit - report.totals.debt;
  async function download(kind: "csv" | "pdf") {
    setExporting(true);
    try {
      const blob =
        kind === "csv"
          ? new Blob([reportCsv(report)], { type: "text/csv;charset=utf-8" })
          : (await import("@/lib/report-pdf")).reportPdf(report);
      await exportFile(`torna-a-casa-${month}.${kind}`, blob);
      setExportChoice(null);
    } catch {
      showError("Esportazione non completata. Riprova.");
    } finally {
      setExporting(false);
    }
  }
  function requestExport(kind: "csv" | "pdf") {
    if (report.anomalies.length) setExportChoice(kind);
    else void download(kind);
  }
  return (
    <main className="min-h-screen bg-[#f3f5f2] p-4 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Il tuo tempo, in ordine
            </p>
            <h1 className="mt-1 text-3xl font-bold">Resoconto mensile</h1>
            <p className="mt-2 text-sm text-slate-500">
              Presenze, assenze e saldo delle ore in un unico archivio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="Filtra archivio per mese"
              className="h-10 rounded-md border bg-white px-3 text-sm"
              type="month"
              value={month}
              onChange={(event) => {
                if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) {
                  setMonth(event.target.value);
                  setExportChoice(null);
                }
              }}
            />
            <Button variant="outline" disabled={loading} onClick={refresh}>
              Aggiorna
            </Button>
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status">Caricamento archivio…</p>
        ) : (
          !error && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ["Ore lavorate", formatDuration(report.totals.worked)],
                  [
                    "Saldo del mese",
                    `${balance < 0 ? "−" : "+"}${formatDuration(Math.abs(balance))}`,
                  ],
                  ["Presenze valide", report.totals.validDays],
                  ["Giorni di assenza", report.totals.leaveDays],
                ].map(([label, value]) => (
                  <Card key={label} className="rounded-2xl">
                    <CardContent className="p-5">
                      <p className="text-sm text-slate-500">{label}</p>
                      <p className="mt-2 text-2xl font-semibold">{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-sm text-slate-600">
                Credito: {formatDuration(report.totals.credit)} · Debito:{" "}
                {formatDuration(report.totals.debt)} · Permessi:{" "}
                {formatDuration(report.totals.permit)}. I totali orari includono
                solo giornate complete e senza anomalie.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!report.rows.length || exporting}
                  onClick={() => requestExport("pdf")}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Esporta PDF
                </Button>
                <Button
                  variant="outline"
                  disabled={!report.rows.length || exporting}
                  onClick={() => requestExport("csv")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Esporta CSV
                </Button>
              </div>
              {exporting && <p role="status">Preparazione del file…</p>}
              {report.anomalies.length > 0 ? (
                <section
                  aria-label="Giornate da verificare"
                  className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-5"
                >
                  <h2 className="flex items-center gap-2 font-semibold text-amber-950">
                    <AlertTriangle className="h-5 w-5" />
                    {report.anomalies.length} giornate da verificare
                  </h2>
                  <p className="text-sm text-amber-900">
                    Correggi le registrazioni prima di esportare. Una giornata
                    ancora in corso può risultare incompleta.
                  </p>
                  <ul className="space-y-3">
                    {report.anomalies.map((row) => (
                      <li key={row.dayKey} className="text-sm">
                        <Link
                          className="font-semibold underline underline-offset-4"
                          to={row.record ? `/tracker/${row.dayKey}` : "/ferie"}
                        >
                          {formatReadableDate(row.dayKey)}
                        </Link>
                        <span className="ml-2">{row.issues.join(" · ")}</span>
                        {row.absences.length > 0 && (
                          <Link className="ml-2 underline" to="/ferie">
                            Rivedi assenze
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                report.rows.length > 0 && (
                  <p className="flex items-center gap-2 text-sm text-emerald-800">
                    <CheckCircle2 className="h-5 w-5" />
                    Nessuna anomalia nelle registrazioni del mese.
                  </p>
                )
              )}
              {exportChoice && (
                <section
                  aria-label="Conferma esportazione"
                  className="space-y-3 rounded-xl border bg-white p-4"
                >
                  <p>
                    Il file {exportChoice.toUpperCase()} includerà le anomalie.
                    Le giornate da verificare saranno escluse dai totali orari.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={exporting}
                      onClick={() => download(exportChoice)}
                    >
                      Esporta con anomalie
                    </Button>
                    <Button
                      variant="outline"
                      disabled={exporting}
                      onClick={() => setExportChoice(null)}
                    >
                      Torna alle correzioni
                    </Button>
                  </div>
                </section>
              )}
              {!report.rows.length ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <h2 className="font-semibold">
                      Nessuna registrazione in questo mese
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Scegli un altro mese o registra una giornata.
                    </p>
                    <Button asChild className="mt-4">
                      <Link to="/tracker">Apri tracker</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {report.rows.map((row) => (
                    <Card key={row.dayKey} className="rounded-xl">
                      <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-semibold">
                            {formatReadableDate(row.dayKey)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {row.label}
                            {row.record
                              ? ` · ${row.record.morningIn || "?"} → ${row.record.finalOut || "?"}`
                              : ""}
                          </p>
                          <p
                            className={`mt-1 text-sm ${row.issues.length ? "text-amber-800" : "text-emerald-800"}`}
                          >
                            {row.issues.length
                              ? "Da verificare · esclusa dai totali orari"
                              : row.totals
                                ? `${formatDuration(row.totals.worked)} lavorate · saldo ${row.totals.balance < 0 ? "−" : "+"}${formatDuration(Math.abs(row.totals.balance))}`
                                : "Assenza registrata"}
                          </p>
                        </div>
                        <Button asChild variant="outline">
                          <Link
                            to={
                              row.record ? `/tracker/${row.dayKey}` : "/ferie"
                            }
                          >
                            {row.record ? "Apri giornata" : "Gestisci assenza"}
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <p className="text-xs leading-relaxed text-slate-500">
                Obiettivo giornaliero 7h12, pausa minima 30 minuti, permessi da
                recuperare. Le assenze sono conteggiate dal lunedì al venerdì,
                senza esclusione delle festività. I giorni privi di
                registrazioni non sono considerati debito.
              </p>
            </>
          )
        )}
      </div>
    </main>
  );
}
