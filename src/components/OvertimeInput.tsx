import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OVERTIME_MAX_PLANNED, OVERTIME_MIN } from "@/lib/day-summary";

interface OvertimeInputProps {
  enabled: boolean;
  minutes: number;
  onEnabledChange: (value: boolean) => void;
  onMinutesChange: (value: number) => void;
  exitTime: string | null;
}

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.floor(value)));
}

const OvertimeInput: React.FC<OvertimeInputProps> = ({
  enabled,
  minutes,
  onEnabledChange,
  onMinutesChange,
  exitTime,
}) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const effective = minutes || OVERTIME_MIN;
  const outOfRange = minutes < OVERTIME_MIN || minutes > OVERTIME_MAX_PLANNED;

  function handleEnabledChange(checked: boolean) {
    onEnabledChange(checked);
    if (checked && minutes === 0) onMinutesChange(OVERTIME_MIN);
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="overtimeEnabled"
          checked={enabled}
          onCheckedChange={(checked) => handleEnabledChange(!!checked)}
        />
        <Label htmlFor="overtimeEnabled" className="text-sm font-medium">
          Oggi faccio straordinario
        </Label>
      </div>

      {enabled && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="overtimeHours" className="mb-1 block">
                Ore
              </Label>
              <Input
                id="overtimeHours"
                type="number"
                inputMode="numeric"
                min={0}
                max={6}
                value={hours}
                onChange={(event) =>
                  onMinutesChange(
                    clamp(event.target.valueAsNumber, 6) * 60 + mins,
                  )
                }
              />
            </div>
            <div>
              <Label htmlFor="overtimeMinutes" className="mb-1 block">
                Minuti
              </Label>
              <Input
                id="overtimeMinutes"
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={mins}
                onChange={(event) =>
                  onMinutesChange(
                    hours * 60 + clamp(event.target.valueAsNumber, 59),
                  )
                }
              />
            </div>
          </div>

          {outOfRange && (
            <p className="text-sm text-red-700">
              Il minimo è 1h00 e il massimo 6h00.
            </p>
          )}

          {exitTime && (
            <div className="rounded bg-blue-100 p-2 text-sm font-semibold text-blue-900">
              Per fare {Math.floor(effective / 60)}h {effective % 60}m di
              straordinario devi uscire alle <strong>{exitTime}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OvertimeInput;
