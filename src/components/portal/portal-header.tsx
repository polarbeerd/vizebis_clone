"use client";

import { motion } from "framer-motion";
import { PortalLocaleSwitcher } from "@/components/portal/portal-locale-switcher";

export function PortalHeader() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/50 dark:border-slate-800/50"
    >
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-2 sm:h-20 sm:px-6">
        <div className="flex-1" />
        <img
          src="/logo.jpg"
          alt="Unusual Consulting"
          className="h-10 object-contain sm:h-14"
        />
        <div className="flex flex-1 justify-end">
          <PortalLocaleSwitcher />
        </div>
      </div>
    </motion.header>
  );
}
