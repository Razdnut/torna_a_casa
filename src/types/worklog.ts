export interface WorkDayCalculated {
  total: number;
  debt: number;
  credit: number;
  totalWithPermit: number;
  permitDuration: number;
  totalRaw: number;
  totalWithPermitIfReached: number;
  reachedWorkTime: boolean;
}

export interface WorkDayRecord {
  morningIn: string;
  lunchOut: string;
  lunchIn: string;
  finalOut: string;
  pauseNoExit: boolean;
  usedPermit: boolean;
  permitOut: string;
  permitIn: string;
  calculated: WorkDayCalculated | null;
  updatedAt: string;
}

export interface WorkDayEntry extends WorkDayRecord {
  dayKey: string;
}