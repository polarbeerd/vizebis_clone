"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bot,
  Copy,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { GeneratedDocumentsTab } from "@/components/applications/generated-documents-tab";
import { AutomationTab } from "@/components/applications/automation-tab";
import { NotesTab } from "@/components/applications/notes-tab";

// ── Status maps ────────────────────────────────────────────────────
const visaStatusKeyMap: Record<string, string> = {
  beklemede: "pending",
  hazirlaniyor: "preparing",
  konsoloslukta: "atConsulate",
  vize_cikti: "approved",
  ret_oldu: "rejected",
  pasaport_teslim: "passportDelivered",
};

const visaStatusColorMap: Record<string, string> = {
  beklemede: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  hazirlaniyor: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  konsoloslukta: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  vize_cikti: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ret_oldu: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  pasaport_teslim: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

const paymentStatusKeyMap: Record<string, string> = {
  odenmedi: "unpaid",
  odendi: "paid",
};

const paymentMethodKeyMap: Record<string, string> = {
  nakit: "cash",
  kredi_karti: "creditCard",
  havale_eft: "bankTransfer",
  sanal_pos: "virtualPos",
};

// ── Types ──────────────────────────────────────────────────────────
interface FieldDef {
  field_key: string;
  field_label: string;
  field_label_tr: string | null;
}

interface SmartTemplate {
  template_key: string;
  label: string;
  label_tr: string | null;
  sub_fields: Array<{ key: string; label: string; label_tr: string }>;
}

interface ApplicationDetailPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  application: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fieldDefs: Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  smartTemplates: Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fieldAssignments: Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  smartAssignments: Record<string, any>[];
}

// ── Stable field components (outside parent to avoid re-mount on every render) ──
function FieldValue({
  fieldKey,
  type = "text",
  editMode,
  editData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app,
  onUpdate,
}: {
  fieldKey: string;
  type?: string;
  editMode: boolean;
  editData: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: Record<string, any>;
  onUpdate: (key: string, value: unknown) => void;
}) {
  if (editMode) {
    const val = editData[fieldKey] ?? "";
    if (type === "textarea") {
      return (
        <Textarea
          className="text-sm"
          rows={2}
          value={String(val)}
          onChange={(e) => onUpdate(fieldKey, e.target.value)}
        />
      );
    }
    return (
      <Input
        className="h-8 text-sm"
        type={type}
        value={String(val)}
        onChange={(e) => onUpdate(fieldKey, e.target.value)}
      />
    );
  }

  const raw = app[fieldKey];
  if (raw == null || raw === "") return <span className="text-muted-foreground">-</span>;
  if (type === "date") return <span className="text-sm">{formatDate(String(raw))}</span>;
  return <span className="text-sm">{String(raw)}</span>;
}

function FieldRow({
  label,
  fieldKey,
  type = "text",
  editMode,
  editData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app,
  onUpdate,
}: {
  label: string;
  fieldKey: string;
  type?: string;
  editMode: boolean;
  editData: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: Record<string, any>;
  onUpdate: (key: string, value: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 items-center">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="col-span-2">
        <FieldValue
          fieldKey={fieldKey}
          type={type}
          editMode={editMode}
          editData={editData}
          app={app}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 items-center">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="col-span-2">
        <span className="text-sm">{value || <span className="text-muted-foreground">-</span>}</span>
      </div>
    </div>
  );
}

// ── Section DB key → i18n key mapping (matches portal) ───────────
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

// ── Status flow for dropdown ──────────────────────────────────────
const statusFlow = [
  "beklemede",
  "hazirlaniyor",
  "konsoloslukta",
  "vize_cikti",
  "pasaport_teslim",
];

export function ApplicationDetailPage({
  application: initialApp,
  fieldDefs: rawFieldDefs,
  smartTemplates: rawSmartTemplates,
  fieldAssignments: rawFieldAssignments,
  smartAssignments: rawSmartAssignments,
}: ApplicationDetailPageProps) {
  const t = useTranslations("applications");
  const tDetail = useTranslations("applicationDetail");
  const tApply = useTranslations("portalApply");
  const tVisa = useTranslations("visaStatus");
  const tPayment = useTranslations("paymentStatus");
  const tPaymentMethod = useTranslations("paymentMethod");
  const tCommon = useTranslations("common");
  const tPortal = useTranslations("portal");
  const tGenDocs = useTranslations("generatedDocuments");
  const locale = useLocale();
  const router = useRouter();

  const supabase = React.useMemo(() => createClient(), []);

  // ── Normalize props ─────────────────────────────────────────────
  const fieldDefs: FieldDef[] = React.useMemo(
    () =>
      rawFieldDefs.map((d) => ({
        field_key: d.field_key as string,
        field_label: d.field_label as string,
        field_label_tr: (d.field_label_tr as string) ?? null,
      })),
    [rawFieldDefs]
  );

  const smartTemplates: SmartTemplate[] = React.useMemo(
    () =>
      rawSmartTemplates.map((t) => ({
        template_key: t.template_key as string,
        label: t.label as string,
        label_tr: (t.label_tr as string) ?? null,
        sub_fields:
          (t.sub_fields as Array<{ key: string; label: string; label_tr: string }>) ?? [],
      })),
    [rawSmartTemplates]
  );

  // ── Normalize field assignments (for section grouping + ordering) ─
  const fieldAssignmentMap = React.useMemo(() => {
    const map = new Map<string, { sort_order: number; section: string }>();
    for (const fa of rawFieldAssignments) {
      const fieldKey =
        (fa.definition as { field_key?: string } | null)?.field_key ?? null;
      if (fieldKey) {
        map.set(fieldKey, {
          sort_order: (fa.sort_order as number) ?? 999,
          section: (fa.section as string) ?? "other",
        });
      }
    }
    return map;
  }, [rawFieldAssignments]);

  const smartAssignmentMap = React.useMemo(() => {
    const map = new Map<string, { sort_order: number; section: string }>();
    for (const sa of rawSmartAssignments) {
      map.set(sa.template_key as string, {
        sort_order: (sa.sort_order as number) ?? 999,
        section: (sa.section as string) ?? "other",
      });
    }
    return map;
  }, [rawSmartAssignments]);

  const app = initialApp;
  const applicationId = app.id as number;

  // ── Edit mode state ─────────────────────────────────────────────
  const [editMode, setEditMode] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editData, setEditData] = React.useState<Record<string, unknown>>({});
  const [portalEdits, setPortalEdits] = React.useState<Record<string, string>>({});

  // ── Modal states ────────────────────────────────────────────────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // ── Initialize edit data when entering edit mode ────────────────
  function enterEditMode() {
    setEditData({
      visa_status: app.visa_status ?? "beklemede",
      appointment_date: app.appointment_date ?? "",
      appointment_time: app.appointment_time ?? "",
      consulate_fee: app.consulate_fee ?? 0,
      service_fee: app.service_fee ?? 0,
      currency: app.currency ?? "TL",
      payment_status: app.payment_status ?? "odenmedi",
    });

    // Initialize portal edits from custom_fields
    if (app.custom_fields && typeof app.custom_fields === "object") {
      const cf = app.custom_fields as Record<string, unknown>;
      const edits: Record<string, string> = {};
      for (const [key, val] of Object.entries(cf)) {
        if (key === "_smart") {
          const smart = val as Record<string, Record<string, unknown>>;
          for (const [templateKey, subFields] of Object.entries(smart)) {
            if (typeof subFields === "object" && subFields !== null) {
              for (const [subKey, subVal] of Object.entries(subFields)) {
                if (subKey === "_valid") continue;
                edits[`_smart.${templateKey}.${subKey}`] = String(subVal ?? "");
              }
            }
          }
        } else {
          edits[key] = String(val ?? "");
        }
      }
      setPortalEdits(edits);
    }

    setEditMode(true);
  }

  function cancelEditMode() {
    setEditMode(false);
    setEditData({});
    setPortalEdits({});
  }

  function updateField(key: string, value: unknown) {
    setEditData((prev) => ({ ...prev, [key]: value }));
  }

  // ── Save handler ────────────────────────────────────────────────
  async function handleSaveAll() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(editData)) {
        if (key === "consulate_fee" || key === "service_fee") {
          payload[key] = Number(val) || 0;
        } else if (key === "visa_rejected") {
          payload[key] = val ?? false;
        } else {
          payload[key] = val || null;
        }
      }

      // Merge portal edits into custom_fields
      if (Object.keys(portalEdits).length > 0 && app.custom_fields) {
        const updated = JSON.parse(
          JSON.stringify(app.custom_fields)
        ) as Record<string, unknown>;
        for (const [key, val] of Object.entries(portalEdits)) {
          if (key.startsWith("_smart.")) {
            const parts = key.split(".");
            const templateKey = parts[1];
            const subKey = parts.slice(2).join(".");
            if (!updated._smart) updated._smart = {};
            const smart = updated._smart as Record<
              string,
              Record<string, unknown>
            >;
            if (!smart[templateKey]) smart[templateKey] = {};
            smart[templateKey][subKey] = val;
          } else {
            updated[key] = val;
          }
        }
        payload.custom_fields = updated;

        // Sync full_name if name or surname changed
        const newName = (updated.name as string) ?? "";
        const newSurname = (updated.surname as string) ?? "";
        if (newName || newSurname) {
          payload.full_name = `${newName} ${newSurname}`.trim();
        }
      }

      const { error } = await supabase
        .from("applications")
        .update(payload)
        .eq("id", applicationId);

      if (error) throw error;

      toast.success(tDetail("savedSuccess"));
      setEditMode(false);
      setEditData({});
      setPortalEdits({});
      router.refresh();
    } catch {
      toast.error(tDetail("savedError"));
    } finally {
      setSaving(false);
    }
  }

  // ── Visa status quick-change ────────────────────────────────────
  async function handleVisaStatusChange(newStatus: string) {
    const { error } = await supabase
      .from("applications")
      .update({ visa_status: newStatus })
      .eq("id", applicationId);

    if (error) {
      toast.error(error.message);
    } else {
      const key = visaStatusKeyMap[newStatus] ?? newStatus;
      toast.success(
        `${app.full_name}: ${tVisa(key as Parameters<typeof tVisa>[0])}`
      );
      router.refresh();
    }
  }

  // ── Delete handler ──────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase
      .from("applications")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", applicationId);

    if (error) {
      toast.error(t("deleteError"));
    } else {
      toast.success(t("deleteSuccess"));
      router.push("/applications");
    }
    setDeleting(false);
    setDeleteConfirmOpen(false);
  }

  // ── Helper: get label for a field key from fieldDefs ────────────
  function getFieldLabel(key: string): string {
    const def = fieldDefs.find((d) => d.field_key === key);
    if (def) {
      return locale === "tr" && def.field_label_tr ? def.field_label_tr : def.field_label;
    }
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // ── Render custom_fields grouped by section ─────────────────────
  function renderCustomerData() {
    const cf = app.custom_fields as Record<string, unknown> | null;
    if (!cf || typeof cf !== "object" || Object.keys(cf).length === 0) {
      return <p className="text-sm text-muted-foreground">-</p>;
    }

    const regularKeys = Object.keys(cf).filter((k) => k !== "_smart" && k !== "_valid");
    const smartData = (cf._smart ?? {}) as Record<string, Record<string, unknown>>;
    const smartKeys = Object.keys(smartData);

    // Build unified list: { kind, key, section, sort_order }
    type UnifiedItem =
      | { kind: "regular"; key: string; section: string; sort_order: number }
      | { kind: "smart"; templateKey: string; section: string; sort_order: number };

    const items: UnifiedItem[] = [];

    for (const key of regularKeys) {
      const assignment = fieldAssignmentMap.get(key);
      items.push({
        kind: "regular",
        key,
        section: assignment?.section ?? "other",
        sort_order: assignment?.sort_order ?? 999,
      });
    }

    for (const templateKey of smartKeys) {
      const assignment = smartAssignmentMap.get(templateKey);
      items.push({
        kind: "smart",
        templateKey,
        section: assignment?.section ?? "other",
        sort_order: assignment?.sort_order ?? 999,
      });
    }

    // Group by section
    const sectionMap = new Map<string, UnifiedItem[]>();
    for (const item of items) {
      if (!sectionMap.has(item.section)) sectionMap.set(item.section, []);
      sectionMap.get(item.section)!.push(item);
    }

    // Sort sections by minimum sort_order, items within by sort_order
    const sectionEntries = Array.from(sectionMap.entries()).sort((a, b) => {
      const aMin = Math.min(...a[1].map((i) => i.sort_order));
      const bMin = Math.min(...b[1].map((i) => i.sort_order));
      return aMin - bMin;
    });

    for (const [, sectionItems] of sectionEntries) {
      sectionItems.sort((a, b) => a.sort_order - b.sort_order);
    }

    return (
      <div className="space-y-5">
        {sectionEntries.map(([sectionKey, sectionItems]) => {
          const i18nKey = SECTION_I18N_MAP[sectionKey] ?? "sectionOther";
          const sectionLabel = tApply(i18nKey as Parameters<typeof tApply>[0]);

          return (
            <div key={sectionKey}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {sectionLabel}
              </h4>
              <div className="space-y-0">
                {sectionItems.map((item) => {
                  if (item.kind === "regular") {
                    return renderRegularField(item.key, cf);
                  }
                  return renderSmartFieldGroup(item.templateKey, smartData);
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Render a single regular field from custom_fields ────────────
  function renderRegularField(key: string, cf: Record<string, unknown>) {
    const label = getFieldLabel(key);

    if (editMode) {
      return (
        <div key={key} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          <div className="grid grid-cols-3 gap-2 py-1.5 items-center">
            <span className="text-muted-foreground text-sm">{label}</span>
            <div className="col-span-2">
              <Input
                className="h-8 text-sm"
                value={portalEdits[key] ?? String(cf[key] ?? "")}
                onChange={(e) =>
                  setPortalEdits((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={key} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
        <ReadOnlyRow label={label} value={String(cf[key] ?? "")} />
      </div>
    );
  }

  // ── Render a smart field group ──────────────────────────────────
  function renderSmartFieldGroup(
    templateKey: string,
    smartData: Record<string, Record<string, unknown>>
  ) {
    const tmpl = smartTemplates.find((t) => t.template_key === templateKey);
    const subData = smartData[templateKey];
    if (!subData || typeof subData !== "object") return null;
    const subKeys = Object.keys(subData).filter((k) => k !== "_valid");

    return (
      <div key={templateKey} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
        {subKeys.map((subKey) => {
          const editKey = `_smart.${templateKey}.${subKey}`;
          const subField = tmpl?.sub_fields?.find((sf) => sf.key === subKey);
          const subLabel = subField
            ? locale === "tr" && subField.label_tr
              ? subField.label_tr
              : subField.label
            : subKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

          if (editMode) {
            return (
              <div key={subKey} className="grid grid-cols-3 gap-2 py-1.5 items-center">
                <span className="text-muted-foreground text-sm">{subLabel}</span>
                <div className="col-span-2">
                  <Input
                    className="h-8 text-sm"
                    value={portalEdits[editKey] ?? String(subData[subKey] ?? "")}
                    onChange={(e) =>
                      setPortalEdits((prev) => ({
                        ...prev,
                        [editKey]: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            );
          }

          return (
            <ReadOnlyRow
              key={subKey}
              label={subLabel}
              value={String(subData[subKey] ?? "")}
            />
          );
        })}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-24">
      {/* ── Top Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/applications">
            <Button variant="ghost" size="icon-xs">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {app.full_name ?? `#${applicationId}`}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {app.visa_status && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="cursor-pointer rounded-md px-0.5 -mx-0.5 transition-all hover:bg-muted/60 hover:scale-105 active:scale-95">
                      <Badge
                        variant="outline"
                        className={`text-xs ${visaStatusColorMap[app.visa_status] ?? ""}`}
                      >
                        {tVisa(
                          (visaStatusKeyMap[app.visa_status] ??
                            app.visa_status) as Parameters<typeof tVisa>[0]
                        )}
                      </Badge>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {statusFlow.map((status) => {
                      const key = visaStatusKeyMap[status] ?? status;
                      const label = tVisa(key as Parameters<typeof tVisa>[0]);
                      const isCurrent = status === app.visa_status;
                      return (
                        <DropdownMenuItem
                          key={status}
                          disabled={isCurrent}
                          className={isCurrent ? "font-bold opacity-60" : ""}
                          onClick={() => handleVisaStatusChange(status)}
                        >
                          {label}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className={
                        app.visa_status === "ret_oldu"
                          ? "font-bold opacity-60"
                          : "text-red-600 dark:text-red-400"
                      }
                      disabled={app.visa_status === "ret_oldu"}
                      onClick={() => handleVisaStatusChange("ret_oldu")}
                    >
                      {tVisa("rejected")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {app.country && (
                <Badge variant="secondary" className="text-xs">
                  {app.country}
                </Badge>
              )}
              {app.visa_type && (
                <Badge variant="secondary" className="text-xs">
                  {app.visa_type}
                </Badge>
              )}
              {app.tracking_code && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-mono text-muted-foreground">
                    #{app.tracking_code}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      const url = `${window.location.origin}/portal/${app.tracking_code}`;
                      navigator.clipboard.writeText(url);
                      toast.success(tPortal("portalLinkCopied"));
                    }}
                    title={tPortal("copyPortalLink")}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              )}
              {app.source === "portal" && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
                >
                  Portal
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {editMode ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEditMode}>
                <X className="mr-1.5 size-3.5" />
                {tDetail("cancelEdit")}
              </Button>
              <Button size="sm" onClick={handleSaveAll} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3.5" />
                )}
                {tDetail("saveAll")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={enterEditMode}>
                <Edit className="mr-1.5 size-3.5" />
                {tDetail("editMode")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const phone = String(app.phone ?? "").replace(/\D/g, "");
                  if (phone) window.open(`https://wa.me/${phone}`, "_blank");
                }}
                disabled={!app.phone}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950 transition-all active:scale-95"
              >
                <svg className="mr-1.5 size-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                <Trash2 className="mr-1.5 size-3.5" />
                {tCommon("delete")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Process Tracking + Finance (side-by-side, compact) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Process Tracking */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">{tDetail("processTrackingSection")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {/* Visa Status */}
            <div className="grid grid-cols-3 gap-2 py-1 items-center">
              <span className="text-muted-foreground text-sm">{t("visaStatus")}</span>
              <div className="col-span-2">
                {editMode ? (
                  <Select
                    value={String(editData.visa_status ?? app.visa_status ?? "beklemede")}
                    onValueChange={(v) => updateField("visa_status", v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beklemede">{tVisa("pending")}</SelectItem>
                      <SelectItem value="hazirlaniyor">{tVisa("preparing")}</SelectItem>
                      <SelectItem value="konsoloslukta">{tVisa("atConsulate")}</SelectItem>
                      <SelectItem value="vize_cikti">{tVisa("approved")}</SelectItem>
                      <SelectItem value="ret_oldu">{tVisa("rejected")}</SelectItem>
                      <SelectItem value="pasaport_teslim">{tVisa("passportDelivered")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-xs ${visaStatusColorMap[app.visa_status] ?? ""}`}
                  >
                    {app.visa_status
                      ? tVisa(
                          (visaStatusKeyMap[app.visa_status] ??
                            app.visa_status) as Parameters<typeof tVisa>[0]
                        )
                      : "-"}
                  </Badge>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 py-1 items-center">
              <span className="text-muted-foreground text-sm">{t("appointmentDate")}</span>
              <div className="col-span-2">
                <FieldValue fieldKey="appointment_date" type="date" editMode={editMode} editData={editData} app={app} onUpdate={updateField} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 py-1 items-center">
              <span className="text-muted-foreground text-sm">{t("appointmentTime")}</span>
              <div className="col-span-2">
                <FieldValue fieldKey="appointment_time" type="time" editMode={editMode} editData={editData} app={app} onUpdate={updateField} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finance */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">{tDetail("financeSection")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <div className="grid grid-cols-3 gap-2 py-1 items-center">
              <span className="text-muted-foreground text-sm">{t("serviceFee")}</span>
              <div className="col-span-2">
                <FieldValue fieldKey="service_fee" type="number" editMode={editMode} editData={editData} app={app} onUpdate={updateField} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 py-1 items-center">
              <span className="text-muted-foreground text-sm">{t("consulateFee")}</span>
              <div className="col-span-2">
                <FieldValue fieldKey="consulate_fee" type="number" editMode={editMode} editData={editData} app={app} onUpdate={updateField} />
              </div>
            </div>
            {/* Currency */}
            <div className="grid grid-cols-3 gap-2 py-1 items-center">
              <span className="text-muted-foreground text-sm">{t("currency")}</span>
              <div className="col-span-2">
                {editMode ? (
                  <Select
                    value={String(editData.currency ?? "TL")}
                    onValueChange={(v) => updateField("currency", v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TL">TL</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm">{app.currency ?? "TL"}</span>
                )}
              </div>
            </div>
            {/* Payment Status */}
            <div className="grid grid-cols-3 gap-2 py-1 items-center">
              <span className="text-muted-foreground text-sm">{t("paymentStatus")}</span>
              <div className="col-span-2">
                {editMode ? (
                  <Select
                    value={String(editData.payment_status ?? "odenmedi")}
                    onValueChange={(v) => updateField("payment_status", v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="odenmedi">{tPayment("unpaid")}</SelectItem>
                      <SelectItem value="odendi">{tPayment("paid")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm">
                    {app.payment_status
                      ? tPayment(
                          (paymentStatusKeyMap[app.payment_status] ??
                            app.payment_status) as Parameters<typeof tPayment>[0]
                        )
                      : "-"}
                  </span>
                )}
              </div>
            </div>
            {/* Payment Method — read-only context when paid */}
            {app.payment_method && (
              <div className="grid grid-cols-3 gap-2 py-1 items-center">
                <span className="text-muted-foreground text-sm">{t("paymentMethod")}</span>
                <div className="col-span-2">
                  <span className="text-sm">
                    {tPaymentMethod(
                      (paymentMethodKeyMap[app.payment_method] ??
                        app.payment_method) as Parameters<typeof tPaymentMethod>[0]
                    )}
                  </span>
                </div>
              </div>
            )}
            {/* Payment Date — read-only context when paid */}
            {app.payment_date && (
              <div className="grid grid-cols-3 gap-2 py-1 items-center">
                <span className="text-muted-foreground text-sm">{t("paymentDate")}</span>
                <div className="col-span-2">
                  <span className="text-sm">{formatDate(String(app.payment_date))}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Customer Data (from custom_fields) ────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{tDetail("customerData")}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderCustomerData()}
        </CardContent>
      </Card>

      {/* ── Generated Documents ────────────────────────────────── */}
      <Card id="documents" className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{tGenDocs("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <GeneratedDocumentsTab applicationId={applicationId} />
        </CardContent>
      </Card>

      {/* ── Automation ─────────────────────────────────────────── */}
      <Card id="automation" className="border-2 border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Automation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AutomationTab applicationId={applicationId} country={app.country ?? ""} />
        </CardContent>
      </Card>

      {/* ── Notes ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{tDetail("notesSection")}</CardTitle>
        </CardHeader>
        <CardContent>
          <NotesTab applicationId={applicationId} />
        </CardContent>
      </Card>

      {/* ── Floating Save Bar ─────────────────────────────────── */}
      {editMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t p-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {tDetail("editMode")}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={cancelEditMode}>
                <X className="mr-1.5 size-3.5" />
                {tDetail("cancelEdit")}
              </Button>
              <Button size="sm" onClick={handleSaveAll} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3.5" />
                )}
                {tDetail("saveAll")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ───────────────────────────────── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDescription", {
                name: app.full_name ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? tCommon("loading") : tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
