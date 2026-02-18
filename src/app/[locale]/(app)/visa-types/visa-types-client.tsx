"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Edit, MoreHorizontal, Plus, Trash2, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { VisaTypeRow } from "./page";

const visaTypeSchema = z.object({
  value: z.string().min(1, "Value is required"),
  label_en: z.string().min(1, "English label is required"),
  label_tr: z.string().min(1, "Turkish label is required"),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().default(0),
});

type VisaTypeFormValues = z.output<typeof visaTypeSchema>;

interface VisaTypesClientProps {
  data: VisaTypeRow[];
}

export function VisaTypesClient({ data }: VisaTypesClientProps) {
  const t = useTranslations("visaTypes");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<VisaTypeRow | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<VisaTypeRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const supabase = React.useMemo(() => createClient(), []);
  const isEdit = !!editTarget;

  const form = useForm<VisaTypeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(visaTypeSchema) as any,
    defaultValues: {
      value: "",
      label_en: "",
      label_tr: "",
      is_active: true,
      sort_order: 0,
    },
  });

  function handleNew() {
    setEditTarget(null);
    form.reset({ value: "", label_en: "", label_tr: "", is_active: true, sort_order: 0 });
    setFormOpen(true);
  }

  function handleEdit(row: VisaTypeRow) {
    setEditTarget(row);
    form.reset({
      value: row.value,
      label_en: row.label_en,
      label_tr: row.label_tr,
      is_active: row.is_active,
      sort_order: row.sort_order,
    });
    setFormOpen(true);
  }

  function handleDelete(row: VisaTypeRow) {
    setDeleteTarget(row);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("visa_types")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error("Error deleting visa type:", error);
      toast.error(t("deleteError"));
    } else {
      toast.success(t("deleteSuccess"));
      router.refresh();
    }

    setDeleting(false);
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  }

  async function onSubmit(values: VisaTypeFormValues) {
    setSaving(true);

    const payload = {
      value: values.value,
      label_en: values.label_en,
      label_tr: values.label_tr,
      is_active: values.is_active,
      sort_order: values.sort_order,
    };

    try {
      if (isEdit && editTarget) {
        const { error } = await supabase
          .from("visa_types")
          .update(payload)
          .eq("id", editTarget.id);

        if (error) throw error;
        toast.success(t("updateSuccess"));
      } else {
        const { error } = await supabase.from("visa_types").insert(payload);

        if (error) throw error;
        toast.success(t("createSuccess"));
      }

      setFormOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Visa type save error:", err);
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnDef<VisaTypeRow, unknown>[] = React.useMemo(
    () => [
      {
        accessorKey: "value",
        header: () => t("value"),
        cell: ({ row }) => (
          <code className="text-xs text-muted-foreground">{row.getValue("value")}</code>
        ),
        filterFn: "includesString",
      },
      {
        accessorKey: "label_en",
        header: () => <span>{"\u{1F1EC}\u{1F1E7}"} {t("labelEN")}</span>,
        cell: ({ row }) => <span className="font-medium">{row.getValue("label_en")}</span>,
      },
      {
        accessorKey: "label_tr",
        header: () => <span>{"\u{1F1F9}\u{1F1F7}"} {t("labelTR")}</span>,
        cell: ({ row }) => <span className="font-medium">{row.getValue("label_tr")}</span>,
      },
      {
        accessorKey: "is_active",
        header: () => t("isActive"),
        cell: ({ row }) => (
          <Badge variant={row.getValue("is_active") ? "default" : "secondary"}>
            {row.getValue("is_active") ? tCommon("active") : tCommon("passive")}
          </Badge>
        ),
      },
      {
        accessorKey: "sort_order",
        header: () => t("sortOrder"),
        cell: ({ row }) => row.getValue("sort_order"),
      },
      {
        id: "actions",
        header: () => tCommon("actions"),
        cell: ({ row }) => {
          const vt = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(vt)}>
                  <Edit className="mr-2 size-3.5" />
                  {tCommon("edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDelete(vt)}
                >
                  <Trash2 className="mr-2 size-3.5" />
                  {tCommon("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tCommon]
  );

  const toolbar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" onClick={handleNew}>
          <Plus className="mr-1 size-4" />
          {t("addVisaType")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        searchKey="value"
        searchPlaceholder={t("searchPlaceholder")}
        pageSize={10}
        toolbarExtra={toolbar}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("editVisaType") : t("addVisaType")}
            </DialogTitle>
            <DialogDescription>
              {isEdit ? t("editDescription") : t("addDescription")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("value")} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("valuePlaceholder")} disabled={isEdit} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{t("valueHint")}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="label_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="mr-1.5">{"\u{1F1EC}\u{1F1E7}"}</span>
                        {t("labelEN")} *
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Tourist" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="label_tr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="mr-1.5">{"\u{1F1F9}\u{1F1F7}"}</span>
                        {t("labelTR")} *
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="orn. Turistik" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="cursor-pointer">{t("isActive")}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {tCommon("save")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDescription", { name: deleteTarget?.label_en ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? tCommon("loading") : tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
