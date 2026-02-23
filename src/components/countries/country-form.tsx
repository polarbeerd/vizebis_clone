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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Schema
const countrySchema = z.object({
  name: z.string().min(1, "Country name is required"),
  flag_emoji: z.string().default(""),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().default(0),
  service_fee: z.coerce.number().min(0).default(0),
  consulate_fee: z.coerce.number().min(0).default(0),
  currency: z.string().default("EUR"),
});

type CountryFormValues = z.output<typeof countrySchema>;

export interface CountryForForm {
  id: number;
  name?: string | null;
  flag_emoji?: string | null;
  is_active?: boolean;
  sort_order?: number;
  service_fee?: number;
  consulate_fee?: number;
  currency?: string;
}

interface CountryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country?: CountryForForm;
  onSuccess: () => void;
}

export function CountryForm({
  open,
  onOpenChange,
  country,
  onSuccess,
}: CountryFormProps) {
  const t = useTranslations("countries");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = React.useState(false);
  const isEdit = !!country;
  const supabase = React.useMemo(() => createClient(), []);

  const form = useForm<CountryFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(countrySchema) as any,
    defaultValues: {
      name: "",
      flag_emoji: "",
      is_active: true,
      sort_order: 0,
      service_fee: 0,
      consulate_fee: 0,
      currency: "EUR",
    },
  });

  // Pre-fill form when editing
  React.useEffect(() => {
    if (open && country) {
      form.reset({
        name: country.name ?? "",
        flag_emoji: country.flag_emoji ?? "",
        is_active: country.is_active ?? true,
        sort_order: country.sort_order ?? 0,
        service_fee: country.service_fee ?? 0,
        consulate_fee: country.consulate_fee ?? 0,
        currency: country.currency ?? "EUR",
      });
    } else if (open && !country) {
      form.reset({
        name: "",
        flag_emoji: "",
        is_active: true,
        sort_order: 0,
        service_fee: 0,
        consulate_fee: 0,
        currency: "EUR",
      });
    }
  }, [open, country, form]);

  async function onSubmit(values: CountryFormValues) {
    setLoading(true);

    const payload = {
      name: values.name,
      flag_emoji: values.flag_emoji || null,
      is_active: values.is_active,
      sort_order: values.sort_order,
      service_fee: values.service_fee,
      consulate_fee: values.consulate_fee,
      currency: values.currency,
    };

    try {
      if (isEdit && country) {
        const { error } = await supabase
          .from("countries")
          .update(payload)
          .eq("id", country.id);

        if (error) throw error;
        toast.success(t("updateSuccess"));
      } else {
        const { error } = await supabase.from("countries").insert(payload);

        if (error) throw error;
        toast.success(t("createSuccess"));
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Country save error:", err);
      toast.error(t("saveError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editCountry") : t("addCountry")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("editDescription") : t("addDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("countryName")} *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="flag_emoji"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("flagEmoji")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("flagEmojiHint")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("sortOrder")}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="service_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("serviceFee")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consulate_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("consulateFee")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                        <SelectValue placeholder={t("selectCurrency")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="TL">TL</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">
                    {t("isActive")}
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-2">
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
