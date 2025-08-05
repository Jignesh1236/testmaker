import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TestTimerProps {
  duration: number; // Duration in minutes
  onTimeUp: () => void;
  startTime?: Date;
}

export function TestTimer({ duration, onTimeUp, startTime }: TestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration * 60); // Convert to seconds
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (startTime) {
      setIsRunning(true);
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const elapsed = Math.floor((now - startTime.getTime()) / 1000);
        const remaining = Math.max(0, (duration * 60) - elapsed);
        
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          setIsRunning(false);
          clearInterval(interval);
          onTimeUp();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [startTime, duration, onTimeUp]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 300) return "text-red-800 bg-red-100"; // Less than 5 minutes
    if (timeLeft <= 600) return "text-amber-800 bg-amber-100"; // Less than 10 minutes
    return "text-amber-800 bg-amber-100";
  };

  return (
    <div className={`px-4 py-2 rounded-lg font-semibold text-lg ${getTimerColor()}`}>
      <Clock className="inline mr-2" size={20} />
      <span>{formatTime(timeLeft)}</span>
      <div className="text-xs font-normal mt-1">Time Remaining</div>
    </div>
  );
}
