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
  Users,
  Phone,
  Calendar,
  Hash,
  Pencil,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { differenceInYears, format } from "date-fns";
import type { PaymentApplication } from "../../actions";

interface PaymentClientProps {
  applications: PaymentApplication[];
  error: string | null;
}

function isChildExempt(dob: string | null): boolean {
  if (!dob) return false;
  const age = differenceInYears(new Date(), new Date(dob));
  return age <= 11;
}

function formatDOB(dob: string | null): string {
  if (!dob) return "—";
  try {
    return format(new Date(dob), "dd.MM.yyyy");
  } catch {
    return dob;
  }
}

export function PaymentClient({ applications, error }: PaymentClientProps) {
  const t = useTranslations("payment");
  const locale = useLocale();
  const [processing, setProcessing] = useState(false);
  const [payLater, setPayLater] = useState(false);

  // ── Error state ──
  if (error || !applications || applications.length === 0) {
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

  const isGroup = applications.length > 1;
  const firstApp = applications[0];
  const currency = (firstApp.currency as "TL" | "USD" | "EUR") || "TL";

  // Calculate fees per application (exempting children <=11)
  const appFees = applications.map((app) => {
    const exempt = isChildExempt(app.date_of_birth);
    const serviceFee = exempt ? 0 : Number(app.service_fee) || 0;
    const consulateFee = exempt ? 0 : Number(app.consulate_fee) || 0;
    return { app, exempt, serviceFee, consulateFee, total: serviceFee + consulateFee };
  });

  const totalFee = appFees.reduce((sum, f) => sum + f.total, 0);
  const hasFee = totalFee > 0;
  const allPaid = applications.every((a) => a.payment_status === "odendi");

  // ── Pay Now handler ──
  const handlePayNow = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationIds: applications.map((a) => a.id),
          trackingCode: firstApp.tracking_code,
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
  if (allPaid) {
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

  // ── Pay Later confirmation state ──
  if (payLater) {
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
            {t("applicationReceived")}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-1 max-w-sm text-base text-slate-500 dark:text-slate-400"
          >
            {t("payLaterInstructions")}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mb-6 text-sm text-slate-400 dark:text-slate-500"
          >
            {t("weWillReachOut")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/portal/pay">
              <Button
                variant="outline"
                className="h-11 rounded-xl border-[#FEBEBF]/40 px-6 text-[#FEBEBF] hover:bg-[#FEBEBF]/10"
              >
                <Clock className="mr-2 h-4 w-4" />
                {t("goToPaymentPortal")}
              </Button>
            </Link>
          </motion.div>
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
          {isGroup ? t("groupPaymentTitle") : t("checkoutTitle")}
        </h1>
        {isGroup && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("membersCount", { count: applications.length })}
          </p>
        )}
      </motion.div>

      {/* Payment card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 shadow-lg shadow-slate-200/30 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-slate-900/30"
      >
        {/* Application Summary */}
        {!isGroup ? (
          /* Single application — checkout-style applicant card */
          <div className="relative border-b border-slate-100 px-5 py-5 sm:px-7 sm:py-6 dark:border-slate-800/60">
            {/* Edit button */}
            <Link href={`/portal/${firstApp.tracking_code}/edit`}>
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-[#FEBEBF]/40 hover:text-[#FEBEBF] sm:right-7 sm:top-6 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:border-[#FEBEBF]/40 dark:hover:text-[#FEBEBF]"
                title={t("editApplication")}
              >
                <Pencil className="h-3.5 w-3.5" />
              </motion.button>
            </Link>

            {/* Applicant name — prominent */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-4 pr-10"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t("summaryTitle")}
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {firstApp.full_name || "—"}
              </h2>
            </motion.div>

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-3">
              <DetailCell
                icon={<Phone className="h-3.5 w-3.5" />}
                label={t("phone")}
                value={firstApp.phone || "—"}
                delay={0.2}
              />
              <DetailCell
                icon={<FileText className="h-3.5 w-3.5" />}
                label={t("passportNo")}
                value={firstApp.passport_no || "—"}
                delay={0.22}
              />
              <DetailCell
                icon={<Hash className="h-3.5 w-3.5" />}
                label={t("idNumber")}
                value={firstApp.id_number || "—"}
                delay={0.24}
              />
              <DetailCell
                icon={<Calendar className="h-3.5 w-3.5" />}
                label={t("dateOfBirth")}
                value={formatDOB(firstApp.date_of_birth)}
                delay={0.26}
              />
              <DetailCell
                icon={<Globe className="h-3.5 w-3.5" />}
                label={t("country")}
                value={firstApp.country || "—"}
                delay={0.28}
              />
              <DetailCell
                icon={<FileText className="h-3.5 w-3.5" />}
                label={t("visaType")}
                value={firstApp.visa_type || "—"}
                delay={0.3}
              />
            </div>
          </div>
        ) : (
          /* Group member list */
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7 sm:py-6 dark:border-slate-800/60">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <Users className="h-3.5 w-3.5" />
              {t("groupPaymentTitle")}
            </h3>

            <div className="space-y-3">
              {appFees.map(({ app, exempt, total }, i) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {app.full_name || t("memberName")}
                        </p>
                        {exempt && (
                          <p className="text-xs font-medium text-[#FEBEBF]">
                            {t("childExempt")}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${exempt ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-200"}`}>
                      {exempt ? formatCurrency(
                        (Number(app.service_fee) || 0) + (Number(app.consulate_fee) || 0),
                        currency
                      ) : formatCurrency(total, currency)}
                    </span>
                  </div>
                  {/* Member details row */}
                  {(app.passport_no || app.id_number) && (
                    <div className="mt-2 flex gap-4 border-t border-slate-100 pt-2 dark:border-slate-700/50">
                      {app.passport_no && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {t("passportNo")}: <span className="font-medium text-slate-600 dark:text-slate-300">{app.passport_no}</span>
                        </span>
                      )}
                      {app.id_number && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {t("idNumber")}: <span className="font-medium text-slate-600 dark:text-slate-300">{app.id_number}</span>
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Fee Breakdown */}
        <div className="border-b border-slate-100 px-5 py-5 sm:px-7 sm:py-6 dark:border-slate-800/60">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t("feeBreakdown")}
          </h3>

          <div className="space-y-3">
            {!isGroup && (
              <>
                {appFees[0].serviceFee > 0 && (
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
                      {formatCurrency(appFees[0].serviceFee, currency)}
                    </span>
                  </motion.div>
                )}
                {appFees[0].consulateFee > 0 && (
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
                      {formatCurrency(appFees[0].consulateFee, currency)}
                    </span>
                  </motion.div>
                )}
              </>
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

        {/* Action Buttons */}
        <div className="px-5 py-5 sm:px-7 sm:py-6">
          {/* Pay Now */}
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

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="my-4 flex items-center gap-3"
          >
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {locale === "tr" ? "veya" : "or"}
            </span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </motion.div>

          {/* Pay Later — prominent outline button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              variant="outline"
              onClick={() => setPayLater(true)}
              className="h-12 w-full rounded-xl border-slate-200 text-sm font-medium text-slate-600 transition-all hover:border-[#FEBEBF]/40 hover:text-[#FEBEBF] dark:border-slate-700 dark:text-slate-400 dark:hover:border-[#FEBEBF]/40 dark:hover:text-[#FEBEBF]"
            >
              <Clock className="mr-2 h-4 w-4" />
              {t("payLater")}
            </Button>
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

// ── Detail cell for applicant card ──
function DetailCell({
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl bg-slate-50/80 px-3 py-2.5 dark:bg-slate-800/40"
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </span>
      </div>
      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
        {value}
      </p>
    </motion.div>
  );
}
