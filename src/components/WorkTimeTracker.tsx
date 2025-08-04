"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";

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
const LUNCH_MIN = 30;
const OFFICE_OPEN = 7 * 60 + 30; // 7:30 in minuti
const OFFICE_CLOSE = 19 * 60; // 19:00 in minuti
const LUNCH_START = 12 * 60; // 12:00
const LUNCH_END = 15 * 60; // 15:00

function toMinutes(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

const WorkTimeTracker = () => {
  const [morningIn, setMorningIn] = useState<TimeString>("");
  const [lunchOut, setLunchOut] = useState<TimeString>("");
  const [lunchIn, setLunchIn] = useState<TimeString>("");
  const [finalOut, setFinalOut] = useState<TimeString>("");

  // Extra entrances (+) and exits (-)
  const [extraEntrances, setExtraEntrances] = useState<TimeString[]>([]);
  const [extraExits, setExtraExits] = useState<TimeString[]>([]);

  const [calculatedFinalOut, setCalculatedFinalOut] = useState<TimeString>("");
  const [showCalculatedOut, setShowCalculatedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // New states for debt/credit to update on button click
  const [debtMins, setDebtMins] = useState(0);
  const [creditMins, setCreditMins] = useState(0);

  // Function to calculate predicted final out time based on current inputs
  const calculatePredictedFinalOut = () => {
    setError(null);
    setInfo(null);

    const morningInDate = parseTime(morningIn);
    if (!morningInDate) {
      setError("Inserire un orario di ingresso mattina valido");
      setShowCalculatedOut(false);
      return;
    }
    const lunchOutDate = parseTime(lunchOut);
    const lunchInDate = parseTime(lunchIn);

    let lunchPauseMins = 30;
    if (lunchOutDate && lunchInDate) {
      const actualLunchPause = diffMinutes(lunchOutDate, lunchInDate);
      lunchPauseMins = actualLunchPause < 30 ? 30 : actualLunchPause;
    }

    const extraRecovery = lunchPauseMins > 30 ? lunchPauseMins - 30 : 0;
    const predictedFinalOutMins =
      toMinutes(morningInDate) + WORK_DURATION_MIN + LUNCH_MIN + extraRecovery;

    if (predictedFinalOutMins > OFFICE_CLOSE) {
      setError(
        "L'orario di uscita previsto supera l'orario di chiusura dell'ufficio (19:00)",
      );
      setShowCalculatedOut(false);
      return;
    }

    setCalculatedFinalOut(formatTime(fromMinutes(predictedFinalOutMins)));
    setShowCalculatedOut(true);

    // Calcolo debito/credito basato su finalOut se presente, altrimenti su predictedFinalOut
    const finalOutDate = parseTime(finalOut);
    const allEntrances: Date[] = [];
    const allExits: Date[] = [];

    if (morningInDate) allEntrances.push(morningInDate);
    extraEntrances.forEach((t) => {
      const d = parseTime(t);
      if (d) allEntrances.push(d);
    });
    if (lunchInDate) allEntrances.push(lunchInDate);

    if (lunchOutDate) allExits.push(lunchOutDate);
    extraExits.forEach((t) => {
      const d = parseTime(t);
      if (d) allExits.push(d);
    });

    if (finalOutDate) {
      allExits.push(finalOutDate);
    } else {
      allExits.push(fromMinutes(predictedFinalOutMins));
    }

    allEntrances.sort((a, b) => a.getTime() - b.getTime());
    allExits.sort((a, b) => a.getTime() - b.getTime());

    let totalWorkedMins = 0;
    for (let i = 0; i < allEntrances.length && i < allExits.length; i++) {
      totalWorkedMins += diffMinutes(allEntrances[i], allExits[i]);
    }

    const effectiveWorkMins = totalWorkedMins;

    let debt = 0;
    let credit = 0;

    if (effectiveWorkMins < WORK_DURATION_MIN + lunchPauseMins) {
      debt = WORK_DURATION_MIN + lunchPauseMins - effectiveWorkMins;
      // Se il debito è minore o uguale a 30 minuti (pausa obbligatoria), azzeralo
      if (debt <= 30) {
        debt = 0;
      } else {
        debt = debt - 30;
      }
    } else {
      credit = effectiveWorkMins - (WORK_DURATION_MIN + lunchPauseMins);
    }

    // FIX: Se l'utente ha inserito Uscita Finale e il tempo lavorato effettivo copre anche il debito da pausa lunga, azzera il debito
    if (finalOutDate) {
      // Calcola il debito dovuto solo alla pausa lunga (oltre i 30 min)
      const extraLunch = lunchPauseMins > 30 ? lunchPauseMins - 30 : 0;
      // Il tempo richiesto totale è WORK_DURATION_MIN + LUNCH_MIN + extraLunch
      const requiredMins = WORK_DURATION_MIN + LUNCH_MIN + extraLunch;
      if (effectiveWorkMins >= requiredMins) {
        debt = 0;
      }
    }

    setDebtMins(debt);
    setCreditMins(credit);
  };

  useEffect(() => {
    setError(null);
    setInfo(null);
    setShowCalculatedOut(false);
    setDebtMins(0);
    setCreditMins(0);

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

    // Validate extra entrances and exits times
    for (const t of extraEntrances) {
      if (t && !parseTime(t)) {
        setError("Orari di entrata extra non validi");
        setCalculatedFinalOut("");
        return;
      }
    }
    for (const t of extraExits) {
      if (t && !parseTime(t)) {
        setError("Orari di uscita extra non validi");
        setCalculatedFinalOut("");
        return;
      }
    }
  }, [morningIn, lunchOut, lunchIn, finalOut, extraEntrances, extraExits]);

  const addExtraEntrance = () => {
    setExtraEntrances((prev) => [...prev, ""]);
  };
  const updateExtraEntrance = (index: number, value: TimeString) => {
    setExtraEntrances((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };
  const removeExtraEntrance = (index: number) => {
    setExtraEntrances((prev) => prev.filter((_, i) => i !== index));
  };

  const addExtraExit = () => {
    setExtraExits((prev) => [...prev, ""]);
  };
  const updateExtraExit = (index: number, value: TimeString) => {
    setExtraExits((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };
  const removeExtraExit = (index: number) => {
    setExtraExits((prev) => prev.filter((_, i) => i !== index));
  };

  const morningInDate = parseTime(morningIn);
  const lunchOutDate = parseTime(lunchOut);
  const lunchInDate = parseTime(lunchIn);
  const finalOutDate = parseTime(finalOut);
  const calculatedFinalOutDate = calculatedFinalOut ? parseTime(calculatedFinalOut) : null;

  const allEntrances: Date[] = [];
  const allExits: Date[] = [];

  if (morningInDate) allEntrances.push(morningInDate);
  extraEntrances.forEach((t) => {
    const d = parseTime(t);
    if (d) allEntrances.push(d);
  });
  if (lunchInDate) allEntrances.push(lunchInDate);

  if (lunchOutDate) allExits.push(lunchOutDate);
  extraExits.forEach((t) => {
    const d = parseTime(t);
    if (d) allExits.push(d);
  });
  if (finalOutDate) {
    allExits.push(finalOutDate);
  } else if (calculatedFinalOutDate) {
    allExits.push(calculatedFinalOutDate);
  }

  allEntrances.sort((a, b) => a.getTime() - b.getTime());
  allExits.sort((a, b) => a.getTime() - b.getTime());

  let totalWorkedMins = 0;
  for (let i = 0; i < allEntrances.length && i < allExits.length; i++) {
    totalWorkedMins += diffMinutes(allEntrances[i], allExits[i]);
  }

  let lunchPauseMins = 30;
  if (lunchOutDate && lunchInDate) {
    const actualLunchPause = diffMinutes(lunchOutDate, lunchInDate);
    lunchPauseMins = actualLunchPause < 30 ? 30 : actualLunchPause;
  }

  const totalWorkedHours = Math.floor(totalWorkedMins / 60);
  const totalWorkedMinutes = Math.round(totalWorkedMins % 60);

  const debtHours = Math.floor(debtMins / 60);
  const debtMinutes = Math.round(debtMins % 60);

  const creditHours = Math.floor(creditMins / 60);
  const creditMinutes = Math.round(creditMins % 60);

  const showStats =
    morningInDate &&
    (finalOutDate || calculatedFinalOutDate || allExits.length > 0);

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

        {/* Extra entrances (+) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-medium">Ingressi Extra (+)</label>
            <Button size="sm" variant="outline" onClick={addExtraEntrance} aria-label="Aggiungi ingresso extra">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {extraEntrances.length === 0 && (
            <p className="text-sm text-gray-500 mb-2">Nessun ingresso extra aggiunto</p>
          )}
          {extraEntrances.map((time, idx) => (
            <div key={idx} className="flex items-center space-x-2 mb-2">
              <Input
                type="time"
                value={time}
                onChange={(e) => updateExtraEntrance(idx, e.target.value)}
                min="07:30"
                max="19:00"
                required
              />
              <Button
                size="sm"
                variant="destructive"
                onClick={() => removeExtraEntrance(idx)}
                aria-label={`Rimuovi ingresso extra #${idx + 1}`}
              >
                <Minus className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Extra exits (-) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-medium">Uscite Extra (-)</label>
            <Button size="sm" variant="outline" onClick={addExtraExit} aria-label="Aggiungi uscita extra">
              <Minus className="w-4 h-4" />
            </Button>
          </div>
          {extraExits.length === 0 && (
            <p className="text-sm text-gray-500 mb-2">Nessuna uscita extra aggiunta</p>
          )}
          {extraExits.map((time, idx) => (
            <div key={idx} className="flex items-center space-x-2 mb-2">
              <Input
                type="time"
                value={time}
                onChange={(e) => updateExtraExit(idx, e.target.value)}
                min="07:30"
                max="19:00"
                required
              />
              <Button
                size="sm"
                variant="destructive"
                onClick={() => removeExtraExit(idx)}
                aria-label={`Rimuovi uscita extra #${idx + 1}`}
              >
                <Minus className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </form>

      <div className="mt-4">
        <Button onClick={calculatePredictedFinalOut} className="w-full" variant="default">
          Calcola orario uscita
        </Button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      {info && !error && (
        <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded">{info}</div>
      )}

      {showStats && (
        <div className="mt-4 space-y-2">
          {calculatedFinalOut && (
            <p className="text-sm font-bold bg-green-100 p-2 rounded">
              Orario presunto di uscita per 7h12m di lavoro:{" "}
              <strong>{calculatedFinalOut}</strong>
            </p>
          )}
          <p>
            Ore lavorate (escluse pausa):{" "}
            <strong>
              {totalWorkedHours}h {totalWorkedMinutes}m
            </strong>
          </p>
          <p>
            Pausa pranzo conteggiata: <strong>{lunchPauseMins} minuti</strong>
          </p>
          {(debtMins > 0 || creditMins > 0) && (
            <p
              className={`font-semibold ${
                debtMins > 0 ? "text-red-700" : "text-green-700"
              }`}
            >
              {debtMins > 0
                ? `Debito giornaliero: ${debtHours}h ${debtMinutes}m`
                : `Credito giornaliero: ${creditHours}h ${creditMinutes}m`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkTimeTracker;