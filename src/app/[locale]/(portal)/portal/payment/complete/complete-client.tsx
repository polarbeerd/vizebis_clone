"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { PaymentApplication } from "../../actions";
import { getApplicationForPayment } from "../../actions";

interface CompleteClientProps {
  application: PaymentApplication | null;
  error: string | null;
}

type PaymentState = "success" | "processing" | "failed";

export function CompleteClient({
  application: initialApp,
  error,
}: CompleteClientProps) {
  const t = useTranslations("payment");
  const [application, setApplication] = useState(initialApp);
  const [pollCount, setPollCount] = useState(0);

  const isPaid = application?.payment_status === "odendi";

  const state: PaymentState = error
    ? "failed"
    : isPaid
      ? "success"
      : pollCount < 6
        ? "processing"
        : "failed";

  // Poll for payment status updates (webhook may be slightly delayed)
  const pollStatus = useCallback(async () => {
    if (!application?.tracking_code || isPaid) return;
    try {
      const result = await getApplicationForPayment(
        application.tracking_code
      );
      if (result.data) {
        setApplication(result.data);
      }
    } catch {
      // ignore polling errors
    }
  }, [application?.tracking_code, isPaid]);

  useEffect(() => {
    if (isPaid || !application || pollCount >= 6) return;

    const timer = setTimeout(
      () => {
        pollStatus();
        setPollCount((c) => c + 1);
      },
      pollCount === 0 ? 2000 : 3000
    );

    return () => clearTimeout(timer);
  }, [pollCount, isPaid, application, pollStatus]);

  // ── Error / not found ──
  if (!application) {
    return (
      <div className="mx-auto w-full max-w-lg px-1 py-8 sm:px-0 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
            {t("errorTitle")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("errorDesc")}
          </p>
          <Link href="/portal/apply">
            <Button
              variant="outline"
              className="mt-6 h-11 rounded-xl px-6"
            >
              {t("submitAnother")}
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-1 py-8 sm:px-0 sm:py-16">
      <AnimatePresence mode="wait">
        {/* ── Success State ── */}
        {state === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center"
          >
            {/* Animated checkmark */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 12,
                delay: 0.2,
              }}
              className="relative mb-8"
            >
              {/* Glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full bg-[#FEBEBF]/20"
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{ width: 96, height: 96 }}
              />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#FEBEBF] shadow-xl shadow-[#FEBEBF]/30">
                <motion.div
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <Check className="h-12 w-12 text-white" strokeWidth={3} />
                </motion.div>
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white"
            >
              {t("paymentConfirmed")}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-2 max-w-sm text-base text-slate-500 dark:text-slate-400"
            >
              {t("paymentConfirmedDesc")}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="text-sm text-slate-400 dark:text-slate-500"
            >
              {t("weWillContactYou")}
            </motion.p>
          </motion.div>
        )}

        {/* ── Processing State ── */}
        {state === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center"
          >
            <div className="relative mb-8">
              <motion.div
                className="flex h-24 w-24 items-center justify-center rounded-full bg-[#FEBEBF]/10 dark:bg-brand-950/20"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <Loader2 className="h-12 w-12 text-[#FEBEBF]" />
              </motion.div>
            </div>

            <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {t("paymentProcessing")}
            </h2>
            <p className="max-w-sm text-base text-slate-500 dark:text-slate-400">
              {t("paymentProcessingDesc")}
            </p>
          </motion.div>
        )}

        {/* ── Failed / Not Completed State ── */}
        {state === "failed" && !error && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
              className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <AlertCircle className="h-12 w-12 text-slate-400" />
            </motion.div>

            <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {t("paymentNotCompleted")}
            </h2>
            <p className="mb-8 max-w-sm text-base text-slate-500 dark:text-slate-400">
              {t("paymentNotCompletedDesc")}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/portal/payment/${application.tracking_code}`}
              >
                <Button className="h-11 rounded-xl bg-[#FEBEBF] px-6 text-white shadow-md shadow-[#FEBEBF]/25 hover:brightness-90">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("tryAgain")}
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
