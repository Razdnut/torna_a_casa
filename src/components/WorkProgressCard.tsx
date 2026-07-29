import { Progress } from "@/components/ui/progress";
import { formatDuration, WorkProgress } from "@/lib/worklog-progress";

interface WorkProgressCardProps {
  progress: WorkProgress | null;
}

const WorkProgressCard = ({ progress }: WorkProgressCardProps) => {
  if (!progress) return null;

  const remaining = Math.max(0, progress.targetMinutes - progress.countedMinutes);
  const isComplete = progress.status === "complete";

  return (
    <section className="mb-5 rounded-xl border border-primary/15 bg-primary/[0.04] p-4" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Obiettivo giornaliero</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatDuration(progress.countedMinutes)} <span className="text-sm font-medium text-muted-foreground">di 7h 12m</span></p>
        </div>
        <span className={isComplete ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800" : "rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"}>
          {isComplete ? "Obiettivo raggiunto" : `${progress.percentage}%`}
        </span>
      </div>
      <Progress value={progress.percentage} className="mt-3 h-3" />
      <p className="mt-2 text-sm text-muted-foreground">
        {isComplete ? "Giornata completata." : `Mancano ${formatDuration(remaining)}.`} {progress.permitMinutes > 0 ? `Permesso conteggiato: ${formatDuration(progress.permitMinutes)}. ` : ""}{progress.detail}.
      </p>
    </section>
  );
};

export default WorkProgressCard;
