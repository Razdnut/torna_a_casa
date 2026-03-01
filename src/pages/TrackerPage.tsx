import { useParams } from "react-router-dom";
import WorkTimeTracker from "@/components/WorkTimeTracker";

const TrackerPage = () => {
  const { dayKey } = useParams();

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="mb-4 text-3xl font-bold">Tracker giornaliero</h1>
        <WorkTimeTracker initialDayKey={dayKey} />
      </div>
    </main>
  );
};

export default TrackerPage;