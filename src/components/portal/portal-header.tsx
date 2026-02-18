"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { PortalLocaleSwitcher } from "@/components/portal/portal-locale-switcher";

export function PortalHeader() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/50 dark:border-slate-800/50"
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:h-24 sm:px-10">
        <div className="flex-1" />
        <Link href="/portal/apply">
          <img
            src="/logo.jpg"
            alt="Unusual Consulting"
            className="h-12 object-contain sm:h-[4.5rem] cursor-pointer"
          />
        </Link>
        <div className="flex flex-1 justify-end pr-1 sm:pr-2">
          <PortalLocaleSwitcher />
        </div>
      </div>
    </motion.header>
  );
}
