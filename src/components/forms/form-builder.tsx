"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Types for fields
interface FormFieldItem {
  id: string;
  label: string;
  type: "text" | "email" | "date" | "select" | "textarea" | "checkbox";
  required: boolean;
  options: string; // comma-separated for select type
}

// Schema
const formBuilderSchema = z.object({
  name: z.string().min(1, "Form name is required"),
  status: z.string().default("aktif"),
  access_level: z.string().default("firma_uyeleri"),
});

type FormBuilderValues = z.output<typeof formBuilderSchema>;

export interface FormForBuilder {
  id: number;
  name?: string | null;
  status?: string | null;
  access_level?: string | null;
  fields?: unknown;
}

interface FormBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData?: FormForBuilder;
  onSuccess: () => void;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function FormBuilder({
  open,
  onOpenChange,
  formData,
  onSuccess,
}: FormBuilderProps) {
  const t = useTranslations("forms");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = React.useState(false);
  const [fields, setFields] = React.useState<FormFieldItem[]>([]);
  const isEdit = !!formData;
  const supabase = React.useMemo(() => createClient(), []);

  const form = useForm<FormBuilderValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formBuilderSchema) as any,
    defaultValues: {
      name: "",
      status: "aktif",
      access_level: "firma_uyeleri",
    },
  });

  // Pre-fill form when editing
  React.useEffect(() => {
    if (open && formData) {
      form.reset({
        name: formData.name ?? "",
        status: formData.status ?? "aktif",
        access_level: formData.access_level ?? "firma_uyeleri",
      });
      // Parse fields
      if (Array.isArray(formData.fields)) {
        setFields(
          (formData.fields as FormFieldItem[]).map((f) => ({
            ...f,
            id: f.id || generateId(),
          }))
        );
      } else {
        setFields([]);
      }
    } else if (open && !formData) {
      form.reset({
        name: "",
        status: "aktif",
        access_level: "firma_uyeleri",
      });
      setFields([]);
    }
  }, [open, formData, form]);

  function addField() {
    setFields((prev) => [
      ...prev,
      {
        id: generateId(),
        label: "",
        type: "text",
        required: false,
        options: "",
      },
    ]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function moveField(index: number, direction: "up" | "down") {
    setFields((prev) => {
      const newFields = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newFields.length) return prev;
      [newFields[index], newFields[targetIndex]] = [
        newFields[targetIndex],
        newFields[index],
      ];
      return newFields;
    });
  }

  function updateField(id: string, key: keyof FormFieldItem, value: unknown) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: value } : f))
    );
  }

  async function onSubmit(values: FormBuilderValues) {
    setLoading(true);

    const payload: Record<string, unknown> = {
      name: values.name,
      status: values.status || "aktif",
      access_level: values.access_level || "firma_uyeleri",
      fields: fields.map(({ id, label, type, required, options }) => ({
        id,
        label,
        type,
        required,
        options,
      })),
    };

    try {
      if (isEdit && formData) {
        const { error } = await supabase
          .from("forms")
          .update(payload)
          .eq("id", formData.id);

        if (error) throw error;
        toast.success(t("updateSuccess"));
      } else {
        const { error } = await supabase.from("forms").insert(payload);

        if (error) throw error;
        toast.success(t("createSuccess"));
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Form save error:", err);
      toast.error(t("saveError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{isEdit ? t("editForm") : t("addNew")}</DialogTitle>
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
                      <FormLabel>{t("formName")} *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>

                <Separator />

                {/* Field builder */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">{t("fields")}</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addField}
                    >
                      <Plus className="mr-1 size-3.5" />
                      {t("addField")}
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                    <div className="flex items-center justify-center rounded-md border border-dashed p-8">
                      <p className="text-muted-foreground text-sm text-center">
                        {t("noFields")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="rounded-md border p-3 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              #{index + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => moveField(index, "up")}
                                disabled={index === 0}
                                title={t("moveUp")}
                              >
                                <ArrowUp className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => moveField(index, "down")}
                                disabled={index === fields.length - 1}
                                title={t("moveDown")}
                              >
                                <ArrowDown className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => removeField(field.id)}
                                title={t("removeField")}
                              >
                                <Trash2 className="size-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium mb-1 block">
                                {t("fieldLabel")}
                              </label>
                              <Input
                                value={field.label}
                                onChange={(e) =>
                                  updateField(field.id, "label", e.target.value)
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">
                                {t("fieldType")}
                              </label>
                              <Select
                                value={field.type}
                                onValueChange={(val) =>
                                  updateField(field.id, "type", val)
                                }
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">
                                    {t("typeText")}
                                  </SelectItem>
                                  <SelectItem value="email">
                                    {t("typeEmail")}
                                  </SelectItem>
                                  <SelectItem value="date">
                                    {t("typeDate")}
                                  </SelectItem>
                                  <SelectItem value="select">
                                    {t("typeSelect")}
                                  </SelectItem>
                                  <SelectItem value="textarea">
                                    {t("typeTextarea")}
                                  </SelectItem>
                                  <SelectItem value="checkbox">
                                    {t("typeCheckbox")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`required-${field.id}`}
                                checked={field.required}
                                onCheckedChange={(checked) =>
                                  updateField(
                                    field.id,
                                    "required",
                                    checked === true
                                  )
                                }
                              />
                              <label
                                htmlFor={`required-${field.id}`}
                                className="text-xs"
                              >
                                {t("fieldRequired")}
                              </label>
                            </div>
                          </div>

                          {field.type === "select" && (
                            <div>
                              <label className="text-xs font-medium mb-1 block">
                                {t("fieldOptions")}
                              </label>
                              <Input
                                value={field.options}
                                onChange={(e) =>
                                  updateField(
                                    field.id,
                                    "options",
                                    e.target.value
                                  )
                                }
                                placeholder={t("fieldOptionsHint")}
                                className="h-8 text-sm"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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
