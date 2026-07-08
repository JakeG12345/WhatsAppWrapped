"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const STATUS_LINES = [
  "Reading the export",
  "Finding running jokes",
  "Pulling real quotes",
  "Writing the recap",
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
  const [statusLine, setStatusLine] = useState(STATUS_LINES[0]);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStatusLine(STATUS_LINES[Math.floor(Math.random() * STATUS_LINES.length)]);
    }, 1400);
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

  const label =
    stage === "reading"
      ? `Reading ${messagesRead.toLocaleString()} of ${totalMessages.toLocaleString()} messages`
      : stage === "tallying"
        ? "Compiling the verdict"
        : "Writing the awards speech";

  return (
    <div className="wa-screen flex h-dvh w-full flex-col items-center justify-center px-6 text-center text-[#E9EDEF]">
      <div className="wa-panel flex w-full max-w-sm flex-col gap-6 rounded-[2rem] p-6">
        <div className="flex items-center gap-3 border-b border-[#2A3942] pb-4 text-left">
          <div className="h-10 w-10 rounded-full bg-[#00A884]" />
          <div>
            <p className="text-sm font-semibold">WhatsApp Wrapped</p>
            <p className="text-xs text-[#8696A0]">{statusLine}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-left">
          <div className="w-fit rounded-2xl rounded-bl-md bg-[#202C33] px-4 py-3 shadow-sm">
            <p className="text-sm font-medium">{label}</p>
            <div className="mt-2 flex gap-1">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="h-1.5 w-1.5 rounded-full bg-[#8696A0]"
                  animate={{ opacity: [0.35, 1, 0.35] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: dot * 0.18 }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-[#2A3942]">
          <motion.div
            className="h-full rounded-full bg-[#00A884]"
            animate={{ width: `${percent}%` }}
            transition={{ ease: "easeOut", duration: 0.2 }}
          />
        </div>
      </div>
    </div>
  );
}
