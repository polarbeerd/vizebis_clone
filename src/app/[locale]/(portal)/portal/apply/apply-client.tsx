"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { normalizeText } from "@/lib/utils";
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
  Users,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  MapPin,
  ShieldCheck,
  Lightbulb,
  CreditCard,
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
import { useRouter, Link } from "@/i18n/navigation";
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
  createPortalApplication,
  createGroup,
  getGroupMembers,
  addGroupMember,
  updateGroupMember,
  deleteGroupMember,
  submitGroup,
} from "../actions";
import type {
  CountryOption,
  VisaTypeOption,
  PortalContentItem,
  FormField,
  SmartFieldAssignment,
  GroupData,
  GroupMember,
} from "../actions";
import { GroupFolderForm } from "@/components/portal/group-folder-form";
import { GroupFolderView } from "@/components/portal/group-folder-view";

// ──────────────────────────────────────────────────────────────
// Step config — built dynamically based on whether guides exist
// ──────────────────────────────────────────────────────────────
const ALL_STEPS = [
  { key: "stepCountry", icon: Globe, id: "country" },
  { key: "stepGuide", icon: FileText, id: "guide" },
  { key: "stepChoice", icon: Users, id: "choice" },
  { key: "stepInfo", icon: User, id: "info" },
  { key: "stepPayment", icon: CreditCard, id: "payment" },
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
  trip_plans: "textareaHintTripPlans",
  ties_to_home: "textareaHintTiesToHome",
  previous_travels: "textareaHintPreviousTravels",
  personal_about: "textareaHintPersonalAbout",
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
// Section progress bar (sticky)
// ──────────────────────────────────────────────────────────────
type SectionMeta = {
  sectionKey: string;
  label: string;
  isComplete: boolean;
};

function SectionProgressBar({
  sections,
  currentIndex,
  onClickSection,
  t,
}: {
  sections: SectionMeta[];
  currentIndex: number;
  onClickSection: (index: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: any) => string;
}) {
  const progress =
    sections.length > 0
      ? ((currentIndex + 1) / sections.length) * 100
      : 0;

  return (
    <div className="sticky top-0 z-30 -mx-1 mb-4 rounded-xl border border-slate-200/60 bg-white/90 px-4 py-2.5 backdrop-blur-md sm:-mx-0 dark:border-slate-700/60 dark:bg-slate-900/90">
      <div className="flex items-center justify-between gap-3">
        <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
          {t("sectionProgress", {
            current: currentIndex + 1,
            total: sections.length,
          })}
        </span>
        {/* Desktop section chips */}
        <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
          {sections.map((sec, i) => (
            <button
              key={sec.sectionKey}
              type="button"
              onClick={() => onClickSection(i)}
              className={`flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                i === currentIndex
                  ? "bg-[#FEBEBF]/30 text-slate-800 dark:text-slate-100"
                  : sec.isComplete
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700/60"
              }`}
            >
              {sec.isComplete && (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {sec.label}
            </button>
          ))}
        </div>
      </div>
      {/* Thin progress bar */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/60">
        <motion.div
          className="h-full rounded-full bg-[#FEBEBF]"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
interface ApplyClientProps {
  countries: CountryOption[];
  visaTypes: VisaTypeOption[];
  formFields: FormField[];
  smartAssignments: SmartFieldAssignment[];
}

export function ApplyClient({
  countries,
  visaTypes,
  formFields: initialFormFields,
  smartAssignments: initialSmartAssignments,
}: ApplyClientProps) {
  const t = useTranslations("portalApply");
  const tCommon = useTranslations("common");
  const tPortal = useTranslations("portal");
  const locale = useLocale();
  const router = useRouter();

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
  // Fields are preloaded server-side (global — no country/visa filter)
  const filteredSmartAssignments = useMemo(
    () => initialSmartAssignments.filter((a) => hasSmartFieldComponent(a.template_key)),
    [initialSmartAssignments]
  );
  const [formFields, setFormFields] = useState<FormField[]>(initialFormFields);
  const [guides, setGuides] = useState<PortalContentItem[]>([]);
  const [hasGuides, setHasGuides] = useState<boolean | null>(null); // null = unknown yet
  const [guideAcknowledged, setGuideAcknowledged] = useState(false);
  const [smartAssignments, setSmartAssignments] = useState<SmartFieldAssignment[]>(filteredSmartAssignments);
  const [smartFieldData, setSmartFieldData] = useState<Record<string, Record<string, unknown>>>({});
  const [smartSubmitted, setSmartSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [applicationMode, setApplicationMode] = useState<"individual" | "group" | null>(null);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupSubStep, setGroupSubStep] = useState<"create" | "folder" | "member">("create");
  const [editingMember, setEditingMember] = useState<GroupMember | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [submittingGroup, setSubmittingGroup] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [smartTouched, setSmartTouched] = useState<Record<string, boolean>>({});
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
      (step === 3 && s.id === "choice") ||
      (step === 4 && s.id === "info") ||
      (step === 5 && s.id === "payment")
  );
  const activeStepLabel = activeSteps[stepperIndex >= 0 ? stepperIndex : 0];

  // ── Dynamic schema + form ──
  const dynamicSchema = useMemo(() => buildDynamicSchema(formFields), [formFields]);
  const defaultValues = useMemo(() => buildDefaultValues(formFields), [formFields]);

  const form = useForm<Record<string, string>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(dynamicSchema) as any,
    defaultValues,
    mode: "onTouched",
  });

  // ── Country selection handler ──
  const handleCountrySelect = useCallback(async (countryName: string) => {
    setSelectedCountry(countryName);
    setSelectedCity("");
    setSelectedVisaType("");
    setGuides([]);
    setHasGuides(null);
    setGuideAcknowledged(false);

    // Single-click navigation: go directly to guide or form
    setLoadingGuides(true);
    try {
      const guidesData = await getPortalContent(countryName);
      setGuides(guidesData);
      setHasGuides(guidesData.length > 0);
      if (guidesData.length === 0) {
        setStep(3);
      } else {
        setStep(2);
      }
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setLoadingGuides(false);
    }
  }, [t]);

  // ── Visa type selection — fields are already loaded (global) ──
  const handleVisaTypeChange = useCallback(
    (visaType: string) => {
      setSelectedVisaType(visaType);
    },
    []
  );

  // ── Step navigation ──
  const goNext = () => {
    if (step === 2 && guideAcknowledged) {
      setStep(3); // go to choice
    }
  };

  const goBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      // Choice step
      if (guides.length === 0) {
        setStep(1);
      } else {
        setStep(2);
      }
    } else if (step === 4) {
      if (applicationMode === "group" && groupSubStep === "member") {
        // From member form, go back to folder view
        setGroupSubStep("folder");
        setEditingMember(null);
        return;
      }
      if (applicationMode === "group" && groupSubStep === "folder") {
        // From folder view, go back to choice
        setStep(3);
        return;
      }
      // Individual form: back to choice
      setStep(3);
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

    // For individual mode, city is required
    if (applicationMode !== "group" && !selectedCity) {
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

    if (applicationMode === "group" && groupData) {
      // Save group member
      await saveGroupMember(data);
    } else {
      // Individual submit
      await submitApplication(data);
    }
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
      // Redirect to payment page
      router.push(`/portal/payment/${result.trackingCode}`);
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Group handlers ──
  const handleChoiceSelect = (mode: "individual" | "group") => {
    setApplicationMode(mode);
    setStep(4);
    if (mode === "group") {
      setGroupSubStep("create");
    }
  };

  const handleCreateFolder = async (data: {
    groupName: string;
    city: string;
    travelDates?: Record<string, unknown>;
  }) => {
    setCreatingFolder(true);
    try {
      const result = await createGroup({
        group_name: data.groupName,
        country: selectedCountry,
        application_city: data.city,
        travel_dates: data.travelDates,
      });
      if (result.error || !result.group) {
        toast.error(t("groupCreateError"));
        return;
      }
      setGroupData(result.group);
      setSelectedCity(data.city);
      setGroupSubStep("folder");
    } catch {
      toast.error(t("groupCreateError"));
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleAddMember = () => {
    setEditingMember(null);
    setSelectedVisaType("");
    setSmartFieldData({});
    setSmartSubmitted(false);
    setFormSubmitted(false);
    form.reset(buildDefaultValues(formFields));
    setGroupSubStep("member");
  };

  const handleEditMember = (member: GroupMember) => {
    setEditingMember(member);
    // Pre-fill visa type
    if (member.visa_type) {
      setSelectedVisaType(member.visa_type);
    }
    // Pre-fill form values from custom_fields
    if (member.custom_fields) {
      const cf = member.custom_fields as Record<string, string>;
      for (const [key, value] of Object.entries(cf)) {
        if (key !== "_smart" && key !== "application_city") {
          form.setValue(key, value as string);
        }
      }
      // Restore smart field data
      if (cf._smart) {
        setSmartFieldData(cf._smart as unknown as Record<string, Record<string, unknown>>);
      }
    }
    setGroupSubStep("member");
  };

  const handleDeleteMember = async (member: GroupMember) => {
    if (!groupData) return;
    const result = await deleteGroupMember(member.id, groupData.id);
    if (result.error) {
      toast.error(t("uploadError"));
      return;
    }
    toast.success(t("memberDeleted"));
    setGroupMembers((prev) => prev.filter((m) => m.id !== member.id));
  };

  const handleSubmitGroup = async () => {
    if (!groupData) return;
    setSubmittingGroup(true);
    try {
      const result = await submitGroup(groupData.id);
      if (result.error || !result.trackingCode) {
        toast.error(t("uploadError"));
        return;
      }
      // Redirect to payment page
      router.push(`/portal/payment/${result.trackingCode}`);
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setSubmittingGroup(false);
    }
  };

  const saveGroupMember = async (data: Record<string, string>) => {
    if (!groupData) return;
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

      if (editingMember) {
        // Update existing member
        const result = await updateGroupMember({
          applicationId: editingMember.id,
          groupId: groupData.id,
          visa_type: selectedVisaType,
          standardFields,
          customFields,
          smartFieldData: Object.keys(smartFieldData).length > 0 ? smartFieldData : undefined,
          application_city: groupData.application_city,
          country: selectedCountry,
        });
        if (result.error) {
          toast.error(t("uploadError"));
          return;
        }
      } else {
        // Add new member
        const result = await addGroupMember({
          groupId: groupData.id,
          country: selectedCountry,
          visa_type: selectedVisaType,
          application_city: groupData.application_city,
          standardFields,
          customFields,
          smartFieldData: Object.keys(smartFieldData).length > 0 ? smartFieldData : undefined,
        });
        if (result.error) {
          toast.error(t("uploadError"));
          return;
        }
      }

      toast.success(t("memberSaved"));
      // Refresh members list
      const members = await getGroupMembers(groupData.id);
      setGroupMembers(members);
      setEditingMember(null);
      setGroupSubStep("folder");
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setSubmitting(false);
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
            <SelectTrigger className="h-11 rounded-xl border-slate-200/80 focus:ring-2 focus:ring-brand-300/30 focus:border-brand-300 dark:border-slate-700/80">
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
          {field.field_key === "ties_to_home" && (
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                {t("tiesToHomeWarning")}
              </p>
            </div>
          )}
          <Textarea
            {...form.register(field.field_key, {
              onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                const pos = e.target.selectionStart;
                e.target.value = normalizeText(e.target.value);
                e.target.setSelectionRange(pos, pos);
              },
            })}
            className="min-h-[100px] rounded-xl border-slate-200/80 focus:ring-2 focus:ring-brand-300/30 focus:border-brand-300 dark:border-slate-700/80"
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
          {...form.register(field.field_key, {
            onChange: inputType === "text" ? (e: React.ChangeEvent<HTMLInputElement>) => {
              const pos = e.target.selectionStart;
              e.target.value = normalizeText(e.target.value);
              e.target.setSelectionRange(pos, pos);
            } : undefined,
          })}
          className="h-11 rounded-xl border-slate-200/80 focus:ring-2 focus:ring-brand-300/30 focus:border-brand-300 dark:border-slate-700/80"
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

  // ── Build sections data (used by progress bar + render) ──
  type UnifiedItem =
    | { kind: "regular"; field: FormField }
    | { kind: "smart"; sa: SmartFieldAssignment };

  const formSections = useMemo(() => {
    const unified: UnifiedItem[] = [
      ...formFields.map((field) => ({ kind: "regular" as const, field })),
      ...smartAssignments.map((sa) => ({ kind: "smart" as const, sa })),
    ].sort((a, b) => {
      const aOrder = a.kind === "regular" ? a.field.sort_order : a.sa.sort_order;
      const bOrder = b.kind === "regular" ? b.field.sort_order : b.sa.sort_order;
      return aOrder - bOrder;
    });

    const sectionMap = new Map<string, UnifiedItem[]>();
    for (const item of unified) {
      const sec = item.kind === "regular" ? item.field.section : item.sa.section;
      const key = sec || "other";
      if (!sectionMap.has(key)) sectionMap.set(key, []);
      sectionMap.get(key)!.push(item);
    }

    const sectionEntries = Array.from(sectionMap.entries()).sort((a, b) => {
      const aMin = Math.min(...a[1].map((i) => i.kind === "regular" ? i.field.sort_order : i.sa.sort_order));
      const bMin = Math.min(...b[1].map((i) => i.kind === "regular" ? i.field.sort_order : i.sa.sort_order));
      return aMin - bMin;
    });

    return sectionEntries.map(([sectionKey, items]) => ({
      sectionKey: SECTION_I18N_MAP[sectionKey] ?? "sectionOther",
      items,
    }));
  }, [formFields, smartAssignments]);

  // ── IntersectionObserver to track current section in view ──
  useEffect(() => {
    if (step !== 4 || formSections.length === 0) return;
    const els = formSections
      .map((sec) => document.getElementById(`section-${sec.sectionKey}`))
      .filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = els.indexOf(entry.target as HTMLElement);
            if (idx !== -1) setCurrentSectionIndex(idx);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [step, formSections]);

  // ── Section completion checker ──
  const watchedValues = form.watch();
  const sectionMetas: SectionMeta[] = useMemo(() => {
    return formSections.map((sec) => {
      const allComplete = sec.items.every((item) => {
        if (item.kind === "regular") {
          if (!item.field.is_required) return true;
          const val = watchedValues[item.field.field_key];
          return !!val && val.trim().length > 0;
        }
        // smart field
        const sfData = smartFieldData[item.sa.template_key];
        return !!sfData && sfData._valid === true;
      });
      return {
        sectionKey: sec.sectionKey,
        label: t(sec.sectionKey),
        isComplete: allComplete,
      };
    });
  }, [formSections, watchedValues, smartFieldData, t]);

  const handleScrollToSection = useCallback((index: number) => {
    const sec = formSections[index];
    if (!sec) return;
    const el = document.getElementById(`section-${sec.sectionKey}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [formSections]);

  // ── Render sectioned form ──
  const renderSectionedForm = () => {
    return (
      <div className="space-y-4">
        {formSections.length > 1 && (
          <SectionProgressBar
            sections={sectionMetas}
            currentIndex={currentSectionIndex}
            onClickSection={handleScrollToSection}
            t={t}
          />
        )}
        {formSections.map((sec) => {
          const descKey = `${sec.sectionKey}Desc`;
          return (
            <div key={sec.sectionKey} id={`section-${sec.sectionKey}`}>
              <SectionCard
                title={t(sec.sectionKey)}
                description={t(descKey)}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {sec.items.map((item) =>
                    item.kind === "regular" ? (
                      renderField(item.field)
                    ) : (
                      <div
                        key={item.sa.template_key}
                        className="col-span-full"
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setSmartTouched((prev) => ({
                              ...prev,
                              [item.sa.template_key]: true,
                            }));
                          }
                        }}
                      >
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
                          touched={smartTouched[item.sa.template_key] ?? false}
                        />
                      </div>
                    )
                  )}
                </div>
              </SectionCard>
            </div>
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
        className="h-10 rounded-xl bg-[#FEBEBF] text-white px-6 text-sm font-semibold shadow-md shadow-brand-400/25 transition-all hover:brightness-90 disabled:opacity-50 sm:h-11 sm:px-8"
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
    <div className="mx-auto w-full max-w-2xl px-1 py-4 sm:px-0 sm:py-6">
      {/* ── Stepper ── */}
      <div className="mb-8 sm:mb-10">
        <div className="mx-auto flex max-w-xs items-center sm:max-w-xl">
          {activeSteps.map((s, i) => {
            const stepId = s.id;
            const isActive =
              (step === 1 && stepId === "country") ||
              (step === 2 && stepId === "guide") ||
              (step === 3 && stepId === "choice") ||
              (step === 4 && stepId === "info") ||
              (step === 5 && stepId === "payment");
            const isComplete =
              (stepId === "country" && step > 1) ||
              (stepId === "guide" && step > 2) ||
              (stepId === "choice" && step > 3) ||
              (stepId === "info" && step > 4);
            const Icon = s.icon;

            return (
              <React.Fragment key={s.key}>
                {/* Step icon + label — fixed width so lines are equal */}
                <div className="flex w-16 shrink-0 flex-col items-center sm:w-24">
                  <motion.div
                    initial={false}
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors duration-300 sm:h-11 sm:w-11 ${
                      isComplete
                        ? "border-[#FEBEBF] bg-[#FEBEBF] text-white"
                        : isActive
                          ? "border-[#FEBEBF] bg-[#FEBEBF] text-white shadow-md shadow-brand-300/25"
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
                    className={`mt-2 hidden text-center text-xs font-semibold sm:block transition-colors duration-300 ${
                      isActive
                        ? "text-brand-600 dark:text-brand-400"
                        : isComplete
                          ? "text-brand-600 dark:text-brand-400"
                          : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {t(s.key)}
                  </span>
                </div>
                {/* Connecting line — flex-1 so all lines are equal width */}
                {i < activeSteps.length - 1 && (
                  <div className="relative mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-slate-200 sm:mx-2 dark:bg-slate-700">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#FEBEBF]"
                      initial={{ width: "0%" }}
                      animate={{ width: isComplete ? "100%" : "0%" }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        {/* Mobile: show current step name */}
        <p className="mt-3 text-center text-xs font-medium text-brand-600 sm:hidden dark:text-brand-400">
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

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                      ? "border-brand-300 bg-brand-50 shadow-md shadow-brand-300/15 dark:bg-brand-950/30"
                      : "border-slate-200/60 bg-white/70 backdrop-blur-md hover:border-brand-300 dark:border-slate-700/60 dark:bg-slate-900/70 dark:hover:border-brand-700"
                  }`}
                >
                  <span className="mb-2 text-3xl">
                    {country.flag_emoji || "\u{1F3F3}\u{FE0F}"}
                  </span>
                  <span
                    className={`text-sm font-medium transition-colors ${
                      selectedCountry === country.name
                        ? "text-brand-700 dark:text-brand-300"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {countryDisplayName(country)}
                  </span>
                  {selectedCountry === country.name && (
                    <motion.div
                      layoutId="country-check"
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#FEBEBF] text-white shadow-md"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Loading indicator when transitioning */}
            {loadingGuides && (
              <div className="mt-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#FEBEBF]" />
              </div>
            )}

            {/* Complete Payment section */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-10"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  {t("or")}
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>

              <Link href="/portal/pay">
                <div className="group flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-md transition-all hover:border-[#FEBEBF]/40 hover:shadow-md sm:px-6 dark:border-slate-700/60 dark:bg-slate-900/70 dark:hover:border-[#FEBEBF]/30">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEBEBF]/15 text-[#FEBEBF] transition-colors group-hover:bg-[#FEBEBF]/25 dark:bg-[#FEBEBF]/10">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {tPortal("completePayment")}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {tPortal("completePaymentDesc")}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-[#FEBEBF] dark:text-slate-600" />
                </div>
              </Link>
            </motion.div>
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
            {/* Country indicator */}
            {(() => {
              const c = countries.find((c) => c.name === selectedCountry);
              if (!c) return null;
              return (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center justify-center gap-2 sm:mb-5"
                >
                  <span className="text-3xl">{c.flag_emoji || "\u{1F3F3}\u{FE0F}"}</span>
                  <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    {countryDisplayName(c)}
                  </span>
                </motion.div>
              );
            })()}

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
                        <Lightbulb className="h-5 w-5 text-warm-500" />
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
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FEBEBF] text-sm font-bold text-white shadow-md shadow-brand-400/20">
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
                  className="h-10 rounded-xl bg-[#FEBEBF] text-white px-6 text-sm font-semibold shadow-md shadow-brand-400/25 transition-all hover:brightness-90 disabled:opacity-50 sm:h-11 sm:px-8"
                >
                  {tCommon("next")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ═══════ STEP 3 — Individual / Group Choice ═══════ */}
        {step === 3 && (
          <motion.div
            key="step3-choice"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.25 }}
          >
            {/* Country indicator */}
            {(() => {
              const c = countries.find((c) => c.name === selectedCountry);
              if (!c) return null;
              return (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center justify-center gap-2 sm:mb-5"
                >
                  <span className="text-3xl">{c.flag_emoji || "\u{1F3F3}\u{FE0F}"}</span>
                  <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    {countryDisplayName(c)}
                  </span>
                </motion.div>
              );
            })()}

            <div className="mb-6 text-center sm:mb-8">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {t("choiceTitle")}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 sm:mt-2 sm:text-base dark:text-slate-400">
                {t("choiceSubtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Individual */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0,0,0,0.1)" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleChoiceSelect("individual")}
                className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white/70 p-8 shadow-sm backdrop-blur-md transition-all hover:border-brand-300 dark:border-slate-700/60 dark:bg-slate-900/70 dark:hover:border-brand-700"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
                  <User className="h-8 w-8 text-brand-600 dark:text-brand-400" />
                </div>
                <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  {t("individualApp")}
                </span>
                <span className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                  {t("individualAppDesc")}
                </span>
              </motion.button>

              {/* Group */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0,0,0,0.1)" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleChoiceSelect("group")}
                className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white/70 p-8 shadow-sm backdrop-blur-md transition-all hover:border-brand-300 dark:border-slate-700/60 dark:bg-slate-900/70 dark:hover:border-brand-700"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
                  <Users className="h-8 w-8 text-brand-600 dark:text-brand-400" />
                </div>
                <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  {t("groupApp")}
                </span>
                <span className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                  {t("groupAppDesc")}
                </span>
              </motion.button>
            </div>

            {/* Back button */}
            <div className="mt-8 flex items-center">
              <Button
                variant="outline"
                onClick={goBack}
                className="h-10 rounded-xl border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50 sm:h-11 sm:px-6 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tCommon("back")}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ═══════ STEP 4 — Visa Type + Dynamic Form / Group Sub-flow ═══════ */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.25 }}
          >
            {/* Group sub-step: create folder */}
            {applicationMode === "group" && groupSubStep === "create" && (
              <>
                <GroupFolderForm
                  country={selectedCountry}
                  onCreateFolder={handleCreateFolder}
                  loading={creatingFolder}
                />
                <div className="mt-6 flex items-center">
                  <Button
                    variant="outline"
                    onClick={goBack}
                    className="h-10 rounded-xl border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50 sm:h-11 sm:px-6 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {tCommon("back")}
                  </Button>
                </div>
              </>
            )}

            {/* Group sub-step: folder view */}
            {applicationMode === "group" && groupSubStep === "folder" && groupData && (
              <>
                <GroupFolderView
                  group={groupData}
                  members={groupMembers}
                  countries={countries}
                  visaTypes={visaTypes}
                  onAddMember={handleAddMember}
                  onEditMember={handleEditMember}
                  onDeleteMember={handleDeleteMember}
                  onSubmit={handleSubmitGroup}
                  submitting={submittingGroup}
                />
                <div className="mt-6 flex items-center">
                  <Button
                    variant="outline"
                    onClick={goBack}
                    className="h-10 rounded-xl border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50 sm:h-11 sm:px-6 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {tCommon("back")}
                  </Button>
                </div>
              </>
            )}

            {/* Individual form OR group member form */}
            {(applicationMode !== "group" || groupSubStep === "member") && (
            <>
            <div className="mb-6 text-center sm:mb-8">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {t("personalInfoTitle")}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 sm:mt-2 sm:text-base dark:text-slate-400">
                {t("personalInfoSubtitle")}
              </p>
            </div>

            {/* Trust signal — prominent */}
            <div className="mb-5 flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-[#FEBEBF]/20 px-4 py-2.5 dark:border-brand-800/40 dark:bg-brand-950/20">
              <ShieldCheck className="h-4 w-4 text-brand-500" />
              <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
                {t("trustSignal")}
              </span>
            </div>

            {/* Application Details section */}
            <div className="space-y-4">
              <SectionCard
                title={t("sectionApplicationDetails")}
                description={t("sectionApplicationDetailsDesc")}
              >
                {/* Application city — hidden for group members */}
                {applicationMode !== "group" && (
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
                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-warm-200 bg-warm-50/80 px-4 py-3 dark:border-warm-800 dark:bg-warm-950/30">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warm-500" />
                          <p className="text-xs text-warm-700 dark:text-warm-300">
                            {t("cityDisclaimer", { country: selectedCountry })}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                )}

                {/* Visa type dropdown */}
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("selectVisaTypeTitle")} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedVisaType}
                    onValueChange={handleVisaTypeChange}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200/80 focus:ring-2 focus:ring-brand-300/30 focus:border-brand-300 dark:border-slate-700/80">
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

              {/* No fields warning */}
              {selectedVisaType && formFields.length === 0 && smartAssignments.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-warm-200 bg-warm-50/80 p-4 dark:border-warm-800 dark:bg-warm-950/30"
                >
                  <AlertTriangle className="h-5 w-5 shrink-0 text-warm-500" />
                  <p className="text-sm text-warm-700 dark:text-warm-300">
                    {t("noChecklistWarning")}
                  </p>
                </motion.div>
              )}

              {/* Dynamic sectioned form */}
              {(formFields.length > 0 || smartAssignments.length > 0) && (
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
              {formFields.length === 0 && smartAssignments.length === 0 && (
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
            </>
            )}
          </motion.div>
        )}

        {/* Step 5 is now handled by /portal/payment/[trackingCode] */}
      </AnimatePresence>
    </div>
  );
}
