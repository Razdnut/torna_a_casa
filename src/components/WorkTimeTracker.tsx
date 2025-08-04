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
      const outM = toMinutes(lunchOutDate);
      const inM = toMinutes(lunchInDate);
      if (outM < LUNCH_START) {
        setError("La pausa pranzo può iniziare solo dalle 12:00");
        setCalculatedFinalOut("");
        return;
      }
      if (inM > LUNCH_END) {
        setError("Il rientro dalla pausa pranzo non può essere dopo le 15:00");
        setCalculatedFinalOut("");
        return;
      }
      if (inM <= outM) {
        setError("L'orario di rientro deve essere dopo l'uscita in pausa");
        setCalculatedFinalOut("");
        return;
      }
    }

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

    const timesEntrances: Date[] = [];
    const timesExits: Date[] = [];

    timesEntrances.push(morningInDate);
    extraEntrances.forEach(t => {
      const d = parseTime(t);
      if (d) timesEntrances.push(d);
    });
    if (lunchInDate) timesEntrances.push(lunchInDate);

    if (lunchOutDate) timesExits.push(lunchOutDate);
    extraExits.forEach(t => {
      const d = parseTime(t);
      if (d) timesExits.push(d);
    });

    const lunchPauseMins = lunchOutDate && lunchInDate
      ? Math.max(30, diffMinutes(lunchOutDate, lunchInDate))
      : 30;

    const extraOver30 = lunchPauseMins > 30 ? lunchPauseMins - 30 : 0;
    const predictedMins =
      toMinutes(morningInDate) + WORK_DURATION_MIN + LUNCH_MIN + extraOver30;
    const predictedDate = fromMinutes(predictedMins);

    if (predictedMins > OFFICE_CLOSE) {
      setError("L'orario di uscita previsto supera le 19:00");
      setCalculatedFinalOut("");
      return;
    }

    let workBy1412 = 0;
    const limit = LATEST_3H36M_TIME;
    timesEntrances.forEach((en, i) => {
      const ex = timesExits[i];
      if (!ex) return;
      const s = toMinutes(en);
      const e = toMinutes(ex);
      workBy1412 += e <= limit ? e - s : s < limit ? limit - s : 0;
    });
    if (workBy1412 < MIN_WORK_MIN) {
      setError("Le 3h36m obbligatorie devono essere completate entro le 14:12");
      setCalculatedFinalOut("");
      return;
    }

    if (lunchOutDate && lunchInDate) {
      const before = diffMinutes(morningInDate, lunchOutDate);
      const after = predictedMins - toMinutes(lunchInDate);
      if (before + after < MIN_WORK_FOR_LUNCH) {
        setError("La pausa pranzo richiede almeno 6h di lavoro");
        setCalculatedFinalOut("");
        return;
      }
    }

    setInfo(
      !(lunchOutDate && lunchInDate)
        ? "Pausa pranzo mancante, si contano 30min obbligatori"
        : null,
    );
    setCalculatedFinalOut(formatTime(predictedDate));
  }, [morningIn, lunchOut, lunchIn, finalOut, extraEntrances, extraExits]);

  const addExtraEntrance = () => setExtraEntrances(prev => [...prev, ""]);
  const addExtraExit = () => setExtraExits(prev => [...prev, ""]);
  const updateExtraEntrance = (i: number, v: TimeString) =>
    setExtraEntrances(prev => prev.map((t, idx) => (idx === i ? v : t)));
  const updateExtraExit = (i: number, v: TimeString) =>
    setExtraExits(prev => prev.map((t, idx) => (idx === i ? v : t)));
  const removeExtraEntrance = (i: number) =>
    setExtraEntrances(prev => prev.filter((_, idx) => idx !== i));
  const removeExtraExit = (i: number) =>
    setExtraExits(prev => prev.filter((_, idx) => idx !== i));

  const morningInDate = parseTime(morningIn);
  const lunchOutDate = parseTime(lunchOut);
  const lunchInDate = parseTime(lunchIn);
  const finalOutDate = parseTime(finalOut);
  const calcOutDate = calculatedFinalOut
    ? parseTime(calculatedFinalOut)
    : null;

  const allEn: Date[] = [];
  const allEx: Date[] = [];
  if (morningInDate) allEn.push(morningInDate);
  extraEntrances.forEach(t => {
    const d = parseTime(t);
    if (d) allEn.push(d);
  });
  if (lunchInDate) allEn.push(lunchInDate);

  if (lunchOutDate) allEx.push(lunchOutDate);
  extraExits.forEach(t => {
    const d = parseTime(t);
    if (d) allEx.push(d);
  });
  if (finalOutDate) {
    allEx.push(finalOutDate);
  } else if (calcOutDate) {
    allEx.push(calcOutDate);
  }

  allEn.sort((a, b) => a.getTime() - b.getTime());
  allEx.sort((a, b) => a.getTime() - b.getTime());

  let totalWorkedMins = 0;
  allEn.forEach((en, i) => {
    const ex = allEx[i];
    if (ex) totalWorkedMins += diffMinutes(en, ex);
  });

  const totalWorkedHours = Math.floor((totalWorkedMins - (lunchOutDate && lunchInDate ? Math.max(30, diffMinutes(lunchOutDate, lunchInDate)) : 30)) / 60);
  const totalWorkedMinutes = Math.round((totalWorkedMins - (lunchOutDate && lunchInDate ? Math.max(30, diffMinutes(lunchOutDate, lunchInDate)) : 30)) % 60);

  const lunchPauseMins = lunchOutDate && lunchInDate
    ? Math.max(30, diffMinutes(lunchOutDate, lunchInDate))
    : 30;

  const effectiveWork = totalWorkedMins - lunchPauseMins;
  let debtMins = 0;
  let creditMins = 0;
  if (morningInDate && (lunchInDate || finalOutDate)) {
    if (effectiveWork < WORK_DURATION_MIN) {
      debtMins = WORK_DURATION_MIN - effectiveWork;
    } else {
      creditMins = effectiveWork - WORK_DURATION_MIN;
    }
  }
  const debtHours = Math.floor(debtMins / 60);
  const debtMinutes = debtMins % 60;
  const creditHours = Math.floor(creditMins / 60);
  const creditMinutes = creditMins % 60;

  // showStats non più vincolato a finalOut, appare dopo lunchIn
  const showStats = Boolean(morningInDate && lunchInDate);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-md shadow-md">
      {/* ... form stesso come prima ... */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      {info && !error && (
        <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded">{info}</div>
      )}
      {showStats && (
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