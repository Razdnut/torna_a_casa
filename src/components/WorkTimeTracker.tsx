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

const WORK_DURATION_MIN = 7 * 60 + 12;
const MIN_WORK_MIN = 3 * 60 + 36;
const LUNCH_MIN = 30;
const OFFICE_OPEN = 7 * 60 + 30;
const OFFICE_CLOSE = 19 * 60;
const LUNCH_START = 12 * 60;
const LUNCH_END = 15 * 60;
const MIN_WORK_FOR_LUNCH = 6 * 60;
const LATEST_3H36M_TIME = 14 * 60 + 12;

function toMinutes(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

const WorkTimeTracker = () => {
  const [morningIn, setMorningIn] = useState<TimeString>("");
  const [lunchOut, setLunchOut] = useState<TimeString>("");
  const [lunchIn, setLunchIn] = useState<TimeString>("");
  const [finalOut, setFinalOut] = useState<TimeString>("");

  const [extraEntrances, setExtraEntrances] = useState<TimeString[]>([]);
  const [extraExits, setExtraExits] = useState<TimeString[]>([]);

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
      const lo = toMinutes(lunchOutDate);
      const li = toMinutes(lunchInDate);
      if (lo < LUNCH_START) {
        setError("La pausa pranzo può iniziare solo dalle 12:00");
        setCalculatedFinalOut("");
        return;
      }
      if (li > LUNCH_END) {
        setError("Il rientro dalla pausa pranzo non può essere dopo le 15:00");
        setCalculatedFinalOut("");
        return;
      }
      if (li <= lo) {
        setError("L'orario di rientro deve essere dopo l'uscita in pausa");
        setCalculatedFinalOut("");
        return;
      }
    }

    extraEntrances.forEach((t) => {
      if (t && !parseTime(t)) {
        setError("Orari di entrata extra non validi");
        setCalculatedFinalOut("");
      }
    });
    extraExits.forEach((t) => {
      if (t && !parseTime(t)) {
        setError("Orari di uscita extra non validi");
        setCalculatedFinalOut("");
      }
    });

    const ent: Date[] = [];
    const ex: Date[] = [];

    ent.push(morningInDate);
    extraEntrances.forEach((t) => { const d = parseTime(t); if (d) ent.push(d); });
    if (lunchInDate) ent.push(lunchInDate);

    if (lunchOutDate) ex.push(lunchOutDate);
    extraExits.forEach((t) => { const d = parseTime(t); if (d) ex.push(d); });

    const fo = parseTime(finalOut);
    const cfo = calculatedFinalOut ? parseTime(calculatedFinalOut) : null;
    if (fo) ex.push(fo);
    else if (cfo) ex.push(cfo);

    ent.sort((a, b) => a.getTime() - b.getTime());
    ex.sort((a, b) => a.getTime() - b.getTime());

    if (ex.length > 0 && ent.length !== ex.length) {
      setError("Numero di orari di entrata e uscita non corrispondono");
      setCalculatedFinalOut("");
      return;
    }
    for (let i = 0; i < ent.length && i < ex.length; i++) {
      if (ent[i].getTime() >= ex[i].getTime()) {
        setError(`L'orario di entrata #${i + 1} deve essere precedente all'uscita corrispondente`);
        setCalculatedFinalOut("");
        return;
      }
    }

    let lunchPauseMins = 30;
    if (lunchOutDate && lunchInDate) {
      const actual = diffMinutes(lunchOutDate, lunchInDate);
      lunchPauseMins = actual < 30 ? 30 : actual;
    }
    const extraRecovery = lunchPauseMins > 30 ? lunchPauseMins - 30 : 0;
    const predicted = toMinutes(morningInDate) + WORK_DURATION_MIN + LUNCH_MIN + extraRecovery;
    if (predicted > OFFICE_CLOSE) {
      setError("L'orario di uscita previsto supera le 19:00");
      setCalculatedFinalOut("");
      return;
    }

    let workBy1412 = 0;
    const limit = LATEST_3H36M_TIME;
    for (let i = 0; i < ent.length && i < ex.length; i++) {
      const s = toMinutes(ent[i]);
      const e = toMinutes(ex[i]);
      workBy1412 += e <= limit ? e - s : s < limit ? limit - s : 0;
    }
    if (workBy1412 < MIN_WORK_MIN) {
      setError("Le 3h36m obbligatorie devono essere completate entro le 14:12");
      setCalculatedFinalOut("");
      return;
    }

    if (lunchOutDate && lunchInDate) {
      const before = diffMinutes(morningInDate, lunchOutDate);
      const after = predicted - toMinutes(lunchInDate);
      if (before + after < MIN_WORK_FOR_LUNCH) {
        setError("La pausa pranzo è permessa solo dopo almeno 6h di lavoro");
        setCalculatedFinalOut("");
        return;
      }
    }

    setInfo(
      !lunchOutDate || !lunchInDate
        ? "Non hai inserito la pausa: verranno conteggiati 30 minuti comunque"
        : null
    );
    setCalculatedFinalOut(formatTime(fromMinutes(predicted)));
  }, [morningIn, lunchOut, lunchIn, finalOut, extraEntrances, extraExits]);

  // handlers omitted for brevity...

  const morningInDate = parseTime(morningIn);
  const lunchOutDate = parseTime(lunchOut);
  const lunchInDate = parseTime(lunchIn);
  const finalOutDate = parseTime(finalOut);
  const calculatedFinalOutDate = calculatedFinalOut ? parseTime(calculatedFinalOut) : null;

  const allEnt: Date[] = [];
  const allEx: Date[] = [];
  if (morningInDate) allEnt.push(morningInDate);
  extraEntrances.forEach((t) => { const d = parseTime(t); if (d) allEnt.push(d); });
  if (lunchInDate) allEnt.push(lunchInDate);
  if (lunchOutDate) allEx.push(lunchOutDate);
  extraExits.forEach((t) => { const d = parseTime(t); if (d) allEx.push(d); });
  if (finalOutDate) allEx.push(finalOutDate);
  else if (calculatedFinalOutDate) allEx.push(calculatedFinalOutDate);

  allEnt.sort((a, b) => a.getTime() - b.getTime());
  allEx.sort((a, b) => a.getTime() - b.getTime());

  let totalWorkedMins = 0;
  for (let i = 0; i < allEnt.length && i < allEx.length; i++) {
    totalWorkedMins += diffMinutes(allEnt[i], allEx[i]);
  }

  let lunchPauseMins = 30;
  if (lunchOutDate && lunchInDate) {
    const actual = diffMinutes(lunchOutDate, lunchInDate);
    lunchPauseMins = actual < 30 ? 30 : actual;
  }

  const effectiveWork = totalWorkedMins - lunchPauseMins;
  let creditMins = 0, debtMins = 0;
  if (morningInDate && (finalOutDate || calculatedFinalOutDate)) {
    if (effectiveWork < WORK_DURATION_MIN) debtMins = WORK_DURATION_MIN - effectiveWork;
    else creditMins = effectiveWork - WORK_DURATION_MIN;
  }

  const totalWorkedHours = Math.floor(totalWorkedMins / 60);
  const totalWorkedMinutes = Math.round(totalWorkedMins % 60);
  const debtHours = Math.floor(debtMins / 60);
  const debtMinutes = Math.round(debtMins % 60);
  const creditHours = Math.floor(creditMins / 60);
  const creditMinutes = Math.round(creditMins % 60);

  // Modificato qui: ora mostriamo le stats anche solo con lunchIn
  const showStats = morningInDate && (lunchInDate || finalOutDate || calculatedFinalOutDate);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-md shadow-md">
      {/* form omitted for brevity */}
      {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      {info && !error && <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded">{info}</div>}
      {showStats && (
        <div className="mt-4 space-y-2">
          <p>Ore lavorate (escluse pausa): <strong>{totalWorkedHours}h {totalWorkedMinutes}m</strong></p>
          <p>Pausa pranzo conteggiata: <strong>{lunchPauseMins}m</strong></p>
          {debtMins > 0 || creditMins > 0 ? (
            <p className={`font-semibold ${debtMins>0?"text-red-700":"text-green-700"}`}>
              {debtMins>0
                ? `Debito giornaliero: ${debtHours}h ${debtMinutes}m`
                : `Credito giornaliero: ${creditHours}h ${creditMinutes}m`}
            </p>
          ) : (
            <p className="text-gray-600">Debito/credito: 0m</p>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkTimeTracker;