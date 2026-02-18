"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, FileCheck2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DocumentUploadCard } from "@/components/portal/document-upload-card";
import { uploadPortalDocument } from "../../actions";
import type { PortalApplication, ApplicationDocument } from "../../actions";

interface UploadClientProps {
  application: PortalApplication;
  documents: ApplicationDocument[];
}

export function UploadClient({ application, documents: initialDocuments }: UploadClientProps) {
  const tPortal = useTranslations("portal");
  const t = useTranslations("portalApply");
  const tDocs = useTranslations("applicationDocuments");
  const [documents, setDocuments] = useState<ApplicationDocument[]>(initialDocuments);

  // Calculate progress from required documents
  const requiredDocs = documents.filter((d) => d.is_required);
  const uploadedRequired = requiredDocs.filter(
    (d) => d.status === "uploaded" || d.status === "approved"
  );
  const progressPercent =
    requiredDocs.length > 0
      ? Math.round((uploadedRequired.length / requiredDocs.length) * 100)
      : 100;

  const handleUpload = useCallback(
    (docId: number) => async (file: File): Promise<{ success: boolean; error?: string }> => {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadPortalDocument(
        application.tracking_code,
        docId,
        formData
      );

      if (result.success) {
        // Update local state to reflect new status
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId
              ? { ...d, status: "uploaded", file_name: file.name, file_path: "uploaded" }
              : d
          )
        );
        toast.success(t("uploadSuccess"));
        return { success: true };
      }

      return { success: false, error: result.error || t("uploadError") };
    },
    [application.tracking_code, t]
  );

  return (
    <div className="space-y-8">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link href={`/portal/${application.tracking_code}`}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-slate-600 dark:text-slate-400"
          >
            <ArrowLeft className="h-4 w-4" />
            {tPortal("backToSearch")}
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("uploadTitle")}
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {t("uploadSubtitle")}
        </p>
      </motion.div>

      {/* Progress indicator */}
      {documents.length > 0 && requiredDocs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mx-auto max-w-lg"
        >
          <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {uploadedRequired.length} {t("of")} {requiredDocs.length}{" "}
                {t("progressLabel")}
              </span>
              <span
                className={`font-semibold ${
                  progressPercent === 100
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-brand-600 dark:text-brand-400"
                }`}
              >
                {progressPercent}%
              </span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  progressPercent === 100
                    ? "bg-brand-400"
                    : "bg-brand-400"
                }`}
              />
            </div>
            {progressPercent === 100 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-2 flex items-center justify-center gap-1.5 text-sm text-brand-600 dark:text-brand-400"
              >
                <FileCheck2 className="h-4 w-4" />
                <span>{t("docsComplete")}</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Document upload cards */}
      <div className="mx-auto max-w-lg space-y-5">
        {documents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="rounded-2xl border border-slate-200/60 bg-white/70 p-8 text-center shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70"
          >
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-slate-400 dark:text-slate-500" />
            <p className="text-slate-600 dark:text-slate-400">
              {tDocs("noDocuments")}
            </p>
          </motion.div>
        ) : (
          documents.map((doc, index) => (
            <DocumentUploadCard
              key={doc.id}
              label={doc.checklist_name || doc.custom_name || "Document"}
              description={doc.checklist_description || doc.custom_description || ""}
              isRequired={doc.is_required}
              status={doc.status as "pending" | "uploaded" | "approved" | "rejected"}
              adminNote={doc.admin_note}
              existingFileName={doc.file_name}
              onUpload={handleUpload(doc.id)}
              delay={0.3 + index * 0.1}
            />
          ))
        )}
      </div>
    </div>
  );
}
