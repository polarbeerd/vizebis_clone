"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Upload, X, Check, FileImage } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadDocument } from "../../actions";
import type { PortalApplication } from "../../actions";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface UploadZoneProps {
  label: string;
  field: "passport_photo" | "visa_photo";
  trackingCode: string;
  existingFile: string | null;
  delay: number;
}

function UploadZone({ label, field, trackingCode, existingFile, delay }: UploadZoneProps) {
  const t = useTranslations("portal");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(!!existingFile);
  const [dragOver, setDragOver] = useState(false);

  function validateFile(f: File): string | null {
    if (f.size > MAX_SIZE) return t("fileTooLarge");
    if (!ACCEPTED_TYPES.includes(f.type)) return t("invalidFileType");
    return null;
  }

  function handleFile(f: File) {
    const err = validateFile(f);
    if (err) {
      toast.error(err);
      return;
    }
    setFile(f);
    setUploaded(false);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function removeFile() {
    setFile(null);
    setPreview(null);
    setUploaded(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("field", field);

    const { success, error } = await uploadDocument(trackingCode, formData);
    setUploading(false);

    if (success) {
      toast.success(t("uploadSuccess"));
      setUploaded(true);
    } else {
      toast.error(t("uploadError"));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70"
    >
      <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">{label}</h3>

      <AnimatePresence mode="wait">
        {file ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            {/* File preview */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              {preview ? (
                <img
                  src={preview}
                  alt={label}
                  className="mx-auto max-h-48 object-contain p-2"
                />
              ) : (
                <div className="flex h-32 items-center justify-center">
                  <FileImage className="h-12 w-12 text-slate-400" />
                </div>
              )}
              <button
                onClick={removeFile}
                className="absolute right-2 top-2 rounded-full bg-red-500/90 p-1 text-white transition-transform hover:scale-110"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
            </p>

            {uploaded ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400"
              >
                <Check className="h-5 w-5" />
                <span className="text-sm font-medium">{t("uploadSuccess")}</span>
              </motion.div>
            ) : (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25"
                >
                  {uploading ? (
                    <>{t("uploading")}</>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {t("uploadDocs")}
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
                dragOver
                  ? "border-blue-400 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20"
                  : "border-slate-300 hover:border-blue-300 hover:bg-blue-50/30 dark:border-slate-600 dark:hover:border-blue-600 dark:hover:bg-blue-950/10"
              }`}
            >
              <motion.div
                animate={dragOver ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Upload className="mb-3 h-10 w-10 text-slate-400 dark:text-slate-500" />
              </motion.div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {t("dragDrop")}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t("maxFileSize")}</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleInputChange}
              className="hidden"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface UploadClientProps {
  application: PortalApplication;
}

export function UploadClient({ application }: UploadClientProps) {
  const t = useTranslations("portal");

  return (
    <div className="space-y-8">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link href={`/portal/${application.tracking_code}`}>
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("uploadTitle")}
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{t("uploadSubtitle")}</p>
      </motion.div>

      {/* Upload zones */}
      <div className="mx-auto max-w-lg space-y-6">
        <UploadZone
          label={t("uploadPassportPhoto")}
          field="passport_photo"
          trackingCode={application.tracking_code}
          existingFile={application.passport_photo}
          delay={0.3}
        />
        <UploadZone
          label={t("uploadVisaPhoto")}
          field="visa_photo"
          trackingCode={application.tracking_code}
          existingFile={application.visa_photo}
          delay={0.45}
        />
      </div>
    </div>
  );
}
