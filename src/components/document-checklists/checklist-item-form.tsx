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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

// Schema
const checklistItemSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  description: z.string().default(""),
  is_required: z.boolean().default(true),
  sort_order: z.coerce.number().default(0),
});

type ChecklistItemFormValues = z.output<typeof checklistItemSchema>;

export interface ChecklistItemForForm {
  id: number;
  name?: string | null;
  description?: string | null;
  is_required?: boolean | null;
  sort_order?: number | null;
}

interface ChecklistItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ChecklistItemForForm;
  country: string;
  visaType: string;
  onSuccess: () => void;
}

export function ChecklistItemForm({
  open,
  onOpenChange,
  item,
  country,
  visaType,
  onSuccess,
}: ChecklistItemFormProps) {
  const t = useTranslations("documentChecklists");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = React.useState(false);
  const isEdit = !!item;
  const supabase = React.useMemo(() => createClient(), []);

  const form = useForm<ChecklistItemFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(checklistItemSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      is_required: true,
      sort_order: 0,
    },
  });

  // Pre-fill form when editing
  React.useEffect(() => {
    if (open && item) {
      form.reset({
        name: item.name ?? "",
        description: item.description ?? "",
        is_required: item.is_required ?? true,
        sort_order: item.sort_order ?? 0,
      });
    } else if (open && !item) {
      form.reset({
        name: "",
        description: "",
        is_required: true,
        sort_order: 0,
      });
    }
  }, [open, item, form]);

  async function onSubmit(values: ChecklistItemFormValues) {
    setLoading(true);

    const payload = {
      name: values.name,
      description: values.description,
      is_required: values.is_required,
      sort_order: values.sort_order,
    };

    try {
      if (isEdit && item) {
        const { error } = await supabase
          .from("document_checklists")
          .update(payload)
          .eq("id", item.id);

        if (error) throw error;
        toast.success(t("updateSuccess"));
      } else {
        const { error } = await supabase
          .from("document_checklists")
          .insert({
            ...payload,
            country,
            visa_type: visaType,
          });

        if (error) throw error;
        toast.success(t("createSuccess"));
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Checklist item save error:", err);
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
            {isEdit ? t("editItem") : t("addItem")}
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
                  <FormLabel>{t("itemName")} *</FormLabel>
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
                  <FormLabel>{t("itemDescription")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_required"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">
                    {t("isRequired")}
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
