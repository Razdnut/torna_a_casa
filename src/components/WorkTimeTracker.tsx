"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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

function addMinutes(date: Date, mins: number): Date {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + mins);
  return d;
}

const WORK_DURATION_MIN = 7 * 60 + 12; // 7h12m = 432 min
const PAUSA_OBBLIGATORIA_MIN = 30; // 30 minuti pausa obbligatoria

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
  const [pauseNoExit, setPauseNoExit] = useState(false);

  // Nuovi stati per permessi
  const [usedPermit, setUsedPermit] = useState(false);
  const [permitOut, setPermitOut] = useState<TimeString>("");
  const [permitIn, setPermitIn] = useState<TimeString>("");

  const [calculated, setCalculated] = useState<{
    total: number;
    debt: number;
    credit: number;
  } | null>(null);

  const [lunchDuration, setLunchDuration] = useState<number | null>(null);
  const [exitHypothesis, setExitHypothesis] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Calcolo durata pausa pranzo
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

  // Calcolo ipotesi orario uscita
  useEffect(() => {
    if (pauseNoExit) {
      // Solo ingresso mattina richiesto
      const morningInDate = parseTime(morningIn);
      if (morningInDate) {
        // 7h12m + 30min pausa obbligatoria = 7h42m = 462 min
        const exit = addMinutes(morningInDate, WORK_DURATION_MIN + PAUSA_OBBLIGATORIA_MIN);
        setExitHypothesis(formatTime(exit));
      } else {
        setExitHypothesis(null);
      }
      return;
    }
    // Pausa con uscita: servono i tre campi
    const morningInDate = parseTime(morningIn);
    const lunchOutDate = parseTime(lunchOut);
    const lunchInDate = parseTime(lunchIn);
    if (
      morningInDate &&
      lunchOutDate &&
      lunchInDate &&
      toMinutes(lunchInDate) > toMinutes(lunchOutDate)
    ) {
      // Ore lavorate mattina
      const morningBlock = diffMinutes(morningInDate, lunchOutDate);
      // Ore da lavorare dopo pranzo
      const remaining = WORK_DURATION_MIN - morningBlock;
      if (remaining > 0) {
        const exit = addMinutes(lunchInDate, remaining);
        setExitHypothesis(formatTime(exit));
      } else {
        setExitHypothesis(formatTime(lunchInDate));
      }
    } else {
      setExitHypothesis(null);
    }
  }, [morningIn, lunchOut, lunchIn, pauseNoExit]);

  const calculate = () => {
    setError(null);

    const morningInDate = parseTime(morningIn);
    const lunchOutDate = parseTime(lunchOut);
    const lunchInDate = parseTime(lunchIn);
    const finalOutDate = parseTime(finalOut);

    // Caso "pausa pranzo senza uscita"
    if (pauseNoExit) {
      if (!morningInDate) {
        setError("Compila almeno Ingresso Mattina.");
        setCalculated(null);
        return;
      }
      // Se non c'è uscita finale, mostra solo ipotesi
      if (!finalOutDate) {
        // Mostra solo ipotesi (già calcolata in blu)
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
      // Calcolo solo su Ingresso Mattina e Uscita Finale
      // Il tempo richiesto è 7h12m + 30min pausa obbligatoria = 462 min
      const totalRaw = diffMinutes(morningInDate, finalOutDate);
      const total = totalRaw - PAUSA_OBBLIGATORIA_MIN; // SOTTRAI i 30 min di pausa obbligatoria
      let debt = 0;
      let credit = 0;
      if (totalRaw < WORK_DURATION_MIN + PAUSA_OBBLIGATORIA_MIN) {
        debt = WORK_DURATION_MIN + PAUSA_OBBLIGATORIA_MIN - totalRaw;
      } else if (totalRaw > WORK_DURATION_MIN + PAUSA_OBBLIGATORIA_MIN) {
        credit = totalRaw - (WORK_DURATION_MIN + PAUSA_OBBLIGATORIA_MIN);
      }
      setCalculated({ total, debt, credit });
      return;
    }

    // Caso normale (pausa pranzo con uscita)
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
    // Calcolo solo i due blocchi
    const morningBlock = diffMinutes(morningInDate, lunchOutDate);
    const afternoonBlock = diffMinutes(lunchInDate, finalOutDate);
    const total = morningBlock + afternoonBlock;
    let debt = 0;
    let credit = 0;
    if (total < WORK_DURATION_MIN) {
      debt = WORK_DURATION_MIN - total;
    } else if (total > WORK_DURATION_MIN) {
      credit = total - WORK_DURATION_MIN;
    }
    setCalculated({ total, debt, credit });
  };

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
            required={!pauseNoExit}
            disabled={pauseNoExit}
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
            required={!pauseNoExit}
            disabled={pauseNoExit}
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
            required={false}
          />
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <Checkbox
            id="pauseNoExit"
            checked={pauseNoExit}
            onCheckedChange={(checked) => setPauseNoExit(!!checked)}
          />
          <label htmlFor="pauseNoExit" className="text-sm font-medium">
            Pausa pranzo senza uscita
          </label>
        </div>
        <div className="flex items-center space-x-2 mt-2">
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
          <div className="space-y-2 mt-2">
            <div>
              <label htmlFor="permitOut" className="block font-medium mb-1">
                Orario uscita permesso
              </label>
              <Input
                id="permitOut"
                type="time"
                value={permitOut}
                onChange={(e) => setPermitOut(e.target.value)}
                min="07:30"
                max="19:00"
              />
            </div>
            <div>
              <label htmlFor="permitIn" className="block font-medium mb-1">
                Orario ingresso permesso
              </label>
              <Input
                id="permitIn"
                type="time"
                value={permitIn}
                onChange={(e) => setPermitIn(e.target.value)}
                min="07:30"
                max="19:00"
              />
            </div>
          </div>
        )}
      </form>

      {/* Durata pausa pranzo */}
      {!pauseNoExit && lunchDuration !== null && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-blue-900 text-sm">
          Durata pausa pranzo: <strong>{Math.floor(lunchDuration)} minuti</strong>
        </div>
      )}

      {/* Ipotesi orario uscita */}
      {exitHypothesis && (
        <div className="mt-2 p-2 bg-blue-100 rounded text-blue-900 text-sm font-semibold">
          Ipotesi orario uscita per {pauseNoExit ? "7h12m + 30min pausa" : "7h12m"}: <strong>{exitHypothesis}</strong>
        </div>
      )}

      <div className="mt-4">
        <Button onClick={calculate} className="w-full" variant="default">
          Calcola orario uscita
        </Button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {calculated && (
        <div className="mt-4 space-y-2">
          <p>
            Ore lavorate (escluse pause):{" "}
            <strong>
              {Math.floor(calculated.total / 60)}h {Math.round(calculated.total % 60)}m
            </strong>
          </p>
          {calculated.debt > 0 && (
            <p className="font-semibold text-red-700">
              Debito giornaliero: {Math.floor(calculated.debt / 60)}h {Math.round(calculated.debt % 60)}m
            </p>
          )}
          {calculated.credit > 0 && (
            <p className="font-semibold text-green-700">
              Credito giornaliero: {Math.floor(calculated.credit / 60)}h {Math.round(calculated.credit % 60)}m
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