"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Edit, Upload, Calendar, MapPin, Plane, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusTimeline } from "@/components/portal/status-timeline";
import { formatDate } from "@/lib/utils";
import type { PortalApplication } from "../actions";

const visaTypeKeyMap: Record<string, string> = {
  kultur: "cultural",
  ticari: "commercial",
  turistik: "tourist",
  ziyaret: "visit",
  diger: "other",
};

interface StatusClientProps {
  application: PortalApplication;
}

function PortalCard({
  title,
  icon: Icon,
  children,
  delay = 0,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/70"
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-violet-500/10 dark:from-blue-500/20 dark:to-violet-500/20">
          <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 text-right max-w-[60%] break-words">
        {value || "-"}
      </span>
    </div>
  );
}

export function StatusClient({ application }: StatusClientProps) {
  const t = useTranslations("portal");
  const tVisaType = useTranslations("visaType");

  const code = application.tracking_code;

  return (
    <div className="space-y-8">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link href="/portal">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-600 dark:text-slate-400">
            <ArrowLeft className="h-4 w-4" />
            {t("backToSearch")}
          </Button>
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {t("statusTitle")}
        </h1>
        {application.full_name && (
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            {application.full_name}
          </p>
        )}
      </motion.div>

      {/* Status Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md sm:p-8 dark:border-slate-700/60 dark:bg-slate-900/70"
      >
        <StatusTimeline status={application.visa_status ?? "beklemede"} />
      </motion.div>

      {/* Info Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Personal Info */}
        <PortalCard title={t("personalInfo")} icon={FileText} delay={0.4}>
          <div className="space-y-0">
            <InfoRow label={t("fullName")} value={application.full_name} />
            <InfoRow label={t("idNumber")} value={application.id_number} />
            <InfoRow
              label={t("dateOfBirth")}
              value={application.date_of_birth ? formatDate(application.date_of_birth) : null}
            />
            <InfoRow label={t("phone")} value={application.phone} />
            <InfoRow label={t("email")} value={application.email} />
          </div>
        </PortalCard>

        {/* Passport Info */}
        <PortalCard title={t("passportInfo")} icon={FileText} delay={0.5}>
          <div className="space-y-0">
            <InfoRow label={t("passportNo")} value={application.passport_no} />
            <InfoRow
              label={t("passportExpiry")}
              value={application.passport_expiry ? formatDate(application.passport_expiry) : null}
            />
            <InfoRow label={t("country")} value={application.country} />
            <InfoRow
              label={t("visaType")}
              value={
                application.visa_type
                  ? tVisaType(
                      (visaTypeKeyMap[application.visa_type] ?? application.visa_type) as Parameters<typeof tVisaType>[0]
                    )
                  : null
              }
            />
            <InfoRow label={t("consulateOffice")} value={application.consulate_office} />
          </div>
        </PortalCard>

        {/* Appointment Info */}
        <PortalCard title={t("appointmentInfo")} icon={Calendar} delay={0.6}>
          <div className="space-y-0">
            <InfoRow
              label={t("appointmentDate")}
              value={application.appointment_date ? formatDate(application.appointment_date) : null}
            />
            <InfoRow label={t("appointmentTime")} value={application.appointment_time} />
            <InfoRow
              label={t("pickupDate")}
              value={application.pickup_date ? formatDate(application.pickup_date) : null}
            />
            <InfoRow
              label={t("travelDate")}
              value={application.travel_date ? formatDate(application.travel_date) : null}
            />
          </div>
        </PortalCard>

        {/* Documents */}
        <PortalCard title={t("documentsSection")} icon={Upload} delay={0.7}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">{t("passportPhoto")}</span>
              {application.passport_photo ? (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {t("viewDocument")}
                </span>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-600">-</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">{t("visaPhoto")}</span>
              {application.visa_photo ? (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {t("viewDocument")}
                </span>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-600">-</span>
              )}
            </div>
            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <InfoRow label={t("lastUpdated")} value={formatDate(application.updated_at)} />
            </div>
          </div>
        </PortalCard>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="flex flex-col gap-3 sm:flex-row sm:justify-center"
      >
        <Link href={`/portal/${code}/edit`}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-8 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 sm:w-auto"
            >
              <Edit className="mr-2 h-4 w-4" />
              {t("editInfo")}
            </Button>
          </motion.div>
        </Link>
        <Link href={`/portal/${code}/upload`}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              variant="outline"
              className="w-full rounded-xl border-slate-200 bg-white/70 px-8 shadow-sm backdrop-blur-sm hover:bg-white sm:w-auto dark:border-slate-700 dark:bg-slate-900/70"
            >
              <Upload className="mr-2 h-4 w-4" />
              {t("uploadDocs")}
            </Button>
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
