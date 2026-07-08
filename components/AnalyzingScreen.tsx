"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const EMOJIS = ["💀", "👀", "😭", "🔥", "📖", "🕵️", "🍿"];

// Classic "fake" progress: climbs fast at first, then decelerates and
// hovers just under the cap. It's driven purely by elapsed time, not real
// completion — real progress across parallel batch calls arrives in
// unpredictable bursts, which looks broken as a literal percentage. This
// stays smooth and only ever reaches 100% once the parent actually unmounts
// this screen (i.e. analysis is truly done), so it never lies.
const CAP = 96;
const TIME_CONSTANT_MS = 9000;

function fakeProgress(elapsedMs: number): number {
  return CAP * (1 - Math.exp(-elapsedMs / TIME_CONSTANT_MS));
}

export default function AnalyzingScreen({ label }: { label: string }) {
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
      <div className="flex w-56 flex-col items-center gap-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
          <motion.div
            className="h-full rounded-full bg-white"
            animate={{ width: `${percent}%` }}
            transition={{ ease: "easeOut", duration: 0.2 }}
          />
        </div>
        <p className="text-xs font-medium tabular-nums text-white/50">
          {Math.round(percent)}%
        </p>
      </div>
    </div>
  );
}
