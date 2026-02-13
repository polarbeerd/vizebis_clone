"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  Edit,
  Upload,
  Calendar,
  MapPin,
  Plane,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusTimeline } from "@/components/portal/status-timeline";
import { formatDate } from "@/lib/utils";
import type { PortalApplication, ApplicationDocument, PortalContentItem } from "../actions";

const visaTypeKeyMap: Record<string, string> = {
  kultur: "cultural",
  ticari: "commercial",
  turistik: "tourist",
  ziyaret: "visit",
  diger: "other",
};

interface StatusClientProps {
  application: PortalApplication;
  documents: ApplicationDocument[];
  guides: PortalContentItem[];
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

// ──────────────────────────────────────────────────────────────
// Status badge helpers
// ──────────────────────────────────────────────────────────────

const statusConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; bg: string; text: string }> = {
  pending: { icon: Clock, bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400" },
  uploaded: { icon: Upload, bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-600 dark:text-blue-400" },
  approved: { icon: CheckCircle2, bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-600 dark:text-emerald-400" },
  rejected: { icon: XCircle, bg: "bg-red-50 dark:bg-red-950", text: "text-red-600 dark:text-red-400" },
};

function DocumentStatusBadge({ status, label }: { status: string; label: string }) {
  const cfg = statusConfig[status] ?? statusConfig.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────
// Document Progress Section
// ──────────────────────────────────────────────────────────────

function DocumentProgressSection({
  documents,
  trackingCode,
}: {
  documents: ApplicationDocument[];
  trackingCode: string;
}) {
  const [open, setOpen] = useState(true);
  const tApply = useTranslations("portalApply");
  const tDocs = useTranslations("applicationDocuments");

  const requiredDocs = documents.filter((d) => d.is_required);
  const uploadedOrApproved = requiredDocs.filter((d) => d.status === "uploaded" || d.status === "approved");
  const remaining = requiredDocs.length - uploadedOrApproved.length;
  const progressPct = requiredDocs.length > 0 ? Math.round((uploadedOrApproved.length / requiredDocs.length) * 100) : 0;
  const allComplete = remaining === 0 && requiredDocs.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.6 }}
      className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70"
    >
      {/* Header — clickable to toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 dark:from-blue-500/20 dark:to-violet-500/20">
            <FileText className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {tDocs("progress")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {allComplete
                ? tApply("docsComplete")
                : `${uploadedOrApproved.length} ${tApply("of")} ${requiredDocs.length} ${tApply("progressLabel")} — ${remaining} ${tApply("docsIncomplete")}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {progressPct}%
          </span>
          {open ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
        />
      </div>

      {/* Document list — collapsible */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="doc-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-3">
              {documents.map((doc) => {
                const name = doc.checklist_name ?? doc.custom_name ?? "-";
                const description = doc.checklist_description ?? doc.custom_description ?? null;
                const isCustom = doc.checklist_item_id === null;
                const isRejected = doc.status === "rejected";
                const statusLabel = tDocs(doc.status as "pending" | "uploaded" | "approved" | "rejected");

                return (
                  <div
                    key={doc.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isRejected
                        ? "border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/30"
                        : "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30"
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      {/* Left side — name + badges */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {name}
                          </span>
                          {doc.is_required ? (
                            <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400">
                              {tApply("required")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                              {tApply("optional")}
                            </Badge>
                          )}
                          {isCustom && (
                            <Badge className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                              <Sparkles className="h-2.5 w-2.5" />
                              {tApply("newRequirement")}
                            </Badge>
                          )}
                        </div>
                        {description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {description}
                          </p>
                        )}
                        {/* Rejection reason */}
                        {isRejected && doc.admin_note && (
                          <div className="mt-1 flex items-start gap-1.5">
                            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                            <p className="text-xs text-red-600 dark:text-red-400">
                              <span className="font-medium">{tApply("rejectionReason")}:</span>{" "}
                              {doc.admin_note}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right side — status + action */}
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-1.5">
                        <DocumentStatusBadge status={doc.status} label={statusLabel} />
                        {(doc.status === "pending" || doc.status === "rejected") && (
                          <Link href={`/portal/${trackingCode}/upload`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Upload className="h-3 w-3" />
                              {isRejected ? tApply("reupload") : tApply("uploaded").replace(/^./, "")}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// Guides Section
// ──────────────────────────────────────────────────────────────

function GuidesSection({ guides }: { guides: PortalContentItem[] }) {
  const [open, setOpen] = useState(true);
  const tApply = useTranslations("portalApply");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 dark:from-blue-500/20 dark:to-violet-500/20">
            <BookOpen className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {tApply("guidesSection")}
          </h3>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {/* Content — collapsible */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="guides-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-3">
              {guides.map((guide) => (
                <div
                  key={guide.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30"
                >
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                    {guide.title}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {guide.content}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────

export function StatusClient({ application, documents, guides }: StatusClientProps) {
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

      {/* Document Progress Section */}
      {documents.length > 0 && (
        <DocumentProgressSection documents={documents} trackingCode={code} />
      )}

      {/* Guides Section */}
      {guides.length > 0 && <GuidesSection guides={guides} />}

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
