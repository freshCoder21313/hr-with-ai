import { useState, useEffect, useRef } from 'react';

export const useInterviewTimer = (
  isProcessing: boolean,
  difficulty?: string,
  onTimeUp?: () => void
) => {
  const [timer, setTimer] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [prevIsProcessing, setPrevIsProcessing] = useState(isProcessing);

  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Derived state from props: Handle isProcessing changes during render
  // This avoids "setState in effect" warnings and ensures state is updated before paint.
  if (isProcessing !== prevIsProcessing) {
    setPrevIsProcessing(isProcessing);

    if (isProcessing) {
      // User sent message (Idle -> Processing) -> Stop timer
      setIsTimerActive(false);
    } else {
      // AI finished speaking (Processing -> Idle) -> Start timer if hardcore
      if (difficulty === 'hardcore') {
        setTimer(60);
        setIsTimerActive(true);
      }
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        if (timer <= 1) {
          // Time is up
          setTimer(0);
          setIsTimerActive(false);
          if (onTimeUpRef.current) onTimeUpRef.current();
        } else {
          setTimer(timer - 1);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timer]);

  const stopTimer = () => setIsTimerActive(false);

  return { timer, isTimerActive, stopTimer };
};
