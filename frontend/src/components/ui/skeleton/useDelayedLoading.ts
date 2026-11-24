import { useEffect, useRef, useState } from "react";

export type DelayedLoadingOptions = {
  showAfterMs?: number;
  minVisibleMs?: number;
};

export function useDelayedLoading(
  isLoading: boolean,
  options: DelayedLoadingOptions = {},
): boolean {
  const { showAfterMs = 150, minVisibleMs = 400 } = options;
  const [isVisible, setIsVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isVisible || shownAtRef.current === null) {
        setIsVisible(false);
        shownAtRef.current = null;
        return;
      }

      const remainingVisibleMs = Math.max(0, shownAtRef.current + minVisibleMs - Date.now());
      const timerId = window.setTimeout(() => {
        setIsVisible(false);
        shownAtRef.current = null;
      }, remainingVisibleMs);

      return () => window.clearTimeout(timerId);
    }

    const timerId = window.setTimeout(() => {
      setIsVisible(true);
      shownAtRef.current = Date.now();
    }, showAfterMs);

    return () => window.clearTimeout(timerId);
  }, [isLoading, isVisible, minVisibleMs, showAfterMs]);

  return isVisible;
}
