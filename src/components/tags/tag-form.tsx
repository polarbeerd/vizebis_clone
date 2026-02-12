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

// Schema
const tagSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color (e.g. #6c757d)")
    .default("#6c757d"),
});

type TagFormValues = z.output<typeof tagSchema>;

export interface TagForForm {
  id: number;
  name?: string | null;
  color?: string | null;
}

interface TagFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag?: TagForForm;
  onSuccess: () => void;
}

export function TagForm({ open, onOpenChange, tag, onSuccess }: TagFormProps) {
  const t = useTranslations("tags");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = React.useState(false);
  const isEdit = !!tag;
  const supabase = React.useMemo(() => createClient(), []);

  const form = useForm<TagFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(tagSchema) as any,
    defaultValues: {
      name: "",
      color: "#6c757d",
    },
  });

  // Pre-fill form when editing
  React.useEffect(() => {
    if (open && tag) {
      form.reset({
        name: tag.name ?? "",
        color: tag.color ?? "#6c757d",
      });
    } else if (open && !tag) {
      form.reset({
        name: "",
        color: "#6c757d",
      });
    }
  }, [open, tag, form]);

  async function onSubmit(values: TagFormValues) {
    setLoading(true);

    const payload = {
      name: values.name,
      color: values.color,
    };

    try {
      if (isEdit && tag) {
        const { error } = await supabase
          .from("tags")
          .update(payload)
          .eq("id", tag.id);

        if (error) throw error;
        toast.success(t("updateSuccess"));
      } else {
        const { error } = await supabase.from("tags").insert(payload);

        if (error) throw error;
        toast.success(t("createSuccess"));
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Tag save error:", err);
      toast.error(t("saveError"));
    } finally {
      setLoading(false);
    }
  }

  const watchColor = form.watch("color");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTag") : t("addNew")}</DialogTitle>
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
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("color")}</FormLabel>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Input
                        placeholder={t("colorHint")}
                        {...field}
                        className="flex-1"
                      />
                    </FormControl>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={
                          /^#[0-9a-fA-F]{6}$/.test(watchColor)
                            ? watchColor
                            : "#6c757d"
                        }
                        onChange={(e) => field.onChange(e.target.value)}
                        className="size-9 cursor-pointer rounded border p-0.5"
                      />
                      <div
                        className="size-9 rounded-full border"
                        style={{
                          backgroundColor: /^#[0-9a-fA-F]{6}$/.test(watchColor)
                            ? watchColor
                            : "#6c757d",
                        }}
                      />
                    </div>
                  </div>
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
