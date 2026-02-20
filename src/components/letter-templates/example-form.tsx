"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

import type { LetterExampleRow } from "@/app/[locale]/(app)/letter-templates/page";

// Schema
const exampleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  country: z.string().default(""),
  visa_type: z.string().default(""),
  is_active: z.boolean().default(true),
});

type ExampleFormValues = z.output<typeof exampleSchema>;

interface ExampleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  example?: LetterExampleRow;
  onSuccess: () => void;
}

export function ExampleForm({
  open,
  onOpenChange,
  example,
  onSuccess,
}: ExampleFormProps) {
  const t = useTranslations("letterTemplates");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = React.useState(false);
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isEdit = !!example;
  const supabase = React.useMemo(() => createClient(), []);

  const form = useForm<ExampleFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(exampleSchema) as any,
    defaultValues: {
      name: "",
      country: "",
      visa_type: "",
      is_active: true,
    },
  });

  // Pre-fill form when editing
  React.useEffect(() => {
    if (open && example) {
      form.reset({
        name: example.name ?? "",
        country: example.country ?? "",
        visa_type: example.visa_type ?? "",
        is_active: example.is_active ?? true,
      });
      setPdfFile(null);
    } else if (open && !example) {
      form.reset();
      setPdfFile(null);
    }
  }, [open, example, form]);

  async function uploadPdf(exampleId: string): Promise<string | null> {
    if (!pdfFile) return null;

    const filePath = `${exampleId}.pdf`;

    const { error } = await supabase.storage
      .from("letter-intent-examples")
      .upload(filePath, pdfFile, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (error) {
      console.error("PDF upload error:", error);
      toast.error(t("uploadPdf") + " error");
      return null;
    }

    return filePath;
  }

  async function extractPdfText(file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const resp = await fetch("/api/extract-pdf-text", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) return null;

      const json = await resp.json();
      return json.text ?? null;
    } catch {
      console.error("PDF text extraction failed");
      return null;
    }
  }

  async function onSubmit(values: ExampleFormValues) {
    setLoading(true);

    try {
      if (isEdit && example) {
        // Update record
        const payload: Record<string, unknown> = {
          name: values.name,
          country: values.country || null,
          visa_type: values.visa_type || null,
          is_active: values.is_active,
        };

        // Upload new PDF if provided
        if (pdfFile) {
          const filePath = await uploadPdf(example.id);
          if (filePath) {
            payload.file_path = filePath;
          }

          // Extract text from the new PDF
          const text = await extractPdfText(pdfFile);
          if (text) {
            payload.extracted_text = text;
          }
        }

        const { error } = await supabase
          .from("letter_intent_examples")
          .update(payload)
          .eq("id", example.id);

        if (error) throw error;
        toast.success(t("saveSuccess"));
      } else {
        // Insert new record
        const payload: Record<string, unknown> = {
          name: values.name,
          country: values.country || null,
          visa_type: values.visa_type || null,
          is_active: values.is_active,
          file_path: "",
          extracted_text: null,
        };

        const { data: inserted, error } = await supabase
          .from("letter_intent_examples")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;

        // Upload PDF if provided
        if (pdfFile && inserted) {
          const filePath = await uploadPdf(inserted.id);
          if (filePath) {
            const updatePayload: Record<string, unknown> = {
              file_path: filePath,
            };

            // Extract text from PDF
            const text = await extractPdfText(pdfFile);
            if (text) {
              updatePayload.extracted_text = text;
            }

            await supabase
              .from("letter_intent_examples")
              .update(updatePayload)
              .eq("id", inserted.id);
          }
        }

        toast.success(t("saveSuccess"));
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Example save error:", err);
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
            {isEdit ? t("editExample") : t("addExample")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("exampleName")} *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                        <FormLabel>{t("country")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Germany"
                            {...field}
                          />
                        </FormControl>
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
                        <FormLabel>{t("visaType")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Schengen"
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
                        {field.value ? tCommon("active") : tCommon("passive")}
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {/* PDF Upload */}
                <div className="space-y-2">
                  <FormLabel>{t("uploadPdf")}</FormLabel>
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
                      ) : example?.file_path ? (
                        <span className="text-muted-foreground text-sm">
                          {example.file_path} &mdash; {t("uploadPdf")}
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
                {loading && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {tCommon("save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
