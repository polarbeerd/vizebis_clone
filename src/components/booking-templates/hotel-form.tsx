"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { ChevronDown, Loader2, Upload, Sparkles } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { HotelRow } from "@/app/[locale]/(app)/booking-templates/page";

const PDF_SERVICE_URL = process.env.NEXT_PUBLIC_PDF_SERVICE_URL || process.env.PDF_SERVICE_URL || "http://localhost:8000";

// Schema
const hotelSchema = z.object({
  name: z.string().min(1, "Hotel name is required"),
  country: z.string().min(1, "Country is required"),
  address: z.string().min(1, "Address is required"),
  postal_code: z.string().default(""),
  city: z.string().default(""),
  email: z.string().email("Valid email required"),
  phone_country_code: z.string().default(""),
  phone: z.string().min(1, "Phone is required"),
  website: z.string().default(""),
  price_per_night_eur: z.coerce.number().min(0).default(0),
  type: z.enum(["individual", "group"]).default("individual"),
  is_active: z.boolean().default(true),
  cancel_days_before: z.coerce.number().min(0).default(3),
});

type HotelFormValues = z.output<typeof hotelSchema>;

interface CountryOption {
  name: string;
  flag_emoji: string | null;
}

interface HotelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotel?: HotelRow;
  onSuccess: () => void;
}

export function HotelForm({
  open,
  onOpenChange,
  hotel,
  onSuccess,
}: HotelFormProps) {
  const t = useTranslations("bookingTemplates");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = React.useState(false);
  const [detecting, setDetecting] = React.useState(false);
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [fieldMapping, setFieldMapping] = React.useState<Record<string, string>>({});
  const [fieldMappingJson, setFieldMappingJson] = React.useState("");
  const [configOpen, setConfigOpen] = React.useState(false);
  const [countries, setCountries] = React.useState<CountryOption[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isEdit = !!hotel;
  const supabase = React.useMemo(() => createClient(), []);

  const form = useForm<HotelFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(hotelSchema) as any,
    defaultValues: {
      name: "",
      country: "",
      address: "",
      postal_code: "",
      city: "",
      email: "",
      phone_country_code: "",
      phone: "",
      website: "",
      price_per_night_eur: 0,
      type: "individual",
      is_active: true,
      cancel_days_before: 3,
    },
  });

  // Fetch countries
  React.useEffect(() => {
    if (!open) return;
    supabase
      .from("countries")
      .select("name, flag_emoji")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setCountries((data ?? []) as CountryOption[]);
      });
  }, [open, supabase]);

  // Pre-fill form when editing
  React.useEffect(() => {
    if (open && hotel) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg = (hotel as any).hotel_config as Record<string, unknown> | undefined;
      const mapping = (cfg?.field_mapping as Record<string, string>) ?? {};

      form.reset({
        name: hotel.name ?? "",
        country: hotel.country ?? "",
        address: hotel.address ?? "",
        postal_code: hotel.postal_code ?? "",
        city: hotel.city ?? "",
        email: hotel.email ?? "",
        phone_country_code: hotel.phone_country_code ?? "",
        phone: hotel.phone ?? "",
        website: hotel.website ?? "",
        price_per_night_eur: hotel.price_per_night_eur ?? 0,
        type: (hotel.type as "individual" | "group") ?? "individual",
        is_active: hotel.is_active ?? true,
        cancel_days_before: Number(cfg?.cancel_days_before) || 3,
      });
      setFieldMapping(mapping);
      setFieldMappingJson(JSON.stringify(mapping, null, 2));
      setPdfFile(null);
    } else if (open && !hotel) {
      form.reset();
      setFieldMapping({});
      setFieldMappingJson("{}");
      setPdfFile(null);
    }
  }, [open, hotel, form]);

  async function uploadPdf(hotelId: string): Promise<string | null> {
    if (!pdfFile) return null;
    const filePath = `${hotelId}.pdf`;
    const { error } = await supabase.storage
      .from("booking-templates")
      .upload(filePath, pdfFile, { upsert: true, contentType: "application/pdf" });
    if (error) {
      console.error("PDF upload error:", error);
      toast.error(t("uploadError"));
      return null;
    }
    return filePath;
  }

  async function handleAutoDetect() {
    if (!pdfFile) {
      toast.error("Upload a PDF first");
      return;
    }
    setDetecting(true);
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      const resp = await fetch("/api/detect-fields", {
        method: "POST",
        body: formData,
      });
      const result = await resp.json();

      if (result.status === "success" && result.field_mapping) {
        setFieldMapping(result.field_mapping);
        setFieldMappingJson(JSON.stringify(result.field_mapping, null, 2));
        setConfigOpen(true);
        toast.success(`Detected ${Object.keys(result.field_mapping).length} fields`);
      } else {
        toast.error(result.error || "Detection failed");
      }
    } catch (err) {
      console.error("Auto-detect error:", err);
      toast.error("Auto-detect failed");
    } finally {
      setDetecting(false);
    }
  }

  function parseFieldMapping(): Record<string, string> {
    try {
      return JSON.parse(fieldMappingJson);
    } catch {
      return fieldMapping;
    }
  }

  async function onSubmit(values: HotelFormValues) {
    setLoading(true);

    const mapping = parseFieldMapping();
    const hotelConfig: Record<string, unknown> = {
      field_mapping: mapping,
      cancel_days_before: values.cancel_days_before,
    };

    try {
      if (isEdit && hotel) {
        const payload: Record<string, unknown> = {
          name: values.name,
          country: values.country,
          address: values.address,
          postal_code: values.postal_code || null,
          city: values.city || null,
          email: values.email,
          phone_country_code: values.phone_country_code || null,
          phone: values.phone,
          website: values.website || null,
          price_per_night_eur: values.price_per_night_eur,
          type: values.type,
          is_active: values.is_active,
          hotel_config: hotelConfig,
        };

        if (pdfFile) {
          const templatePath = await uploadPdf(hotel.id);
          if (templatePath) payload.template_path = templatePath;
        }

        const { error } = await supabase
          .from("booking_hotels")
          .update(payload)
          .eq("id", hotel.id);
        if (error) throw error;
      } else {
        const payload: Record<string, unknown> = {
          name: values.name,
          country: values.country,
          address: values.address,
          postal_code: values.postal_code || null,
          city: values.city || null,
          email: values.email,
          phone_country_code: values.phone_country_code || null,
          phone: values.phone,
          website: values.website || null,
          price_per_night_eur: values.price_per_night_eur,
          type: values.type,
          is_active: values.is_active,
          hotel_config: hotelConfig,
          template_path: "",
        };

        const { data: inserted, error } = await supabase
          .from("booking_hotels")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;

        if (pdfFile && inserted) {
          const templatePath = await uploadPdf(inserted.id);
          if (templatePath) {
            await supabase
              .from("booking_hotels")
              .update({ template_path: templatePath })
              .eq("id", inserted.id);
          }
        }
      }

      toast.success(t("saveSuccess"));
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Hotel save error:", err);
      toast.error(tCommon("save") + " error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>
            {isEdit ? t("editHotel") : t("addHotel")}
          </DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 px-6 py-4">
                {/* Hotel Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("hotelName")} *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Country */}
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("country")} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectCountry")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c.name} value={c.name}>
                              {c.flag_emoji ? `${c.flag_emoji} ` : ""}{c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street address *</FormLabel>
                      <FormControl>
                        <Textarea rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Postal + City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal code</FormLabel>
                        <FormControl><Input placeholder="2300" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input placeholder="Copenhagen" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Email + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("email")} *</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Price + Cancel days */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price_per_night_eur"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("pricePerNight")}</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step="0.01" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cancel_days_before"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cancel days before check-in</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Active */}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">
                        {field.value ? t("active") : t("inactive")}
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {/* PDF Template Upload */}
                <div className="space-y-2">
                  <FormLabel>{t("pdfTemplate")}</FormLabel>
                  <div
                    className="flex items-center gap-3 rounded-lg border border-dashed p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="text-muted-foreground size-5" />
                    <div className="flex-1">
                      {pdfFile ? (
                        <span className="text-sm font-medium">{pdfFile.name}</span>
                      ) : hotel?.template_path ? (
                        <span className="text-muted-foreground text-sm">
                          {hotel.template_path} &mdash; {t("uploadPdf")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">{t("uploadPdf")}</span>
                      )}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                {/* Auto-detect button */}
                {pdfFile && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAutoDetect}
                    disabled={detecting}
                    className="w-full"
                  >
                    {detecting ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 size-4" />
                    )}
                    {detecting ? "Detecting fields..." : "Auto-detect fields with AI"}
                  </Button>
                )}

                {/* Field mapping (collapsible JSON editor) */}
                <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                      Field Mapping ({Object.keys(parseFieldMapping()).length} fields)
                      <ChevronDown className={`size-4 transition-transform ${configOpen ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <Textarea
                      rows={15}
                      className="font-mono text-xs"
                      value={fieldMappingJson}
                      onChange={(e) => setFieldMappingJson(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      AI-detected field mapping. Each key is a field name, each value is the exact text found in the template PDF.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
