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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

// Schema
const documentSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  description: z.string().default(""),
  html_content: z.string().default(""),
  document_type: z.string().default("genel"),
  category: z.string().default(""),
  status: z.string().default("taslak"),
  priority: z.string().default("normal"),
  access_level: z.string().default("firma_uyeleri"),
  tags: z.string().default(""),
});

type DocumentFormValues = z.output<typeof documentSchema>;

export interface DocumentForForm {
  id: number;
  name?: string | null;
  description?: string | null;
  html_content?: string | null;
  document_type?: string | null;
  category?: string | null;
  status?: string | null;
  priority?: string | null;
  access_level?: string | null;
  tags?: string | null;
}

interface DocumentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: DocumentForForm;
  onSuccess: () => void;
}

export function DocumentForm({
  open,
  onOpenChange,
  document,
  onSuccess,
}: DocumentFormProps) {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = React.useState(false);
  const isEdit = !!document;
  const supabase = React.useMemo(() => createClient(), []);

  const form = useForm<DocumentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(documentSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      html_content: "",
      document_type: "genel",
      category: "",
      status: "taslak",
      priority: "normal",
      access_level: "firma_uyeleri",
      tags: "",
    },
  });

  // Pre-fill form when editing
  React.useEffect(() => {
    if (open && document) {
      form.reset({
        name: document.name ?? "",
        description: document.description ?? "",
        html_content: document.html_content ?? "",
        document_type: document.document_type ?? "genel",
        category: document.category ?? "",
        status: document.status ?? "taslak",
        priority: document.priority ?? "normal",
        access_level: document.access_level ?? "firma_uyeleri",
        tags: document.tags ?? "",
      });
    } else if (open && !document) {
      form.reset();
    }
  }, [open, document, form]);

  async function onSubmit(values: DocumentFormValues) {
    setLoading(true);

    const payload: Record<string, unknown> = {
      name: values.name,
      description: values.description || null,
      html_content: values.html_content || null,
      document_type: values.document_type || "genel",
      category: values.category || null,
      status: values.status || "taslak",
      priority: values.priority || "normal",
      access_level: values.access_level || "firma_uyeleri",
      tags: values.tags || null,
    };

    try {
      if (isEdit && document) {
        const { error } = await supabase
          .from("documents")
          .update(payload)
          .eq("id", document.id);

        if (error) throw error;
        toast.success(t("updateSuccess"));
      } else {
        const { error } = await supabase.from("documents").insert(payload);

        if (error) throw error;
        toast.success(t("createSuccess"));
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Document save error:", err);
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
            {isEdit ? t("editDocument") : t("addNew")}
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
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("name")} *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("description")}</FormLabel>
                      <FormControl>
                        <Textarea rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="html_content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("htmlContent")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={6}
                          placeholder={t("htmlContentHint")}
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="document_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("documentType")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="genel">
                              {t("typeGenel")}
                            </SelectItem>
                            <SelectItem value="vize">
                              {t("typeVize")}
                            </SelectItem>
                            <SelectItem value="pasaport">
                              {t("typePasaport")}
                            </SelectItem>
                            <SelectItem value="diger">
                              {t("typeDiger")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("category")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("status")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="aktif">
                              {t("statusAktif")}
                            </SelectItem>
                            <SelectItem value="pasif">
                              {t("statusPasif")}
                            </SelectItem>
                            <SelectItem value="taslak">
                              {t("statusTaslak")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("priority")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="normal">
                              {t("priorityNormal")}
                            </SelectItem>
                            <SelectItem value="dusuk">
                              {t("priorityDusuk")}
                            </SelectItem>
                            <SelectItem value="yuksek">
                              {t("priorityYuksek")}
                            </SelectItem>
                            <SelectItem value="acil">
                              {t("priorityAcil")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="access_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("accessLevel")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="firma_uyeleri">
                              {t("accessFirmaUyeleri")}
                            </SelectItem>
                            <SelectItem value="herkes">
                              {t("accessHerkes")}
                            </SelectItem>
                            <SelectItem value="sadece_admin">
                              {t("accessSadeceAdmin")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("tags")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("tagsHint")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
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
