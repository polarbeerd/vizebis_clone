"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Copy, Edit, Plus, Trash2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table/data-table";
import type { ChecklistRow, CountryOption } from "./page";
import {
  ChecklistItemForm,
  type ChecklistItemForForm,
} from "@/components/document-checklists/checklist-item-form";

interface DocumentChecklistsClientProps {
  data: ChecklistRow[];
  countries: CountryOption[];
}

export function DocumentChecklistsClient({
  data,
  countries,
}: DocumentChecklistsClientProps) {
  const t = useTranslations("documentChecklists");
  const tCommon = useTranslations("common");
  const tVisaType = useTranslations("visaType");
  const router = useRouter();

  const supabase = React.useMemo(() => createClient(), []);

  // Filter state
  const [selectedCountry, setSelectedCountry] = React.useState("");
  const [selectedVisaType, setSelectedVisaType] = React.useState("");

  // Form dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [formItem, setFormItem] = React.useState<
    ChecklistItemForForm | undefined
  >(undefined);

  // Delete dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ChecklistRow | null>(
    null
  );
  const [deleting, setDeleting] = React.useState(false);

  // Copy dialog state
  const [copyDialogOpen, setCopyDialogOpen] = React.useState(false);
  const [sourceCountry, setSourceCountry] = React.useState("");
  const [sourceVisaType, setSourceVisaType] = React.useState("");
  const [copying, setCopying] = React.useState(false);

  const visaTypes = [
    { value: "kultur", label: tVisaType("kultur") },
    { value: "ticari", label: tVisaType("ticari") },
    { value: "turistik", label: tVisaType("turistik") },
    { value: "ziyaret", label: tVisaType("ziyaret") },
    { value: "diger", label: tVisaType("diger") },
  ];

  // Filter data by selected country + visa type
  const filteredData = React.useMemo(() => {
    if (!selectedCountry || !selectedVisaType) return [];
    return data.filter(
      (item) =>
        item.country === selectedCountry &&
        item.visa_type === selectedVisaType
    );
  }, [data, selectedCountry, selectedVisaType]);

  const bothSelected = selectedCountry !== "" && selectedVisaType !== "";

  // Columns
  const columns: ColumnDef<ChecklistRow>[] = React.useMemo(
    () => [
      {
        accessorKey: "sort_order",
        header: () => t("sortOrder"),
        cell: ({ row }) => row.getValue("sort_order"),
        enableSorting: true,
      },
      {
        accessorKey: "name",
        header: () => t("itemName"),
        cell: ({ row }) => row.getValue("name"),
        enableSorting: true,
      },
      {
        accessorKey: "description",
        header: () => t("itemDescription"),
        cell: ({ row }) => {
          const desc = row.getValue("description") as string | null;
          if (!desc) return "-";
          return desc.length > 50 ? desc.slice(0, 50) + "..." : desc;
        },
        enableSorting: false,
      },
      {
        accessorKey: "is_required",
        header: () => t("isRequired"),
        cell: ({ row }) => {
          const required = row.getValue("is_required") as boolean;
          return required ? (
            <Badge variant="default">{t("isRequired")}</Badge>
          ) : (
            <Badge variant="secondary">{t("optional")}</Badge>
          );
        },
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => tCommon("actions"),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleEdit(item)}
              >
                <Edit className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleDelete(item)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tCommon]
  );

  function handleAdd() {
    setFormItem(undefined);
    setFormOpen(true);
  }

  function handleEdit(item: ChecklistRow) {
    setFormItem({
      id: item.id,
      name: item.name,
      description: item.description,
      is_required: item.is_required,
      sort_order: item.sort_order,
    });
    setFormOpen(true);
  }

  function handleDelete(item: ChecklistRow) {
    setDeleteTarget(item);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("document_checklists")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error("Error deleting checklist item:", error);
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

  async function handleCopyChecklist() {
    if (!sourceCountry || !sourceVisaType) return;
    setCopying(true);

    const { data: sourceItems } = await supabase
      .from("document_checklists")
      .select("name, description, is_required, sort_order")
      .eq("country", sourceCountry)
      .eq("visa_type", sourceVisaType)
      .order("sort_order");

    if (!sourceItems?.length) {
      toast.error(t("noItems"));
      setCopying(false);
      return;
    }

    const { error } = await supabase.from("document_checklists").insert(
      sourceItems.map((item: Record<string, unknown>) => ({
        country: selectedCountry,
        visa_type: selectedVisaType,
        name: item.name,
        description: item.description,
        is_required: item.is_required,
        sort_order: item.sort_order,
      }))
    );

    if (error) {
      console.error("Error copying checklist:", error);
      toast.error(t("saveError"));
    } else {
      toast.success(t("copySuccess"));
      router.refresh();
    }

    setCopying(false);
    setCopyDialogOpen(false);
    setSourceCountry("");
    setSourceVisaType("");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCopyDialogOpen(true)}
            disabled={!bothSelected}
          >
            <Copy className="mr-1 size-4" />
            {t("copyChecklist")}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleAdd}
            disabled={!bothSelected}
          >
            <Plus className="mr-1 size-4" />
            {t("addItem")}
          </Button>
        </div>
      </div>

      {/* Filters: Country + Visa Type */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue placeholder={t("selectCountry")} />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.id} value={country.name}>
                {country.flag_emoji ? `${country.flag_emoji} ` : ""}
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedVisaType} onValueChange={setSelectedVisaType}>
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue placeholder={t("selectVisaType")} />
          </SelectTrigger>
          <SelectContent>
            {visaTypes.map((vt) => (
              <SelectItem key={vt.value} value={vt.value}>
                {vt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table or empty state */}
      {bothSelected ? (
        filteredData.length > 0 ? (
          <DataTable
            columns={columns}
            data={filteredData}
            searchKey="name"
            searchPlaceholder={t("itemName")}
          />
        ) : (
          <div className="flex items-center justify-center rounded-md border border-dashed p-12">
            <p className="text-muted-foreground">{t("noItems")}</p>
          </div>
        )
      ) : (
        <div className="flex items-center justify-center rounded-md border border-dashed p-12">
          <p className="text-muted-foreground">
            {t("selectCountry")} & {t("selectVisaType")}
          </p>
        </div>
      )}

      {/* Create/Edit Form Dialog */}
      <ChecklistItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        item={formItem}
        country={selectedCountry}
        visaType={selectedVisaType}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
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

      {/* Copy Checklist Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("copyChecklist")}</DialogTitle>
            <DialogDescription>{t("copyFrom")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("sourceCountry")}
              </label>
              <Select value={sourceCountry} onValueChange={setSourceCountry}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("selectCountry")} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.name}>
                      {country.flag_emoji ? `${country.flag_emoji} ` : ""}
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("sourceVisaType")}
              </label>
              <Select
                value={sourceVisaType}
                onValueChange={setSourceVisaType}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("selectVisaType")} />
                </SelectTrigger>
                <SelectContent>
                  {visaTypes.map((vt) => (
                    <SelectItem key={vt.value} value={vt.value}>
                      {vt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCopyDialogOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleCopyChecklist}
              disabled={copying || !sourceCountry || !sourceVisaType}
            >
              {copying ? tCommon("loading") : t("copy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
