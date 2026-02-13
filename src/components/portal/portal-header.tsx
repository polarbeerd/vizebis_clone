"use client";

import { motion } from "framer-motion";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export function PortalHeader() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/50 dark:border-slate-800/50"
    >
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Unusual Consulting" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            Unusual Consulting
          </span>
        </div>
        <LocaleSwitcher />
      </div>
    </motion.header>
  );
}
