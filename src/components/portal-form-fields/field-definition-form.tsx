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
import { Badge } from "@/components/ui/badge";
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
  field_type: z.string().min(1, "Field type is required"),
  placeholder: z.string().default(""),
  options: z.string().default(""),
});

type DefinitionFormValues = z.output<typeof definitionSchema>;

export interface FieldDefinition {
  id: number;
  field_key: string;
  field_label: string;
  field_type: string;
  placeholder: string | null;
  options: string | null;
  is_standard: boolean;
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
  const isStandard = item?.is_standard ?? false;
  const supabase = React.useMemo(() => createClient(), []);

  const form = useForm<DefinitionFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(definitionSchema) as any,
    defaultValues: {
      field_key: "",
      field_label: "",
      field_type: "text",
      placeholder: "",
      options: "",
    },
  });

  const watchFieldType = form.watch("field_type");

  React.useEffect(() => {
    if (open && item) {
      form.reset({
        field_key: item.field_key ?? "",
        field_label: item.field_label ?? "",
        field_type: item.field_type ?? "text",
        placeholder: item.placeholder ?? "",
        options: item.options ?? "",
      });
    } else if (open && !item) {
      form.reset({
        field_key: "",
        field_label: "",
        field_type: "text",
        placeholder: "",
        options: "",
      });
    }
  }, [open, item, form]);

  async function onSubmit(values: DefinitionFormValues) {
    setLoading(true);

    const payload = {
      field_key: values.field_key,
      field_label: values.field_label,
      field_type: values.field_type,
      placeholder: values.placeholder,
      options: values.options,
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
          .insert({ ...payload, is_standard: false });

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editDefinition") : t("createDefinition")}
            {isStandard && (
              <Badge variant="outline" className="ml-2">
                {t("isStandard")}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("editDescription") : t("addDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="field_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fieldKey")} *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={isStandard}
                      placeholder={t("fieldKeyPlaceholder")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="field_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fieldLabel")} *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("fieldLabelPlaceholder")}
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
                    disabled={isStandard}
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

            <FormField
              control={form.control}
              name="placeholder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("placeholder")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchFieldType === "select" && (
              <FormField
                control={form.control}
                name="options"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("options")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t("optionsHint")}
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
