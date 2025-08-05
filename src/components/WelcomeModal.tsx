import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface WelcomeModalProps {
  onProceed: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onProceed }) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Gestione avanzamento progress bar e chiusura automatica
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          handleFadeOut();
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line
  }, []);

  // Gestione fade out e chiamata onProceed dopo 2s
  const handleFadeOut = () => {
    setFadeOut(true);
    setTimeout(() => {
      onProceed();
    }, 2000);
  };

  const handleProceed = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(100);
    handleFadeOut();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity duration-2000 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ transitionProperty: "opacity", transitionDuration: "2000ms" }}
    >
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full flex flex-col items-center">
        <div
          className="text-2xl md:text-3xl font-semibold text-center mb-6"
          style={{
            fontFamily: "'Times New Roman', Times, serif",
            fontStyle: "italic",
            letterSpacing: "0.01em",
          }}
        >
          Per tutti i miei colleghi che<br />
          non sanno mai quando è il momento di tornare a casa
        </div>
        <Progress value={progress} className="w-full h-3 mb-6" />
        <Button
          onClick={handleProceed}
          className="w-full text-lg font-semibold"
          variant="default"
        >
          Procedi
        </Button>
      </div>
    </div>
  );
};

export default WelcomeModal;