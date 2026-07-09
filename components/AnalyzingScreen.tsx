"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import BrandMark from "./BrandMark";

const STATUS_LINES = [
  "reading the export",
  "cross-referencing running jokes",
  "pulling quotes into evidence",
  "counting who got left on read",
  "drafting the awards speech",
];

// Classic "fake" progress: climbs fast at first, then decelerates and
// hovers just under the cap. It's driven purely by elapsed time, not real
// completion - real progress arrives in unpredictable bursts (or, with a
// single big call, just one lump at the end), which looks broken as a
// literal percentage. This stays smooth and only ever reaches 100% once the
// parent actually unmounts this screen (i.e. analysis is truly done).
const CAP = 96;
const TIME_CONSTANT_MS = 9000;

function fakeProgress(elapsedMs: number): number {
  return CAP * (1 - Math.exp(-elapsedMs / TIME_CONSTANT_MS));
}

type AnalyzingStage = "reading" | "tallying" | "writing";

interface AnalyzingScreenProps {
  stage: AnalyzingStage;
  totalMessages: number;
}

export default function AnalyzingScreen({ stage, totalMessages }: AnalyzingScreenProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setLineIndex((i) => (i + 1) % STATUS_LINES.length);
    }, 1600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setPercent(fakeProgress(Date.now() - start));
    }, 150);
    return () => clearInterval(id);
  }, []);

  // Faked numerator, real denominator - climbs toward the actual message
  // count with the same curve as the bar, but never reaches it while still
  // in the reading stage (that's reserved for the stage actually changing).
  const messagesRead = Math.min(
    totalMessages,
    Math.floor((percent / CAP) * totalMessages) + 1
  );

  const stageLabel =
    stage === "reading"
      ? "Reading messages"
      : stage === "tallying"
        ? "Compiling the verdict"
        : "Writing the awards";

  return (
    <main className="flex h-dvh w-full flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 sm:px-6">
        <span className="flex items-center gap-2">
          <BrandMark />
          <p className="mono-label text-muted">WhatsApp Wrapped</p>
        </span>
        <p className="mono-label flex items-center gap-2 text-primary">
          <motion.span
            className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
          Processing
        </p>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 sm:px-6">
        {/* Giant percent readout */}
        <div className="flex items-end justify-between border-b border-border pb-4">
          <p className="text-[26vw] font-black leading-[0.85] tracking-normal tabular-nums sm:text-9xl">
            {Math.floor(percent)}
            <span className="text-primary">%</span>
          </p>
          <p className="mono-label pb-2 text-right text-muted">
            {stageLabel}
          </p>
        </div>

        {/* Progress rule */}
        <div className="mt-4 h-1 w-full bg-border" role="progressbar" aria-valuenow={Math.floor(percent)} aria-valuemin={0} aria-valuemax={100}>
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${percent}%` }}
            transition={{ ease: "easeOut", duration: 0.2 }}
          />
        </div>

        {/* Log ticker */}
        <div className="mt-8 border-l-2 border-primary pl-4">
          <p className="font-mono text-xs text-muted" aria-live="polite">
            <span className="text-primary">&gt;</span>{" "}
            {STATUS_LINES[lineIndex]}
            <motion.span
              className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 bg-primary"
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
          </p>
          {totalMessages > 0 && stage === "reading" && (
            <p className="mt-2 font-mono text-xs tabular-nums text-muted">
              {messagesRead.toLocaleString()} / {totalMessages.toLocaleString()}{" "}
              messages
            </p>
          )}
        </div>
      </div>

      <footer className="ticket-edge px-4 py-3 sm:px-6">
        <p className="mono-label text-center text-muted">
          Do not close the tab &middot; the jury is deliberating
        </p>
      </footer>
    </main>
  );
}
