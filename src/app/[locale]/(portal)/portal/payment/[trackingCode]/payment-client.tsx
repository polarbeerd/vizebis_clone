"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import {
  Lock,
  Shield,
  CreditCard,
  ArrowRight,
  Loader2,
  Check,
  Globe,
  User,
  FileText,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import type { PaymentApplication } from "../../actions";

interface PaymentClientProps {
  application: PaymentApplication | null;
  error: string | null;
}

export function PaymentClient({ application, error }: PaymentClientProps) {
  const t = useTranslations("payment");
  const locale = useLocale();
  const [processing, setProcessing] = useState(false);

  // ── Error state ──
  if (error || !application) {
    return (
      <div className="mx-auto w-full max-w-lg px-1 py-8 sm:px-0 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
            {t("applicationNotFound")}
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

  const serviceFee = Number(application.service_fee) || 0;
  const consulateFee = Number(application.consulate_fee) || 0;
  const totalFee = serviceFee + consulateFee;
  const hasFee = totalFee > 0;
  const isPaid = application.payment_status === "odendi";
  const currency = (application.currency as "TL" | "USD" | "EUR") || "TL";

  // ── Pay Now handler ──
  const handlePayNow = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingCode: application.tracking_code,
          locale,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        toast.error(t("errorTitle"), { description: t("errorDesc") });
        setProcessing(false);
        return;
      }

      // Redirect to Mollie checkout
      window.location.href = data.checkoutUrl;
    } catch {
      toast.error(t("errorTitle"), { description: t("errorDesc") });
      setProcessing(false);
    }
  };

  // ── Already paid state ──
  if (isPaid) {
    return (
      <div className="mx-auto w-full max-w-lg px-1 py-8 sm:px-0 sm:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 12,
              delay: 0.2,
            }}
            className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#FEBEBF] shadow-xl shadow-[#FEBEBF]/30"
          >
            <Check className="h-12 w-12 text-white" strokeWidth={3} />
          </motion.div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
            {t("alreadyPaidTitle")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("alreadyPaidDesc")}
          </p>
        </motion.div>
      </div>
    );
  }

  // ── No fee set state ──
  if (!hasFee) {
    return (
      <div className="mx-auto w-full max-w-lg px-1 py-8 sm:px-0 sm:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 12,
              delay: 0.2,
            }}
            className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#FEBEBF] shadow-xl shadow-[#FEBEBF]/30"
          >
            <Check className="h-12 w-12 text-white" strokeWidth={3} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white"
          >
            {t("noPricingTitle")}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-2 max-w-sm text-base text-slate-500 dark:text-slate-400"
          >
            {t("noPricingDesc")}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="text-sm text-slate-400 dark:text-slate-500"
          >
            {t("weWillContactYou")}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ── Main payment page ──
  return (
    <div className="mx-auto w-full max-w-lg px-1 py-6 sm:px-0 sm:py-12">
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
          {t("pageTitle")}
        </h1>
      </motion.div>

      {/* Payment card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 shadow-lg shadow-slate-200/30 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-slate-900/30"
      >
        {/* Application Summary */}
        <div className="border-b border-slate-100 px-5 py-5 sm:px-7 sm:py-6 dark:border-slate-800/60">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t("summaryTitle")}
          </h3>

          <div className="space-y-3">
            <SummaryRow
              icon={<User className="h-4 w-4" />}
              label={t("applicantName")}
              value={application.full_name || "—"}
              delay={0.15}
            />
            <SummaryRow
              icon={<Globe className="h-4 w-4" />}
              label={t("country")}
              value={application.country || "—"}
              delay={0.2}
            />
            <SummaryRow
              icon={<FileText className="h-4 w-4" />}
              label={t("visaType")}
              value={application.visa_type || "—"}
              delay={0.25}
            />
          </div>
        </div>

        {/* Fee Breakdown */}
        <div className="border-b border-slate-100 px-5 py-5 sm:px-7 sm:py-6 dark:border-slate-800/60">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t("feeBreakdown")}
          </h3>

          <div className="space-y-3">
            {serviceFee > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {t("serviceFee")}
                </span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {formatCurrency(serviceFee, currency)}
                </span>
              </motion.div>
            )}
            {consulateFee > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {t("consulateFee")}
                </span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {formatCurrency(consulateFee, currency)}
                </span>
              </motion.div>
            )}

            {/* Divider */}
            <div className="border-t border-dashed border-slate-200 pt-3 dark:border-slate-700">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-between"
              >
                <span className="text-base font-semibold text-slate-900 dark:text-white">
                  {t("totalAmount")}
                </span>
                <motion.span
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  className="text-xl font-bold text-slate-900 dark:text-white"
                >
                  {formatCurrency(totalFee, currency)}
                </motion.span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Pay Now Button */}
        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={handlePayNow}
              disabled={processing}
              className="relative h-13 w-full rounded-xl bg-[#FEBEBF] text-base font-semibold text-white shadow-lg shadow-[#FEBEBF]/25 transition-all hover:brightness-90 hover:shadow-xl hover:shadow-[#FEBEBF]/30 disabled:opacity-60"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t("redirectingToPayment")}
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  {t("payNow")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>

          {/* Security badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 flex items-center justify-center gap-2"
          >
            <Shield className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {t("securePaymentDesc")}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Powered by Mollie */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-5 flex items-center justify-center gap-1.5"
      >
        <Sparkles className="h-3 w-3 text-slate-300 dark:text-slate-600" />
        <span className="text-[11px] text-slate-300 dark:text-slate-600">
          {t("poweredByMollie")}
        </span>
      </motion.div>
    </div>
  );
}

// ── Summary row ──
function SummaryRow({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center justify-between"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          {icon}
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
        {value}
      </span>
    </motion.div>
  );
}
