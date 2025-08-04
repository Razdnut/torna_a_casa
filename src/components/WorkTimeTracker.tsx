"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

type TimeString = string; // "HH:mm"

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

function fromMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

const WORK_DURATION_MIN = 7 * 60 + 12; // 7h12m = 432 min (solo lavoro, pausa esclusa)
const MIN_WORK_MIN = 3 * 60 + 36; // 3h36m = 216 min
const LUNCH_MIN = 30;
const OFFICE_OPEN = 7 * 60 + 30; // 7:30 in minuti
const OFFICE_CLOSE = 19 * 60; // 19:00 in minuti
const LUNCH_START = 12 * 60; // 12:00
const LUNCH_END = 15 * 60; // 15:00
const MIN_WORK_FOR_LUNCH = 6 * 60; // 6h = 360 min
const LATEST_3H36M_TIME = 14 * 60 + 12; // 14:12 in minuti

function toMinutes(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

const WorkTimeTracker = () => {
  const [morningIn, setMorningIn] = useState<TimeString>("");
  const [lunchOut, setLunchOut] = useState<TimeString>("");
  const [lunchIn, setLunchIn] = useState<TimeString>("");
  const [finalOut, setFinalOut] = useState<TimeString>("");

  const [calculatedFinalOut, setCalculatedFinalOut] = useState<TimeString>("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setInfo(null);

    const morningInDate = parseTime(morningIn);
    if (!morningInDate) {
      setCalculatedFinalOut("");
      return;
    }
    const morningInMins = toMinutes(morningInDate);
    if (morningInMins < OFFICE_OPEN) {
      setError("L'orario di ingresso mattutino non può essere prima delle 7:30");
      setCalculatedFinalOut("");
      return;
    }
    if (morningInMins > OFFICE_CLOSE) {
      setError("L'orario di ingresso mattutino non può essere dopo le 19:00");
      setCalculatedFinalOut("");
      return;
    }

    const lunchOutDate = parseTime(lunchOut);
    const lunchInDate = parseTime(lunchIn);

    if ((lunchOut && !lunchOutDate) || (lunchIn && !lunchInDate)) {
      setError("Orari pausa pranzo non validi");
      setCalculatedFinalOut("");
      return;
    }

    if ((lunchOut && !lunchIn) || (!lunchOut && lunchIn)) {
      setCalculatedFinalOut("");
      return;
    }

    if (lunchOutDate && lunchInDate) {
      const lunchOutMins = toMinutes(lunchOutDate);
      const lunchInMins = toMinutes(lunchInDate);

      if (lunchOutMins < LUNCH_START) {
        setError("La pausa pranzo può iniziare solo dalle 12:00");
        setCalculatedFinalOut("");
        return;
      }
      if (lunchInMins > LUNCH_END) {
        setError("Il rientro dalla pausa pranzo non può essere dopo le 15:00");
        setCalculatedFinalOut("");
        return;
      }
      if (lunchInMins <= lunchOutMins) {
        setError("L'orario di rientro deve essere dopo l'uscita in pausa");
        setCalculatedFinalOut("");
        return;
      }
    }

    let lunchPauseMins = 30;
    if (lunchOutDate && lunchInDate) {
      const actualLunchPause = diffMinutes(lunchOutDate, lunchInDate);
      lunchPauseMins = actualLunchPause < 30 ? 30 : actualLunchPause;
    }

    const extraRecovery = lunchPauseMins > 30 ? lunchPauseMins - 30 : 0;

    const finalOutMins =
      toMinutes(morningInDate) + WORK_DURATION_MIN + LUNCH_MIN + extraRecovery;

    if (finalOutMins > OFFICE_CLOSE) {
      setError(
        "L'orario di uscita previsto supera l'orario di chiusura dell'ufficio (19:00)",
      );
      setCalculatedFinalOut("");
      return;
    }

    if (lunchOutDate && lunchInDate) {
      const workedBeforeLunch = diffMinutes(morningInDate, lunchOutDate);
      const workedAfterLunch = finalOutMins - toMinutes(lunchInDate);
      const totalWork = workedBeforeLunch + workedAfterLunch;

      if (totalWork < MIN_WORK_FOR_LUNCH) {
        setError(
          "La pausa pranzo può essere fatta solo se si svolgono almeno 6 ore di lavoro",
        );
        setCalculatedFinalOut("");
        return;
      }
    }

    const limitTime = fromMinutes(LATEST_3H36M_TIME);

    let workBy1412 = 0;
    if (lunchOutDate && lunchInDate) {
      if (toMinutes(lunchOutDate) <= LATEST_3H36M_TIME) {
        workBy1412 += diffMinutes(morningInDate, lunchOutDate);
      } else if (toMinutes(morningInDate) < LATEST_3H36M_TIME) {
        workBy1412 += LATEST_3H36M_TIME - toMinutes(morningInDate);
      }
      if (toMinutes(lunchInDate) < LATEST_3H36M_TIME) {
        const afterLunchEnd = Math.min(finalOutMins, LATEST_3H36M_TIME);
        if (afterLunchEnd > toMinutes(lunchInDate)) {
          workBy1412 += afterLunchEnd - toMinutes(lunchInDate);
        }
      }
    } else {
      if (morningInMins < LATEST_3H36M_TIME) {
        const afterLunchEnd = Math.min(finalOutMins, LATEST_3H36M_TIME);
        workBy1412 = afterLunchEnd - morningInMins;
      }
    }

    if (workBy1412 < MIN_WORK_MIN) {
      setError(
        "Le 3h36m obbligatorie devono essere completate entro le 14:12",
      );
      setCalculatedFinalOut("");
      return;
    }

    if (!lunchOutDate || !lunchInDate) {
      setInfo(
        "Non è stata inserita la pausa pranzo, verranno conteggiati 30 minuti di pausa comunque",
      );
    }

    setCalculatedFinalOut(formatTime(fromMinutes(finalOutMins)));
  }, [morningIn, lunchOut, lunchIn]);

  let totalWorkedMins = 0;
  let lunchPauseMins = 30;

  const morningInDate = parseTime(morningIn);
  const lunchOutDate = parseTime(lunchOut);
  const lunchInDate = parseTime(lunchIn);
  const finalOutDate = parseTime(finalOut);
  const calculatedFinalOutDate = calculatedFinalOut ? parseTime(calculatedFinalOut) : null;

  if (morningInDate) {
    if (finalOut) {
      if (lunchOutDate && lunchInDate) {
        const actualLunchPause = diffMinutes(lunchOutDate, lunchInDate);
        lunchPauseMins = actualLunchPause < 30 ? 30 : actualLunchPause;
      }
      if (finalOutDate) {
        totalWorkedMins =
          diffMinutes(morningInDate, finalOutDate) - lunchPauseMins;
      }
    } else if (calculatedFinalOutDate) {
      totalWorkedMins = WORK_DURATION_MIN;
      lunchPauseMins = 30;
    }
  }

  const totalWorkedHours = Math.floor(totalWorkedMins / 60);
  const totalWorkedMinutes = Math.round(totalWorkedMins % 60);

  const extraLunchPause = lunchPauseMins > 30 ? lunchPauseMins - 30 : 0;

  // Calcolo debito giornaliero se ore lavorate < 7h12m
  const debtMins = totalWorkedMins < WORK_DURATION_MIN ? WORK_DURATION_MIN - totalWorkedMins : 0;
  const debtHours = Math.floor(debtMins / 60);
  const debtMinutes = Math.round(debtMins % 60);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-md shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-center">
        Monitoraggio Orario Lavoro
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="morningIn" className="block font-medium mb-1">
            Ingresso Mattina (es. 07:30)
          </label>
          <Input
            id="morningIn"
            type="time"
            value={morningIn}
            onChange={(e) => setMorningIn(e.target.value)}
            min="07:30"
            max="19:00"
            required
          />
        </div>
        <div>
          <label htmlFor="lunchOut" className="block font-medium mb-1">
            Uscita Pausa Pranzo (es. 12:00)
          </label>
          <Input
            id="lunchOut"
            type="time"
            value={lunchOut}
            onChange={(e) => setLunchOut(e.target.value)}
            min="12:00"
            max="15:00"
          />
        </div>
        <div>
          <label htmlFor="lunchIn" className="block font-medium mb-1">
            Rientro Pausa Pranzo (es. 12:30)
          </label>
          <Input
            id="lunchIn"
            type="time"
            value={lunchIn}
            onChange={(e) => setLunchIn(e.target.value)}
            min="12:30"
            max="15:00"
          />
        </div>
        <div>
          <label htmlFor="finalOut" className="block font-medium mb-1">
            Uscita Finale (opzionale)
          </label>
          <Input
            id="finalOut"
            type="time"
            value={finalOut}
            onChange={(e) => setFinalOut(e.target.value)}
            min="07:30"
            max="19:00"
            placeholder={calculatedFinalOut ? `Previsto: ${calculatedFinalOut}` : ""}
          />
          <p className="text-sm text-gray-500 mt-1">
            L'orario di uscita previsto si calcola automaticamente dopo aver inserito
            ingresso mattina e rientro pausa pranzo.
          </p>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      {info && !error && (
        <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded">{info}</div>
      )}

      {calculatedFinalOut && !error && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
          Orario di uscita previsto: <strong>{calculatedFinalOut}</strong>
        </div>
      )}

      {totalWorkedMins > 0 && (
        <div className="mt-4">
          <p>
            Ore lavorate (escluse pausa):{" "}
            <strong>
              {totalWorkedHours}h {totalWorkedMinutes}m
            </strong>
          </p>
          <p>
            Pausa pranzo conteggiata: <strong>{lunchPauseMins} minuti</strong>
          </p>
          {extraLunchPause > 0 && (
            <p className="text-red-600">
              Minuti pausa extra da recuperare: <strong>{extraLunchPause}</strong>
            </p>
          )}
          {debtMins > 0 && (
            <p className="text-red-700 font-semibold">
              Debito giornaliero: {debtHours}h {debtMinutes}m
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkTimeTracker;