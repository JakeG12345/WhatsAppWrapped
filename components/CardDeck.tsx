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
    <div className="relative h-dvh w-full overflow-hidden bg-[#0B141A]">
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        {cards.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 overflow-hidden rounded-full bg-[#2A3942]"
          >
            <div
              className="h-full rounded-full bg-[#25D366] transition-all duration-300 ease-out"
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

      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <button
          type="button"
          aria-label="Previous card"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="rounded-full border border-[#2A3942] bg-[#202C33]/90 px-4 py-2 text-sm font-semibold text-[#E9EDEF] backdrop-blur-sm disabled:opacity-0"
        >
          Back
        </button>
        <p className="rounded-full bg-[#111B21]/80 px-3 py-1 text-xs font-medium text-[#8696A0]">
          {index + 1} / {cards.length}
        </p>
        <button
          type="button"
          aria-label="Next card"
          onClick={() => goTo(index + 1)}
          disabled={index === cards.length - 1}
          className="rounded-full bg-[#00A884] px-4 py-2 text-sm font-bold text-[#06130D] backdrop-blur-sm disabled:opacity-0"
        >
          Next
        </button>
      </div>
    </div>
  );
}
