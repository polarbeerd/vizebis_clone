"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { ChevronDown, Loader2, Upload } from "lucide-react";
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
  type: z.enum(["individual", "group"]).default("individual"),
  is_active: z.boolean().default(true),
});

type HotelFormValues = z.output<typeof hotelSchema>;

const DEFAULT_EDIT_CONFIG: Record<string, unknown> = {
  column_centers: { checkin: 364.9, checkout: 448.0, nights: 545.5 },
  font_names: {
    bold: ["/TT0", "/TT9", "/TT12"],
    italic: ["/TT13"],
    regular: ["/TT3", "/TT4"],
  },
  patterns: {
    // "refund_tl_amount": { "old_text": "12345", "context": "TL" },
    // "num_guests": { "old_text": "1", "context": "guest" }
  },
};

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
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [editConfigJson, setEditConfigJson] = React.useState("");
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
      type: "individual",
      is_active: true,
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
        type: (hotel.type as "individual" | "group") ?? "individual",
        is_active: hotel.is_active ?? true,
      });
      setEditConfigJson(
        JSON.stringify(hotel.edit_config ?? DEFAULT_EDIT_CONFIG, null, 2)
      );
      setPdfFile(null);
    } else if (open && !hotel) {
      form.reset();
      setEditConfigJson(JSON.stringify(DEFAULT_EDIT_CONFIG, null, 2));
      setPdfFile(null);
    }
  }, [open, hotel, form]);

  async function uploadPdf(hotelId: string): Promise<string | null> {
    if (!pdfFile) return null;

    const filePath = `${hotelId}.pdf`;

    const { error } = await supabase.storage
      .from("booking-templates")
      .upload(filePath, pdfFile, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (error) {
      console.error("PDF upload error:", error);
      toast.error(t("uploadError"));
      return null;
    }

    toast.success(t("uploadSuccess"));
    return filePath;
  }

  function parseEditConfig(): Record<string, unknown> {
    try {
      return JSON.parse(editConfigJson);
    } catch {
      return DEFAULT_EDIT_CONFIG;
    }
  }

  async function onSubmit(values: HotelFormValues) {
    setLoading(true);

    const editConfig = parseEditConfig();

    try {
      if (isEdit && hotel) {
        // Update hotel record
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
          type: values.type,
          is_active: values.is_active,
          edit_config: editConfig,
        };

        // Upload PDF if a new file was selected
        if (pdfFile) {
          const templatePath = await uploadPdf(hotel.id);
          if (templatePath) {
            payload.template_path = templatePath;
          }
        }

        const { error } = await supabase
          .from("booking_hotels")
          .update(payload)
          .eq("id", hotel.id);

        if (error) throw error;
        toast.success(t("saveSuccess"));
      } else {
        // Insert new hotel record
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
          type: values.type,
          is_active: values.is_active,
          edit_config: editConfig,
          template_path: "",
        };

        const { data: inserted, error } = await supabase
          .from("booking_hotels")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;

        // Upload PDF if provided
        if (pdfFile && inserted) {
          const templatePath = await uploadPdf(inserted.id);
          if (templatePath) {
            await supabase
              .from("booking_hotels")
              .update({ template_path: templatePath })
              .eq("id", inserted.id);
          }
        }

        toast.success(t("saveSuccess"));
      }

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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
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

                {/* Street Address */}
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

                {/* Postal Code + City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal code</FormLabel>
                        <FormControl>
                          <Input placeholder="2300" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Copenhagen" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("email")} *</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone Country Code */}
                  <FormField
                    control={form.control}
                    name="phone_country_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone country code</FormLabel>
                        <FormControl>
                          <Input placeholder="0045" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone (without country code) */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (without country code) *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Website */}
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("website")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>

                {/* Active toggle */}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
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
                        <span className="text-sm font-medium">
                          {pdfFile.name}
                        </span>
                      ) : hotel?.template_path ? (
                        <span className="text-muted-foreground text-sm">
                          {hotel.template_path} &mdash; {t("uploadPdf")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {t("uploadPdf")}
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setPdfFile(file);
                    }}
                  />
                </div>

                {/* Advanced: PDF Edit Config */}
                <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between"
                    >
                      {t("editConfig")}
                      <ChevronDown
                        className={`size-4 transition-transform ${
                          configOpen ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <Textarea
                      rows={10}
                      className="font-mono text-sm"
                      value={editConfigJson}
                      onChange={(e) => setEditConfigJson(e.target.value)}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

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
