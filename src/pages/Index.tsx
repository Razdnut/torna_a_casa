import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  Coffee,
  CalendarDays,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useClock } from "@/hooks/use-clock";
import {
  calculateRecord,
  clockTime,
  dayIssues,
  emptyDay,
  TARGET,
  todayState,
} from "@/lib/day-summary";
import { formatDayKey } from "@/lib/worklog-date";
import { formatDuration } from "@/lib/worklog-progress";
import {
  getLeaveAllowances,
  listLeaveEntries,
  listWorkDays,
  loadWorkDay,
  saveWorkDay,
} from "@/lib/worklog-storage";
import { calculateLeaveBalances, getCategoryLabel } from "@/lib/leave";
import { buildMonthReport } from "@/lib/month-report";
import type { WorkDayRecord } from "@/types/worklog";
import { showError, showSuccess } from "@/utils/toast";

const labels = {
  morningIn: "Registra ingresso",
  lunchOut: "Inizia pausa",
  lunchIn: "Rientra dalla pausa",
  permitIn: "Rientra dal permesso",
  finalOut: "Registra uscita",
};

export default function Index() {
  const now = useClock(),
    dayKey = formatDayKey(now);
  const [record, setRecord] = useState<WorkDayRecord>(emptyDay);
  const [loadedDay, setLoadedDay] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [summary, setSummary] = useState({
    balance: 0,
    leave: 0,
    year: 0,
    next: "Nessuna assenza pianificata",
    absentToday: false,
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    (async () => {
      const current = await loadWorkDay(dayKey);
      const days = await listWorkDays();
      const leaves = await listLeaveEntries();
      const allowances = await getLeaveAllowances();
      const report = buildMonthReport(dayKey.slice(0, 7), days, leaves);
      const balances = calculateLeaveBalances(leaves, allowances).filter(
        (row) =>
          row.category === "annual-current" ||
          row.category === "annual-previous",
      );
      const next = leaves
        .filter((leave) => leave.endDay >= dayKey)
        .sort((a, b) => a.startDay.localeCompare(b.startDay))[0];
      const weekday = new Date(`${dayKey}T12:00:00`).getDay();
      if (active) {
        setRecord(current ?? emptyDay());
        setLoadedDay(dayKey);
        setSummary({
          balance: report.totals.credit - report.totals.debt,
          leave: balances.reduce((sum, row) => sum + row.remaining, 0),
          year: allowances.year,
          next: next
            ? `${getCategoryLabel(next.category)} · ${new Date(`${next.startDay}T12:00:00`).toLocaleDateString("it-IT")}`
            : "Nessuna assenza pianificata",
          absentToday:
            leaves.some(
              (leave) => leave.startDay <= dayKey && leave.endDay >= dayKey,
            ) &&
            weekday !== 0 &&
            weekday !== 6,
        });
      }
    })().catch(() => {
      if (active)
        setError(
          "Impossibile caricare la giornata. Riprova prima di registrare un orario.",
        );
    });
    return () => {
      active = false;
    };
  }, [dayKey, revision]);
  const reference = now.getHours() * 60 + now.getMinutes();
  const state = todayState(record, reference);
  const problems = dayIssues(record, false);
  const ready = loadedDay === dayKey && !busy && !error;

  async function register(field: keyof typeof labels | "pauseNoExit") {
    if (!ready || saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      const timestamp = new Date();
      if (formatDayKey(timestamp) !== dayKey)
        throw new Error(
          "È iniziata una nuova giornata: attendi il caricamento.",
        );
      const next = {
        ...record,
        [field]:
          field === "pauseNoExit" ? true : timestamp.toTimeString().slice(0, 5),
        updatedAt: timestamp.toISOString(),
      };
      const issues = dayIssues(next, field === "finalOut");
      if (issues.length) throw new Error(issues[0]);
      next.calculated = calculateRecord(next);
      await saveWorkDay(dayKey, next);
      setRecord(next);
      setRevision((value) => value + 1);
      showSuccess(
        field === "pauseNoExit"
          ? "Pausa senza uscita impostata"
          : `${labels[field]}: ${timestamp.toTimeString().slice(0, 5)}`,
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Salvataggio non riuscito. Riprova.",
      );
    } finally {
      setBusy(false);
      saving.current = false;
    }
  }

  const timeline = [
    ["Ingresso", record.morningIn],
    [
      record.pauseNoExit ? "Pausa inclusa" : "Pausa",
      record.pauseNoExit ? "30 min" : record.lunchOut,
    ],
    ["Rientro", record.pauseNoExit ? "Non previsto" : record.lunchIn],
    ["Uscita", record.finalOut],
  ];
  return (
    <main className="min-h-screen bg-[#f3f5f2] px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-sm font-medium capitalize text-slate-500">
              {now.toLocaleDateString("it-IT", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              La tua giornata, a colpo d’occhio.
            </h1>
          </div>
          <Sun
            className="hidden h-9 w-9 text-amber-500 sm:block"
            aria-hidden="true"
          />
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4"
          >
            {error}
            <Button
              className="ml-3"
              onClick={() => setRevision((value) => value + 1)}
            >
              Riprova
            </Button>
          </div>
        )}
        <section className="overflow-hidden rounded-3xl bg-[#124d43] text-white shadow-lg">
          <div className="grid gap-8 p-6 sm:p-9 md:grid-cols-[1.2fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                {loadedDay !== dayKey ? "Caricamento…" : state.status}
              </span>
              <p className="mt-7 text-sm text-emerald-100">
                {state.done
                  ? "Hai registrato l’uscita alle"
                  : "Oggi puoi uscire alle"}
              </p>
              <p className="my-2 text-6xl font-semibold tracking-tight tabular-nums sm:text-7xl">
                {loadedDay !== dayKey || problems.length
                  ? "—:—"
                  : state.done
                    ? record.finalOut
                    : state.exit === null
                      ? "—:—"
                      : clockTime(state.exit)}
              </p>
              <p className="min-h-6 text-emerald-100">
                {state.done
                  ? "Giornata salvata. Buon rientro a casa!"
                  : problems.length
                    ? "Correggi gli orari per aggiornare la previsione."
                    : state.exit === null
                      ? "Registra l’ingresso per iniziare."
                      : state.exit > 1140
                        ? "L’obiettivo supera le 19:00: verifica la giornata."
                        : reference >= state.exit
                          ? "Obiettivo raggiunto. Puoi registrare l’uscita."
                          : `Mancano ${formatDuration(state.exit - reference)} al tuo obiettivo.`}
              </p>
              {!state.done && state.exit !== null && (
                <p className="mt-3 text-xs leading-relaxed text-emerald-100/80">
                  {state.inPause || state.inPermit
                    ? "La previsione si aggiorna durante l’assenza."
                    : !record.pauseNoExit && !record.lunchOut
                      ? "Stima con 30 minuti di pausa pranzo."
                      : "Pausa minima di 30 minuti e permessi da recuperare inclusi."}
                </p>
              )}
            </div>
            <div className="flex flex-col justify-center rounded-2xl border border-white/15 bg-white/5 p-5">
              <div className="mb-3 flex items-center justify-between gap-2 text-sm">
                <span>Ore lavorate</span>
                <span className="tabular-nums">
                  {formatDuration(state.worked)} / 7h 12m
                </span>
              </div>
              <Progress
                value={Math.min(100, (state.worked / TARGET) * 100)}
                className="mb-5 h-2 bg-white/20 [&>div]:bg-emerald-300"
              />
              {state.action ? (
                <Button
                  disabled={
                    !ready ||
                    problems.length > 0 ||
                    (summary.absentToday && !record.morningIn)
                  }
                  onClick={() => register(state.action!)}
                  className="h-12 w-full bg-white text-base text-[#124d43] hover:bg-emerald-50"
                >
                  {busy ? "Salvataggio…" : labels[state.action]}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  asChild
                  className="h-12 bg-white text-[#124d43] hover:bg-emerald-50"
                >
                  <Link to={`/tracker/${dayKey}`}>Rivedi la giornata</Link>
                </Button>
              )}
              {state.action === "lunchOut" && (
                <button
                  disabled={!ready}
                  className="mt-3 py-2 text-sm text-emerald-100 underline underline-offset-4 disabled:opacity-50"
                  onClick={() => register("pauseNoExit")}
                >
                  Oggi faccio pausa senza uscita
                </button>
              )}
              <Link
                to={`/tracker/${dayKey}`}
                className="mt-3 py-2 text-center text-sm text-emerald-100 underline underline-offset-4"
              >
                Modifica orari e permessi
              </Link>
            </div>
          </div>
          <ol className="grid grid-cols-2 gap-4 border-t border-white/10 bg-black/10 px-6 py-5 sm:grid-cols-4 sm:px-9">
            {timeline.map(([label, value], index) => (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${value ? "bg-emerald-200 text-emerald-950" : "border border-white/25 text-white/60"}`}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-xs text-emerald-100">{label}</p>
                  <p className="font-medium tabular-nums">
                    {value || "Da registrare"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        {(problems.length > 0 || summary.absentToday) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            {summary.absentToday
              ? "Oggi hai un’assenza pianificata. Verificala nella sezione Ferie prima di registrare una presenza. "
              : ""}
            {problems.join(". ")}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <Clock3 className="mb-4 h-5 w-5 text-emerald-700" />
              <p className="text-sm text-slate-500">
                Saldo del mese · presenze valide
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.balance < 0 ? "−" : "+"}
                {formatDuration(Math.abs(summary.balance))}
              </p>
              <Link
                className="mt-3 inline-block text-sm underline underline-offset-4"
                to="/archivio"
              >
                Apri il resoconto
              </Link>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <Coffee className="mb-4 h-5 w-5 text-amber-600" />
              <p className="text-sm text-slate-500">
                Ferie residue {summary.year || ""}
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.leave} giorni
              </p>
              <Link
                className="mt-3 inline-block text-sm underline underline-offset-4"
                to="/ferie"
              >
                Gestisci ferie e permessi
              </Link>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <CalendarDays className="mb-4 h-5 w-5 text-blue-600" />
              <p className="text-sm text-slate-500">Prossima assenza</p>
              <p className="mt-2 font-semibold">{summary.next}</p>
              <Link
                className="mt-3 inline-block text-sm underline underline-offset-4"
                to="/calendario"
              >
                Apri calendario
              </Link>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Le azioni rapide salvano subito la giornata.
          </span>
          <Link to="/impostazioni" className="underline underline-offset-4">
            Backup e ripristino
          </Link>
        </div>
      </div>
    </main>
  );
}
