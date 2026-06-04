"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type RotatingTextProps = {
  words: string[];
  intervalMs?: number;
  className?: string;
};

export function RotatingText({ words, intervalMs = 2600, className }: RotatingTextProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce || words.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [words.length, intervalMs, reduce]);

  const word = words[index] ?? words[0];

  if (reduce) {
    return <span className={className}>{word}</span>;
  }

  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={word}
          className="inline-block text-[#2997ff]"
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
