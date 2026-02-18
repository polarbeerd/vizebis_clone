"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

// Schema
const appointmentSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  passport_no: z.string().default(""),
  id_number: z.string().default(""),
  date_of_birth: z.string().default(""),
  email: z.string().default(""),
  passport_expiry: z.string().default(""),
  company_name: z.string().default(""),
  country: z.string().default(""),
  visa_type: z.string().default(""),
  travel_date: z.string().default(""),
  appointment_date: z.string().default(""),
  payment_status: z.string().default("beklemede"),
  notes: z.string().default(""),
  passport_photo: z.string().default(""),
});

type AppointmentFormValues = z.output<typeof appointmentSchema>;

// Types
export interface AppointmentForForm {
  id: number;
  full_name?: string | null;
  passport_no?: string | null;
  id_number?: string | null;
  date_of_birth?: string | null;
  email?: string | null;
  passport_expiry?: string | null;
  company_name?: string | null;
  country?: string | null;
  visa_type?: string | null;
  travel_date?: string | null;
  appointment_date?: string | null;
  payment_status?: string | null;
  notes?: string | null;
  passport_photo?: string | null;
}

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: AppointmentForForm;
  onSuccess: () => void;
}

export function AppointmentForm({
  open,
  onOpenChange,
  appointment,
  onSuccess,
}: AppointmentFormProps) {
  const t = useTranslations("appointments");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [loading, setLoading] = React.useState(false);
  const [visaTypeOptions, setVisaTypeOptions] = React.useState<Array<{ value: string; label_en: string; label_tr: string }>>([]);
  const isEdit = !!appointment;
  const supabase = React.useMemo(() => createClient(), []);

  const form = useForm<AppointmentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(appointmentSchema) as any,
    defaultValues: {
      full_name: "",
      passport_no: "",
      id_number: "",
      date_of_birth: "",
      email: "",
      passport_expiry: "",
      company_name: "",
      country: "",
      visa_type: "",
      travel_date: "",
      appointment_date: "",
      payment_status: "beklemede",
      notes: "",
      passport_photo: "",
    },
  });

  // Fetch visa types on open
  React.useEffect(() => {
    if (!open) return;
    supabase
      .from("visa_types")
      .select("value, label_en, label_tr")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setVisaTypeOptions(data);
      });
  }, [open, supabase]);

  // Pre-fill form when editing
  React.useEffect(() => {
    if (open && appointment) {
      form.reset({
        full_name: appointment.full_name ?? "",
        passport_no: appointment.passport_no ?? "",
        id_number: appointment.id_number ?? "",
        date_of_birth: appointment.date_of_birth ?? "",
        email: appointment.email ?? "",
        passport_expiry: appointment.passport_expiry ?? "",
        company_name: appointment.company_name ?? "",
        country: appointment.country ?? "",
        visa_type: appointment.visa_type ?? "",
        travel_date: appointment.travel_date ?? "",
        appointment_date: appointment.appointment_date ?? "",
        payment_status: appointment.payment_status ?? "beklemede",
        notes: appointment.notes ?? "",
        passport_photo: appointment.passport_photo ?? "",
      });
    } else if (open && !appointment) {
      form.reset();
    }
  }, [open, appointment, form]);

  async function onSubmit(values: AppointmentFormValues) {
    setLoading(true);

    const payload: Record<string, unknown> = {
      full_name: values.full_name,
      passport_no: values.passport_no || null,
      id_number: values.id_number || null,
      date_of_birth: values.date_of_birth || null,
      email: values.email || null,
      passport_expiry: values.passport_expiry || null,
      company_name: values.company_name || null,
      country: values.country || null,
      visa_type: values.visa_type || null,
      travel_date: values.travel_date || null,
      appointment_date: values.appointment_date || null,
      payment_status: values.payment_status || "beklemede",
      notes: values.notes || null,
      passport_photo: values.passport_photo || null,
    };

    try {
      if (isEdit && appointment) {
        const { error } = await supabase
          .from("appointments")
          .update(payload)
          .eq("id", appointment.id);

        if (error) throw error;
        toast.success(t("updateSuccess"));
      } else {
        const { error } = await supabase.from("appointments").insert(payload);

        if (error) throw error;
        toast.success(t("createSuccess"));
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Appointment save error:", err);
      toast.error(t("saveError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>
            {isEdit ? t("editAppointment") : t("addNew")}
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
            <ScrollArea className="flex-1 px-6 py-4">
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
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("companyName")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                              placeholder={t("visaType")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {visaTypeOptions.map((vt) => (
                            <SelectItem key={vt.value} value={vt.value}>
                              {locale === "tr" ? vt.label_tr : vt.label_en}
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
                          <SelectItem value="beklemede">
                            {t("pending")}
                          </SelectItem>
                          <SelectItem value="odendi">
                            {t("paid")}
                          </SelectItem>
                          <SelectItem value="iptal">
                            {t("cancelled")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="passport_photo"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>{t("passportPhoto")}</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="URL or file path"
                          {...field}
                        />
                      </FormControl>
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
              </div>
            </ScrollArea>

            {/* Footer */}
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
