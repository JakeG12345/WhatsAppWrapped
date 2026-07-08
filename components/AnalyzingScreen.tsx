"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const EMOJIS = ["💀", "👀", "😭", "🔥", "📖", "🕵️", "🍿"];

// Classic "fake" progress: climbs fast at first, then decelerates and
// hovers just under the cap. It's driven purely by elapsed time, not real
// completion — real progress arrives in unpredictable bursts (or, with a
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
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setEmoji(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
    }, 700);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setPercent(fakeProgress(Date.now() - start));
    }, 150);
    return () => clearInterval(id);
  }, []);

  // Faked numerator, real denominator — climbs toward the actual message
  // count with the same curve as the bar, but never reaches it while still
  // in the reading stage (that's reserved for the stage actually changing).
  const messagesRead = Math.min(
    totalMessages,
    Math.floor((percent / CAP) * totalMessages) + 1
  );

  const label =
    stage === "reading"
      ? `Reading ${messagesRead.toLocaleString()}/${totalMessages.toLocaleString()} messages...`
      : stage === "tallying"
        ? "Compiling the verdict..."
        : "Writing the awards speech...";

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-6 bg-gradient-to-br from-indigo-800 via-purple-800 to-fuchsia-700 px-8 text-center text-white">
      <motion.div
        key={emoji}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-6xl"
      >
        {emoji}
      </motion.div>
      <p className="text-lg font-semibold">{label}</p>
      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/20">
        <motion.div
          className="h-full rounded-full bg-white"
          animate={{ width: `${percent}%` }}
          transition={{ ease: "easeOut", duration: 0.2 }}
        />
      </div>
    </div>
  );
}
