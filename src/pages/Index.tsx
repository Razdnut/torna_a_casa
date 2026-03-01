import React, { useState } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import WorkTimeTracker from "@/components/WorkTimeTracker";
import WelcomeModal from "@/components/WelcomeModal";

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      {showWelcome && (
        <WelcomeModal onProceed={() => setShowWelcome(false)} />
      )}
      {!showWelcome && (
        <>
          <h1 className="text-4xl font-bold mb-6">Monitoraggio Orario Lavoro</h1>
          <WorkTimeTracker />
          <MadeWithDyad />
        </>
      )}
    </div>
  );
};

export default Index;