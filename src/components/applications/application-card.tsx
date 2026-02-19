"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Copy, Edit, Loader2, Download, Check, XCircle, Plus, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatCurrency } from "@/lib/utils";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { NotesTab } from "@/components/applications/notes-tab";
import { GeneratedDocumentsTab } from "@/components/applications/generated-documents-tab";

// ── Types ─────────────────────────────────────────────────────────
export interface ApplicationDetail {
  id: number;
  tracking_code: string | null;
  full_name: string | null;
  id_number: string | null;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  company_id: number | null;
  passport_no: string | null;
  passport_expiry: string | null;
  visa_start: string | null;
  visa_end: string | null;
  visa_status: string | null;
  visa_type: string | null;
  country: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  pickup_date: string | null;
  travel_date: string | null;
  consulate_fee: number | null;
  service_fee: number | null;
  currency: string | null;
  invoice_status: string | null;
  invoice_date: string | null;
  invoice_number: string | null;
  payment_status: string | null;
  payment_date: string | null;
  payment_method: string | null;
  payment_note: string | null;
  consulate_app_no: string | null;
  consulate_office: string | null;
  referral_id: number | null;
  visa_rejected: boolean | null;
  notes: string | null;
  assigned_user_id: string | null;
  assignment_note: string | null;
  passport_photo_url: string | null;
  visa_photo_url: string | null;
  companies: { company_name: string } | null;
  referrals: { name: string } | null;
  profiles: { full_name: string } | null;
  custom_fields: Record<string, unknown> | null;
  source: string | null;
}

interface ApplicationCardProps {
  applicationId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (application: ApplicationDetail) => void;
  onSms?: (application: { id: number; full_name: string | null; phone: string | null }) => void;
}

interface AppDoc {
  id: number;
  checklist_item_id: number | null;
  custom_name: string | null;
  custom_description: string | null;
  is_required: boolean;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  admin_note: string | null;
  uploaded_at: string | null;
  reviewed_at: string | null;
  checklist_name: string | null;
  checklist_description: string | null;
}

const docStatusBadgeMap: Record<string, { className: string; key: string }> = {
  pending: {
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    key: "pending",
  },
  uploaded: {
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    key: "uploaded",
  },
  approved: {
    className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    key: "approved",
  },
  rejected: {
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    key: "rejected",
  },
};

// ── Visa status badge (from applications-client logic) ───────────
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
  hazirlaniyor:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  konsoloslukta:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  vize_cikti:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ret_oldu: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  pasaport_teslim:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

const visaTypeKeyMap: Record<string, string> = {
  kultur: "cultural",
  ticari: "commercial",
  turistik: "tourist",
  ziyaret: "visit",
  diger: "other",
};

const invoiceStatusKeyMap: Record<string, string> = {
  fatura_yok: "none",
  fatura_var: "exists",
  fatura_kesildi: "issued",
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

export function ApplicationCard({
  applicationId,
  open,
  onOpenChange,
  onEdit,
  onSms,
}: ApplicationCardProps) {
  const t = useTranslations("applications");
  const tVisa = useTranslations("visaStatus");
  const tVisaType = useTranslations("visaType");
  const tInvoice = useTranslations("invoiceStatus");
  const tPayment = useTranslations("paymentStatus");
  const tPaymentMethod = useTranslations("paymentMethod");
  const tCommon = useTranslations("common");
  const tPortal = useTranslations("portal");
  const tAppDocs = useTranslations("applicationDocuments");
  const tDetail = useTranslations("applicationDetail");
  const tGenDocs = useTranslations("generatedDocuments");

  const [application, setApplication] =
    React.useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [documents, setDocuments] = React.useState<AppDoc[]>([]);
  const [rejectDocId, setRejectDocId] = React.useState<number | null>(null);
  const [rejectNote, setRejectNote] = React.useState("");
  const [showCustomDialog, setShowCustomDialog] = React.useState(false);
  const [customName, setCustomName] = React.useState("");
  const [customDescription, setCustomDescription] = React.useState("");
  const [customRequired, setCustomRequired] = React.useState(true);
  const [portalEdits, setPortalEdits] = React.useState<Record<string, string>>({});
  const [savingPortal, setSavingPortal] = React.useState(false);
  const [fieldDefs, setFieldDefs] = React.useState<Array<{ field_key: string; field_label: string; field_label_tr: string | null }>>([]);
  const [smartTemplates, setSmartTemplates] = React.useState<Array<{ template_key: string; label: string; label_tr: string; sub_fields: Array<{ key: string; label: string; label_tr: string }> }>>([]);
  const locale = useLocale();

  const supabase = React.useMemo(() => createClient(), []);

  React.useEffect(() => {
    if (!open || !applicationId) {
      setApplication(null);
      setDocuments([]);
      return;
    }

    async function fetchApplication() {
      setLoading(true);
      const [appRes, fieldDefsRes, smartTemplatesRes] = await Promise.all([
        supabase
          .from("applications")
          .select(
            `
            *,
            companies ( company_name ),
            referrals ( name ),
            profiles!assigned_user_id ( full_name )
          `
          )
          .eq("id", applicationId)
          .single(),
        supabase
          .from("portal_field_definitions")
          .select("field_key, field_label, field_label_tr"),
        supabase
          .from("portal_smart_field_templates")
          .select("template_key, label, label_tr, sub_fields"),
      ]);

      if (appRes.error) {
        console.error("Error fetching application detail:", appRes.error);
      } else {
        setApplication(appRes.data as unknown as ApplicationDetail);
      }

      if (fieldDefsRes.data) {
        setFieldDefs(
          fieldDefsRes.data.map((d: Record<string, unknown>) => ({
            field_key: d.field_key as string,
            field_label: d.field_label as string,
            field_label_tr: (d.field_label_tr as string) ?? null,
          }))
        );
      }
      if (smartTemplatesRes.data) {
        setSmartTemplates(
          smartTemplatesRes.data.map((t: Record<string, unknown>) => ({
            template_key: t.template_key as string,
            label: t.label as string,
            label_tr: (t.label_tr as string) ?? "",
            sub_fields: (t.sub_fields as Array<{ key: string; label: string; label_tr: string }>) ?? [],
          }))
        );
      }

      // Fetch application documents
      const { data: docsData } = await supabase
        .from("application_documents")
        .select(`
          id, checklist_item_id, custom_name, custom_description,
          is_required, file_path, file_name, file_size, mime_type,
          status, admin_note, uploaded_at, reviewed_at,
          document_checklists ( name, description )
        `)
        .eq("application_id", applicationId)
        .order("id", { ascending: true });

      if (docsData) {
        setDocuments(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          docsData.map((d: any) => ({
            id: d.id,
            checklist_item_id: d.checklist_item_id,
            custom_name: d.custom_name,
            custom_description: d.custom_description,
            is_required: d.is_required,
            file_path: d.file_path,
            file_name: d.file_name,
            file_size: d.file_size,
            mime_type: d.mime_type,
            status: d.status,
            admin_note: d.admin_note,
            uploaded_at: d.uploaded_at,
            reviewed_at: d.reviewed_at,
            checklist_name: d.document_checklists?.name ?? null,
            checklist_description: d.document_checklists?.description ?? null,
          }))
        );
      }

      setLoading(false);
    }

    fetchApplication();
  }, [open, applicationId, supabase]);

  // ── Helper ──────────────────────────────────────────────────
  function FieldRow({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) {
    return (
      <div className="flex justify-between py-1.5">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="text-sm font-medium text-right max-w-[60%] break-words">
          {value || "-"}
        </span>
      </div>
    );
  }

  // ── Document helpers ──────────────────────────────────────────
  async function refreshDocs() {
    if (!applicationId) return;
    const { data: docsData } = await supabase
      .from("application_documents")
      .select(`
        id, checklist_item_id, custom_name, custom_description,
        is_required, file_path, file_name, file_size, mime_type,
        status, admin_note, uploaded_at, reviewed_at,
        document_checklists ( name, description )
      `)
      .eq("application_id", applicationId)
      .order("id", { ascending: true });

    if (docsData) {
      setDocuments(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        docsData.map((d: any) => ({
          id: d.id,
          checklist_item_id: d.checklist_item_id,
          custom_name: d.custom_name,
          custom_description: d.custom_description,
          is_required: d.is_required,
          file_path: d.file_path,
          file_name: d.file_name,
          file_size: d.file_size,
          mime_type: d.mime_type,
          status: d.status,
          admin_note: d.admin_note,
          uploaded_at: d.uploaded_at,
          reviewed_at: d.reviewed_at,
          checklist_name: d.document_checklists?.name ?? null,
          checklist_description: d.document_checklists?.description ?? null,
        }))
      );
    }
  }

  async function handleApprove(docId: number) {
    const { error } = await supabase
      .from("application_documents")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", docId);

    if (error) {
      console.error("Error approving document:", error);
      return;
    }
    toast.success(tAppDocs("approveSuccess"));
    refreshDocs();
  }

  async function handleReject(docId: number, note: string) {
    const { error } = await supabase
      .from("application_documents")
      .update({
        status: "rejected",
        admin_note: note,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", docId);

    if (error) {
      console.error("Error rejecting document:", error);
      return;
    }
    toast.success(tAppDocs("rejectSuccess"));
    setRejectDocId(null);
    setRejectNote("");
    refreshDocs();
  }

  async function handleAddCustom() {
    if (!applicationId || !customName.trim()) return;
    const { error } = await supabase.from("application_documents").insert({
      application_id: applicationId,
      custom_name: customName.trim(),
      custom_description: customDescription.trim() || null,
      is_required: customRequired,
      status: "pending",
    });

    if (error) {
      console.error("Error adding custom requirement:", error);
      return;
    }
    toast.success(tAppDocs("addSuccess"));
    setShowCustomDialog(false);
    setCustomName("");
    setCustomDescription("");
    setCustomRequired(true);
    refreshDocs();
  }

  async function handleLoadChecklist() {
    if (!applicationId || !application?.country || !application?.visa_type) return;

    const { data: items } = await supabase
      .from("document_checklists")
      .select("id, name, description, is_required")
      .eq("country", application.country)
      .eq("visa_type", application.visa_type)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!items || items.length === 0) return;

    const rows = items.map((item) => ({
      application_id: applicationId,
      checklist_item_id: item.id,
      is_required: item.is_required,
      status: "pending",
    }));

    const { error } = await supabase.from("application_documents").insert(rows);
    if (error) {
      console.error("Error loading checklist:", error);
      return;
    }
    refreshDocs();
  }

  async function handleDownload(doc: AppDoc) {
    if (!doc.file_path) return;
    const { data } = await supabase.storage
      .from("portal-uploads")
      .createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  }

  // Compute document progress
  const approvedCount = documents.filter((d) => d.status === "approved").length;
  const totalDocs = documents.length;
  const progressPercent = totalDocs > 0 ? Math.round((approvedCount / totalDocs) * 100) : 0;

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl w-full p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-4 pt-4 shrink-0">
          <SheetTitle>
            {application?.full_name ?? t("personalInfo")}
          </SheetTitle>
          <SheetDescription>#{applicationId}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : application ? (
          <>
            {/* Top actions row */}
            <div className="px-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {application.visa_status && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      visaStatusColorMap[application.visa_status] ?? ""
                    }`}
                  >
                    {tVisa(
                      (visaStatusKeyMap[application.visa_status] ??
                        application.visa_status) as Parameters<typeof tVisa>[0]
                    )}
                  </Badge>
                )}
                {application.tracking_code && (
                  <>
                    <span className="text-xs font-mono text-muted-foreground">#{application.tracking_code}</span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        const url = `${window.location.origin}/portal/${application.tracking_code}`;
                        navigator.clipboard.writeText(url);
                        toast.success(tPortal("portalLinkCopied"));
                      }}
                      title={tPortal("copyPortalLink")}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        if (!application) return;
                        const exportData: Record<string, unknown> = {
                          id: application.id,
                          tracking_code: application.tracking_code,
                          full_name: application.full_name,
                          id_number: application.id_number,
                          date_of_birth: application.date_of_birth,
                          phone: application.phone,
                          email: application.email,
                          passport_no: application.passport_no,
                          passport_expiry: application.passport_expiry,
                          visa_status: application.visa_status,
                          visa_type: application.visa_type,
                          country: application.country,
                          appointment_date: application.appointment_date,
                          appointment_time: application.appointment_time,
                          consulate_office: application.consulate_office,
                          source: application.source,
                        };
                        if (application.custom_fields) {
                          const cf = application.custom_fields as Record<string, unknown>;
                          for (const [k, v] of Object.entries(cf)) {
                            if (k === "_smart") {
                              const smart = v as Record<string, Record<string, unknown>>;
                              for (const [sfKey, sfData] of Object.entries(smart)) {
                                for (const [subKey, subVal] of Object.entries(sfData)) {
                                  if (subKey === "_valid") continue;
                                  exportData[`${sfKey}_${subKey}`] = subVal;
                                }
                              }
                            } else if (!k.startsWith("_")) {
                              exportData[k] = v;
                            }
                          }
                        }
                        navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
                        toast.success(tDetail("jsonCopied"));
                      }}
                      title={tDetail("copyJson")}
                    >
                      <span className="text-[10px] font-mono">{"{}"}</span>
                    </Button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onEdit(application);
                      onOpenChange(false);
                    }}
                  >
                    <Edit className="mr-1.5 size-3.5" />
                    {tCommon("edit")}
                  </Button>
                )}
                {onSms && application.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSms({
                        id: application.id,
                        full_name: application.full_name,
                        phone: application.phone,
                      });
                    }}
                  >
                    <MessageSquare className="mr-1.5 size-3.5" />
                    SMS
                  </Button>
                )}
              </div>
            </div>

            <Tabs defaultValue="overview" className="flex-1 min-h-0 flex flex-col">
              <TabsList className="mx-4 w-fit">
                <TabsTrigger value="overview">{t("personalInfo")}</TabsTrigger>
                <TabsTrigger value="generated">{tGenDocs("title")}</TabsTrigger>
                <TabsTrigger value="portal-docs">{tAppDocs("title")}</TabsTrigger>
                <TabsTrigger value="notes">{t("notes")}</TabsTrigger>
              </TabsList>

              {/* ── Overview Tab ──────────────────────────────────────── */}
              <TabsContent value="overview" className="flex-1 min-h-0 overflow-auto">
                <ScrollArea className="flex-1 min-h-0 overflow-hidden px-4 pb-4">
                  {(() => {
                    const isPortalApp = !!application.custom_fields && Object.keys(application.custom_fields).length > 0;

                    if (isPortalApp) {
                      const cf = application.custom_fields as Record<string, unknown>;
                      const regularKeys = Object.keys(cf).filter((k) => k !== "_smart");
                      const smartData = (cf._smart ?? {}) as Record<string, Record<string, unknown>>;
                      const smartKeys = Object.keys(smartData);

                      return (
                        <>
                          {/* Section: Customer Data */}
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold">{t("customerData")}</h4>
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                              {tDetail("sourcePortal")}
                            </Badge>
                          </div>

                          {regularKeys.length > 0 && (
                            <div className="space-y-0">
                              {regularKeys.map((key) => {
                                const def = fieldDefs.find((d) => d.field_key === key);
                                const label = def
                                  ? (locale === "tr" && def.field_label_tr ? def.field_label_tr : def.field_label)
                                  : key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                                const editKey = key;
                                return (
                                  <div key={key} className="flex justify-between py-1.5 gap-2">
                                    <span className="text-muted-foreground text-sm whitespace-nowrap">
                                      {label}
                                    </span>
                                    <Input
                                      className="h-7 text-sm font-medium text-right max-w-[60%]"
                                      value={portalEdits[editKey] ?? String(cf[key] ?? "")}
                                      onChange={(e) =>
                                        setPortalEdits((prev) => ({ ...prev, [editKey]: e.target.value }))
                                      }
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {smartKeys.length > 0 && (
                            <div className="mt-3 space-y-3">
                              {smartKeys.map((templateKey) => {
                                const tmpl = smartTemplates.find((t) => t.template_key === templateKey);
                                const groupLabel = tmpl
                                  ? (locale === "tr" && tmpl.label_tr ? tmpl.label_tr : tmpl.label)
                                  : templateKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

                                const subData = smartData[templateKey];
                                if (!subData || typeof subData !== "object") return null;
                                const subKeys = Object.keys(subData).filter((k) => k !== "_valid");

                                return (
                                  <div key={templateKey} className="rounded-lg border p-3">
                                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                      {groupLabel}
                                    </h5>
                                    <div className="space-y-0">
                                      {subKeys.map((subKey) => {
                                        const editKey = `_smart.${templateKey}.${subKey}`;
                                        const subField = tmpl?.sub_fields?.find((sf) => sf.key === subKey);
                                        const subLabel = subField
                                          ? (locale === "tr" && subField.label_tr ? subField.label_tr : subField.label)
                                          : subKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

                                        return (
                                          <div key={subKey} className="flex justify-between py-1.5 gap-2">
                                            <span className="text-muted-foreground text-xs whitespace-nowrap">
                                              {subLabel}
                                            </span>
                                            <Input
                                              className="h-7 text-sm font-medium text-right max-w-[60%]"
                                              value={portalEdits[editKey] ?? String(subData[subKey] ?? "")}
                                              onChange={(e) =>
                                                setPortalEdits((prev) => ({ ...prev, [editKey]: e.target.value }))
                                              }
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {Object.keys(portalEdits).length > 0 && (
                            <Button
                              size="sm"
                              className="mt-2 w-full"
                              disabled={savingPortal}
                              onClick={async () => {
                                if (!applicationId) return;
                                setSavingPortal(true);
                                try {
                                  const current = { ...cf };
                                  for (const [editKey, editVal] of Object.entries(portalEdits)) {
                                    if (editKey.startsWith("_smart.")) {
                                      const parts = editKey.split(".");
                                      const tplKey = parts[1];
                                      const sKey = parts.slice(2).join(".");
                                      if (!current._smart) current._smart = {};
                                      const smart = current._smart as Record<string, Record<string, unknown>>;
                                      if (!smart[tplKey]) smart[tplKey] = {};
                                      smart[tplKey][sKey] = editVal;
                                    } else {
                                      current[editKey] = editVal;
                                    }
                                  }
                                  const { error } = await supabase
                                    .from("applications")
                                    .update({ custom_fields: current })
                                    .eq("id", applicationId);
                                  if (error) throw error;
                                  setApplication({ ...application, custom_fields: current });
                                  setPortalEdits({});
                                  toast.success(tDetail("portalDataSaved"));
                                } catch {
                                  toast.error(tDetail("portalDataSaveError"));
                                } finally {
                                  setSavingPortal(false);
                                }
                              }}
                            >
                              {savingPortal ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                              {tDetail("savePortalData")}
                            </Button>
                          )}

                          <Separator className="my-3" />

                          {/* Section: Process Tracking */}
                          <h4 className="text-sm font-semibold mb-2">{t("processTracking")}</h4>
                          <div className="space-y-0">
                            <FieldRow
                              label={t("visaStatus")}
                              value={
                                application.visa_status
                                  ? tVisa(
                                      (visaStatusKeyMap[application.visa_status] ??
                                        application.visa_status) as Parameters<typeof tVisa>[0]
                                    )
                                  : null
                              }
                            />
                            <FieldRow
                              label={t("visaType")}
                              value={
                                application.visa_type
                                  ? tVisaType(
                                      (visaTypeKeyMap[application.visa_type] ??
                                        application.visa_type) as Parameters<typeof tVisaType>[0]
                                    )
                                  : null
                              }
                            />
                            <FieldRow label={t("country")} value={application.country} />
                            <FieldRow
                              label={t("appointmentDate")}
                              value={application.appointment_date ? formatDate(application.appointment_date) : null}
                            />
                            <FieldRow label={t("appointmentTime")} value={application.appointment_time} />
                            <FieldRow
                              label={t("pickupDate")}
                              value={application.pickup_date ? formatDate(application.pickup_date) : null}
                            />
                            <FieldRow
                              label={t("travelDate")}
                              value={application.travel_date ? formatDate(application.travel_date) : null}
                            />
                            <FieldRow label={t("consulateAppNo")} value={application.consulate_app_no} />
                            <FieldRow label={t("consulateOffice")} value={application.consulate_office} />
                            <FieldRow
                              label={t("visaStart")}
                              value={application.visa_start ? formatDate(application.visa_start) : null}
                            />
                            <FieldRow
                              label={t("visaEnd")}
                              value={application.visa_end ? formatDate(application.visa_end) : null}
                            />
                            <FieldRow
                              label={t("visaRejected")}
                              value={application.visa_rejected ? tCommon("yes") : tCommon("no")}
                            />
                          </div>
                        </>
                      );
                    }

                    // Admin-created app: show classic sections
                    return (
                      <>
                        {/* Section: Personal Info */}
                        <h4 className="text-sm font-semibold mb-2">{t("personalInfo")}</h4>
                        <div className="space-y-0">
                          <FieldRow label={t("fullName")} value={application.full_name} />
                          <FieldRow label={t("idNumber")} value={application.id_number} />
                          <FieldRow
                            label={t("dateOfBirth")}
                            value={application.date_of_birth ? formatDate(application.date_of_birth) : null}
                          />
                          <FieldRow label={t("phone")} value={application.phone} />
                          <FieldRow label={t("email")} value={application.email} />
                          <FieldRow label={t("company")} value={application.companies?.company_name} />
                        </div>

                        <Separator className="my-3" />

                        {/* Section: Passport & Visa */}
                        <h4 className="text-sm font-semibold mb-2">{t("passportVisaInfo")}</h4>
                        <div className="space-y-0">
                          <FieldRow label={t("passportNo")} value={application.passport_no} />
                          <FieldRow
                            label={t("passportExpiry")}
                            value={application.passport_expiry ? formatDate(application.passport_expiry) : null}
                          />
                          <FieldRow
                            label={t("visaStart")}
                            value={application.visa_start ? formatDate(application.visa_start) : null}
                          />
                          <FieldRow
                            label={t("visaEnd")}
                            value={application.visa_end ? formatDate(application.visa_end) : null}
                          />
                          <FieldRow
                            label={t("visaType")}
                            value={
                              application.visa_type
                                ? tVisaType(
                                    (visaTypeKeyMap[application.visa_type] ??
                                      application.visa_type) as Parameters<typeof tVisaType>[0]
                                  )
                                : null
                            }
                          />
                          <FieldRow
                            label={t("visaRejected")}
                            value={application.visa_rejected ? tCommon("yes") : tCommon("no")}
                          />
                        </div>

                        <Separator className="my-3" />

                        {/* Section: Appointment & Travel */}
                        <h4 className="text-sm font-semibold mb-2">{t("appointmentTravel")}</h4>
                        <div className="space-y-0">
                          <FieldRow label={t("country")} value={application.country} />
                          <FieldRow
                            label={t("appointmentDate")}
                            value={application.appointment_date ? formatDate(application.appointment_date) : null}
                          />
                          <FieldRow label={t("appointmentTime")} value={application.appointment_time} />
                          <FieldRow
                            label={t("pickupDate")}
                            value={application.pickup_date ? formatDate(application.pickup_date) : null}
                          />
                          <FieldRow
                            label={t("travelDate")}
                            value={application.travel_date ? formatDate(application.travel_date) : null}
                          />
                        </div>

                        <Separator className="my-3" />

                        {/* Section: Consulate */}
                        <h4 className="text-sm font-semibold mb-2">{t("consulateInfo")}</h4>
                        <div className="space-y-0">
                          <FieldRow label={t("consulateAppNo")} value={application.consulate_app_no} />
                          <FieldRow label={t("consulateOffice")} value={application.consulate_office} />
                        </div>
                      </>
                    );
                  })()}

                  <Separator className="my-3" />

                  {/* Section: Fee Info */}
                  <h4 className="text-sm font-semibold mb-2">{t("feeInfo")}</h4>
                  <div className="space-y-0">
                    <FieldRow
                      label={t("consulateFee")}
                      value={
                        application.consulate_fee != null
                          ? formatCurrency(
                              application.consulate_fee,
                              (application.currency as "TL" | "USD" | "EUR") ?? "TL"
                            )
                          : null
                      }
                    />
                    <FieldRow
                      label={t("serviceFee")}
                      value={
                        application.service_fee != null
                          ? formatCurrency(
                              application.service_fee,
                              (application.currency as "TL" | "USD" | "EUR") ?? "TL"
                            )
                          : null
                      }
                    />
                    <FieldRow
                      label={t("invoiceStatus")}
                      value={
                        application.invoice_status
                          ? tInvoice(
                              (invoiceStatusKeyMap[application.invoice_status] ??
                                application.invoice_status) as Parameters<
                                typeof tInvoice
                              >[0]
                            )
                          : null
                      }
                    />
                    <FieldRow
                      label={t("invoiceDate")}
                      value={
                        application.invoice_date
                          ? formatDate(application.invoice_date)
                          : null
                      }
                    />
                    <FieldRow
                      label={t("invoiceNumber")}
                      value={application.invoice_number}
                    />
                    <FieldRow
                      label={t("paymentStatus")}
                      value={
                        application.payment_status
                          ? tPayment(
                              (paymentStatusKeyMap[application.payment_status] ??
                                application.payment_status) as Parameters<
                                typeof tPayment
                              >[0]
                            )
                          : null
                      }
                    />
                    <FieldRow
                      label={t("paymentDate")}
                      value={
                        application.payment_date
                          ? formatDate(application.payment_date)
                          : null
                      }
                    />
                    <FieldRow
                      label={t("paymentMethod")}
                      value={
                        application.payment_method
                          ? tPaymentMethod(
                              (paymentMethodKeyMap[application.payment_method] ??
                                application.payment_method) as Parameters<
                                typeof tPaymentMethod
                              >[0]
                            )
                          : null
                      }
                    />
                    <FieldRow
                      label={t("paymentNote")}
                      value={application.payment_note}
                    />
                  </div>

                  <Separator className="my-3" />

                  {/* Section: Notes & Other */}
                  <h4 className="text-sm font-semibold mb-2">{t("other")}</h4>
                  <div className="space-y-0">
                    <FieldRow
                      label={t("reference")}
                      value={application.referrals?.name}
                    />
                    <FieldRow
                      label={t("assignedUser")}
                      value={application.profiles?.full_name}
                    />
                    <FieldRow
                      label={t("assignmentNote")}
                      value={application.assignment_note}
                    />
                    <FieldRow label={t("notes")} value={application.notes} />
                  </div>

                  {/* Passport / Visa photos */}
                  {(application.passport_photo_url ||
                    application.visa_photo_url) && (
                    <>
                      <Separator className="my-3" />
                      <h4 className="text-sm font-semibold mb-2">{t("files")}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {application.passport_photo_url && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {t("passportPhoto")}
                            </p>
                            <img
                              src={application.passport_photo_url}
                              alt="Passport"
                              className="rounded-md border max-h-40 object-contain"
                            />
                          </div>
                        )}
                        {application.visa_photo_url && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {t("visaPhoto")}
                            </p>
                            <img
                              src={application.visa_photo_url}
                              alt="Visa"
                              className="rounded-md border max-h-40 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="h-4" />
                </ScrollArea>
              </TabsContent>

              {/* ── Generated Documents Tab ───────────────────────────── */}
              <TabsContent value="generated" className="flex-1 min-h-0 overflow-auto px-4 pb-4">
                <GeneratedDocumentsTab applicationId={applicationId} />
              </TabsContent>

              {/* ── Portal Documents Tab ──────────────────────────────── */}
              <TabsContent value="portal-docs" className="flex-1 min-h-0 overflow-auto">
                <ScrollArea className="flex-1 min-h-0 overflow-hidden px-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">{tAppDocs("title")}</h4>
                    {totalDocs > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {approvedCount}/{totalDocs}
                      </Badge>
                    )}
                  </div>

                  {totalDocs > 0 && (
                    <div className="mb-3">
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          style={{ width: `${progressPercent}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-600 transition-all duration-300"
                        />
                      </div>
                    </div>
                  )}

                  {documents.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{tAppDocs("noDocuments")}</p>
                      {application.country && application.visa_type && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLoadChecklist}
                        >
                          <Plus className="mr-1.5 size-3.5" />
                          {tAppDocs("progress")}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="rounded-lg border p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-medium truncate block">
                                {doc.checklist_name || doc.custom_name}
                              </span>
                              {(doc.checklist_description || doc.custom_description) && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {doc.checklist_description || doc.custom_description}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-xs ${
                                docStatusBadgeMap[doc.status]?.className ?? ""
                              }`}
                            >
                              {tAppDocs(
                                (docStatusBadgeMap[doc.status]?.key ??
                                  doc.status) as Parameters<typeof tAppDocs>[0]
                              )}
                            </Badge>
                          </div>

                          {doc.file_name && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleDownload(doc)}
                              >
                                <Download className="mr-1 size-3" />
                                {tAppDocs("download")}
                              </Button>
                              {doc.status !== "approved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                  onClick={() => handleApprove(doc.id)}
                                >
                                  <Check className="mr-1 size-3" />
                                  {tAppDocs("approve")}
                                </Button>
                              )}
                              {doc.status !== "rejected" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  onClick={() => {
                                    setRejectDocId(doc.id);
                                    setRejectNote("");
                                  }}
                                >
                                  <XCircle className="mr-1 size-3" />
                                  {tAppDocs("reject")}
                                </Button>
                              )}
                            </div>
                          )}

                          {doc.status === "rejected" && doc.admin_note && (
                            <p className="text-xs text-red-500 dark:text-red-400">
                              {tAppDocs("rejectionNote")}: {doc.admin_note}
                            </p>
                          )}

                          {doc.is_required && !doc.file_name && doc.status === "pending" && (
                            <span className="inline-block text-[10px] font-medium text-orange-600 dark:text-orange-400">
                              * {tCommon("active")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomDialog(true)}
                    >
                      <Plus className="mr-1.5 size-3.5" />
                      {tAppDocs("addCustom")}
                    </Button>
                  </div>

                  <div className="h-4" />
                </ScrollArea>
              </TabsContent>

              {/* ── Notes Tab ────────────────────────────────────────── */}
              <TabsContent value="notes" className="flex-1 min-h-0 overflow-auto px-4 pb-4">
                <NotesTab applicationId={applicationId} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <p className="text-muted-foreground">{tCommon("noData")}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>

    {/* Reject dialog */}
    <Dialog open={rejectDocId !== null} onOpenChange={(v) => { if (!v) { setRejectDocId(null); setRejectNote(""); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tAppDocs("rejectionNote")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Textarea
            placeholder={tAppDocs("rejectionNotePlaceholder")}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setRejectDocId(null); setRejectNote(""); }}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={!rejectNote.trim()}
            onClick={() => {
              if (rejectDocId !== null) handleReject(rejectDocId, rejectNote.trim());
            }}
          >
            <XCircle className="mr-1.5 size-4" />
            {tAppDocs("reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Add custom requirement dialog */}
    <Dialog open={showCustomDialog} onOpenChange={(v) => { if (!v) { setShowCustomDialog(false); setCustomName(""); setCustomDescription(""); setCustomRequired(true); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tAppDocs("addCustom")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="custom-doc-name">{tAppDocs("customName")}</Label>
            <Input
              id="custom-doc-name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={tAppDocs("customName")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-doc-desc">{tAppDocs("customDescription")}</Label>
            <Textarea
              id="custom-doc-desc"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder={tAppDocs("customDescription")}
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="custom-doc-required"
              checked={customRequired}
              onCheckedChange={setCustomRequired}
            />
            <Label htmlFor="custom-doc-required" className="text-sm">
              {tCommon("status")}: {customRequired ? tCommon("active") : tCommon("passive")}
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowCustomDialog(false); setCustomName(""); setCustomDescription(""); setCustomRequired(true); }}>
            {tCommon("cancel")}
          </Button>
          <Button disabled={!customName.trim()} onClick={handleAddCustom}>
            <Plus className="mr-1.5 size-4" />
            {tCommon("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
