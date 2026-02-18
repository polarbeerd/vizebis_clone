"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

const STEPS = [
  { key: "beklemede", translationKey: "stepPending" },
  { key: "hazirlaniyor", translationKey: "stepPreparing" },
  { key: "konsoloslukta", translationKey: "stepAtConsulate" },
  { key: "vize_cikti", translationKey: "stepApproved" },
  { key: "pasaport_teslim", translationKey: "stepDelivered" },
] as const;

const STATUS_ORDER: Record<string, number> = {
  beklemede: 0,
  hazirlaniyor: 1,
  konsoloslukta: 2,
  vize_cikti: 3,
  pasaport_teslim: 4,
};

interface StatusTimelineProps {
  status: string;
}

export function StatusTimeline({ status }: StatusTimelineProps) {
  const t = useTranslations("portal");
  const isRejected = status === "ret_oldu";
  const currentIndex = STATUS_ORDER[status] ?? -1;

  if (isRejected) {
    return <RejectedTimeline t={t} />;
  }

  return (
    <div className="w-full px-2">
      {/* Desktop horizontal timeline */}
      <div className="hidden sm:block">
        <div className="relative flex items-center justify-between">
          {/* Background track */}
          <div className="absolute top-5 left-5 right-5 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />

          {/* Animated progress line */}
          <motion.div
            className="absolute top-5 left-5 h-1 rounded-full bg-brand-400"
            initial={{ width: "0%" }}
            animate={{
              width: `${currentIndex >= 0 ? (currentIndex / (STEPS.length - 1)) * 100 : 0}%`,
            }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            style={{ maxWidth: "calc(100% - 40px)" }}
          />

          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.15, type: "spring", stiffness: 200 }}
                  className="relative"
                >
                  {isCompleted ? (
                    <motion.div
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-400 text-white shadow-lg"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                    >
                      <Check className="h-5 w-5" strokeWidth={3} />
                    </motion.div>
                  ) : isCurrent ? (
                    <div className="relative">
                      <motion.div
                        className="absolute inset-0 rounded-full bg-brand-400/30"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand-300 text-white shadow-lg shadow-brand-500/30">
                        <motion.div
                          className="h-3 w-3 rounded-full bg-white"
                          animate={{ scale: [1, 0.7, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500">
                      <span className="text-xs font-medium">{index + 1}</span>
                    </div>
                  )}
                </motion.div>

                <motion.span
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.15 }}
                  className={`mt-2 text-xs font-medium text-center max-w-[80px] ${
                    isCompleted || isCurrent
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {t(step.translationKey)}
                </motion.span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile vertical timeline */}
      <div className="block sm:hidden space-y-0">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                >
                  {isCompleted ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-400 text-white">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </div>
                  ) : isCurrent ? (
                    <div className="relative">
                      <motion.div
                        className="absolute inset-0 rounded-full bg-brand-400/30"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-300 text-white">
                        <motion.div
                          className="h-2.5 w-2.5 rounded-full bg-white"
                          animate={{ scale: [1, 0.7, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800">
                      <span className="text-[10px] font-medium">{index + 1}</span>
                    </div>
                  )}
                </motion.div>
                {!isLast && (
                  <div className={`w-0.5 h-8 ${
                    isCompleted ? "bg-brand-400" : "bg-slate-200 dark:bg-slate-700"
                  }`} />
                )}
              </div>
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={`pt-1.5 text-sm font-medium ${
                  isCompleted || isCurrent
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {t(step.translationKey)}
              </motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RejectedTimeline({ t }: { t: ReturnType<typeof useTranslations<"portal">> }) {
  // Show first 3 steps as completed, then rejected
  const rejectedSteps = STEPS.slice(0, 3);

  return (
    <div className="w-full px-2">
      <div className="hidden sm:block">
        <div className="relative flex items-center justify-between">
          <div className="absolute top-5 left-5 right-5 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
          <motion.div
            className="absolute top-5 left-5 h-1 rounded-full bg-brand-400"
            initial={{ width: "0%" }}
            animate={{ width: "75%" }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            style={{ maxWidth: "calc(100% - 40px)" }}
          />

          {rejectedSteps.map((step, index) => (
            <div key={step.key} className="relative z-10 flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + index * 0.15, type: "spring" }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-400 text-white shadow-lg"
              >
                <Check className="h-5 w-5" strokeWidth={3} />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.15 }}
                className="mt-2 text-xs font-medium text-slate-900 dark:text-slate-100 text-center max-w-[80px]"
              >
                {t(step.translationKey)}
              </motion.span>
            </div>
          ))}

          {/* Rejected step */}
          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
            >
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30"
                animate={{ x: [-2, 2, -2, 2, 0] }}
                transition={{ delay: 1.2, duration: 0.4 }}
              >
                <X className="h-5 w-5" strokeWidth={3} />
              </motion.div>
            </motion.div>
            <motion.span
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 text-center max-w-[80px]"
            >
              {t("stepRejected")}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Mobile vertical rejected */}
      <div className="block sm:hidden space-y-0">
        {rejectedSteps.map((step, index) => (
          <div key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-400 text-white"
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </motion.div>
              <div className="w-0.5 h-8 bg-brand-400" />
            </div>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="pt-1 text-sm font-medium text-slate-900 dark:text-slate-100"
            >
              {t(step.translationKey)}
            </motion.span>
          </div>
        ))}
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
            >
              <motion.div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white"
                animate={{ x: [-2, 2, -2, 2, 0] }}
                transition={{ delay: 1, duration: 0.4 }}
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </motion.div>
            </motion.div>
          </div>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="pt-1 text-sm font-medium text-red-600 dark:text-red-400"
          >
            {t("stepRejected")}
          </motion.span>
        </div>
      </div>
    </div>
  );
}
