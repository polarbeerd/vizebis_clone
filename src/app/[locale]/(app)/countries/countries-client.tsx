"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Edit, MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
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
import type { CountryRow } from "./page";
import { CountryForm } from "@/components/countries/country-form";
import type { CountryForForm } from "@/components/countries/country-form";

interface CountriesClientProps {
  data: CountryRow[];
}

export function CountriesClient({ data }: CountriesClientProps) {
  const t = useTranslations("countries");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [formOpen, setFormOpen] = React.useState(false);
  const [formCountry, setFormCountry] = React.useState<
    CountryForForm | undefined
  >(undefined);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<CountryRow | null>(
    null
  );
  const [deleting, setDeleting] = React.useState(false);

  const supabase = React.useMemo(() => createClient(), []);

  function handleNewCountry() {
    setFormCountry(undefined);
    setFormOpen(true);
  }

  function handleEditCountry(country: CountryRow) {
    setFormCountry({
      id: country.id,
      name: country.name,
      flag_emoji: country.flag_emoji,
      is_active: country.is_active,
      sort_order: country.sort_order,
      service_fee: country.service_fee,
      consulate_fee: country.consulate_fee,
      currency: country.currency,
    });
    setFormOpen(true);
  }

  function handleDeleteCountry(country: CountryRow) {
    setDeleteTarget(country);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("countries")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error("Error deleting country:", error);
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

  // Column definitions
  const columns: ColumnDef<CountryRow, unknown>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: () => t("countryName"),
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="text-lg">
              {row.original.flag_emoji || "\ud83c\udff3\ufe0f"}
            </span>
            <span className="font-medium">{row.getValue("name")}</span>
          </span>
        ),
        filterFn: "includesString",
      },
      {
        accessorKey: "is_active",
        header: () => t("isActive"),
        cell: ({ row }) => (
          <Badge
            variant={row.getValue("is_active") ? "default" : "secondary"}
          >
            {row.getValue("is_active") ? tCommon("active") : tCommon("passive")}
          </Badge>
        ),
      },
      {
        accessorKey: "service_fee",
        header: () => t("serviceFee"),
        cell: ({ row }) => {
          const fee = Number(row.original.service_fee) || 0;
          const cur = (row.original.currency as "TL" | "USD" | "EUR") || "EUR";
          return fee > 0 ? formatCurrency(fee, cur) : "—";
        },
      },
      {
        accessorKey: "consulate_fee",
        header: () => t("consulateFee"),
        cell: ({ row }) => {
          const fee = Number(row.original.consulate_fee) || 0;
          const cur = (row.original.currency as "TL" | "USD" | "EUR") || "EUR";
          return fee > 0 ? formatCurrency(fee, cur) : "—";
        },
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
          const country = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleEditCountry(country)}
                >
                  <Edit className="mr-2 size-3.5" />
                  {tCommon("edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDeleteCountry(country)}
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
        <Button variant="default" size="sm" onClick={handleNewCountry}>
          <Plus className="mr-1 size-4" />
          {t("addCountry")}
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

      <CountryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        country={formCountry}
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
