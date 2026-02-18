"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Upload,
  X,
  Check,
  FileImage,
  Camera,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import imageCompression from "browser-image-compression";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface DocumentUploadCardProps {
  /** Document name to display */
  label: string;
  /** Instructions for this document */
  description?: string;
  /** Whether this document is required */
  isRequired: boolean;
  /** Current upload status */
  status: "pending" | "uploaded" | "approved" | "rejected";
  /** Admin note (shown when rejected) */
  adminNote?: string | null;
  /** Existing file name if already uploaded */
  existingFileName?: string | null;
  /** Called when user uploads a file. Should return success/error. */
  onUpload: (file: File) => Promise<{ success: boolean; error?: string }>;
  /** Animation delay for staggered entrance */
  delay?: number;
}

export function DocumentUploadCard({
  label,
  description,
  isRequired,
  status: initialStatus,
  adminNote,
  existingFileName,
  onUpload,
  delay = 0,
}: DocumentUploadCardProps) {
  const t = useTranslations("portalApply");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [compressing, setCompressing] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [status, setStatus] = React.useState(initialStatus);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Status badge colors
  const statusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", label: "" },
    uploaded: { color: "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300", label: t("uploaded") },
    approved: { color: "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300", label: "✓" },
    rejected: { color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", label: t("adminRejected") },
  };

  function validateFile(f: File): string | null {
    if (f.size > MAX_SIZE) return t("fileTooLarge");
    if (!ACCEPTED_TYPES.includes(f.type)) return t("invalidFileType");
    return null;
  }

  async function processFile(f: File) {
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    // Compress images (not PDFs)
    let processedFile = f;
    if (f.type.startsWith("image/") && f.type !== "application/pdf") {
      try {
        setCompressing(true);
        processedFile = await imageCompression(f, {
          maxSizeMB: 2,
          maxWidthOrHeight: 2048,
          useWebWorker: true,
        });
      } catch {
        // If compression fails, use original
        processedFile = f;
      } finally {
        setCompressing(false);
      }
    }

    setFile(processedFile);
    setStatus("pending");

    // Generate preview for images
    if (processedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(processedFile);
    } else {
      setPreview(null);
    }

    // Auto-upload
    await handleUpload(processedFile);
  }

  async function handleUpload(fileToUpload: File) {
    setUploading(true);
    setError(null);

    try {
      const result = await onUpload(fileToUpload);
      if (result.success) {
        setStatus("uploaded");
      } else {
        setError(result.error || t("uploadError"));
      }
    } catch {
      setError(t("uploadError"));
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }

  function removeFile() {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  const showDropzone = !file && status !== "uploaded" && status !== "approved";
  const showReupload = status === "rejected" || (file && error);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="relative rounded-2xl border border-slate-200/60 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70"
    >
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {label}
            </h3>
            <Badge
              variant="outline"
              className={isRequired
                ? "border-red-200 text-red-600 dark:border-red-800 dark:text-red-400"
                : "border-slate-200 text-slate-500"
              }
            >
              {isRequired ? t("required") : t("optional")}
            </Badge>
          </div>
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {status !== "pending" && (
          <Badge className={statusConfig[status]?.color}>
            {statusConfig[status]?.label}
          </Badge>
        )}
      </div>

      {/* Rejection note */}
      {status === "rejected" && adminNote && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-950/30"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="text-sm">
            <span className="font-medium text-red-700 dark:text-red-400">
              {t("rejectionReason")}:
            </span>{" "}
            <span className="text-red-600 dark:text-red-300">{adminNote}</span>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* State: Compressing */}
        {compressing && (
          <motion.div
            key="compressing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-8 dark:border-brand-700 dark:bg-brand-950/20"
          >
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            <span className="text-sm text-brand-600 dark:text-brand-400">
              {t("compressing")}
            </span>
          </motion.div>
        )}

        {/* State: Uploading */}
        {!compressing && uploading && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-brand-400 bg-brand-50/50 p-8 dark:border-brand-600 dark:bg-brand-950/20"
          >
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
              {t("uploading")}
            </span>
          </motion.div>
        )}

        {/* State: File selected with preview (after upload success or error) */}
        {!compressing && !uploading && file && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-3"
          >
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              {preview ? (
                <img
                  src={preview}
                  alt={label}
                  className="mx-auto max-h-40 object-contain p-2"
                />
              ) : (
                <div className="flex h-24 items-center justify-center">
                  <FileImage className="h-10 w-10 text-slate-400" />
                </div>
              )}
              <button
                onClick={removeFile}
                className="absolute right-2 top-2 rounded-full bg-red-500/90 p-1 text-white transition-transform hover:scale-110"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-center text-xs text-slate-500">
              {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
            </p>

            {status === "uploaded" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="flex items-center justify-center gap-2 text-brand-600"
              >
                <Check className="h-5 w-5" />
                <span className="text-sm font-medium">{t("uploadSuccess")}</span>
              </motion.div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-red-500">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpload(file)}
                  className="gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("reupload")}
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* State: Already uploaded (no local file) */}
        {!compressing && !uploading && !file && (status === "uploaded" || status === "approved") && (
          <motion.div
            key="existing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/20"
          >
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-brand-600" />
              <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
                {existingFileName || t("uploaded")}
              </span>
            </div>
          </motion.div>
        )}

        {/* State: Dropzone (empty or rejected needing re-upload) */}
        {!compressing && !uploading && (showDropzone || showReupload) && !file && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${
                dragOver
                  ? "border-brand-400 bg-brand-50/50 dark:border-brand-500 dark:bg-brand-950/20"
                  : status === "rejected"
                    ? "border-red-300 hover:border-red-400 hover:bg-red-50/30 dark:border-red-700"
                    : "border-slate-300 hover:border-brand-300 hover:bg-brand-50/30 dark:border-slate-600 dark:hover:border-brand-600"
              }`}
            >
              <motion.div
                animate={dragOver ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Upload className="mb-2 h-8 w-8 text-slate-400" />
              </motion.div>

              {/* Desktop text */}
              <p className="hidden text-sm font-medium text-slate-600 dark:text-slate-400 sm:block">
                {t("dragOrClick")}
              </p>
              {/* Mobile text */}
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 sm:hidden">
                {t("tapToUpload")}
              </p>

              <p className="mt-1 text-xs text-slate-400">{t("supportedFormats")}</p>

              {status === "rejected" && (
                <p className="mt-2 text-xs font-medium text-red-500">
                  {t("reupload")}
                </p>
              )}
            </div>

            {/* Camera button for mobile */}
            <div className="mt-2 flex justify-center sm:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                {t("tapToUpload")}
              </Button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.heic,.heif"
              onChange={handleInputChange}
              className="hidden"
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleInputChange}
              className="hidden"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
