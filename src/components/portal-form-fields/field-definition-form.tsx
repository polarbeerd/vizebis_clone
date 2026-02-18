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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const FIELD_TYPES = [
  "text",
  "email",
  "date",
  "tel",
  "number",
  "select",
  "textarea",
] as const;

const definitionSchema = z.object({
  field_key: z.string().min(1, "Field key is required"),
  field_label: z.string().min(1, "Field label is required"),
  field_label_tr: z.string().default(""),
  field_type: z.string().min(1, "Field type is required"),
  placeholder: z.string().default(""),
  placeholder_tr: z.string().default(""),
  options: z.string().default(""),
  options_tr: z.string().default(""),
  max_chars: z.coerce.number().int().min(1).nullable().default(null),
});

type DefinitionFormValues = z.output<typeof definitionSchema>;

export interface FieldDefinition {
  id: number;
  field_key: string;
  field_label: string;
  field_label_tr: string | null;
  field_type: string;
  placeholder: string | null;
  placeholder_tr: string | null;
  options: string | null;
  options_tr: string | null;
  max_chars: number | null;
  created_at: string | null;
}

interface FieldDefinitionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: FieldDefinition | null;
  onSuccess: () => void;
}

export function FieldDefinitionForm({
  open,
  onOpenChange,
  item,
  onSuccess,
}: FieldDefinitionFormProps) {
  const t = useTranslations("portalFormFields");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = React.useState(false);
  const isEdit = !!item?.id;
  const supabase = React.useMemo(() => createClient(), []);

  const form = useForm<DefinitionFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(definitionSchema) as any,
    defaultValues: {
      field_key: "",
      field_label: "",
      field_label_tr: "",
      field_type: "text",
      placeholder: "",
      placeholder_tr: "",
      options: "",
      options_tr: "",
      max_chars: null,
    },
  });

  const watchFieldType = form.watch("field_type");

  React.useEffect(() => {
    if (open && item) {
      form.reset({
        field_key: item.field_key ?? "",
        field_label: item.field_label ?? "",
        field_label_tr: item.field_label_tr ?? "",
        field_type: item.field_type ?? "text",
        placeholder: item.placeholder ?? "",
        placeholder_tr: item.placeholder_tr ?? "",
        options: item.options ?? "",
        options_tr: item.options_tr ?? "",
        max_chars: item.max_chars ?? null,
      });
    } else if (open && !item) {
      form.reset({
        field_key: "",
        field_label: "",
        field_label_tr: "",
        field_type: "text",
        placeholder: "",
        placeholder_tr: "",
        options: "",
        options_tr: "",
        max_chars: null,
      });
    }
  }, [open, item, form]);

  async function onSubmit(values: DefinitionFormValues) {
    setLoading(true);

    const payload = {
      field_key: values.field_key,
      field_label: values.field_label,
      field_label_tr: values.field_label_tr,
      field_type: values.field_type,
      placeholder: values.placeholder,
      placeholder_tr: values.placeholder_tr,
      options: values.options,
      options_tr: values.options_tr,
      max_chars: values.max_chars || null,
    };

    try {
      if (isEdit && item?.id) {
        const { error } = await supabase
          .from("portal_field_definitions")
          .update(payload)
          .eq("id", item.id);

        if (error) throw error;
        toast.success(t("updateSuccess"));
      } else {
        const { error } = await supabase
          .from("portal_field_definitions")
          .insert(payload);

        if (error) throw error;
        toast.success(t("createSuccess"));
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Field definition save error:", err);
      toast.error(t("saveError"));
    } finally {
      setLoading(false);
    }
  }

  // Show max_chars for text-like types
  const showMaxChars = ["text", "tel", "number", "email", "textarea"].includes(watchFieldType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editDefinition") : t("createDefinition")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("editDescription") : t("addDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Field key + type row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="field_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fieldKey")} *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("fieldKeyPlaceholder")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="field_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fieldType")}</FormLabel>
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
                        {FIELD_TYPES.map((ft) => (
                          <SelectItem key={ft} value={ft}>
                            {ft}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Labels: EN / TR side by side */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="field_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <span className="mr-1.5">{"\u{1F1EC}\u{1F1E7}"}</span>
                      {t("fieldLabelEN")} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Full Name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="field_label_tr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <span className="mr-1.5">{"\u{1F1F9}\u{1F1F7}"}</span>
                      {t("fieldLabelTR")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="orn. Ad Soyad"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Placeholders: EN / TR side by side */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="placeholder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <span className="mr-1.5">{"\u{1F1EC}\u{1F1E7}"}</span>
                      {t("placeholderEN")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="placeholder_tr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <span className="mr-1.5">{"\u{1F1F9}\u{1F1F7}"}</span>
                      {t("placeholderTR")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Options: EN / TR side by side (only for select) */}
            {watchFieldType === "select" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="options"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="mr-1.5">{"\u{1F1EC}\u{1F1E7}"}</span>
                        {t("optionsEN")}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Male, Female" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {t("optionsHint")}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="options_tr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="mr-1.5">{"\u{1F1F9}\u{1F1F7}"}</span>
                        {t("optionsTR")}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Erkek, Kadin" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {t("optionsHint")}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {showMaxChars && (
              <FormField
                control={form.control}
                name="max_chars"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("charLimit")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder={t("charLimitPlaceholder")}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t("charLimitHint")}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
