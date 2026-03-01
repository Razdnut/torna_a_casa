import { useState } from "react";
import WelcomeModal from "@/components/WelcomeModal";
import PageList from "@/components/PageList";

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {showWelcome && <WelcomeModal onProceed={() => setShowWelcome(false)} />}

      {!showWelcome && (
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 py-8">
          <h1 className="text-center text-4xl font-bold">Torna a Casa</h1>
          <p className="text-center text-muted-foreground">
            Gestisci le tue giornate lavorative, salva i dati e recuperali dal
            calendario.
          </p>
          <PageList />
        </div>
      )}
    </div>
  );
};

export default Index;
