"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import WorkProgressCard from "@/components/WorkProgressCard";
import { WorkDayCalculated, WorkDayRecord } from "@/types/worklog";
import { formatDayKey, isValidDayKey } from "@/lib/worklog-date";
import {
  calculateRecord,
  dayIssues,
  todayState,
  TARGET,
} from "@/lib/day-summary";
import { useClock } from "@/hooks/use-clock";
import {
  getAutoSaveEnabled,
  loadWorkDay,
  saveWorkDay,
  setAutoSaveEnabled,
} from "@/lib/worklog-storage";
import { showError, showSuccess } from "@/utils/toast";

type TimeString = string;

interface WorkTimeTrackerProps {
  initialDayKey?: string;
}

function parseTime(t: TimeString): Date | null {
  const [h, m] = t.split(":").map(Number);
  if (
    Number.isInteger(h) &&
    Number.isInteger(m) &&
    h >= 0 &&
    h < 24 &&
    m >= 0 &&
    m < 60
  ) {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }
  return null;
}

function formatTime(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

function diffMinutes(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 60000;
}

function addMinutes(date: Date, mins: number): Date {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + mins);
  return d;
}

function toMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function formatMinutesLabel(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
}

const WORK_DURATION_MIN = 7 * 60 + 12;
const PAUSA_OBBLIGATORIA_MIN = 30;

const OFFICE_OPEN = 7 * 60 + 30;
const OFFICE_CLOSE = 19 * 60;
const LUNCH_START = 12 * 60;
const LUNCH_END = 15 * 60;

interface TimeFieldProps {
  id: string;
  label: string;
  value: string;
  min: string;
  max: string;
  required?: boolean;
  disabled?: boolean;
  showNow: boolean;
  onChange: (value: string) => void;
}

const TimeField = ({
  id,
  label,
  value,
  min,
  max,
  required,
  disabled,
  showNow,
  onChange,
}: TimeFieldProps) => (
  <div>
    <div className="mb-1 flex items-center justify-between gap-2">
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      {showNow && !disabled && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => onChange(new Date().toTimeString().slice(0, 5))}
        >
          Ora
        </Button>
      )}
    </div>
    <Input
      id={id}
      type="time"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      min={min}
      max={max}
      required={required}
      disabled={disabled}
    />
  </div>
);

const WorkTimeTracker: React.FC<WorkTimeTrackerProps> = ({ initialDayKey }) => {
  const now = useClock();
  const todayKey = formatDayKey(now);
  const [dayKey, setDayKey] = useState<string>(
    initialDayKey && isValidDayKey(initialDayKey) ? initialDayKey : todayKey,
  );

  const [morningIn, setMorningIn] = useState<TimeString>("");
  const [lunchOut, setLunchOut] = useState<TimeString>("");
  const [lunchIn, setLunchIn] = useState<TimeString>("");
  const [finalOut, setFinalOut] = useState<TimeString>("");
  const [pauseNoExit, setPauseNoExit] = useState(false);

  const [usedPermit, setUsedPermit] = useState(false);
  const [permitOut, setPermitOut] = useState<TimeString>("");
  const [permitIn, setPermitIn] = useState<TimeString>("");

  const [calculated, setCalculated] = useState<WorkDayCalculated | null>(null);
  const [lunchDuration, setLunchDuration] = useState<number | null>(null);
  const [exitHypothesis, setExitHypothesis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [autoSave, setAutoSave] = useState(false);
  const [dayLoaded, setDayLoaded] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const canSetCurrentTime = dayKey === todayKey;
  const morningInDate = parseTime(morningIn);

  const currentRecord: WorkDayRecord = {
    morningIn,
    lunchOut,
    lunchIn,
    finalOut,
    pauseNoExit,
    usedPermit,
    permitOut,
    permitIn,
    calculated: null,
    updatedAt: now.toISOString(),
  };
  const live = todayState(
    currentRecord,
    canSetCurrentTime
      ? now.getHours() * 60 + now.getMinutes()
      : morningInDate
        ? toMinutes(morningInDate)
        : 0,
  );
  const progress = morningInDate
    ? {
        workedMinutes: live.worked,
        countedMinutes: live.worked,
        permitMinutes: 0,
        targetMinutes: TARGET,
        percentage: Math.min(100, Math.round((live.worked / TARGET) * 100)),
        status: (live.worked >= TARGET ? "complete" : "in-progress") as
          "complete" | "in-progress",
        detail: live.status,
      }
    : null;
  useEffect(() => {
    if (initialDayKey && isValidDayKey(initialDayKey)) {
      setDayKey(initialDayKey);
    }
  }, [initialDayKey]);

  useEffect(() => {
    getAutoSaveEnabled().then((value) => setAutoSave(value));
  }, []);

  function applyRecord(record: WorkDayRecord | null) {
    if (!record) {
      setMorningIn("");
      setLunchOut("");
      setLunchIn("");
      setFinalOut("");
      setPauseNoExit(false);
      setUsedPermit(false);
      setPermitOut("");
      setPermitIn("");
      setCalculated(null);
      setLunchDuration(null);
      setExitHypothesis(null);
      setError(null);
      return;
    }

    setMorningIn(record.morningIn);
    setLunchOut(record.lunchOut);
    setLunchIn(record.lunchIn);
    setFinalOut(record.finalOut);
    setPauseNoExit(record.pauseNoExit);
    setUsedPermit(record.usedPermit);
    setPermitOut(record.permitOut);
    setPermitIn(record.permitIn);
    setCalculated(calculateRecord(record));
    setError(null);
  }

  useEffect(() => {
    let active = true;
    setDayLoaded(false);

    loadWorkDay(dayKey).then((record) => {
      if (!active) return;
      applyRecord(record);
      setLastSavedAt(record?.updatedAt ?? null);
      setDayLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [dayKey]);

  const getPermitDuration = useCallback((): number => {
    if (!usedPermit) return 0;
    const out = parseTime(permitOut);
    const inT = parseTime(permitIn);
    if (out && inT && toMinutes(inT) > toMinutes(out)) {
      return diffMinutes(out, inT);
    }
    return 0;
  }, [permitIn, permitOut, usedPermit]);

  const buildRecord = useCallback((): WorkDayRecord => {
    return {
      morningIn,
      lunchOut,
      lunchIn,
      finalOut,
      pauseNoExit,
      usedPermit,
      permitOut,
      permitIn,
      calculated: calculateRecord({
        morningIn,
        lunchOut,
        lunchIn,
        finalOut,
        pauseNoExit,
        usedPermit,
        permitOut,
        permitIn,
        calculated: null,
        updatedAt: new Date().toISOString(),
      }),
      updatedAt: new Date().toISOString(),
    };
  }, [
    finalOut,
    lunchIn,
    lunchOut,
    morningIn,
    pauseNoExit,
    permitIn,
    permitOut,
    usedPermit,
  ]);

  async function handleSaveDay() {
    if (!dayLoaded || !isValidDayKey(dayKey)) return;
    const record = buildRecord();
    try {
      await saveWorkDay(dayKey, record);
    } catch {
      showError("Salvataggio non riuscito. Riprova.");
      return;
    }
    setLastSavedAt(record.updatedAt);
    setCalculated(record.calculated);
    showSuccess(`Dati del ${dayKey} salvati`);
  }

  function handleAutoSaveToggle(value: boolean) {
    setAutoSave(value);
    setAutoSaveEnabled(value);
    showSuccess(
      value ? "Autosalvataggio attivato" : "Autosalvataggio disattivato",
    );
  }

  useEffect(() => {
    if (!autoSave || !dayLoaded) return;

    const timeout = setTimeout(() => {
      const record = buildRecord();
      saveWorkDay(dayKey, record)
        .then(() => setLastSavedAt(record.updatedAt))
        .catch(() => showError("Autosalvataggio non riuscito. Riprova."));
    }, 500);

    return () => clearTimeout(timeout);
  }, [autoSave, buildRecord, dayLoaded, dayKey]);

  useEffect(() => {
    const lunchOutDate = parseTime(lunchOut);
    const lunchInDate = parseTime(lunchIn);

    if (
      !pauseNoExit &&
      lunchOutDate &&
      lunchInDate &&
      toMinutes(lunchInDate) > toMinutes(lunchOutDate)
    ) {
      setLunchDuration(diffMinutes(lunchOutDate, lunchInDate));
    } else {
      setLunchDuration(null);
    }
  }, [lunchOut, lunchIn, pauseNoExit]);

  useEffect(() => {
    const permitDuration = getPermitDuration();

    if (pauseNoExit) {
      const morningInDate = parseTime(morningIn);
      if (morningInDate) {
        const exit = addMinutes(
          morningInDate,
          WORK_DURATION_MIN + PAUSA_OBBLIGATORIA_MIN + permitDuration,
        );
        setExitHypothesis(formatTime(exit));
      } else {
        setExitHypothesis(null);
      }
      return;
    }

    const morningInDate = parseTime(morningIn);
    const lunchOutDate = parseTime(lunchOut);
    const lunchInDate = parseTime(lunchIn);

    if (
      morningInDate &&
      lunchOutDate &&
      lunchInDate &&
      toMinutes(lunchInDate) > toMinutes(lunchOutDate)
    ) {
      const morningBlock = diffMinutes(morningInDate, lunchOutDate);
      const pausaEffettiva = diffMinutes(lunchOutDate, lunchInDate);
      const pausaConsiderata = Math.max(pausaEffettiva, PAUSA_OBBLIGATORIA_MIN);
      const remaining = WORK_DURATION_MIN - morningBlock;
      const exit = addMinutes(
        lunchInDate,
        remaining + (pausaConsiderata - pausaEffettiva) + permitDuration,
      );
      setExitHypothesis(formatTime(exit));
    } else {
      setExitHypothesis(null);
    }
  }, [getPermitDuration, lunchIn, lunchOut, morningIn, pauseNoExit]);

  const calculate = () => {
    const issues = dayIssues(currentRecord);
    setError(issues.length ? issues.join(". ") : null);
    setCalculated(calculateRecord(currentRecord));
  };

  function getVisualWorkedMinutes() {
    return calculateRecord(currentRecord)?.total ?? 0;
  }
  const showPausaMinimaMsg =
    pauseNoExit ||
    (!pauseNoExit &&
      lunchDuration !== null &&
      lunchDuration < PAUSA_OBBLIGATORIA_MIN);

  return (
    <div className="mx-auto w-full max-w-md rounded-md bg-white p-6 shadow-md">
      <h2 className="mb-4 text-center text-2xl font-semibold">
        Monitoraggio Orario Lavoro
      </h2>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="dayKey" className="mb-1 block font-medium">
            Giorno
          </label>
          <Input
            id="dayKey"
            type="date"
            value={dayKey}
            onChange={(event) => setDayKey(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={handleSaveDay}
            disabled={!dayLoaded}
            className="w-full"
          >
            Salva giornata
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center space-x-2">
        <Checkbox
          id="autoSave"
          checked={autoSave}
          onCheckedChange={(checked) => handleAutoSaveToggle(!!checked)}
        />
        <label htmlFor="autoSave" className="text-sm font-medium">
          Autosalvataggio
        </label>
      </div>

      {lastSavedAt && (
        <div className="mb-4 rounded bg-gray-100 p-2 text-sm text-gray-700">
          Ultimo salvataggio:{" "}
          <strong>{new Date(lastSavedAt).toLocaleString("it-IT")}</strong>
        </div>
      )}

      <WorkProgressCard progress={progress} />

      {showPausaMinimaMsg && (
        <div className="mb-4 rounded bg-blue-100 p-2 text-sm font-semibold text-blue-900">
          Hai fatto una pausa pranzo inferiore a 30 min, ma verrà conteggiata
          comunque
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
        className="space-y-4"
      >
        <TimeField
          id="morningIn"
          label="Ingresso Mattina (es. 07:30)"
          value={morningIn}
          onChange={setMorningIn}
          min="07:30"
          max="19:00"
          required
          showNow={canSetCurrentTime}
        />

        <TimeField
          id="lunchOut"
          label="Uscita Pausa Pranzo (es. 12:00)"
          value={lunchOut}
          onChange={setLunchOut}
          min="12:00"
          max="15:00"
          required={!pauseNoExit}
          disabled={pauseNoExit}
          showNow={canSetCurrentTime}
        />

        <TimeField
          id="lunchIn"
          label="Rientro Pausa Pranzo (es. 12:30)"
          value={lunchIn}
          onChange={setLunchIn}
          min="12:30"
          max="15:00"
          required={!pauseNoExit}
          disabled={pauseNoExit}
          showNow={canSetCurrentTime}
        />

        <TimeField
          id="finalOut"
          label="Uscita Finale (opzionale)"
          value={finalOut}
          onChange={setFinalOut}
          min="07:30"
          max="19:00"
          showNow={canSetCurrentTime}
        />

        <div className="mt-2 flex items-center space-x-2">
          <Checkbox
            id="pauseNoExit"
            checked={pauseNoExit}
            onCheckedChange={(checked) => setPauseNoExit(!!checked)}
          />
          <label htmlFor="pauseNoExit" className="text-sm font-medium">
            Pausa pranzo senza uscita
          </label>
        </div>

        <div className="mt-2 flex items-center space-x-2">
          <Checkbox
            id="usedPermit"
            checked={usedPermit}
            onCheckedChange={(checked) => setUsedPermit(!!checked)}
          />
          <label htmlFor="usedPermit" className="text-sm font-medium">
            Hai usato permessi?
          </label>
        </div>

        {usedPermit && (
          <div className="mt-2 space-y-2">
            <TimeField
              id="permitOut"
              label="Orario uscita permesso"
              value={permitOut}
              onChange={setPermitOut}
              min="07:30"
              max="19:00"
              showNow={canSetCurrentTime}
            />
            <TimeField
              id="permitIn"
              label="Orario ingresso permesso"
              value={permitIn}
              onChange={setPermitIn}
              min="07:30"
              max="19:00"
              showNow={canSetCurrentTime}
            />
          </div>
        )}
      </form>

      {!pauseNoExit && lunchDuration !== null && (
        <div className="mt-4 rounded bg-gray-100 p-2 text-sm text-blue-900">
          Durata pausa pranzo:{" "}
          <strong>{Math.floor(lunchDuration)} minuti</strong>
        </div>
      )}

      {exitHypothesis && (
        <div className="mt-2 rounded bg-blue-100 p-2 text-sm font-semibold text-blue-900">
          Ipotesi orario uscita per{" "}
          {pauseNoExit ? "7h12m + 30min pausa" : "7h12m"}
          {usedPermit && getPermitDuration() > 0
            ? ` + permesso (${Math.round(getPermitDuration())} min)`
            : ""}
          : <strong>{exitHypothesis}</strong>
        </div>
      )}

      <div className="mt-4">
        <Button onClick={calculate} className="w-full" variant="default">
          Calcola orario uscita
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded bg-red-100 p-3 text-red-700">{error}</div>
      )}

      {calculated && (
        <div className="mt-4 space-y-2">
          <p>
            Ore lavorate (escluse pause):{" "}
            <strong>{formatMinutesLabel(getVisualWorkedMinutes())}</strong>
          </p>

          {calculated.debt > 0 && (
            <p className="font-semibold text-red-700">
              Debito giornaliero: {formatMinutesLabel(calculated.debt)}
            </p>
          )}

          {calculated.credit > 0 && (
            <p className="font-semibold text-green-700">
              Credito giornaliero: {formatMinutesLabel(calculated.credit)}
            </p>
          )}

          {calculated.debt === 0 && calculated.credit === 0 && (
            <p className="font-semibold text-green-700">
              Nessun debito, giornata regolare!
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkTimeTracker;
