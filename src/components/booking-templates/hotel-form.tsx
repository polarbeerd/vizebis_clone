"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { ChevronDown, Loader2 } from "lucide-react";
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
  price_per_night_eur: z.coerce.number().min(0).default(0),
  type: z.enum(["individual", "group"]).default("individual"),
  is_active: z.boolean().default(true),
  // hotel_config fields for PDF generation
  hotel_name_pdf: z.string().default(""),
  hotel_address_pdf: z.string().default(""),
  hotel_phone_pdf: z.string().default(""),
  hotel_gps: z.string().default(""),
  layout: z.enum(["no_visuals", "photo_only", "photo_and_map", "photo_map_side_by_side"]).default("no_visuals"),
  photo_path: z.string().default(""),
  map_path: z.string().default(""),
  checkin_time: z.string().default("15:00 - 00:00"),
  checkout_time: z.string().default("until 12:00"),
  room_type: z.string().default("Standard Room"),
  meal_plan: z.string().default("There is no meal option with this room."),
  amenities: z.string().default(""),
  bed_size: z.string().default("1 large double bed (151-180cm wide)"),
  prepayment: z.string().default("No prepayment is needed."),
  cancel_days_before: z.coerce.number().min(0).default(3),
  cancel_time: z.string().default("11:59 PM"),
  cancel_policy_note: z.string().default("Changing the dates of your stay is not possible."),
  payment_handles_text: z.string().default(""),
  payment_accepts_text: z.string().default(""),
  currency_note: z.string().default(""),
  additional_info: z.string().default(""),
  important_info: z.string().default(""),
  parking_policy: z.string().default(""),
  wifi_policy: z.string().default(""),
  page2_contact_text: z.string().default(""),
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
  const [pdfConfigOpen, setPdfConfigOpen] = React.useState(false);
  const [countries, setCountries] = React.useState<CountryOption[]>([]);

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
      hotel_name_pdf: "",
      hotel_address_pdf: "",
      hotel_phone_pdf: "",
      hotel_gps: "",
      layout: "no_visuals",
      photo_path: "",
      map_path: "",
      checkin_time: "15:00 - 00:00",
      checkout_time: "until 12:00",
      room_type: "Standard Room",
      meal_plan: "There is no meal option with this room.",
      amenities: "",
      bed_size: "1 large double bed (151-180cm wide)",
      prepayment: "No prepayment is needed.",
      cancel_days_before: 3,
      cancel_time: "11:59 PM",
      cancel_policy_note: "Changing the dates of your stay is not possible.",
      payment_handles_text: "",
      payment_accepts_text: "",
      currency_note: "",
      additional_info: "",
      important_info: "",
      parking_policy: "",
      wifi_policy: "",
      page2_contact_text: "",
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
        // hotel_config fields
        hotel_name_pdf: (cfg?.hotel_name as string) ?? "",
        hotel_address_pdf: (cfg?.hotel_address as string) ?? "",
        hotel_phone_pdf: (cfg?.hotel_phone as string) ?? "",
        hotel_gps: (cfg?.gps as string) ?? "",
        layout: (cfg?.layout as "no_visuals" | "photo_only" | "photo_and_map" | "photo_map_side_by_side") ?? "no_visuals",
        photo_path: (cfg?.photo_path as string) ?? "",
        map_path: (cfg?.map_path as string) ?? "",
        checkin_time: (cfg?.checkin_time as string) ?? "15:00 - 00:00",
        checkout_time: (cfg?.checkout_time as string) ?? "until 12:00",
        room_type: (cfg?.room_type as string) ?? "Standard Room",
        meal_plan: (cfg?.meal_plan as string) ?? "There is no meal option with this room.",
        amenities: (cfg?.amenities as string) ?? "",
        bed_size: (cfg?.bed_size as string) ?? "1 large double bed (151-180cm wide)",
        prepayment: (cfg?.prepayment as string) ?? "No prepayment is needed.",
        cancel_days_before: Number(cfg?.cancel_days_before) || 3,
        cancel_time: (cfg?.cancel_time as string) ?? "11:59 PM",
        cancel_policy_note: (cfg?.cancel_policy_note as string) ?? "Changing the dates of your stay is not possible.",
        payment_handles_text: (cfg?.payment_handles_text as string) ?? "",
        payment_accepts_text: (cfg?.payment_accepts_text as string) ?? "",
        currency_note: (cfg?.currency_note as string) ?? "",
        additional_info: (cfg?.additional_info as string) ?? "",
        important_info: (cfg?.important_info as string) ?? "",
        parking_policy: (cfg?.parking_policy as string) ?? "",
        wifi_policy: (cfg?.wifi_policy as string) ?? "",
        page2_contact_text: (cfg?.page2_contact_text as string) ?? "",
      });
    } else if (open && !hotel) {
      form.reset();
    }
  }, [open, hotel, form]);

  function buildHotelConfig(values: HotelFormValues): Record<string, unknown> {
    return {
      hotel_name: values.hotel_name_pdf || values.name,
      hotel_address: values.hotel_address_pdf || values.address,
      hotel_phone: values.hotel_phone_pdf || values.phone,
      gps: values.hotel_gps,
      layout: values.layout,
      photo_path: values.photo_path,
      map_path: values.map_path,
      checkin_time: values.checkin_time,
      checkout_time: values.checkout_time,
      room_type: values.room_type,
      meal_plan: values.meal_plan,
      amenities: values.amenities,
      bed_size: values.bed_size,
      prepayment: values.prepayment,
      cancel_days_before: values.cancel_days_before,
      cancel_time: values.cancel_time,
      cancel_policy_note: values.cancel_policy_note,
      payment_handles_text: values.payment_handles_text,
      payment_accepts_text: values.payment_accepts_text,
      currency_note: values.currency_note,
      additional_info: values.additional_info,
      important_info: values.important_info,
      parking_policy: values.parking_policy,
      wifi_policy: values.wifi_policy,
      page2_contact_text: values.page2_contact_text,
    };
  }

  async function onSubmit(values: HotelFormValues) {
    setLoading(true);

    const hotelConfig = buildHotelConfig(values);

    try {
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
        photo_path: values.photo_path || null,
        map_path: values.map_path || null,
      };

      if (isEdit && hotel) {
        const { error } = await supabase
          .from("booking_hotels")
          .update(payload)
          .eq("id", hotel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("booking_hotels")
          .insert(payload);
        if (error) throw error;
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

                {/* Price Per Night (EUR) */}
                <FormField
                  control={form.control}
                  name="price_per_night_eur"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("pricePerNight")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                {/* ========== PDF Config Section ========== */}
                <Collapsible open={pdfConfigOpen} onOpenChange={setPdfConfigOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between"
                    >
                      PDF Configuration
                      <ChevronDown
                        className={`size-4 transition-transform ${
                          pdfConfigOpen ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 space-y-4">
                    {/* Layout */}
                    <FormField
                      control={form.control}
                      name="layout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Layout variant</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="no_visuals">No visuals</SelectItem>
                              <SelectItem value="photo_only">Photo only</SelectItem>
                              <SelectItem value="photo_and_map">Photo + Map (stacked)</SelectItem>
                              <SelectItem value="photo_map_side_by_side">Photo + Map (side by side)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {/* Image paths */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="photo_path"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Photo path (hotel-assets bucket)</FormLabel>
                            <FormControl>
                              <Input placeholder="wakeup/photo.png" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="map_path"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Map path (hotel-assets bucket)</FormLabel>
                            <FormControl>
                              <Input placeholder="wakeup/map.png" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* PDF hotel name override */}
                    <FormField
                      control={form.control}
                      name="hotel_name_pdf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hotel name (PDF) — leave empty to use hotel name above</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* PDF address + phone + GPS */}
                    <FormField
                      control={form.control}
                      name="hotel_address_pdf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full address (PDF)</FormLabel>
                          <FormControl>
                            <Input placeholder="Bernstorffsgade 35, 1577 Copenhagen, Denmark" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="hotel_phone_pdf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (PDF)</FormLabel>
                            <FormControl>
                              <Input placeholder="+45 44 80 00 00" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hotel_gps"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GPS coordinates</FormLabel>
                            <FormControl>
                              <Input placeholder="N 55° 40.122, E 12° 34.334" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Check-in/out times */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="checkin_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Check-in time</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="checkout_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Check-out time</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Room details */}
                    <FormField
                      control={form.control}
                      name="room_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room type</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="meal_plan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meal plan</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bed_size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bed size</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amenities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amenities (use * or bullet separator)</FormLabel>
                          <FormControl>
                            <Textarea rows={3} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Cancellation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <FormField
                        control={form.control}
                        name="cancel_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cancel deadline time</FormLabel>
                            <FormControl>
                              <Input placeholder="11:59 PM" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="prepayment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prepayment policy</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cancel_policy_note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cancellation policy note</FormLabel>
                          <FormControl>
                            <Textarea rows={2} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Payment */}
                    <FormField
                      control={form.control}
                      name="payment_handles_text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment handles text</FormLabel>
                          <FormControl>
                            <Input placeholder="Hotel Name handles all payments." {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payment_accepts_text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment accepts text</FormLabel>
                          <FormControl>
                            <Textarea rows={2} placeholder="This property accepts: Visa, Mastercard..." {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currency_note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency / exchange note</FormLabel>
                          <FormControl>
                            <Textarea rows={2} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Additional / Important info */}
                    <FormField
                      control={form.control}
                      name="additional_info"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional information</FormLabel>
                          <FormControl>
                            <Textarea rows={3} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="important_info"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Important information</FormLabel>
                          <FormControl>
                            <Textarea rows={3} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Policies */}
                    <FormField
                      control={form.control}
                      name="parking_policy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parking policy</FormLabel>
                          <FormControl>
                            <Textarea rows={2} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="wifi_policy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WiFi policy</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Page 2 */}
                    <FormField
                      control={form.control}
                      name="page2_contact_text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Page 2 contact text</FormLabel>
                          <FormControl>
                            <Textarea rows={2} placeholder="For any questions..." {...field} />
                          </FormControl>
                        </FormItem>
                      )}
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
