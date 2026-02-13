"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Edit, MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { FilterableColumn } from "@/components/data-table/data-table-toolbar";
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
import { formatDate } from "@/lib/utils";
import type { ContentRow, CountryOption } from "./page";
import { ContentForm } from "@/components/portal-content/content-form";
import type { ContentForForm } from "@/components/portal-content/content-form";

interface PortalContentClientProps {
  data: ContentRow[];
  countries: CountryOption[];
}

export function PortalContentClient({ data, countries }: PortalContentClientProps) {
  const t = useTranslations("portalContent");
  const tCommon = useTranslations("common");
  const tVisaType = useTranslations("visaType");
  const router = useRouter();

  // ── Modal states ────────────────────────────────────────
  const [formOpen, setFormOpen] = React.useState(false);
  const [formContent, setFormContent] = React.useState<ContentForForm | undefined>(undefined);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ContentRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const supabase = React.useMemo(() => createClient(), []);

  // ── Handlers ────────────────────────────────────────────
  function handleNewArticle() {
    setFormContent(undefined);
    setFormOpen(true);
  }

  function handleEditArticle(row: ContentRow) {
    setFormContent({
      id: row.id,
      title: row.title,
      content: row.content,
      content_type: row.content_type,
      country: row.country,
      visa_type: row.visa_type,
      sort_order: row.sort_order,
      is_published: row.is_published,
    });
    setFormOpen(true);
  }

  function handleDeleteArticle(row: ContentRow) {
    setDeleteTarget(row);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("portal_content")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error("Error deleting portal content:", error);
      toast.error(t("saveError"));
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

  // ── Visa type label helper ──────────────────────────────
  const visaTypeKeyMap: Record<string, string> = {
    kultur: "cultural",
    ticari: "commercial",
    turistik: "tourist",
    ziyaret: "visit",
    diger: "other",
  };

  function visaTypeLabel(type: string | null): string {
    if (!type) return "-";
    const key = visaTypeKeyMap[type] ?? type;
    return tVisaType(key as Parameters<typeof tVisaType>[0]);
  }

  // ── Content type badge styling ──────────────────────────
  function contentTypeBadge(type: string) {
    const colors: Record<string, string> = {
      country_guide: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      process_guide: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      faq: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      general: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    };

    const labelKey = type === "country_guide"
      ? "countryGuide"
      : type === "process_guide"
        ? "processGuide"
        : type === "faq"
          ? "faq"
          : "general";

    return (
      <Badge variant="outline" className={colors[type] || ""}>
        {t(labelKey)}
      </Badge>
    );
  }

  // ── Column definitions ──────────────────────────────────
  const columns: ColumnDef<ContentRow, unknown>[] = React.useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("id")}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("articleTitle")} />
        ),
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate block font-medium">
            {row.getValue("title")}
          </span>
        ),
        enableSorting: true,
        filterFn: "includesString",
      },
      {
        accessorKey: "content_type",
        header: () => t("contentType"),
        cell: ({ row }) => contentTypeBadge(row.getValue("content_type") as string),
        filterFn: (row, id, value: string[]) => {
          return value.includes(row.getValue(id) as string);
        },
        enableSorting: false,
      },
      {
        accessorKey: "country",
        header: () => t("assignCountry"),
        cell: ({ row }) => {
          const country = row.getValue("country") as string | null;
          return country || tCommon("all");
        },
        enableSorting: false,
      },
      {
        accessorKey: "visa_type",
        header: () => t("assignVisaType"),
        cell: ({ row }) => {
          const vt = row.getValue("visa_type") as string | null;
          return visaTypeLabel(vt);
        },
        enableSorting: false,
      },
      {
        accessorKey: "sort_order",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="#" />
        ),
        cell: ({ row }) => row.getValue("sort_order"),
        enableSorting: true,
      },
      {
        accessorKey: "is_published",
        header: () => tCommon("status"),
        cell: ({ row }) => {
          const published = row.getValue("is_published") as boolean;
          return published ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              {t("published")}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
              {t("draft")}
            </Badge>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "created_at",
        header: () => tCommon("date"),
        cell: ({ row }) => {
          const date = row.getValue("created_at") as string | null;
          return date ? formatDate(date) : "-";
        },
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => tCommon("actions"),
        cell: ({ row }) => {
          const article = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditArticle(article)}>
                  <Edit className="mr-2 size-3.5" />
                  {tCommon("edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDeleteArticle(article)}
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
    [t, tCommon, tVisaType]
  );

  // ── Filterable columns config ───────────────────────────
  const filterableColumns: FilterableColumn[] = React.useMemo(
    () => [
      {
        id: "content_type",
        title: t("contentType"),
        options: [
          { label: t("countryGuide"), value: "country_guide" },
          { label: t("processGuide"), value: "process_guide" },
          { label: t("faq"), value: "faq" },
          { label: t("general"), value: "general" },
        ],
      },
    ],
    [t]
  );

  // ── Toolbar header ──────────────────────────────────────
  const toolbarHeader = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" onClick={handleNewArticle}>
          <Plus className="mr-1 size-4" />
          {t("addArticle")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        searchKey="title"
        searchPlaceholder={t("articleTitle")}
        filterableColumns={filterableColumns}
        pageSize={10}
        toolbarExtra={toolbarHeader}
      />

      {/* ── Content Form Modal ──────────────────────────── */}
      <ContentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        content={formContent}
        countries={countries}
        onSuccess={handleFormSuccess}
      />

      {/* ── Delete Confirmation Dialog ──────────────────── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDescription", {
                name: deleteTarget?.title ?? "",
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
