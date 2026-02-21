"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { HotelRow } from "@/app/[locale]/(app)/booking-templates/page";

const bookingSchema = z.object({
  hotel_id: z.string().min(1, "Required"),
  guest_name: z.string().min(1, "Required"),
  confirmation_number: z.string().min(1, "Required"),
  pin_code: z.string().min(1, "Required"),
  checkin_date: z.string().min(1, "Required"),
  checkout_date: z.string().min(1, "Required"),
  num_guests: z.coerce.number().int().min(1).max(50),
  daily_price_eur: z.coerce.number().min(0),
});

type BookingFormValues = z.output<typeof bookingSchema>;

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotels: HotelRow[];
  defaultHotel?: HotelRow;
}

export function CreateBookingDialog({
  open,
  onOpenChange,
  hotels,
  defaultHotel,
}: CreateBookingDialogProps) {
  const t = useTranslations("createBooking");
  const tCommon = useTranslations("common");

  const [eurToTry, setEurToTry] = React.useState<number>(38);
  const [eurToDkk, setEurToDkk] = React.useState<number>(7.5);
  const [manualTry, setManualTry] = React.useState("");
  const [manualDkk, setManualDkk] = React.useState("");
  const [ratesLoading, setRatesLoading] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);

  const form = useForm<BookingFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(bookingSchema) as any,
    defaultValues: {
      hotel_id: defaultHotel?.id ?? "",
      guest_name: "",
      confirmation_number: "5087.509.967",
      pin_code: "0751",
      checkin_date: "",
      checkout_date: "",
      num_guests: 1,
      daily_price_eur: 0,
    },
  });

  const watchedValues = form.watch();

  // Reset form when dialog opens / defaultHotel changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        hotel_id: defaultHotel?.id ?? "",
        guest_name: "",
        confirmation_number: "5087.509.967",
        pin_code: "0751",
        checkin_date: "",
        checkout_date: "",
        num_guests: 1,
        daily_price_eur: 0,
      });
      setManualTry("");
      setManualDkk("");
    }
  }, [open, defaultHotel, form]);

  // Fetch FX rates on open
  React.useEffect(() => {
    if (!open) return;
    setRatesLoading(true);
    fetch("/api/create-booking?action=rates")
      .then((r) => r.json())
      .then((data) => {
        if (data.EUR_TRY) setEurToTry(data.EUR_TRY);
        if (data.EUR_DKK) setEurToDkk(data.EUR_DKK);
      })
      .catch(() => {
        /* keep fallback defaults */
      })
      .finally(() => setRatesLoading(false));
  }, [open]);

  // Derived calculations
  const { nights, totalEur, totalTry, totalDkk, refundAmountTl } =
    React.useMemo(() => {
      const { checkin_date, checkout_date, num_guests, daily_price_eur } =
        watchedValues;
      if (!checkin_date || !checkout_date) {
        return {
          nights: 0,
          totalEur: 0,
          totalTry: 0,
          totalDkk: 0,
          refundAmountTl: 0,
        };
      }
      const ci = new Date(checkin_date);
      const co = new Date(checkout_date);
      const n = Math.max(
        0,
        Math.round((co.getTime() - ci.getTime()) / 86400000)
      );
      const eur = (daily_price_eur || 0) * (num_guests || 1) * n;
      const tryRate = parseFloat(manualTry) || eurToTry;
      const dkkRate = parseFloat(manualDkk) || eurToDkk;
      const tl = eur * tryRate;
      return {
        nights: n,
        totalEur: eur,
        totalTry: tl,
        totalDkk: eur * dkkRate,
        refundAmountTl: Math.round(tl),
      };
    }, [watchedValues, manualTry, manualDkk, eurToTry, eurToDkk]);

  async function onSubmit(values: BookingFormValues) {
    const selectedHotel = hotels.find((h) => h.id === values.hotel_id);
    if (selectedHotel && !selectedHotel.template_path) {
      toast.error(t("noHotelTemplate"));
      return;
    }

    setGenerating(true);
    try {
      const resp = await fetch("/api/create-booking?action=generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel_id: values.hotel_id,
          guest_name: values.guest_name,
          confirmation_number: values.confirmation_number,
          pin_code: values.pin_code,
          checkin_date: values.checkin_date,
          checkout_date: values.checkout_date,
          num_guests: values.num_guests,
          refund_amount_tl: refundAmountTl,
          price_total_tl: Math.round(totalTry),
          price_total_dkk: Math.round(totalDkk),
        }),
      });

      const result = await resp.json();

      if (!resp.ok || result.error) {
        toast.error(result.error || t("error"));
        return;
      }

      // Decode base64 → Blob → download/open
      const bytes = Uint8Array.from(atob(result.pdf_base64), (c) =>
        c.charCodeAt(0)
      );
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = `booking-${values.guest_name.replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);

      toast.success(t("success"));
    } catch (err) {
      console.error("Booking generation error:", err);
      toast.error(t("error"));
    } finally {
      setGenerating(false);
    }
  }

  const activeHotels = hotels.filter((h) => h.is_active && h.template_path);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <ScrollArea className="flex-1">
              <div className="space-y-4 px-6 py-4">
                {/* Hotel selection */}
                <FormField
                  control={form.control}
                  name="hotel_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("selectHotel")} *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectHotel")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeHotels.map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              {h.country ? `${h.country} — ` : ""}
                              {h.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Guest name */}
                <FormField
                  control={form.control}
                  name="guest_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("guestName")} *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Confirmation number */}
                  <FormField
                    control={form.control}
                    name="confirmation_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("confirmationNumber")} *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* PIN code */}
                  <FormField
                    control={form.control}
                    name="pin_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("pinCode")} *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Check-in date */}
                  <FormField
                    control={form.control}
                    name="checkin_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("checkinDate")} *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Check-out date */}
                  <FormField
                    control={form.control}
                    name="checkout_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("checkoutDate")} *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Number of guests */}
                  <FormField
                    control={form.control}
                    name="num_guests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("numGuests")} *</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={50} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Daily price EUR */}
                  <FormField
                    control={form.control}
                    name="daily_price_eur"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("dailyPriceEur")} *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* FX Rates section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-sm font-medium">{t("fxRates")}</p>
                    {ratesLoading && (
                      <Loader2 className="size-3 animate-spin text-muted-foreground" />
                    )}
                    {!ratesLoading && (
                      <Badge variant="outline" className="text-xs">
                        {t("liveRate")}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        {t("eurToTry")}
                      </label>
                      <Input
                        placeholder={eurToTry.toFixed(2)}
                        value={manualTry}
                        onChange={(e) => setManualTry(e.target.value)}
                        type="number"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        {t("eurToDkk")}
                      </label>
                      <Input
                        placeholder={eurToDkk.toFixed(2)}
                        value={manualDkk}
                        onChange={(e) => setManualDkk(e.target.value)}
                        type="number"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Calculated summary */}
                <div>
                  <p className="text-sm font-medium mb-3">
                    {t("calculatedFields")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">{t("nights")}</span>
                    <span className="font-mono font-medium">
                      {nights} {t("nightsUnit")}
                    </span>
                    <span className="text-muted-foreground">
                      {t("totalEur")}
                    </span>
                    <span className="font-mono font-medium">
                      &euro;{totalEur.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      {t("totalTry")}
                    </span>
                    <span className="font-mono font-medium">
                      &#8378;
                      {totalTry.toLocaleString("tr-TR", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <span className="text-muted-foreground">
                      {t("totalDkk")}
                    </span>
                    <span className="font-mono font-medium">
                      DKK {totalDkk.toFixed(2)}
                    </span>
                  </div>
                </div>
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
              <Button type="submit" disabled={generating || nights <= 0}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("generating")}
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 size-4" />
                    {t("generate")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
