"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { WorkDayCalculated, WorkDayRecord } from "@/types/worklog";
import { formatDayKey, isValidDayKey } from "@/lib/worklog-date";
import {
  getAutoSaveEnabled,
  loadWorkDay,
  saveWorkDay,
  setAutoSaveEnabled,
} from "@/lib/worklog-storage";
import { showSuccess } from "@/utils/toast";

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

const WorkTimeTracker: React.FC<WorkTimeTrackerProps> = ({ initialDayKey }) => {
  const todayKey = formatDayKey(new Date());
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
    setCalculated(record.calculated);
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

  function getPermitDuration(): number {
    if (!usedPermit) return 0;
    const out = parseTime(permitOut);
    const inT = parseTime(permitIn);
    if (out && inT && toMinutes(inT) > toMinutes(out)) {
      return diffMinutes(out, inT);
    }
    return 0;
  }

  function buildRecord(): WorkDayRecord {
    return {
      morningIn,
      lunchOut,
      lunchIn,
      finalOut,
      pauseNoExit,
      usedPermit,
      permitOut,
      permitIn,
      calculated,
      updatedAt: new Date().toISOString(),
    };
  }

  async function handleSaveDay() {
    const record = buildRecord();
    await saveWorkDay(dayKey, record);
    setLastSavedAt(record.updatedAt);
    showSuccess(`Dati del ${dayKey} salvati`);
  }

  function handleAutoSaveToggle(value: boolean) {
    setAutoSave(value);
    setAutoSaveEnabled(value);
    showSuccess(value ? "Autosalvataggio attivato" : "Autosalvataggio disattivato");
  }

  useEffect(() => {
    if (!autoSave || !dayLoaded) return;

    const timeout = setTimeout(() => {
      const record = buildRecord();
      saveWorkDay(dayKey, record);
      setLastSavedAt(record.updatedAt);
    }, 500);

    return () => clearTimeout(timeout);
  }, [
    autoSave,
    dayLoaded,
    dayKey,
    morningIn,
    lunchOut,
    lunchIn,
    finalOut,
    pauseNoExit,
    usedPermit,
    permitOut,
    permitIn,
    calculated,
  ]);

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
  }, [morningIn, lunchOut, lunchIn, pauseNoExit, usedPermit, permitOut, permitIn]);

  const calculate = () => {
    setError(null);

    const morningInDate = parseTime(morningIn);
    const lunchOutDate = parseTime(lunchOut);
    const lunchInDate = parseTime(lunchIn);
    const finalOutDate = parseTime(finalOut);
    const permitDuration = getPermitDuration();

    if (pauseNoExit) {
      if (!morningInDate) {
        setError("Compila almeno Ingresso Mattina.");
        setCalculated(null);
        return;
      }

      if (!finalOutDate) {
        setCalculated(null);
        return;
      }

      if (toMinutes(morningInDate) < OFFICE_OPEN) {
        setError("L'orario di ingresso mattutino non può essere prima delle 7:30");
        setCalculated(null);
        return;
      }

      if (toMinutes(finalOutDate) > OFFICE_CLOSE) {
        setError("L'orario di uscita finale non può essere dopo le 19:00");
        setCalculated(null);
        return;
      }

      if (toMinutes(finalOutDate) <= toMinutes(morningInDate)) {
        setError("L'uscita finale deve essere dopo l'ingresso mattina");
        setCalculated(null);
        return;
      }

      const totalRaw = diffMinutes(morningInDate, finalOutDate);
      let total = totalRaw - PAUSA_OBBLIGATORIA_MIN;

      if (usedPermit && pauseNoExit) {
        total = totalRaw - PAUSA_OBBLIGATORIA_MIN;
      }

      let debt = 0;
      let credit = 0;

      if (totalRaw < WORK_DURATION_MIN + PAUSA_OBBLIGATORIA_MIN + permitDuration) {
        debt = WORK_DURATION_MIN + PAUSA_OBBLIGATORIA_MIN + permitDuration - totalRaw;
      } else if (totalRaw > WORK_DURATION_MIN + PAUSA_OBBLIGATORIA_MIN + permitDuration) {
        credit = totalRaw - (WORK_DURATION_MIN + PAUSA_OBBLIGATORIA_MIN + permitDuration);
      }

      const totalWithPermit = total + permitDuration;

      let totalWithPermitIfReached = total;
      let reachedWorkTime = false;
      if (usedPermit && pauseNoExit) {
        if (total > WORK_DURATION_MIN) {
          totalWithPermitIfReached = total + permitDuration;
          reachedWorkTime = true;
        } else if (total === WORK_DURATION_MIN) {
          totalWithPermitIfReached = total;
          reachedWorkTime = true;
        }
      }

      setCalculated({
        total,
        debt,
        credit,
        totalWithPermit,
        permitDuration,
        totalRaw,
        totalWithPermitIfReached,
        reachedWorkTime,
      });
      return;
    }

    if (!morningInDate || !lunchOutDate || !lunchInDate) {
      setError("Compila tutti gli orari richiesti per il calcolo.");
      setCalculated(null);
      return;
    }

    if (!finalOutDate) {
      setCalculated(null);
      return;
    }

    if (toMinutes(morningInDate) < OFFICE_OPEN) {
      setError("L'orario di ingresso mattutino non può essere prima delle 7:30");
      setCalculated(null);
      return;
    }

    if (toMinutes(finalOutDate) > OFFICE_CLOSE) {
      setError("L'orario di uscita finale non può essere dopo le 19:00");
      setCalculated(null);
      return;
    }

    if (toMinutes(lunchOutDate) < LUNCH_START) {
      setError("La pausa pranzo può iniziare solo dalle 12:00");
      setCalculated(null);
      return;
    }

    if (toMinutes(lunchInDate) > LUNCH_END) {
      setError("Il rientro dalla pausa pranzo non può essere dopo le 15:00");
      setCalculated(null);
      return;
    }

    if (toMinutes(lunchInDate) <= toMinutes(lunchOutDate)) {
      setError("L'orario di rientro deve essere dopo l'uscita in pausa");
      setCalculated(null);
      return;
    }

    if (toMinutes(lunchOutDate) <= toMinutes(morningInDate)) {
      setError("L'uscita pausa pranzo deve essere dopo l'ingresso mattina");
      setCalculated(null);
      return;
    }

    if (toMinutes(finalOutDate) <= toMinutes(lunchInDate)) {
      setError("L'uscita finale deve essere dopo il rientro pausa pranzo");
      setCalculated(null);
      return;
    }

    const pausaEffettiva = diffMinutes(lunchOutDate, lunchInDate);
    const pausaConsiderata = Math.max(pausaEffettiva, PAUSA_OBBLIGATORIA_MIN);
    const totalEffettivo = diffMinutes(morningInDate, finalOutDate) - pausaConsiderata;

    let debt = 0;
    let credit = 0;

    if (totalEffettivo < WORK_DURATION_MIN + permitDuration) {
      debt = WORK_DURATION_MIN + permitDuration - totalEffettivo;
    } else if (totalEffettivo > WORK_DURATION_MIN + permitDuration) {
      credit = totalEffettivo - (WORK_DURATION_MIN + permitDuration);
    }

    const totalWithPermit = totalEffettivo + permitDuration;
    setCalculated({
      total: totalEffettivo,
      debt,
      credit,
      totalWithPermit,
      permitDuration,
      totalRaw: totalEffettivo,
      totalWithPermitIfReached: totalWithPermit,
      reachedWorkTime: false,
    });
  };

  function getVisualWorkedMinutes() {
    if (!calculated) return 0;

    if (usedPermit && pauseNoExit) {
      if (calculated.reachedWorkTime) {
        if (calculated.total > WORK_DURATION_MIN) {
          return calculated.total + calculated.permitDuration;
        }
        return calculated.total;
      }
      return calculated.total;
    }

    if (usedPermit && calculated.permitDuration > 0) {
      return calculated.totalWithPermit;
    }

    return calculated.total;
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
          <Button onClick={handleSaveDay} className="w-full">
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
        <div>
          <label htmlFor="morningIn" className="mb-1 block font-medium">
            Ingresso Mattina (es. 07:30)
          </label>
          <Input
            id="morningIn"
            type="time"
            value={morningIn}
            onChange={(event) => setMorningIn(event.target.value)}
            min="07:30"
            max="19:00"
            required
          />
        </div>

        <div>
          <label htmlFor="lunchOut" className="mb-1 block font-medium">
            Uscita Pausa Pranzo (es. 12:00)
          </label>
          <Input
            id="lunchOut"
            type="time"
            value={lunchOut}
            onChange={(event) => setLunchOut(event.target.value)}
            min="12:00"
            max="15:00"
            required={!pauseNoExit}
            disabled={pauseNoExit}
          />
        </div>

        <div>
          <label htmlFor="lunchIn" className="mb-1 block font-medium">
            Rientro Pausa Pranzo (es. 12:30)
          </label>
          <Input
            id="lunchIn"
            type="time"
            value={lunchIn}
            onChange={(event) => setLunchIn(event.target.value)}
            min="12:30"
            max="15:00"
            required={!pauseNoExit}
            disabled={pauseNoExit}
          />
        </div>

        <div>
          <label htmlFor="finalOut" className="mb-1 block font-medium">
            Uscita Finale (opzionale)
          </label>
          <Input
            id="finalOut"
            type="time"
            value={finalOut}
            onChange={(event) => setFinalOut(event.target.value)}
            min="07:30"
            max="19:00"
          />
        </div>

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
            <div>
              <label htmlFor="permitOut" className="mb-1 block font-medium">
                Orario uscita permesso
              </label>
              <Input
                id="permitOut"
                type="time"
                value={permitOut}
                onChange={(event) => setPermitOut(event.target.value)}
                min="07:30"
                max="19:00"
              />
            </div>
            <div>
              <label htmlFor="permitIn" className="mb-1 block font-medium">
                Orario ingresso permesso
              </label>
              <Input
                id="permitIn"
                type="time"
                value={permitIn}
                onChange={(event) => setPermitIn(event.target.value)}
                min="07:30"
                max="19:00"
              />
            </div>
          </div>
        )}
      </form>

      {!pauseNoExit && lunchDuration !== null && (
        <div className="mt-4 rounded bg-gray-100 p-2 text-sm text-blue-900">
          Durata pausa pranzo: <strong>{Math.floor(lunchDuration)} minuti</strong>
        </div>
      )}

      {exitHypothesis && (
        <div className="mt-2 rounded bg-blue-100 p-2 text-sm font-semibold text-blue-900">
          Ipotesi orario uscita per {pauseNoExit ? "7h12m + 30min pausa" : "7h12m"}
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