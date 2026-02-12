"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  ClipboardCopy,
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { FormRow } from "./page";
import { FormBuilder } from "@/components/forms/form-builder";
import type { FormForBuilder } from "@/components/forms/form-builder";

interface FormsClientProps {
  data: FormRow[];
}

export function FormsClient({ data }: FormsClientProps) {
  const t = useTranslations("forms");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [formOpen, setFormOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<FormForBuilder | undefined>(
    undefined
  );

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<FormRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const supabase = React.useMemo(() => createClient(), []);

  function handleNewForm() {
    setFormData(undefined);
    setFormOpen(true);
  }

  function handleEditForm(form: FormRow) {
    setFormData({
      id: form.id,
      name: form.name,
      status: form.status,
      access_level: form.access_level,
      fields: form.fields,
    });
    setFormOpen(true);
  }

  function handleDeleteForm(form: FormRow) {
    setDeleteTarget(form);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("forms")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error("Error deleting form:", error);
      toast.error(t("deleteError"));
    } else {
      toast.success(t("deleteSuccess"));
      router.refresh();
    }

    setDeleting(false);
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  }

  function handleFormSuccess() {
    router.refresh();
  }

  function handleCopyLink(formId: number) {
    const link = `${window.location.origin}/forms/${formId}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success(t("linkCopied"));
    });
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  // Column definitions
  const columns: ColumnDef<FormRow, unknown>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("formName")} />
        ),
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate font-medium">
            {(row.getValue("name") as string) ?? "-"}
          </span>
        ),
        enableSorting: true,
        filterFn: "includesString",
      },
      {
        accessorKey: "status",
        header: () => t("status"),
        cell: ({ row }) => {
          const status = row.getValue("status") as string | null;
          return status === "aktif" ? (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
              {t("statusAktif")}
            </Badge>
          ) : (
            <Badge variant="secondary">{t("statusPasif")}</Badge>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "access_level",
        header: () => t("accessLevel"),
        cell: ({ row }) => {
          const level = row.getValue("access_level") as string | null;
          switch (level) {
            case "firma_uyeleri":
              return t("accessFirmaUyeleri");
            case "herkes":
              return t("accessHerkes");
            case "sadece_admin":
              return t("accessSadeceAdmin");
            default:
              return level ?? "-";
          }
        },
        enableSorting: false,
      },
      {
        accessorKey: "submission_count",
        header: () => t("submissionCount"),
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.getValue("submission_count") as number}
          </Badge>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "pending_count",
        header: () => t("pendingCount"),
        cell: ({ row }) => {
          const count = row.getValue("pending_count") as number;
          return count > 0 ? (
            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
              {count}
            </Badge>
          ) : (
            <span className="text-muted-foreground">0</span>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "completed_count",
        header: () => t("completedCount"),
        cell: ({ row }) => {
          const count = row.getValue("completed_count") as number;
          return count > 0 ? (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
              {count}
            </Badge>
          ) : (
            <span className="text-muted-foreground">0</span>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "created_by",
        header: () => t("createdBy"),
        cell: ({ row }) => row.getValue("created_by") ?? "-",
        enableSorting: false,
      },
      {
        accessorKey: "created_at",
        header: () => t("createdDate"),
        cell: ({ row }) =>
          formatDate(row.getValue("created_at") as string | null),
        enableSorting: true,
      },
      {
        id: "form_link",
        header: () => t("formLink"),
        cell: ({ row }) => {
          const form = row.original;
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleCopyLink(form.id)}
            >
              <ClipboardCopy className="mr-1 size-3" />
              {t("copyLink")}
            </Button>
          );
        },
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => tCommon("actions"),
        cell: ({ row }) => {
          const form = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditForm(form)}>
                  <Edit className="mr-2 size-3.5" />
                  {tCommon("edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCopyLink(form.id)}>
                  <Eye className="mr-2 size-3.5" />
                  {t("viewSubmissions")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDeleteForm(form)}
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
      </div>
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" onClick={handleNewForm}>
          <Plus className="mr-1 size-4" />
          {t("addNew")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        searchPlaceholder={t("searchPlaceholder")}
        pageSize={10}
        toolbarExtra={toolbar}
      />

      <FormBuilder
        open={formOpen}
        onOpenChange={setFormOpen}
        formData={formData}
        onSuccess={handleFormSuccess}
      />

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDescription", {
                name: deleteTarget?.name ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? tCommon("loading") : tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
