"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Search,
  CreditCard,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { lookupApplicationByPassport } from "../actions";
import type { PaymentApplication } from "../actions";
import { PaymentClient } from "../payment/[trackingCode]/payment-client";

export function PayClient() {
  const t = useTranslations("payment");
  const [passportNo, setPassportNo] = useState("");
  const [isPending, startTransition] = useTransition();
  const [application, setApplication] = useState<PaymentApplication | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passportNo.trim()) return;

    setError(null);
    setApplication(null);

    startTransition(async () => {
      const result = await lookupApplicationByPassport(passportNo.trim());

      if (result.error || !result.data) {
        setError(result.error ?? "NOT_FOUND");
        setSearched(true);
        return;
      }

      setApplication(result.data);
      setSearched(true);
    });
  };

  // Show the payment component once an application is found
  if (application) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="payment"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4 }}
        >
          <PaymentClient application={application} error={null} />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:px-0 sm:py-16">
      <AnimatePresence mode="wait">
        <motion.div
          key="lookup"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6 text-center sm:mb-8"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEBEBF]/20 dark:bg-brand-950/30">
              <CreditCard className="h-7 w-7 text-[#FEBEBF]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {t("lookupTitle")}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t("lookupSubtitle")}
            </p>
          </motion.div>

          {/* Lookup Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 shadow-lg shadow-slate-200/30 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-slate-900/30"
          >
            <form onSubmit={handleSubmit} className="px-5 py-6 sm:px-7">
              {/* Passport Input */}
              <div className="mb-5">
                <label
                  htmlFor="passport-no"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {t("passportNumber")}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="passport-no"
                    type="text"
                    value={passportNo}
                    onChange={(e) => {
                      setPassportNo(e.target.value.toUpperCase());
                      if (searched) {
                        setSearched(false);
                        setError(null);
                      }
                    }}
                    placeholder={t("passportPlaceholder")}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white/80 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#FEBEBF] focus:ring-2 focus:ring-[#FEBEBF]/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-[#FEBEBF]"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  type="submit"
                  disabled={isPending || !passportNo.trim()}
                  className="relative h-12 w-full rounded-xl bg-[#FEBEBF] text-base font-semibold text-white shadow-lg shadow-[#FEBEBF]/25 transition-all hover:brightness-90 hover:shadow-xl hover:shadow-[#FEBEBF]/30 disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t("searching")}
                    </>
                  ) : (
                    <>
                      {t("findApplication")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </motion.div>

          {/* Error State */}
          <AnimatePresence>
            {searched && error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="mt-6 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 shadow-lg shadow-slate-200/30 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-slate-900/30"
              >
                <div className="flex flex-col items-center px-5 py-8 text-center sm:px-7">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
                    <AlertCircle className="h-8 w-8 text-red-400" />
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">
                    {t("noApplicationFound")}
                  </h3>
                  <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
                    {t("noApplicationFoundDesc")}
                  </p>
                  <Link href="/portal/apply">
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl px-6"
                    >
                      {t("applyNow")}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
