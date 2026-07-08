"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const EMOJIS = ["💀", "👀", "😭", "🔥", "📖", "🕵️", "🍿"];

export default function AnalyzingScreen({ label }: { label: string }) {
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  useEffect(() => {
    const id = setInterval(() => {
      setEmoji(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
    }, 700);
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
      <div className="relative h-1 w-48 overflow-hidden rounded-full bg-white/20">
        <motion.div
          className="absolute h-full w-1/3 rounded-full bg-white"
          animate={{ x: ["-100%", "250%"] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
