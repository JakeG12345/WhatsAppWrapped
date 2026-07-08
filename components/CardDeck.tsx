"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";

interface CardDeckProps {
  cards: ReactNode[];
  onIndexChange?: (index: number) => void;
}

const SWIPE_THRESHOLD = 80;

export default function CardDeck({ cards, onIndexChange }: CardDeckProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = (next: number) => {
    if (next < 0 || next >= cards.length) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
    onIndexChange?.(next);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.x < -SWIPE_THRESHOLD) goTo(index + 1);
    else if (info.offset.x > SWIPE_THRESHOLD) goTo(index - 1);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      {/* Story progress segments */}
      <div className="absolute inset-x-0 top-0 z-20 flex gap-px px-5 pt-[calc(env(safe-area-inset-top)+0.65rem)] sm:px-8">
        {cards.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden bg-border">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: i <= index ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={index}
          custom={direction}
          initial={{ x: direction > 0 ? "100%" : "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction > 0 ? "-100%" : "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={handleDragEnd}
          className="absolute inset-0"
        >
          {cards[index]}
        </motion.div>
      </AnimatePresence>

      {/* Deck controls */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-stretch border-t border-border bg-background/90 backdrop-blur-sm">
        <button
          type="button"
          aria-label="Previous card"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="mono-label flex-1 border-r border-border py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-muted transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          ← Prev
        </button>
        <p className="mono-label flex items-center border-r border-border px-4 pb-[env(safe-area-inset-bottom)] tabular-nums text-muted">
          {String(index + 1).padStart(2, "0")}
          <span className="mx-1 opacity-50">/</span>
          {String(cards.length).padStart(2, "0")}
        </p>
        <button
          type="button"
          aria-label="Next card"
          onClick={() => goTo(index + 1)}
          disabled={index === cards.length - 1}
          className="mono-label flex-1 bg-primary py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-primary-ink transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-0"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
