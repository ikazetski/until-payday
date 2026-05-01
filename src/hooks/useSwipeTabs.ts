import { useRef } from "react";

type UseSwipeTabsOptions<T extends string> = {
  value: T;
  values: T[];
  onChange: (value: T) => void;
  threshold?: number;
};

export function useSwipeTabs<T extends string>({
  value,
  values,
  onChange,
  threshold = 56,
}: UseSwipeTabsOptions<T>) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const goToPrevious = () => {
    const currentIndex = values.indexOf(value);
    if (currentIndex > 0) {
      onChange(values[currentIndex - 1]);
    }
  };

  const goToNext = () => {
    const currentIndex = values.indexOf(value);
    if (currentIndex >= 0 && currentIndex < values.length - 1) {
      onChange(values[currentIndex + 1]);
    }
  };

  return {
    onTouchStart: (event: React.TouchEvent) => {
      const touch = event.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
    },
    onTouchEnd: (event: React.TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;

      if (!start) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      if (Math.abs(deltaX) < threshold) return;
      if (Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    },
  };
}