"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  return new Date(date.getTime() + mins * 60000);
}

const WORK_DURATION_MIN = 7 * 60 + 12; // 7h12m = 432 min
const MIN_WORK_MIN = 3 * 60 + 36; // 3h36m = 216 min
const LUNCH_MIN = 30;
const OFFICE_OPEN = 7 * 60 + 30; // 7:30 in minutes
const OFFICE_CLOSE = 19 * 60; // 19:00 in minutes
const LUNCH_START = 12 * 60; // 12:00
const LUNCH_END = 15 * 60; // 15:00
const MIN_WORK_FOR_LUNCH = 6 * 60; // 6h = 360 min
const MIN_WORK_BY_1412 = 3 * 60 + 36; // 3h36m by 14:12 (14*60+12=852)

const LATEST_3H36M_TIME = 14 * 60 + 12; // 14:12 in minutes

function toMinutes(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function fromMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

const WorkTimeTracker = () => {
  const [morningIn, setMorningIn] = useState<TimeString>("");
  const [lunchOut, setLunchOut] = useState<TimeString>("");
  const [lunchIn, setLunchIn] = useState<TimeString>("");
  const [finalOut, setFinalOut] = useState<TimeString>("");

  const [calculatedFinalOut, setCalculatedFinalOut] = useState<TimeString>("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Calculate total worked minutes excluding lunch pause
  // and apply rules for lunch pause minimum 30 min, etc.

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

    // Lunch times
    const lunchOutDate = parseTime(lunchOut);
    const lunchInDate = parseTime(lunchIn);

    // Validate lunch times if provided
    if ((lunchOut && !lunchOutDate) || (lunchIn && !lunchInDate)) {
      setError("Orari pausa pranzo non validi");
      setCalculatedFinalOut("");
      return;
    }

    // If lunch times are partially filled, wait for both
    if ((lunchOut && !lunchIn) || (!lunchOut && lunchIn)) {
      setCalculatedFinalOut("");
      return;
    }

    // If lunch times are filled, validate lunch rules
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

    // Calculate worked minutes before lunch
    let workedBeforeLunch = 0;
    if (lunchOutDate) {
      workedBeforeLunch = diffMinutes(morningInDate, lunchOutDate);
      if (workedBeforeLunch < 0) {
        setError("L'orario di uscita in pausa non può essere prima dell'ingresso mattutino");
        setCalculatedFinalOut("");
        return;
      }
    }

    // Calculate worked minutes after lunch
    let workedAfterLunch = 0;
    if (lunchInDate) {
      // We don't know finalOut yet, so we calculate finalOut based on rules
      // We'll calculate finalOut below
    }

    // Calculate total worked minutes excluding lunch pause
    // If no lunch pause, 30 min pause is counted anyway
    // If lunch pause < 30 min, count 30 min pause anyway
    // If lunch pause > 30 min, extra minutes must be recovered (detraction)

    // Calculate lunch pause duration
    let lunchPauseMins = 30; // default 30 min if no lunch pause or less than 30 min
    if (lunchOutDate && lunchInDate) {
      const actualLunchPause = diffMinutes(lunchOutDate, lunchInDate);
      lunchPauseMins = actualLunchPause < 30 ? 30 : actualLunchPause;
    }

    // Check if lunch pause is allowed (only if total work >= 6h)
    // We calculate total work as WORK_DURATION_MIN + lunchPauseMins
    // But we don't have finalOut yet, so we calculate finalOut now:

    // Calculate finalOut time:
    // finalOut = morningIn + WORK_DURATION_MIN + lunchPauseMins + extra recovery if lunchPauseMins > 30

    // Extra recovery minutes = lunchPauseMins - 30 if > 30 else 0
    const extraRecovery = lunchPauseMins > 30 ? lunchPauseMins - 30 : 0;

    // Calculate finalOut in minutes from midnight
    // finalOut = morningIn + WORK_DURATION_MIN + lunchPauseMins + extraRecovery
    // But extraRecovery is detraction, so finalOut is delayed by extraRecovery minutes

    // Actually, the extraRecovery means you have to work more, so finalOut is morningIn + WORK_DURATION_MIN + lunchPauseMins + extraRecovery
    // But lunchPauseMins already includes the extra time, so we add extraRecovery again? No, lunchPauseMins already includes the full pause time.
    // So finalOut = morningIn + WORK_DURATION_MIN + lunchPauseMins + extraRecovery (extraRecovery is the extra time to recover)
    // Wait, this would double count extraRecovery. So finalOut = morningIn + WORK_DURATION_MIN + lunchPauseMins + extraRecovery is wrong.
    // Correct is finalOut = morningIn + WORK_DURATION_MIN + lunchPauseMins + extraRecovery
    // But lunchPauseMins already includes the extra time, so extraRecovery is lunchPauseMins - 30
    // So finalOut = morningIn + WORK_DURATION_MIN + lunchPauseMins + extraRecovery = morningIn + WORK_DURATION_MIN + lunchPauseMins + (lunchPauseMins - 30) = morningIn + WORK_DURATION_MIN + 2*lunchPauseMins - 30
    // This is wrong, so let's think carefully:
    // The base work is 7h12m including 30m lunch.
    // If lunch is longer than 30m, the extra time must be recovered, so total work time increases by extraRecovery.
    // So finalOut = morningIn + 7h12m + lunchPauseMins + extraRecovery - 30m (because 30m lunch is already included in 7h12m)
    // So finalOut = morningIn + 7h12m + (lunchPauseMins - 30m) + extraRecovery
    // But extraRecovery = lunchPauseMins - 30m, so finalOut = morningIn + 7h12m + 2*(lunchPauseMins - 30m)
    // This is not correct.
    // Actually, the 7h12m includes 30m lunch, so the actual work time is 6h42m (7h12m - 30m lunch).
    // So finalOut = morningIn + 6h42m + lunchPauseMins + extraRecovery
    // extraRecovery = lunchPauseMins - 30m if lunchPauseMins > 30 else 0
    // So finalOut = morningIn + 6h42m + lunchPauseMins + extraRecovery
    // But extraRecovery is already included in lunchPauseMins, so we add it again? No.
    // So finalOut = morningIn + 6h42m + lunchPauseMins + extraRecovery
    // Wait, extraRecovery is the extra time to recover, so it adds to work time.
    // So finalOut = morningIn + 6h42m + lunchPauseMins + extraRecovery
    // But lunchPauseMins already includes the full pause time, so extraRecovery is double counted.
    // So finalOut = morningIn + 6h42m + lunchPauseMins + extraRecovery is wrong.
    // Correct is finalOut = morningIn + 6h42m + lunchPauseMins + extraRecovery (extraRecovery is the extra time to recover)
    // But lunchPauseMins includes the full pause, so extraRecovery is lunchPauseMins - 30m
    // So finalOut = morningIn + 6h42m + lunchPauseMins + (lunchPauseMins - 30m) = morningIn + 6h42m + 2*lunchPauseMins - 30m
    // This is wrong.
    // Let's simplify:
    // Work time excluding lunch = 7h12m - 30m = 6h42m = 402 min
    // So total time at work = 6h42m + lunchPauseMins + extraRecovery
    // But extraRecovery = lunchPauseMins - 30m if lunchPauseMins > 30 else 0
    // So total time = 402 + lunchPauseMins + extraRecovery
    // But extraRecovery is part of lunchPauseMins, so we must not add it twice.
    // So total time = 402 + lunchPauseMins + (lunchPauseMins - 30m) if lunchPauseMins > 30 else 402 + lunchPauseMins
    // This is double counting.
    // Actually, the extraRecovery is the extra time beyond 30m, so total time = 402 + lunchPauseMins + extraRecovery = 402 + lunchPauseMins + (lunchPauseMins - 30m) = 402 + 2*lunchPauseMins - 30m
    // This is wrong.
    // The correct approach:
    // The base work is 7h12m including 30m lunch.
    // If lunch is longer than 30m, the extra time must be recovered, so total work time increases by extraRecovery.
    // So finalOut = morningIn + 7h12m + extraRecovery
    // Because 7h12m already includes 30m lunch.
    // So finalOut = morningIn + 432 + extraRecovery
    // This is the correct formula.

    const finalOutMins =
      morningInMins + WORK_DURATION_MIN + (extraRecovery > 0 ? extraRecovery : 0);

    // Check finalOutMins within office hours
    if (finalOutMins > OFFICE_CLOSE) {
      setError(
        "L'orario di uscita previsto supera l'orario di chiusura dell'ufficio (19:00)",
      );
      setCalculatedFinalOut("");
      return;
    }

    // Check lunch pause allowed only if work >= 6h
    // Calculate total work excluding lunch pause (morningIn to lunchOut + lunchIn to finalOut)
    // But finalOut is calculated now, so:
    // workedBeforeLunch = lunchOut - morningIn
    // workedAfterLunch = finalOut - lunchIn
    // totalWork = workedBeforeLunch + workedAfterLunch

    if (lunchOutDate && lunchInDate) {
      const workedAfterLunchMins = finalOutMins - toMinutes(lunchInDate);
      const totalWorkMins = workedBeforeLunch + workedAfterLunchMins;

      if (totalWorkMins < MIN_WORK_FOR_LUNCH) {
        setError(
          "La pausa pranzo può essere fatta solo se si svolgono almeno 6 ore di lavoro",
        );
        setCalculatedFinalOut("");
        return;
      }
    }

    // Check 3h36m obbligatori entro 14:12
    // Calculate work done by 14:12 (852 min)
    // Work before lunch + work after lunch until 14:12

    const limitTime = fromMinutes(LATEST_3H36M_TIME);

    let workBy1412 = 0;
    if (lunchOutDate && lunchInDate) {
      // Work before lunch if lunchOut <= 14:12
      if (toMinutes(lunchOutDate) <= LATEST_3H36M_TIME) {
        workBy1412 += diffMinutes(morningInDate, lunchOutDate);
      } else if (toMinutes(morningInDate) < LATEST_3H36M_TIME) {
        workBy1412 += LATEST_3H36M_TIME - toMinutes(morningInDate);
      }
      // Work after lunch if lunchIn < 14:12
      if (toMinutes(lunchInDate) < LATEST_3H36M_TIME) {
        const afterLunchEnd = Math.min(finalOutMins, LATEST_3H36M_TIME);
        if (afterLunchEnd > toMinutes(lunchInDate)) {
          workBy1412 += afterLunchEnd - toMinutes(lunchInDate);
        }
      }
    } else {
      // No lunch pause, work is continuous from morningIn to finalOut
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

    // If no lunch pause entered, count 30 min pause anyway
    if (!lunchOutDate || !lunchInDate) {
      setInfo(
        "Non è stata inserita la pausa pranzo, verranno conteggiati 30 minuti di pausa comunque",
      );
    }

    setCalculatedFinalOut(formatTime(fromMinutes(finalOutMins)));
  }, [morningIn, lunchOut, lunchIn]);

  // Calculate total worked time and lunch pause for display
  let totalWorkedMins = 0;
  let lunchPauseMins = 30;
  let lunchPauseEntered = false;

  const morningInDate = parseTime(morningIn);
  const lunchOutDate = parseTime(lunchOut);
  const lunchInDate = parseTime(lunchIn);
  const finalOutDate = parseTime(finalOut || calculatedFinalOut);

  if (morningInDate && finalOutDate) {
    if (lunchOutDate && lunchInDate) {
      lunchPauseEntered = true;
      const actualLunchPause = diffMinutes(lunchOutDate, lunchInDate);
      lunchPauseMins = actualLunchPause < 30 ? 30 : actualLunchPause;
      totalWorkedMins =
        diffMinutes(morningInDate, lunchOutDate) +
        diffMinutes(lunchInDate, finalOutDate);
    } else {
      // No lunch pause entered, count 30 min pause anyway
      lunchPauseMins = 30;
      totalWorkedMins = diffMinutes(morningInDate, finalOutDate) - lunchPauseMins;
    }
  }

  // Format total worked time for display
  const totalWorkedHours = Math.floor(totalWorkedMins / 60);
  const totalWorkedMinutes = Math.round(totalWorkedMins % 60);

  // Calculate extra lunch pause to recover or detraction
  const extraLunchPause = lunchPauseMins > 30 ? lunchPauseMins - 30 : 0;

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
        </div>
      )}
    </div>
  );
};

export default WorkTimeTracker;