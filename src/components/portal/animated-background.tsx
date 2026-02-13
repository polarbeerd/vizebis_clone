"use client";

import { motion } from "framer-motion";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/40 dark:from-slate-950 dark:via-blue-950/30 dark:to-violet-950/40" />

      {/* Floating orbs */}
      <motion.div
        className="absolute top-1/4 -left-20 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl dark:bg-blue-800/20"
        animate={{
          x: [0, 60, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-2/3 right-0 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-800/20"
        animate={{
          x: [0, -50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -bottom-10 left-1/3 h-64 w-64 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-800/15"
        animate={{
          x: [0, 40, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
