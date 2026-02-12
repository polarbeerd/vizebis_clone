"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Download,
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { DocumentRow } from "./page";
import { DocumentForm } from "@/components/documents/document-form";
import type { DocumentForForm } from "@/components/documents/document-form";

interface DocumentsClientProps {
  data: DocumentRow[];
  categories: string[];
}

export function DocumentsClient({ data, categories }: DocumentsClientProps) {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [formOpen, setFormOpen] = React.useState(false);
  const [formDocument, setFormDocument] = React.useState<
    DocumentForForm | undefined
  >(undefined);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewHtml, setPreviewHtml] = React.useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<DocumentRow | null>(
    null
  );
  const [deleting, setDeleting] = React.useState(false);

  // Filter state
  const [filterCategory, setFilterCategory] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterType, setFilterType] = React.useState("all");
  const [searchText, setSearchText] = React.useState("");

  const supabase = React.useMemo(() => createClient(), []);

  // Filtered data
  const filteredData = React.useMemo(() => {
    let result = data;
    if (filterCategory !== "all") {
      result = result.filter((d) => d.category === filterCategory);
    }
    if (filterStatus !== "all") {
      result = result.filter((d) => d.status === filterStatus);
    }
    if (filterType !== "all") {
      result = result.filter((d) => d.document_type === filterType);
    }
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter((d) =>
        d.name?.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [data, filterCategory, filterStatus, filterType, searchText]);

  function handleNewDocument() {
    setFormDocument(undefined);
    setFormOpen(true);
  }

  function handleEditDocument(doc: DocumentRow) {
    setFormDocument({
      id: doc.id,
      name: doc.name,
      description: doc.description,
      html_content: doc.html_content,
      document_type: doc.document_type,
      category: doc.category,
      status: doc.status,
      priority: doc.priority,
      access_level: doc.access_level,
      tags: doc.tags,
    });
    setFormOpen(true);
  }

  function handlePreview(doc: DocumentRow) {
    setPreviewHtml(doc.html_content || "<p>No content</p>");
    setPreviewOpen(true);
  }

  function handleDeleteDocument(doc: DocumentRow) {
    setDeleteTarget(doc);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error("Error deleting document:", error);
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

  function handleExport() {
    const headers = ["ID", "Name", "Category", "Type", "Status", "Priority", "View Count", "Updated At"];
    const csvRows = [headers.join(",")];
    filteredData.forEach((d) => {
      csvRows.push(
        [
          d.id,
          `"${(d.name ?? "").replace(/"/g, '""')}"`,
          d.category ?? "",
          d.document_type ?? "",
          d.status ?? "",
          d.priority ?? "",
          d.view_count,
          d.updated_at ?? "",
        ].join(",")
      );
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documents.csv";
    a.click();
    URL.revokeObjectURL(url);
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

  function getStatusBadge(status: string | null) {
    switch (status) {
      case "aktif":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{t("statusAktif")}</Badge>;
      case "pasif":
        return <Badge variant="secondary">{t("statusPasif")}</Badge>;
      case "taslak":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">{t("statusTaslak")}</Badge>;
      default:
        return <Badge variant="outline">{status ?? "-"}</Badge>;
    }
  }

  function getPriorityBadge(priority: string | null) {
    switch (priority) {
      case "acil":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">{t("priorityAcil")}</Badge>;
      case "yuksek":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">{t("priorityYuksek")}</Badge>;
      case "normal":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{t("priorityNormal")}</Badge>;
      case "dusuk":
        return <Badge variant="secondary">{t("priorityDusuk")}</Badge>;
      default:
        return <Badge variant="outline">{priority ?? "-"}</Badge>;
    }
  }

  function getTypeBadge(type: string | null) {
    switch (type) {
      case "vize":
        return <Badge variant="outline">{t("typeVize")}</Badge>;
      case "pasaport":
        return <Badge variant="outline">{t("typePasaport")}</Badge>;
      case "genel":
        return <Badge variant="outline">{t("typeGenel")}</Badge>;
      case "diger":
        return <Badge variant="outline">{t("typeDiger")}</Badge>;
      default:
        return <Badge variant="outline">{type ?? "-"}</Badge>;
    }
  }

  // Column definitions
  const columns: ColumnDef<DocumentRow, unknown>[] = React.useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="#" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("id")}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("name")} />
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
        accessorKey: "category",
        header: () => t("category"),
        cell: ({ row }) => row.getValue("category") ?? "-",
        enableSorting: false,
      },
      {
        accessorKey: "document_type",
        header: () => t("documentType"),
        cell: ({ row }) => getTypeBadge(row.getValue("document_type") as string | null),
        enableSorting: false,
      },
      {
        accessorKey: "status",
        header: () => t("status"),
        cell: ({ row }) => getStatusBadge(row.getValue("status") as string | null),
        enableSorting: false,
      },
      {
        accessorKey: "priority",
        header: () => t("priority"),
        cell: ({ row }) => getPriorityBadge(row.getValue("priority") as string | null),
        enableSorting: false,
      },
      {
        accessorKey: "view_count",
        header: () => t("viewCount"),
        cell: ({ row }) => (
          <Badge variant="outline">{row.getValue("view_count") as number}</Badge>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "updated_at",
        header: () => t("lastUpdated"),
        cell: ({ row }) => formatDate(row.getValue("updated_at") as string | null),
        enableSorting: true,
      },
      {
        id: "actions",
        header: () => tCommon("actions"),
        cell: ({ row }) => {
          const doc = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditDocument(doc)}>
                  <Edit className="mr-2 size-3.5" />
                  {tCommon("edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePreview(doc)}>
                  <Eye className="mr-2 size-3.5" />
                  {t("preview")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDeleteDocument(doc)}
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
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1 size-4" />
            {tCommon("export")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 size-4" />
            {tCommon("print")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.refresh()}>
            <RefreshCw className="mr-1 size-4" />
            {tCommon("refresh")}
          </Button>
          <Button variant="default" size="sm" onClick={handleNewDocument}>
            <Plus className="mr-1 size-4" />
            {t("addNew")}
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder={t("filterCategory")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder={t("filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            <SelectItem value="aktif">{t("statusAktif")}</SelectItem>
            <SelectItem value="pasif">{t("statusPasif")}</SelectItem>
            <SelectItem value="taslak">{t("statusTaslak")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder={t("filterType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            <SelectItem value="vize">{t("typeVize")}</SelectItem>
            <SelectItem value="pasaport">{t("typePasaport")}</SelectItem>
            <SelectItem value="genel">{t("typeGenel")}</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder={t("searchPlaceholder")}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-9 w-[200px]"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={filteredData}
        pageSize={10}
        toolbarExtra={toolbar}
      />

      <DocumentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        document={formDocument}
        onSuccess={handleFormSuccess}
      />

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t("preview")}</DialogTitle>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
      </Dialog>

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
