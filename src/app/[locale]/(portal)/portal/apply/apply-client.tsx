"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Globe,
  FileText,
  User,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DocumentUploadCard } from "@/components/portal/document-upload-card";
import { toast } from "sonner";
import {
  getChecklist,
  getPortalContent,
  createPortalApplication,
  uploadPortalDocument,
  getApplicationDocuments,
} from "../actions";
import type {
  CountryOption,
  ChecklistItem,
  PortalContentItem,
  ApplicationDocument,
} from "../actions";

// ──────────────────────────────────────────────────────────────
// Visa type definitions
// ──────────────────────────────────────────────────────────────
const VISA_TYPES = [
  { value: "turistik", labelKey: "turistik" },
  { value: "ticari", labelKey: "ticari" },
  { value: "kultur", labelKey: "kultur" },
  { value: "ziyaret", labelKey: "ziyaret" },
  { value: "diger", labelKey: "diger" },
] as const;

// ──────────────────────────────────────────────────────────────
// Step config
// ──────────────────────────────────────────────────────────────
const STEPS = [
  { key: "stepCountry", icon: Globe },
  { key: "stepGuide", icon: FileText },
  { key: "stepInfo", icon: User },
  { key: "stepDocuments", icon: Upload },
  { key: "stepConfirmation", icon: CheckCircle2 },
] as const;

// ──────────────────────────────────────────────────────────────
// Personal info schema
// ──────────────────────────────────────────────────────────────
const personalInfoSchema = z.object({
  full_name: z.string().min(1),
  id_number: z.string(),
  date_of_birth: z.string(),
  phone: z.string().min(1),
  email: z.string().email().or(z.literal("")),
  passport_no: z.string(),
  passport_expiry: z.string(),
});

type PersonalInfoValues = z.infer<typeof personalInfoSchema>;

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
interface ApplyClientProps {
  countries: CountryOption[];
}

export function ApplyClient({ countries }: ApplyClientProps) {
  const t = useTranslations("portalApply");
  const tVisa = useTranslations("visaType");
  const tCommon = useTranslations("common");
  const tPortal = useTranslations("portal");

  // ── Wizard state ──
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedVisaType, setSelectedVisaType] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [guides, setGuides] = useState<PortalContentItem[]>([]);
  const [guideAcknowledged, setGuideAcknowledged] = useState(false);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfoValues | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Map<number, File>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // ── Form ──
  const form = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      full_name: "",
      id_number: "",
      date_of_birth: "",
      phone: "",
      email: "",
      passport_no: "",
      passport_expiry: "",
    },
  });

  // ── Country selection handler ──
  const handleCountrySelect = useCallback((countryName: string) => {
    setSelectedCountry(countryName);
    setSelectedVisaType("");
    setChecklist([]);
    setGuides([]);
  }, []);

  // ── Visa type selection handler ──
  const handleVisaTypeSelect = useCallback(
    async (visaType: string) => {
      setSelectedVisaType(visaType);
      setLoadingChecklist(true);

      try {
        const [checklistData, guidesData] = await Promise.all([
          getChecklist(selectedCountry, visaType),
          getPortalContent(selectedCountry, visaType),
        ]);
        setChecklist(checklistData);
        setGuides(guidesData);
      } catch {
        toast.error(t("uploadError"));
      } finally {
        setLoadingChecklist(false);
      }
    },
    [selectedCountry, t]
  );

  // ── Step navigation ──
  const canProceedStep1 = selectedCountry && selectedVisaType && checklist.length > 0;

  const goNext = () => {
    if (step === 1 && canProceedStep1) {
      // If no guides, skip step 2
      if (guides.length === 0) {
        setStep(3);
      } else {
        setStep(2);
      }
    } else if (step === 2 && guideAcknowledged) {
      setStep(3);
    }
    // Steps 3 and 4 are handled by form submit / upload submit
  };

  const goBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      if (guides.length === 0) {
        setStep(1);
      } else {
        setStep(2);
      }
    } else if (step === 4) {
      setStep(3);
    }
  };

  // ── Personal info submit ──
  const onPersonalInfoSubmit = (data: PersonalInfoValues) => {
    setPersonalInfo(data);
    setStep(4);
  };

  // ── File selection handler (stores locally) ──
  const handleFileSelect = useCallback(
    (checklistItemId: number) =>
      async (file: File): Promise<{ success: boolean; error?: string }> => {
        setUploadedFiles((prev) => {
          const next = new Map(prev);
          next.set(checklistItemId, file);
          return next;
        });
        return { success: true };
      },
    []
  );

  // ── Submit application + upload files ──
  const handleSubmitApplication = async () => {
    if (!personalInfo) return;
    setSubmitting(true);

    try {
      // 1. Create the application
      const result = await createPortalApplication({
        full_name: personalInfo.full_name,
        id_number: personalInfo.id_number || "",
        date_of_birth: personalInfo.date_of_birth || "",
        phone: personalInfo.phone,
        email: personalInfo.email || "",
        passport_no: personalInfo.passport_no || "",
        passport_expiry: personalInfo.passport_expiry || "",
        country: selectedCountry,
        visa_type: selectedVisaType,
      });

      if (result.error || !result.trackingCode || !result.applicationId) {
        toast.error(t("uploadError"));
        setSubmitting(false);
        return;
      }

      setTrackingCode(result.trackingCode);
      setApplicationId(result.applicationId);

      // 2. Get the auto-created application_documents to know the real doc IDs
      const { documents, error: docsError } = await getApplicationDocuments(
        result.trackingCode
      );

      if (docsError) {
        // Application created but failed to fetch docs — still proceed to confirmation
        toast.error(t("uploadError"));
        setStep(5);
        setSubmitting(false);
        return;
      }

      // 3. Upload each file, matching checklist_item_id
      if (uploadedFiles.size > 0 && documents.length > 0) {
        const uploadPromises: Promise<void>[] = [];

        for (const doc of documents) {
          const file = uploadedFiles.get(doc.checklist_item_id ?? -1);
          if (file) {
            const formData = new FormData();
            formData.append("file", file);
            uploadPromises.push(
              uploadPortalDocument(result.trackingCode, doc.id, formData).then(
                (res) => {
                  if (!res.success) {
                    console.error(
                      `Upload failed for doc ${doc.id}:`,
                      res.error
                    );
                  }
                }
              )
            );
          }
        }

        await Promise.allSettled(uploadPromises);
      }

      // 4. Done
      setStep(5);
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Copy tracking code ──
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCodeCopied(true);
      toast.success(t("codeCopied"));
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Fallback
      toast.error("Could not copy");
    }
  };

  // ── Upload progress counts ──
  const requiredChecklist = checklist.filter((c) => c.is_required);
  const uploadedRequiredCount = requiredChecklist.filter((c) =>
    uploadedFiles.has(c.id)
  ).length;

  // ────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      {/* ── Progress bar ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isComplete = step > stepNum;
            const Icon = s.icon;

            return (
              <div key={s.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                      isComplete
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isActive
                          ? "border-blue-500 bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/25"
                          : "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </motion.div>
                  <span
                    className={`mt-1.5 hidden text-xs font-medium sm:block ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : isComplete
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {t(s.key)}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 rounded-full transition-colors ${
                      step > stepNum
                        ? "bg-emerald-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Steps ── */}
      <AnimatePresence mode="wait">
        {/* ══════════════════════════════════════════════════════
            STEP 1 — Country + Visa Type Selection
           ══════════════════════════════════════════════════════ */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {/* Country title */}
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                {t("selectCountryTitle")}
              </h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                {t("selectCountrySubtitle")}
              </p>
            </div>

            {/* Country grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {countries.map((country, i) => (
                <motion.button
                  key={country.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  onClick={() => handleCountrySelect(country.name)}
                  className={`group relative flex flex-col items-center justify-center rounded-2xl border p-4 transition-all hover:shadow-md ${
                    selectedCountry === country.name
                      ? "border-blue-500 bg-gradient-to-br from-blue-50 to-violet-50 shadow-md shadow-blue-500/10 dark:from-blue-950/30 dark:to-violet-950/30"
                      : "border-slate-200/60 bg-white/70 backdrop-blur-md hover:border-blue-300 dark:border-slate-700/60 dark:bg-slate-900/70 dark:hover:border-blue-600"
                  }`}
                >
                  <span className="mb-2 text-3xl">
                    {country.flag_emoji || "🏳️"}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      selectedCountry === country.name
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {country.name}
                  </span>
                  {selectedCountry === country.name && (
                    <motion.div
                      layoutId="country-check"
                      className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shadow-md"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Visa type selection (appears after country is selected) */}
            <AnimatePresence>
              {selectedCountry && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-8"
                >
                  <h3 className="mb-4 text-center text-xl font-semibold text-slate-900 dark:text-white">
                    {t("selectVisaTypeTitle")}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {VISA_TYPES.map((vt) => (
                      <motion.button
                        key={vt.value}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleVisaTypeSelect(vt.value)}
                        className={`rounded-xl border p-4 text-center transition-all ${
                          selectedVisaType === vt.value
                            ? "border-blue-500 bg-gradient-to-br from-blue-50 to-violet-50 shadow-md dark:from-blue-950/30 dark:to-violet-950/30"
                            : "border-slate-200/60 bg-white/70 backdrop-blur-md hover:border-blue-300 dark:border-slate-700/60 dark:bg-slate-900/70"
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            selectedVisaType === vt.value
                              ? "text-blue-700 dark:text-blue-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {tVisa(vt.labelKey)}
                        </span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Loading indicator */}
                  {loadingChecklist && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6 flex items-center justify-center gap-2 text-blue-500"
                    >
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">{tCommon("loading")}</span>
                    </motion.div>
                  )}

                  {/* No checklist warning */}
                  {!loadingChecklist &&
                    selectedVisaType &&
                    checklist.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/30"
                      >
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          {t("noChecklistWarning")}
                        </p>
                      </motion.div>
                    )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next button */}
            <div className="mt-8 flex justify-end">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={goNext}
                  disabled={!canProceedStep1}
                  className="h-12 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-8 text-base font-medium shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50"
                >
                  {tCommon("next")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 2 — Read Guide
           ══════════════════════════════════════════════════════ */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                {t("guideTitle")}
              </h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                {t("guideSubtitle")}
              </p>
            </div>

            {/* Guide cards */}
            <div className="space-y-4">
              {guides.map((guide, i) => (
                <motion.div
                  key={guide.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70"
                >
                  <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
                    {guide.title}
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {guide.content}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Acknowledge checkbox */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70"
            >
              <Checkbox
                id="acknowledge"
                checked={guideAcknowledged}
                onCheckedChange={(checked) =>
                  setGuideAcknowledged(checked === true)
                }
              />
              <Label
                htmlFor="acknowledge"
                className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {t("acknowledgeGuide")}
              </Label>
            </motion.div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={goBack}
                className="h-12 rounded-xl px-6"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tCommon("back")}
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={goNext}
                  disabled={!guideAcknowledged}
                  className="h-12 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-8 text-base font-medium shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50"
                >
                  {tCommon("next")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 3 — Personal Info Form
           ══════════════════════════════════════════════════════ */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                {t("personalInfoTitle")}
              </h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                {t("personalInfoSubtitle")}
              </p>
            </div>

            <form
              onSubmit={form.handleSubmit(onPersonalInfoSubmit)}
              className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <Label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("fullName")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    {...form.register("full_name")}
                    className="h-11 rounded-xl"
                    placeholder={t("fullName")}
                  />
                  {form.formState.errors.full_name && (
                    <p className="mt-1 text-xs text-red-500">
                      {tPortal("required")}
                    </p>
                  )}
                </div>

                {/* ID Number */}
                <div>
                  <Label htmlFor="id_number" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("idNumber")}
                  </Label>
                  <Input
                    id="id_number"
                    {...form.register("id_number")}
                    className="h-11 rounded-xl"
                    placeholder={t("idNumber")}
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <Label htmlFor="date_of_birth" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("dateOfBirth")}
                  </Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    {...form.register("date_of_birth")}
                    className="h-11 rounded-xl"
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("phone")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...form.register("phone")}
                    className="h-11 rounded-xl"
                    placeholder="+90 5XX XXX XXXX"
                  />
                  {form.formState.errors.phone && (
                    <p className="mt-1 text-xs text-red-500">
                      {tPortal("required")}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("email")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    className="h-11 rounded-xl"
                    placeholder="email@example.com"
                  />
                  {form.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-500">
                      {tPortal("invalidEmail")}
                    </p>
                  )}
                </div>

                {/* Passport No */}
                <div>
                  <Label htmlFor="passport_no" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("passportNo")}
                  </Label>
                  <Input
                    id="passport_no"
                    {...form.register("passport_no")}
                    className="h-11 rounded-xl"
                    placeholder={t("passportNo")}
                  />
                </div>

                {/* Passport Expiry */}
                <div>
                  <Label htmlFor="passport_expiry" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("passportExpiry")}
                  </Label>
                  <Input
                    id="passport_expiry"
                    type="date"
                    {...form.register("passport_expiry")}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="mt-8 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  className="h-12 rounded-xl px-6"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {tCommon("back")}
                </Button>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    className="h-12 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-8 text-base font-medium shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
                  >
                    {tCommon("next")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </form>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 4 — Document Upload
           ══════════════════════════════════════════════════════ */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                {t("uploadTitle")}
              </h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                {t("uploadSubtitle")}
              </p>
            </div>

            {/* Upload progress */}
            <div className="mb-6 rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {uploadedRequiredCount} {t("of")} {requiredChecklist.length}{" "}
                  {t("required")} {t("progressLabel")}
                </span>
                <span className="text-slate-500">
                  {uploadedFiles.size} {t("of")} {checklist.length} {tCommon("total")}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width:
                      checklist.length > 0
                        ? `${(uploadedFiles.size / checklist.length) * 100}%`
                        : "0%",
                  }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-600"
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Document cards */}
            <div className="space-y-4">
              {checklist.map((item, i) => (
                <DocumentUploadCard
                  key={item.id}
                  label={item.name}
                  description={item.description}
                  isRequired={item.is_required}
                  status={uploadedFiles.has(item.id) ? "uploaded" : "pending"}
                  existingFileName={
                    uploadedFiles.has(item.id)
                      ? uploadedFiles.get(item.id)!.name
                      : null
                  }
                  onUpload={handleFileSelect(item.id)}
                  delay={i * 0.08}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={goBack}
                className="h-12 rounded-xl px-6"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tCommon("back")}
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleSubmitApplication}
                  disabled={submitting}
                  className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 text-base font-medium shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {tCommon("loading")}
                    </>
                  ) : (
                    <>
                      {tCommon("confirm")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 5 — Confirmation
           ══════════════════════════════════════════════════════ */}
        {step === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
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
              className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-500/30"
            >
              <motion.div
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Check className="h-12 w-12 text-white" strokeWidth={3} />
              </motion.div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-2 text-3xl font-bold text-slate-900 dark:text-white"
            >
              {t("confirmationTitle")}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-8 text-lg text-slate-500 dark:text-slate-400"
            >
              {t("confirmationSubtitle")}
            </motion.p>

            {/* Tracking code box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-6 w-full max-w-md"
            >
              <p className="mb-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                {t("yourTrackingCode")}
              </p>
              <div className="relative overflow-hidden rounded-2xl border-2 border-transparent bg-gradient-to-r from-blue-500 to-violet-600 p-[2px]">
                <div className="flex items-center justify-between rounded-[14px] bg-white px-5 py-4 dark:bg-slate-900">
                  <code className="text-lg font-bold tracking-wider text-slate-900 dark:text-white sm:text-xl">
                    {trackingCode}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="ml-3 gap-1.5 rounded-lg"
                  >
                    {codeCopied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-600">{t("codeCopied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        {t("copyCode")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Warning text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mb-8 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-left dark:border-amber-800 dark:bg-amber-950/30"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t("saveThisCode")}
              </p>
            </motion.div>

            {/* Go to portal button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href={`/portal/${trackingCode}`}>
                <Button className="h-12 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-8 text-base font-medium shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30">
                  {t("goToPortal")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
