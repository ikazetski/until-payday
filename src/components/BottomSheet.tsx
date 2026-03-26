import { useEffect, useRef, useState, type ReactNode } from "react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
  panelClassName?: string;
  contentClassName?: string;
};

const CLOSE_THRESHOLD = 90;

export function BottomSheet({
  open,
  onClose,
  children,
  maxWidthClassName = "max-w-md",
  panelClassName = "",
  contentClassName = "",
}: BottomSheetProps) {
  const startYRef = useRef<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    startYRef.current = event.touches[0].clientY;
    setDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (startYRef.current === null) return;

    const currentY = event.touches[0].clientY;
    const delta = currentY - startYRef.current;

    if (delta > 0) {
      setTranslateY(delta);
    } else {
      setTranslateY(0);
    }
  };

  const handleTouchEnd = () => {
    setDragging(false);

    if (translateY >= CLOSE_THRESHOLD) {
      setTranslateY(0);
      startYRef.current = null;
      onClose();
      return;
    }

    setTranslateY(0);
    startYRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClassName} rounded-t-3xl bg-white shadow-2xl ${panelClassName}`}
        onClick={(event) => event.stopPropagation()}
        style={{
          transform: `translateY(${translateY}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
      >
        <div
          className="flex justify-center pt-3 pb-2"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
}