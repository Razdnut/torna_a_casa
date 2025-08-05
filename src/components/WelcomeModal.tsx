import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface WelcomeModalProps {
  onProceed: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onProceed }) => {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onProceed();
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onProceed]);

  const handleProceed = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(100);
    onProceed();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full flex flex-col items-center">
        <div
          className="text-2xl md:text-3xl font-serif font-semibold text-center mb-6"
          style={{ fontFamily: "'Playfair Display', serif" }}
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