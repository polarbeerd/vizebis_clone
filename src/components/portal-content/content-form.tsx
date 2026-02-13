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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CountryOption } from "@/app/[locale]/(app)/portal-content/page";

// ── Schema ────────────────────────────────────────────────────────
const contentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  content_type: z.string().min(1, "Content type is required"),
  country: z.string().default(""),
  visa_type: z.string().default(""),
  sort_order: z.coerce.number().default(0),
  is_published: z.boolean().default(true),
});

type ContentFormValues = z.output<typeof contentSchema>;

// ── Types ─────────────────────────────────────────────────────────
export interface ContentForForm {
  id: number;
  title?: string | null;
  content?: string | null;
  content_type?: string | null;
  country?: string | null;
  visa_type?: string | null;
  sort_order?: number | null;
  is_published?: boolean | null;
}

interface ContentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content?: ContentForForm;
  countries: CountryOption[];
  onSuccess: () => void;
}

export function ContentForm({
  open,
  onOpenChange,
  content,
  countries,
  onSuccess,
}: ContentFormProps) {
  const t = useTranslations("portalContent");
  const tCommon = useTranslations("common");
  const tVisaType = useTranslations("visaType");

  const [loading, setLoading] = React.useState(false);
  const isEdit = !!content;
  const supabase = React.useMemo(() => createClient(), []);

  // ── Form setup ──────────────────────────────────────────────────
  const form = useForm<ContentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(contentSchema) as any,
    defaultValues: {
      title: "",
      content: "",
      content_type: "",
      country: "",
      visa_type: "",
      sort_order: 0,
      is_published: true,
    },
  });

  // ── Pre-fill form when editing ──────────────────────────────────
  React.useEffect(() => {
    if (open && content) {
      form.reset({
        title: content.title ?? "",
        content: content.content ?? "",
        content_type: content.content_type ?? "",
        country: content.country ?? "",
        visa_type: content.visa_type ?? "",
        sort_order: content.sort_order ?? 0,
        is_published: content.is_published ?? true,
      });
    } else if (open && !content) {
      form.reset({
        title: "",
        content: "",
        content_type: "",
        country: "",
        visa_type: "",
        sort_order: 0,
        is_published: true,
      });
    }
  }, [open, content, form]);

  // ── Submit handler ──────────────────────────────────────────────
  async function onSubmit(values: ContentFormValues) {
    setLoading(true);

    const payload = {
      title: values.title,
      content: values.content,
      content_type: values.content_type,
      country: values.country || null,
      visa_type: values.visa_type || null,
      sort_order: values.sort_order,
      is_published: values.is_published,
    };

    try {
      if (isEdit && content) {
        const { error } = await supabase
          .from("portal_content")
          .update(payload)
          .eq("id", content.id);

        if (error) throw error;
        toast.success(t("updateSuccess"));
      } else {
        const { error } = await supabase.from("portal_content").insert(payload);

        if (error) throw error;
        toast.success(t("createSuccess"));
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Portal content save error:", err);
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
            {isEdit ? t("editArticle") : t("addArticle")}
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
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("articleTitle")} *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Content */}
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("articleContent")} *</FormLabel>
                      <FormControl>
                        <Textarea rows={12} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Content Type */}
                <FormField
                  control={form.control}
                  name="content_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contentType")} *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("contentType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="country_guide">
                            {t("countryGuide")}
                          </SelectItem>
                          <SelectItem value="process_guide">
                            {t("processGuide")}
                          </SelectItem>
                          <SelectItem value="faq">
                            {t("faq")}
                          </SelectItem>
                          <SelectItem value="general">
                            {t("general")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Country */}
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("assignCountry")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={tCommon("all")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">
                              {tCommon("all")}
                            </SelectItem>
                            {countries.map((c) => (
                              <SelectItem key={c.id} value={c.name}>
                                {c.flag_emoji ? `${c.flag_emoji} ` : ""}{c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Visa Type */}
                  <FormField
                    control={form.control}
                    name="visa_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("assignVisaType")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={tCommon("all")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">
                              {tCommon("all")}
                            </SelectItem>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sort Order */}
                  <FormField
                    control={form.control}
                    name="sort_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>#</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
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

                  {/* Is Published */}
                  <FormField
                    control={form.control}
                    name="is_published"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0 rounded-md border p-3">
                        <FormLabel className="font-normal">
                          {t("published")}
                        </FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
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
