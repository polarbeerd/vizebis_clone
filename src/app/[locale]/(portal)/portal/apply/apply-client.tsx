"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  FileText,
  User,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  MapPin,
  ShieldCheck,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneInput } from "@/components/portal/phone-input";
import { SegmentedControl } from "@/components/portal/segmented-control";
import { toast } from "sonner";
import { SmartFieldRenderer } from "@/components/portal/smart-fields/smart-field-renderer";
import { hasSmartFieldComponent } from "@/components/portal/smart-fields/registry";
import {
  getCitiesForCountry,
  SEGMENTED_THRESHOLD,
  type CityOption,
} from "@/config/application-cities";
import {
  getPortalContent,
  getFormFields,
  getSmartFieldAssignments,
  createPortalApplication,
} from "../actions";
import type {
  CountryOption,
  VisaTypeOption,
  PortalContentItem,
  FormField,
  SmartFieldAssignment,
} from "../actions";

// ──────────────────────────────────────────────────────────────
// Step config — built dynamically based on whether guides exist
// ──────────────────────────────────────────────────────────────
const ALL_STEPS = [
  { key: "stepCountry", icon: Globe, id: "country" },
  { key: "stepGuide", icon: FileText, id: "guide" },
  { key: "stepInfo", icon: User, id: "info" },
  { key: "stepConfirmation", icon: CheckCircle2, id: "confirmation" },
] as const;

const STEPS_WITHOUT_GUIDE = ALL_STEPS.filter((s) => s.id !== "guide");

// ──────────────────────────────────────────────────────────────
// Section DB key → i18n key mapping (sections come from DB now)
// ──────────────────────────────────────────────────────────────
const SECTION_I18N_MAP: Record<string, string> = {
  personal_details: "sectionPersonalDetails",
  birth_info: "sectionBirthInfo",
  nationality_civil: "sectionNationalityCivil",
  address: "sectionAddress",
  passport: "sectionPassport",
  fingerprint: "sectionFingerprint",
  travel: "sectionTravel",
  employment: "sectionEmployment",
  other: "sectionOther",
};

// Textarea helper text map
const TEXTAREA_HINT_MAP: Record<string, string> = {
  daily_life: "textareaHintDaily",
  off_day: "textareaHintOffDay",
  hobbies: "textareaHintHobbies",
  travel_info: "textareaHintTravel",
};

// ──────────────────────────────────────────────────────────────
// Build Zod schema from dynamic fields
// ──────────────────────────────────────────────────────────────
function buildDynamicSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    let schema: z.ZodTypeAny;

    if (field.field_type === "email") {
      schema = field.is_required
        ? z.string().email().min(1)
        : z.string().email().or(z.literal(""));
    } else if (field.field_type === "tel" && field.is_required) {
      schema = z.string().min(7);
    } else if (field.is_required) {
      schema = z.string().min(1);
    } else {
      schema = z.string().default("");
    }

    if (field.field_type !== "email" && field.field_type !== "tel" && field.max_chars != null) {
      schema = schema.pipe(z.string().length(field.max_chars));
    }

    shape[field.field_key] = schema;
  }
  return z.object(shape);
}

function buildDefaultValues(fields: FormField[]): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const field of fields) {
    defaults[field.field_key] = "";
  }
  return defaults;
}

// ──────────────────────────────────────────────────────────────
// YouTube embed helper
// ──────────────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// (Application cities are now dynamic — see src/config/application-cities.ts)

// ──────────────────────────────────────────────────────────────
// Section card wrapper
// ──────────────────────────────────────────────────────────────
function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/60 p-4 backdrop-blur-sm sm:p-6 dark:border-slate-700/60 dark:bg-slate-800/40">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
interface ApplyClientProps {
  countries: CountryOption[];
  visaTypes: VisaTypeOption[];
}

export function ApplyClient({ countries, visaTypes }: ApplyClientProps) {
  const t = useTranslations("portalApply");
  const tCommon = useTranslations("common");
  const tPortal = useTranslations("portal");
  const locale = useLocale();

  // Locale-aware helpers
  const countryDisplayName = (c: CountryOption) =>
    locale === "en" && c.name_en ? c.name_en : c.name;
  const fieldLabel = (f: FormField) =>
    locale === "tr" && f.field_label_tr ? f.field_label_tr : f.field_label;
  const fieldPlaceholder = (f: FormField) =>
    locale === "tr" && f.placeholder_tr ? f.placeholder_tr : f.placeholder;
  const fieldOptions = (f: FormField) =>
    locale === "tr" && f.options_tr ? f.options_tr : f.options;
  const smartLabel = (sa: SmartFieldAssignment) =>
    locale === "tr" && sa.label_tr ? sa.label_tr : sa.label;
  const smartDescription = (sa: SmartFieldAssignment) =>
    locale === "tr" && sa.description_tr ? sa.description_tr : sa.description;

  // ── Wizard state ──
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedVisaType, setSelectedVisaType] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [guides, setGuides] = useState<PortalContentItem[]>([]);
  const [hasGuides, setHasGuides] = useState<boolean | null>(null); // null = unknown yet
  const [guideAcknowledged, setGuideAcknowledged] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [smartAssignments, setSmartAssignments] = useState<SmartFieldAssignment[]>([]);
  const [smartFieldData, setSmartFieldData] = useState<Record<string, Record<string, unknown>>>({});
  const [smartSubmitted, setSmartSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // ── Dynamic stepper config ──
  // Before guides are fetched, show all 4 steps.
  // After fetch, if no guides exist, show only 3 steps.
  const activeSteps = hasGuides === false ? STEPS_WITHOUT_GUIDE : ALL_STEPS;

  // Map internal step number (1-based) to stepper position
  const stepperIndex = activeSteps.findIndex(
    (s) =>
      (step === 1 && s.id === "country") ||
      (step === 2 && s.id === "guide") ||
      (step === 3 && s.id === "info") ||
      (step === 4 && s.id === "confirmation")
  );
  const activeStepLabel = activeSteps[stepperIndex >= 0 ? stepperIndex : 0];

  // ── Dynamic schema + form ──
  const dynamicSchema = useMemo(() => buildDynamicSchema(formFields), [formFields]);
  const defaultValues = useMemo(() => buildDefaultValues(formFields), [formFields]);

  const form = useForm<Record<string, string>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(dynamicSchema) as any,
    defaultValues,
  });

  const resetFormWithFields = useCallback(
    (fields: FormField[]) => {
      const defaults = buildDefaultValues(fields);
      form.reset(defaults);
    },
    [form]
  );

  // ── Country selection handler ──
  const handleCountrySelect = useCallback((countryName: string) => {
    setSelectedCountry(countryName);
    setSelectedCity("");
    setSelectedVisaType("");
    setFormFields([]);
    setGuides([]);
    setHasGuides(null);
    setGuideAcknowledged(false);
  }, []);

  // ── Visa type selection in Step 3 ──
  const handleVisaTypeChange = useCallback(
    async (visaType: string) => {
      setSelectedVisaType(visaType);
      setLoadingFields(true);
      setFormFields([]);
      setSmartAssignments([]);
      setSmartFieldData({});
      setSmartSubmitted(false);

      try {
        const [fields, smartAssigns] = await Promise.all([
          getFormFields(selectedCountry, visaType),
          getSmartFieldAssignments(selectedCountry, visaType),
        ]);
        setFormFields(fields);
        resetFormWithFields(fields);
        setSmartAssignments(
          smartAssigns.filter((a) => hasSmartFieldComponent(a.template_key))
        );
      } catch {
        toast.error(t("uploadError"));
      } finally {
        setLoadingFields(false);
      }
    },
    [selectedCountry, t, resetFormWithFields]
  );

  // ── Fetch guides when moving to Step 2 ──
  const fetchGuidesForCountry = useCallback(async () => {
    setLoadingGuides(true);
    try {
      const guidesData = await getPortalContent(selectedCountry);
      setGuides(guidesData);
      setHasGuides(guidesData.length > 0);
      return guidesData;
    } catch {
      toast.error(t("uploadError"));
      return [];
    } finally {
      setLoadingGuides(false);
    }
  }, [selectedCountry, t]);

  // ── Step navigation ──
  const canProceedStep1 = !!selectedCountry;

  const goNextFromStep1 = async () => {
    if (!canProceedStep1) return;
    const guidesData = await fetchGuidesForCountry();
    if (guidesData.length === 0) {
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const goNext = () => {
    if (step === 2 && guideAcknowledged) {
      setStep(3);
    }
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
    }
  };

  // ── Scroll to first error field ──
  const scrollToFirstError = useCallback((errors: FieldErrors<Record<string, string>>) => {
    const firstKey = Object.keys(errors)[0];
    if (!firstKey || !formRef.current) return;
    const el = formRef.current.querySelector(`[data-field-key="${firstKey}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const onFormError = useCallback(
    (errors: FieldErrors<Record<string, string>>) => {
      setFormSubmitted(true);
      setSmartSubmitted(true);
      scrollToFirstError(errors);
    },
    [scrollToFirstError]
  );

  // ── Form submit ──
  const onFormSubmit = async (data: Record<string, string>) => {
    setFormSubmitted(true);
    if (!selectedCity) {
      toast.error(t("applicationCityRequired"));
      return;
    }
    setSmartSubmitted(true);
    for (const sa of smartAssignments) {
      const sfData = smartFieldData[sa.template_key];
      if (!sfData || sfData._valid !== true) {
        toast.error(t("fillSmartFields"), {
          description: t("fillSmartFieldsHint"),
          duration: 5000,
        });
        return;
      }
    }
    await submitApplication(data);
  };

  const submitApplication = async (data: Record<string, string>) => {
    setSubmitting(true);
    try {
      const standardFields: Record<string, string> = {};
      const customFields: Record<string, string> = {};
      for (const field of formFields) {
        const value = data[field.field_key] ?? "";
        if (field.is_standard) {
          standardFields[field.field_key] = value;
        } else {
          customFields[field.field_key] = value;
        }
      }
      if (selectedCity) {
        customFields.application_city = selectedCity;
      }
      const result = await createPortalApplication({
        standardFields,
        customFields,
        smartFieldData:
          Object.keys(smartFieldData).length > 0 ? smartFieldData : undefined,
        country: selectedCountry,
        visa_type: selectedVisaType,
      });
      if (result.error || !result.trackingCode || !result.applicationId) {
        toast.error(t("uploadError"));
        setSubmitting(false);
        return;
      }
      setTrackingCode(result.trackingCode);
      setStep(4);
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
      toast.success(t("codeCopied"));
    } catch {
      toast.error("Could not copy");
    }
  };

  // ── City options — dynamic per selected country ──
  const countryCities = useMemo(
    () => getCitiesForCountry(selectedCountry),
    [selectedCountry]
  );
  const cityLabel = (c: CityOption) =>
    locale === "en" ? c.label_en : c.label_tr;
  const useSegmented = countryCities.length <= SEGMENTED_THRESHOLD;
  const citySegmentOptions = useMemo(
    () =>
      countryCities.map((c) => ({
        value: c.value,
        label: locale === "en" ? c.label_en : c.label_tr,
        icon: <MapPin className="h-3.5 w-3.5" />,
      })),
    [countryCities, locale]
  );

  // ── Render a dynamic field ──
  const renderField = (field: FormField) => {
    const error = form.formState.errors[field.field_key];
    const label = fieldLabel(field);
    const placeholder = fieldPlaceholder(field);
    const opts = fieldOptions(field);

    if (field.field_type === "select" && opts) {
      const optionsList = opts.split(",").map((o) => o.trim()).filter(Boolean);
      return (
        <div key={field.field_key} data-field-key={field.field_key}>
          <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
            {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          <Select
            value={form.watch(field.field_key) || ""}
            onValueChange={(val) => form.setValue(field.field_key, val, { shouldValidate: formSubmitted })}
          >
            <SelectTrigger className="h-11 rounded-xl border-slate-200/80 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:border-slate-700/80">
              <SelectValue placeholder={placeholder || label} />
            </SelectTrigger>
            <SelectContent>
              {optionsList.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && (
            <p className="mt-1 text-xs text-red-500">{tPortal("required")}</p>
          )}
        </div>
      );
    }

    if (field.field_type === "textarea") {
      const charLimit = field.max_chars ?? 500;
      const currentLength = (form.watch(field.field_key) || "").length;
      const hintKey = TEXTAREA_HINT_MAP[field.field_key];

      return (
        <div key={field.field_key} data-field-key={field.field_key} className="col-span-full">
          <Label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
            {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          {hintKey && (
            <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">
              {t(hintKey)}
            </p>
          )}
          <Textarea
            {...form.register(field.field_key)}
            className="min-h-[100px] rounded-xl border-slate-200/80 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:border-slate-700/80"
            placeholder={placeholder || ""}
            maxLength={charLimit}
          />
          <div className="mt-1 flex items-center justify-between">
            {error ? (
              <p className="text-xs text-red-500">{tPortal("required")}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-slate-400">{currentLength} / {charLimit}</span>
          </div>
        </div>
      );
    }

    if (field.field_type === "tel") {
      return (
        <div key={field.field_key} data-field-key={field.field_key}>
          <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
            {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          <PhoneInput
            value={form.watch(field.field_key) || ""}
            onChange={(phone) =>
              form.setValue(field.field_key, phone, {
                shouldValidate: formSubmitted,
                shouldDirty: true,
                shouldTouch: true,
              })
            }
            placeholder={placeholder || ""}
            aria-invalid={error ? true : undefined}
          />
          {error && (
            <p className="mt-1 text-xs text-red-500">{tPortal("required")}</p>
          )}
        </div>
      );
    }

    const inputType =
      field.field_type === "email"
        ? "email"
        : field.field_type === "date"
          ? "date"
          : field.field_type === "number"
            ? "number"
            : "text";

    return (
      <div key={field.field_key} data-field-key={field.field_key}>
        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        <Input
          type={inputType}
          {...form.register(field.field_key)}
          className="h-11 rounded-xl border-slate-200/80 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:border-slate-700/80"
          placeholder={placeholder || ""}
          maxLength={field.max_chars ?? undefined}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500">
            {field.field_type === "email"
              ? tPortal("invalidEmail")
              : field.max_chars != null && (form.watch(field.field_key) || "").length > 0
                ? tPortal("exactChars", { count: field.max_chars })
                : tPortal("required")}
          </p>
        )}
      </div>
    );
  };

  // ── Build sectioned form ──
  const renderSectionedForm = () => {
    // Build unified list sorted by sort_order
    type UnifiedItem =
      | { kind: "regular"; field: FormField }
      | { kind: "smart"; sa: SmartFieldAssignment };

    const unified: UnifiedItem[] = [
      ...formFields.map((field) => ({ kind: "regular" as const, field })),
      ...smartAssignments.map((sa) => ({ kind: "smart" as const, sa })),
    ].sort((a, b) => {
      const aOrder = a.kind === "regular" ? a.field.sort_order : a.sa.sort_order;
      const bOrder = b.kind === "regular" ? b.field.sort_order : b.sa.sort_order;
      return aOrder - bOrder;
    });

    // Group items into sections (read section from DB field data)
    const sections: Array<{
      sectionKey: string;
      items: UnifiedItem[];
    }> = [];

    // Group by section from DB — order sections by first item's sort_order
    const sectionMap = new Map<string, UnifiedItem[]>();
    for (const item of unified) {
      const sec = item.kind === "regular" ? item.field.section : item.sa.section;
      const key = sec || "other";
      if (!sectionMap.has(key)) sectionMap.set(key, []);
      sectionMap.get(key)!.push(item);
    }

    // Convert to array, ordered by the minimum sort_order in each section
    const sectionEntries = Array.from(sectionMap.entries()).sort((a, b) => {
      const aMin = Math.min(...a[1].map((i) => i.kind === "regular" ? i.field.sort_order : i.sa.sort_order));
      const bMin = Math.min(...b[1].map((i) => i.kind === "regular" ? i.field.sort_order : i.sa.sort_order));
      return aMin - bMin;
    });

    for (const [sectionKey, items] of sectionEntries) {
      const i18nKey = SECTION_I18N_MAP[sectionKey] ?? "sectionOther";
      sections.push({ sectionKey: i18nKey, items });
    }

    return (
      <div className="space-y-4">
        {sections.map((sec) => {
          const descKey = `${sec.sectionKey}Desc`;
          return (
            <SectionCard
              key={sec.sectionKey}
              title={t(sec.sectionKey)}
              description={t(descKey)}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {sec.items.map((item) =>
                  item.kind === "regular" ? (
                    renderField(item.field)
                  ) : (
                    <div key={item.sa.template_key} className="col-span-full">
                      <SmartFieldRenderer
                        templateKey={item.sa.template_key}
                        label={smartLabel(item.sa)}
                        description={smartDescription(item.sa)}
                        isRequired={item.sa.is_required}
                        value={smartFieldData[item.sa.template_key] ?? {}}
                        onChange={(val) =>
                          setSmartFieldData((prev) => ({
                            ...prev,
                            [item.sa.template_key]: val,
                          }))
                        }
                        submitted={smartSubmitted}
                      />
                    </div>
                  )
                )}
              </div>
            </SectionCard>
          );
        })}
      </div>
    );
  };

  // ── Navigation bar component (reused for sticky mobile) ──
  const renderNavBar = (isSticky: boolean) => (
    <div
      className={
        isSticky
          ? "fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-slate-200/60 bg-white/90 px-4 py-3 backdrop-blur-md sm:hidden dark:border-slate-700/60 dark:bg-slate-900/90"
          : "mt-8 hidden items-center justify-between gap-3 sm:mt-10 sm:flex"
      }
    >
      <Button
        type="button"
        variant="outline"
        onClick={goBack}
        className="h-10 rounded-xl border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50 sm:h-11 sm:px-6 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {tCommon("back")}
      </Button>
      <Button
        type="submit"
        disabled={submitting || (formSubmitted && Object.keys(form.formState.errors).length > 0)}
        className="h-10 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 px-6 text-sm font-medium shadow-lg shadow-rose-600/20 transition-all hover:shadow-xl disabled:opacity-50 sm:h-11 sm:px-8"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {tCommon("loading")}
          </>
        ) : (
          <>
            {t("continue")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );

  // ────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────
  return (
    <div className="w-full px-1 py-4 sm:px-0 sm:py-6">
      {/* ── Stepper ── */}
      <div className="mb-8 sm:mb-10">
        <div className="mx-auto flex max-w-xs items-center justify-between sm:max-w-none">
          {activeSteps.map((s, i) => {
            const stepId = s.id;
            const isActive =
              (step === 1 && stepId === "country") ||
              (step === 2 && stepId === "guide") ||
              (step === 3 && stepId === "info") ||
              (step === 4 && stepId === "confirmation");
            const isComplete =
              (stepId === "country" && step > 1) ||
              (stepId === "guide" && step > 2) ||
              (stepId === "info" && step > 3);
            const Icon = s.icon;

            return (
              <div key={s.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors duration-300 sm:h-11 sm:w-11 ${
                      isComplete
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isActive
                          ? "border-rose-600 bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-lg shadow-rose-600/25"
                          : "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800"
                    }`}
                  >
                    {isComplete ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      >
                        <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                      </motion.div>
                    ) : (
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </motion.div>
                  <span
                    className={`mt-2 hidden text-xs font-semibold sm:block transition-colors duration-300 ${
                      isActive
                        ? "text-rose-700 dark:text-rose-400"
                        : isComplete
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {t(s.key)}
                  </span>
                </div>
                {/* Connecting line */}
                {i < activeSteps.length - 1 && (
                  <div className="relative mx-1.5 h-0.5 flex-1 overflow-hidden rounded-full bg-slate-200 sm:mx-3 dark:bg-slate-700">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                      initial={{ width: "0%" }}
                      animate={{ width: isComplete ? "100%" : "0%" }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Mobile: show current step name */}
        <p className="mt-3 text-center text-xs font-medium text-rose-600 sm:hidden dark:text-rose-400">
          {t(activeStepLabel.key)}
        </p>
      </div>

      {/* ── Steps ── */}
      <AnimatePresence mode="wait">
        {/* ═══════ STEP 1 — Country Selection ═══════ */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-6 text-center sm:mb-8">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {t("selectCountryTitle")}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 sm:mt-2 sm:text-base dark:text-slate-400">
                {t("selectCountrySubtitle")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {countries.map((country, i) => (
                <motion.button
                  key={country.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0,0,0,0.1)" }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCountrySelect(country.name)}
                  className={`group relative flex flex-col items-center justify-center rounded-2xl border p-4 shadow-sm transition-all duration-200 ${
                    selectedCountry === country.name
                      ? "border-rose-500 bg-gradient-to-br from-rose-50 to-amber-50 shadow-lg shadow-rose-500/10 dark:from-rose-950/30 dark:to-amber-950/30"
                      : "border-slate-200/60 bg-white/70 backdrop-blur-md hover:border-rose-400 dark:border-slate-700/60 dark:bg-slate-900/70 dark:hover:border-rose-600"
                  }`}
                >
                  <span className="mb-2 text-3xl">
                    {country.flag_emoji || "\u{1F3F3}\u{FE0F}"}
                  </span>
                  <span
                    className={`text-sm font-medium transition-colors ${
                      selectedCountry === country.name
                        ? "text-rose-700 dark:text-rose-300"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {countryDisplayName(country)}
                  </span>
                  {selectedCountry === country.name && (
                    <motion.div
                      layoutId="country-check"
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-md"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Next button */}
            <div className="mt-8 flex justify-end sm:mt-10">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Button
                  onClick={goNextFromStep1}
                  disabled={!canProceedStep1 || loadingGuides}
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 px-8 text-sm font-medium shadow-lg shadow-rose-600/20 transition-all hover:shadow-xl hover:shadow-rose-600/25 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:w-auto sm:text-base"
                >
                  {loadingGuides ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {tCommon("loading")}
                    </>
                  ) : (
                    <>
                      {tCommon("next")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ═══════ STEP 2 — Read Guide ═══════ */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-6 text-center sm:mb-8">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {t("guideTitle")}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 sm:mt-2 sm:text-base dark:text-slate-400">
                {t("guideSubtitle")}
              </p>
            </div>

            {/* Video section */}
            {(() => {
              const videos = guides.filter((g) => g.content_type === "video" && g.video_url);
              const keyPoints = guides.filter((g) => g.content_type === "key_point");

              return (
                <>
                  {videos.length > 0 && (
                    <div className="mb-8 space-y-4">
                      {videos.map((video, i) => {
                        const videoId = extractYouTubeId(video.video_url!);
                        if (!videoId) return null;
                        return (
                          <motion.div
                            key={`video-${video.id}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1, duration: 0.4 }}
                            className="rounded-2xl border border-slate-200/60 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70"
                          >
                            <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
                              {video.title}
                            </h3>
                            <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: "56.25%" }}>
                              <iframe
                                className="absolute inset-0 h-full w-full"
                                src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
                                title={video.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Key Points section */}
                  {keyPoints.length > 0 && (
                    <div className="mb-6 space-y-3">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                        {t("keyPointsTitle")}
                      </h3>
                      {keyPoints.map((kp, i) => (
                        <motion.div
                          key={`kp-${kp.id}`}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08, duration: 0.3 }}
                          className="flex items-start gap-4 rounded-2xl border border-slate-200/60 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-400 text-sm font-bold text-white shadow-lg shadow-rose-500/25">
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            {kp.title && (
                              <h4 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                {kp.title}
                              </h4>
                            )}
                            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                              {kp.content}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Acknowledge checkbox */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-sm backdrop-blur-md sm:p-5 dark:border-slate-700/60 dark:bg-slate-900/70"
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
            <div className="mt-8 flex items-center justify-between gap-3 sm:mt-10">
              <Button
                variant="outline"
                onClick={goBack}
                className="h-10 rounded-xl border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50 sm:h-11 sm:px-6 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tCommon("back")}
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={goNext}
                  disabled={!guideAcknowledged}
                  className="h-10 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 px-6 text-sm font-medium shadow-lg shadow-rose-600/20 transition-all hover:shadow-xl disabled:opacity-50 sm:h-11 sm:px-8"
                >
                  {tCommon("next")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ═══════ STEP 3 — Visa Type + Dynamic Form ═══════ */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-6 text-center sm:mb-8">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {t("personalInfoTitle")}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 sm:mt-2 sm:text-base dark:text-slate-400">
                {t("personalInfoSubtitle")}
              </p>
            </div>

            {/* Trust signal — prominent */}
            <div className="mb-5 flex items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-2.5 dark:border-rose-900/40 dark:bg-rose-950/20">
              <ShieldCheck className="h-4 w-4 text-rose-500" />
              <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
                {t("trustSignal")}
              </span>
            </div>

            {/* Application Details section */}
            <div className="space-y-4">
              <SectionCard
                title={t("sectionApplicationDetails")}
                description={t("sectionApplicationDetailsDesc")}
              >
                {/* Application city */}
                <div className="mb-5">
                  <Label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("applicationCity")} <span className="text-red-500">*</span>
                  </Label>
                  {useSegmented ? (
                    <SegmentedControl
                      options={citySegmentOptions}
                      value={selectedCity}
                      onChange={setSelectedCity}
                      layoutId="city-segment"
                      fullWidth
                    />
                  ) : (
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/60">
                        <SelectValue placeholder={t("applicationCity")} />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCities.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            <span className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {cityLabel(c)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <AnimatePresence>
                    {selectedCity && selectedCity !== "Ankara" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            {t("cityDisclaimer", { country: selectedCountry })}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Visa type dropdown */}
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("selectVisaTypeTitle")} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedVisaType}
                    onValueChange={handleVisaTypeChange}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200/80 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:border-slate-700/80">
                      <SelectValue placeholder={t("selectVisaTypeTitle")} />
                    </SelectTrigger>
                    <SelectContent>
                      {visaTypes.map((vt) => (
                        <SelectItem key={vt.value} value={vt.value}>
                          {locale === "tr" ? vt.label_tr : vt.label_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </SectionCard>

              {/* Loading indicator */}
              {loadingFields && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-2 py-8 text-rose-600"
                >
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">{tCommon("loading")}</span>
                </motion.div>
              )}

              {/* No fields warning */}
              {!loadingFields && selectedVisaType && formFields.length === 0 && smartAssignments.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/30"
                >
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {t("noChecklistWarning")}
                  </p>
                </motion.div>
              )}

              {/* Dynamic sectioned form */}
              {!loadingFields && (formFields.length > 0 || smartAssignments.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <form ref={formRef} onSubmit={form.handleSubmit(onFormSubmit, onFormError)}>
                    {renderSectionedForm()}

                    {/* Error summary */}
                    {formSubmitted && (() => {
                      const errorFields: string[] = [];
                      for (const field of formFields) {
                        if (form.formState.errors[field.field_key]) {
                          errorFields.push(fieldLabel(field));
                        }
                      }
                      for (const sa of smartAssignments) {
                        const sfData = smartFieldData[sa.template_key];
                        if (!sfData || sfData._valid !== true) {
                          errorFields.push(smartLabel(sa));
                        }
                      }
                      if (errorFields.length === 0) return null;
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 dark:border-red-800 dark:bg-red-950/30"
                        >
                          <p className="mb-2 text-sm font-medium text-red-700 dark:text-red-300">
                            <AlertTriangle className="mr-1.5 inline-block h-4 w-4" />
                            {t("formErrorsTitle")}
                          </p>
                          <ul className="space-y-0.5">
                            {errorFields.map((label) => (
                              <li key={label} className="text-xs text-red-600 dark:text-red-400">
                                &bull; {label}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      );
                    })()}

                    {/* Desktop nav */}
                    {renderNavBar(false)}
                    {/* Mobile sticky nav */}
                    {renderNavBar(true)}
                    {/* Spacer for sticky nav on mobile */}
                    <div className="h-16 sm:hidden" />
                  </form>
                </motion.div>
              )}

              {/* Back button when no fields */}
              {!loadingFields && formFields.length === 0 && smartAssignments.length === 0 && (
                <div className="mt-6 flex items-center sm:mt-8">
                  <Button
                    variant="outline"
                    onClick={goBack}
                    className="h-10 rounded-xl border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50 sm:h-11 sm:px-6 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {tCommon("back")}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════ STEP 4 — Confirmation ═══════ */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
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
              className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white"
            >
              {t("confirmationTitle")}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-8 text-base text-slate-500 sm:text-lg dark:text-slate-400"
            >
              {t("confirmationContact")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mb-8 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-700 dark:bg-slate-800"
              onClick={handleCopyCode}
            >
              <p className="text-xs text-slate-400 dark:text-slate-500">{t("referenceNumber")}</p>
              <p className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-white">{trackingCode}</p>
              <p className="mt-1 text-xs text-rose-500">{t("copyCode")}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                variant="outline"
                className="h-11 rounded-xl px-6"
                onClick={() => {
                  setStep(1);
                  setSelectedCountry("");
                  setSelectedCity("");
                  setSelectedVisaType("");
                  setFormFields([]);
                  setSmartAssignments([]);
                  setSmartFieldData({});
                  setGuides([]);
                  setHasGuides(null);
                  setGuideAcknowledged(false);
                  setTrackingCode("");
                  setFormSubmitted(false);
                  setSmartSubmitted(false);
                }}
              >
                {t("submitAnother")}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
