"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Schema ────────────────────────────────────────────────────────
const applicationSchema = z.object({
  // Personal info
  full_name: z.string().min(1, "Full name is required"),
  id_number: z.string().default(""),
  date_of_birth: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  company_id: z.string().default(""),
  // Passport & Visa
  passport_no: z.string().default(""),
  passport_expiry: z.string().default(""),
  visa_start: z.string().default(""),
  visa_end: z.string().default(""),
  visa_status: z.string().default("beklemede"),
  visa_type: z.string().default(""),
  // Appointment & Travel
  country: z.string().default(""),
  appointment_date: z.string().default(""),
  appointment_time: z.string().default(""),
  pickup_date: z.string().default(""),
  travel_date: z.string().default(""),
  // Fee info
  consulate_fee: z.coerce.number().default(0),
  service_fee: z.coerce.number().default(0),
  currency: z.string().default("TL"),
  invoice_status: z.string().default("fatura_yok"),
  invoice_date: z.string().default(""),
  invoice_number: z.string().default(""),
  payment_status: z.string().default("odenmedi"),
  payment_date: z.string().default(""),
  payment_method: z.string().default(""),
  payment_note: z.string().default(""),
  // Consulate
  consulate_app_no: z.string().default(""),
  consulate_office: z.string().default(""),
  // Other
  referral_id: z.string().default(""),
  visa_rejected: z.boolean().default(false),
  notes: z.string().default(""),
  assigned_user_id: z.string().default(""),
  assignment_note: z.string().default(""),
});

type ApplicationFormValues = z.output<typeof applicationSchema>;

// ── Types for lookup data ─────────────────────────────────────────
interface Company {
  id: number;
  company_name: string;
}
interface Referral {
  id: number;
  full_name: string;
}
interface Profile {
  id: string;
  full_name: string;
}

// ── Props ─────────────────────────────────────────────────────────
export interface ApplicationForForm {
  id: number;
  full_name?: string | null;
  id_number?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  email?: string | null;
  company_id?: number | null;
  passport_no?: string | null;
  passport_expiry?: string | null;
  visa_start?: string | null;
  visa_end?: string | null;
  visa_status?: string | null;
  visa_type?: string | null;
  country?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
  pickup_date?: string | null;
  travel_date?: string | null;
  consulate_fee?: number | null;
  service_fee?: number | null;
  currency?: string | null;
  invoice_status?: string | null;
  invoice_date?: string | null;
  invoice_number?: string | null;
  payment_status?: string | null;
  payment_date?: string | null;
  payment_method?: string | null;
  payment_note?: string | null;
  consulate_app_no?: string | null;
  consulate_office?: string | null;
  referral_id?: number | null;
  visa_rejected?: boolean | null;
  notes?: string | null;
  assigned_user_id?: string | null;
  assignment_note?: string | null;
}

interface ApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application?: ApplicationForForm;
  onSuccess: () => void;
}

export function ApplicationForm({
  open,
  onOpenChange,
  application,
  onSuccess,
}: ApplicationFormProps) {
  const t = useTranslations("applications");
  const tVisa = useTranslations("visaStatus");
  const tVisaType = useTranslations("visaType");
  const tInvoice = useTranslations("invoiceStatus");
  const tPayment = useTranslations("paymentStatus");
  const tPaymentMethod = useTranslations("paymentMethod");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = React.useState(false);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [referrals, setReferrals] = React.useState<Referral[]>([]);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);

  const isEdit = !!application;
  const supabase = React.useMemo(() => createClient(), []);

  // ── Fetch lookup data ────────────────────────────────────────
  React.useEffect(() => {
    if (!open) return;

    async function fetchLookups() {
      const [companiesRes, referralsRes, profilesRes] = await Promise.all([
        supabase
          .from("companies")
          .select("id, company_name")
          .eq("is_active", true)
          .order("company_name"),
        supabase
          .from("referrals")
          .select("id, full_name")
          .order("full_name"),
        supabase
          .from("profiles")
          .select("id, full_name")
          .order("full_name"),
      ]);

      if (companiesRes.data) setCompanies(companiesRes.data);
      if (referralsRes.data) setReferrals(referralsRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
    }

    fetchLookups();
  }, [open, supabase]);

  // ── Form setup ───────────────────────────────────────────────
  const form = useForm<ApplicationFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(applicationSchema) as any,
    defaultValues: {
      full_name: "",
      id_number: "",
      date_of_birth: "",
      phone: "",
      email: "",
      company_id: "",
      passport_no: "",
      passport_expiry: "",
      visa_start: "",
      visa_end: "",
      visa_status: "beklemede",
      visa_type: "",
      country: "",
      appointment_date: "",
      appointment_time: "",
      pickup_date: "",
      travel_date: "",
      consulate_fee: 0,
      service_fee: 0,
      currency: "TL",
      invoice_status: "fatura_yok",
      invoice_date: "",
      invoice_number: "",
      payment_status: "odenmedi",
      payment_date: "",
      payment_method: "",
      payment_note: "",
      consulate_app_no: "",
      consulate_office: "",
      referral_id: "",
      visa_rejected: false,
      notes: "",
      assigned_user_id: "",
      assignment_note: "",
    },
  });

  // ── Pre-fill form when editing ───────────────────────────────
  React.useEffect(() => {
    if (open && application) {
      form.reset({
        full_name: application.full_name ?? "",
        id_number: application.id_number ?? "",
        date_of_birth: application.date_of_birth ?? "",
        phone: application.phone ?? "",
        email: application.email ?? "",
        company_id: application.company_id ? String(application.company_id) : "",
        passport_no: application.passport_no ?? "",
        passport_expiry: application.passport_expiry ?? "",
        visa_start: application.visa_start ?? "",
        visa_end: application.visa_end ?? "",
        visa_status: application.visa_status ?? "beklemede",
        visa_type: application.visa_type ?? "",
        country: application.country ?? "",
        appointment_date: application.appointment_date ?? "",
        appointment_time: application.appointment_time ?? "",
        pickup_date: application.pickup_date ?? "",
        travel_date: application.travel_date ?? "",
        consulate_fee: application.consulate_fee ?? 0,
        service_fee: application.service_fee ?? 0,
        currency: application.currency ?? "TL",
        invoice_status: application.invoice_status ?? "fatura_yok",
        invoice_date: application.invoice_date ?? "",
        invoice_number: application.invoice_number ?? "",
        payment_status: application.payment_status ?? "odenmedi",
        payment_date: application.payment_date ?? "",
        payment_method: application.payment_method ?? "",
        payment_note: application.payment_note ?? "",
        consulate_app_no: application.consulate_app_no ?? "",
        consulate_office: application.consulate_office ?? "",
        referral_id: application.referral_id
          ? String(application.referral_id)
          : "",
        visa_rejected: application.visa_rejected ?? false,
        notes: application.notes ?? "",
        assigned_user_id: application.assigned_user_id ?? "",
        assignment_note: application.assignment_note ?? "",
      });
    } else if (open && !application) {
      form.reset();
    }
  }, [open, application, form]);

  // ── Submit handler ───────────────────────────────────────────
  async function onSubmit(values: ApplicationFormValues) {
    setLoading(true);

    // Build the payload: convert empty strings to null for optional fields
    const payload: Record<string, unknown> = {
      full_name: values.full_name,
      id_number: values.id_number || null,
      date_of_birth: values.date_of_birth || null,
      phone: values.phone || null,
      email: values.email || null,
      company_id: values.company_id ? Number(values.company_id) : null,
      passport_no: values.passport_no || null,
      passport_expiry: values.passport_expiry || null,
      visa_start: values.visa_start || null,
      visa_end: values.visa_end || null,
      visa_status: values.visa_status || null,
      visa_type: values.visa_type || null,
      country: values.country || null,
      appointment_date: values.appointment_date || null,
      appointment_time: values.appointment_time || null,
      pickup_date: values.pickup_date || null,
      travel_date: values.travel_date || null,
      consulate_fee: values.consulate_fee || 0,
      service_fee: values.service_fee || 0,
      currency: values.currency || "TL",
      invoice_status: values.invoice_status || null,
      invoice_date: values.invoice_date || null,
      invoice_number: values.invoice_number || null,
      payment_status: values.payment_status || null,
      payment_date: values.payment_date || null,
      payment_method: values.payment_method || null,
      payment_note: values.payment_note || null,
      consulate_app_no: values.consulate_app_no || null,
      consulate_office: values.consulate_office || null,
      referral_id: values.referral_id ? Number(values.referral_id) : null,
      visa_rejected: values.visa_rejected ?? false,
      notes: values.notes || null,
      assigned_user_id: values.assigned_user_id || null,
      assignment_note: values.assignment_note || null,
    };

    try {
      if (isEdit && application) {
        const { error } = await supabase
          .from("applications")
          .update(payload)
          .eq("id", application.id);

        if (error) throw error;
        toast.success(t("updateSuccess"));
      } else {
        const { error } = await supabase.from("applications").insert(payload);

        if (error) throw error;
        toast.success(t("createSuccess"));
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Application save error:", err);
      toast.error(t("saveError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>
            {isEdit ? t("editApplication") : t("addNew")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("editDescription") : t("addDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <ScrollArea className="flex-1 px-6">
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="w-full flex-wrap h-auto">
                  <TabsTrigger value="personal">
                    {t("personalInfo")}
                  </TabsTrigger>
                  <TabsTrigger value="passport">
                    {t("passportVisaInfo")}
                  </TabsTrigger>
                  <TabsTrigger value="appointment">
                    {t("appointmentTravel")}
                  </TabsTrigger>
                  <TabsTrigger value="fee">{t("feeInfo")}</TabsTrigger>
                  <TabsTrigger value="consulate">
                    {t("consulateInfo")}
                  </TabsTrigger>
                  <TabsTrigger value="other">{t("other")}</TabsTrigger>
                </TabsList>

                {/* ── Tab 1: Personal Info ──────────────────────── */}
                <TabsContent value="personal" className="space-y-4 pt-4 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("fullName")} *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="id_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("idNumber")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("dateOfBirth")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("phone")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("email")}</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("company")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t("company")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {companies.map((c) => (
                                <SelectItem
                                  key={c.id}
                                  value={String(c.id)}
                                >
                                  {c.company_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* ── Tab 2: Passport & Visa ────────────────────── */}
                <TabsContent value="passport" className="space-y-4 pt-4 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="passport_no"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("passportNo")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="passport_expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("passportExpiry")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="visa_start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("visaStart")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="visa_end"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("visaEnd")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="visa_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("visaStatus")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beklemede">
                                {tVisa("pending")}
                              </SelectItem>
                              <SelectItem value="hazirlaniyor">
                                {tVisa("preparing")}
                              </SelectItem>
                              <SelectItem value="konsoloslukta">
                                {tVisa("atConsulate")}
                              </SelectItem>
                              <SelectItem value="vize_cikti">
                                {tVisa("approved")}
                              </SelectItem>
                              <SelectItem value="ret_oldu">
                                {tVisa("rejected")}
                              </SelectItem>
                              <SelectItem value="pasaport_teslim">
                                {tVisa("passportDelivered")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="visa_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("visaType")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder={tVisaType("select")}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="kultur">
                                {tVisaType("cultural")}
                              </SelectItem>
                              <SelectItem value="ticari">
                                {tVisaType("commercial")}
                              </SelectItem>
                              <SelectItem value="turistik">
                                {tVisaType("tourist")}
                              </SelectItem>
                              <SelectItem value="ziyaret">
                                {tVisaType("visit")}
                              </SelectItem>
                              <SelectItem value="diger">
                                {tVisaType("other")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* ── Tab 3: Appointment & Travel ───────────────── */}
                <TabsContent
                  value="appointment"
                  className="space-y-4 pt-4 pb-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("country")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="appointment_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("appointmentDate")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="appointment_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("appointmentTime")}</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pickup_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("pickupDate")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="travel_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("travelDate")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* ── Tab 4: Fee Info ───────────────────────────── */}
                <TabsContent value="fee" className="space-y-4 pt-4 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="consulate_fee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("consulateFee")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="service_fee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("serviceFee")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("currency")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="TL">TL</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="invoice_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("invoiceStatus")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="fatura_yok">
                                {tInvoice("none")}
                              </SelectItem>
                              <SelectItem value="fatura_var">
                                {tInvoice("exists")}
                              </SelectItem>
                              <SelectItem value="fatura_kesildi">
                                {tInvoice("issued")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="invoice_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("invoiceDate")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="invoice_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("invoiceNumber")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payment_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("paymentStatus")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="odenmedi">
                                {tPayment("unpaid")}
                              </SelectItem>
                              <SelectItem value="odendi">
                                {tPayment("paid")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payment_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("paymentDate")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("paymentMethod")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder={tPaymentMethod("select")}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="nakit">
                                {tPaymentMethod("cash")}
                              </SelectItem>
                              <SelectItem value="kredi_karti">
                                {tPaymentMethod("creditCard")}
                              </SelectItem>
                              <SelectItem value="havale_eft">
                                {tPaymentMethod("bankTransfer")}
                              </SelectItem>
                              <SelectItem value="sanal_pos">
                                {tPaymentMethod("virtualPos")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payment_note"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>{t("paymentNote")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* ── Tab 5: Consulate Info ─────────────────────── */}
                <TabsContent
                  value="consulate"
                  className="space-y-4 pt-4 pb-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="consulate_app_no"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("consulateAppNo")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="consulate_office"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("consulateOffice")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* ── Tab 6: Other ──────────────────────────────── */}
                <TabsContent value="other" className="space-y-4 pt-4 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="referral_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("reference")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t("reference")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {referrals.map((r) => (
                                <SelectItem
                                  key={r.id}
                                  value={String(r.id)}
                                >
                                  {r.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assigned_user_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("assignedUser")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder={t("assignedUser")}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {profiles.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="visa_rejected"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-3 space-y-0 sm:col-span-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t("visaRejected")}
                          </FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>{t("notes")}</FormLabel>
                          <FormControl>
                            <Textarea rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assignment_note"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>{t("assignmentNote")}</FormLabel>
                          <FormControl>
                            <Textarea rows={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>

            {/* ── Footer ──────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {tCommon("save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
