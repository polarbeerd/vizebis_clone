"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Copy, Edit, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatCurrency } from "@/lib/utils";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────
interface ApplicationDetail {
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
  referrals: { full_name: string } | null;
  profiles: { full_name: string } | null;
}

interface ApplicationDetailProps {
  applicationId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (application: ApplicationDetail) => void;
}

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

export function ApplicationDetailSheet({
  applicationId,
  open,
  onOpenChange,
  onEdit,
}: ApplicationDetailProps) {
  const t = useTranslations("applications");
  const tVisa = useTranslations("visaStatus");
  const tVisaType = useTranslations("visaType");
  const tInvoice = useTranslations("invoiceStatus");
  const tPayment = useTranslations("paymentStatus");
  const tPaymentMethod = useTranslations("paymentMethod");
  const tCommon = useTranslations("common");
  const tPortal = useTranslations("portal");

  const [application, setApplication] =
    React.useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = React.useState(false);

  const supabase = React.useMemo(() => createClient(), []);

  React.useEffect(() => {
    if (!open || !applicationId) {
      setApplication(null);
      return;
    }

    async function fetchApplication() {
      setLoading(true);
      const { data, error } = await supabase
        .from("applications")
        .select(
          `
          *,
          companies ( company_name ),
          referrals ( full_name ),
          profiles ( full_name )
        `
        )
        .eq("id", applicationId)
        .single();

      if (error) {
        console.error("Error fetching application detail:", error);
      } else {
        setApplication(data as unknown as ApplicationDetail);
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4">
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
          <ScrollArea className="flex-1 px-4 pb-4">
            {/* Tracking code + portal link */}
            {application.tracking_code && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30">
                <span className="text-xs text-muted-foreground">{tPortal("trackingCode")}:</span>
                <code className="flex-1 truncate text-xs font-mono">{application.tracking_code}</code>
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
              </div>
            )}

            {/* Visa status badge */}
            <div className="mb-4">
              {application.visa_status && (
                <Badge
                  variant="outline"
                  className={`text-base px-3 py-1 ${
                    visaStatusColorMap[application.visa_status] ?? ""
                  }`}
                >
                  {tVisa(
                    (visaStatusKeyMap[application.visa_status] ??
                      application.visa_status) as Parameters<typeof tVisa>[0]
                  )}
                </Badge>
              )}
            </div>

            {/* Section: Personal Info */}
            <h4 className="text-sm font-semibold mb-2">{t("personalInfo")}</h4>
            <div className="space-y-0">
              <FieldRow label={t("fullName")} value={application.full_name} />
              <FieldRow label={t("idNumber")} value={application.id_number} />
              <FieldRow
                label={t("dateOfBirth")}
                value={
                  application.date_of_birth
                    ? formatDate(application.date_of_birth)
                    : null
                }
              />
              <FieldRow label={t("phone")} value={application.phone} />
              <FieldRow label={t("email")} value={application.email} />
              <FieldRow
                label={t("company")}
                value={application.companies?.company_name}
              />
            </div>

            <Separator className="my-3" />

            {/* Section: Passport & Visa */}
            <h4 className="text-sm font-semibold mb-2">
              {t("passportVisaInfo")}
            </h4>
            <div className="space-y-0">
              <FieldRow
                label={t("passportNo")}
                value={application.passport_no}
              />
              <FieldRow
                label={t("passportExpiry")}
                value={
                  application.passport_expiry
                    ? formatDate(application.passport_expiry)
                    : null
                }
              />
              <FieldRow
                label={t("visaStart")}
                value={
                  application.visa_start
                    ? formatDate(application.visa_start)
                    : null
                }
              />
              <FieldRow
                label={t("visaEnd")}
                value={
                  application.visa_end
                    ? formatDate(application.visa_end)
                    : null
                }
              />
              <FieldRow
                label={t("visaType")}
                value={
                  application.visa_type
                    ? tVisaType(
                        (visaTypeKeyMap[application.visa_type] ??
                          application.visa_type) as Parameters<
                          typeof tVisaType
                        >[0]
                      )
                    : null
                }
              />
              <FieldRow
                label={t("visaRejected")}
                value={
                  application.visa_rejected ? tCommon("yes") : tCommon("no")
                }
              />
            </div>

            <Separator className="my-3" />

            {/* Section: Appointment & Travel */}
            <h4 className="text-sm font-semibold mb-2">
              {t("appointmentTravel")}
            </h4>
            <div className="space-y-0">
              <FieldRow label={t("country")} value={application.country} />
              <FieldRow
                label={t("appointmentDate")}
                value={
                  application.appointment_date
                    ? formatDate(application.appointment_date)
                    : null
                }
              />
              <FieldRow
                label={t("appointmentTime")}
                value={application.appointment_time}
              />
              <FieldRow
                label={t("pickupDate")}
                value={
                  application.pickup_date
                    ? formatDate(application.pickup_date)
                    : null
                }
              />
              <FieldRow
                label={t("travelDate")}
                value={
                  application.travel_date
                    ? formatDate(application.travel_date)
                    : null
                }
              />
            </div>

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

            {/* Section: Consulate */}
            <h4 className="text-sm font-semibold mb-2">
              {t("consulateInfo")}
            </h4>
            <div className="space-y-0">
              <FieldRow
                label={t("consulateAppNo")}
                value={application.consulate_app_no}
              />
              <FieldRow
                label={t("consulateOffice")}
                value={application.consulate_office}
              />
            </div>

            <Separator className="my-3" />

            {/* Section: Other */}
            <h4 className="text-sm font-semibold mb-2">{t("other")}</h4>
            <div className="space-y-0">
              <FieldRow
                label={t("reference")}
                value={application.referrals?.full_name}
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
        ) : (
          <div className="flex items-center justify-center flex-1">
            <p className="text-muted-foreground">{tCommon("noData")}</p>
          </div>
        )}

        {/* Footer with edit button */}
        {application && onEdit && (
          <div className="border-t px-4 py-3">
            <Button
              className="w-full"
              onClick={() => {
                onEdit(application);
                onOpenChange(false);
              }}
            >
              <Edit className="mr-2 size-4" />
              {tCommon("edit")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
