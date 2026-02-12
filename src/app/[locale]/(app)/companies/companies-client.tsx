"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Edit,
  MoreHorizontal,
  Plus,
  Power,
  Trash2,
  EyeOff,
  Eye,
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
import type { CompanyRow } from "./page";
import { CompanyForm } from "@/components/companies/company-form";
import type { CompanyForForm } from "@/components/companies/company-form";

interface CompaniesClientProps {
  data: CompanyRow[];
}

export function CompaniesClient({ data }: CompaniesClientProps) {
  const t = useTranslations("companies");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [showPassive, setShowPassive] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formCompany, setFormCompany] = React.useState<
    CompanyForForm | undefined
  >(undefined);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<CompanyRow | null>(
    null
  );
  const [deleting, setDeleting] = React.useState(false);

  const supabase = React.useMemo(() => createClient(), []);

  // Filter data based on passive toggle
  const filteredData = React.useMemo(() => {
    if (showPassive) return data;
    return data.filter((c) => c.is_active);
  }, [data, showPassive]);

  function handleNewCompany() {
    setFormCompany(undefined);
    setFormOpen(true);
  }

  function handleEditCompany(company: CompanyRow) {
    setFormCompany({
      id: company.id,
      company_code: company.company_code,
      company_name: company.company_name,
      phone: company.phone,
      email: company.email,
      tax_number: company.tax_number,
      tax_office: company.tax_office,
      customer_type: company.customer_type,
      password: company.password,
      province: company.province,
      district: company.district,
      address: company.address,
    });
    setFormOpen(true);
  }

  async function handleToggleActive(company: CompanyRow) {
    const { error } = await supabase
      .from("companies")
      .update({ is_active: !company.is_active })
      .eq("id", company.id);

    if (error) {
      toast.error(t("toggleActiveError"));
    } else {
      toast.success(t("toggleActiveSuccess"));
      router.refresh();
    }
  }

  function handleDeleteCompany(company: CompanyRow) {
    setDeleteTarget(company);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error("Error deleting company:", error);
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
  const columns: ColumnDef<CompanyRow, unknown>[] = React.useMemo(
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
        accessorKey: "company_code",
        header: () => t("companyCode"),
        cell: ({ row }) => row.getValue("company_code") ?? "-",
        enableSorting: false,
      },
      {
        accessorKey: "company_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("companyName")} />
        ),
        cell: ({ row }) => {
          const name = row.getValue("company_name") as string | null;
          const isActive = row.original.is_active;
          return (
            <div className="flex items-center gap-2">
              <span className="max-w-[200px] truncate font-medium">
                {name ?? "-"}
              </span>
              {!isActive && (
                <Badge variant="secondary" className="text-xs">
                  {tCommon("passive")}
                </Badge>
              )}
            </div>
          );
        },
        enableSorting: true,
        filterFn: "includesString",
      },
      {
        accessorKey: "phone",
        header: () => t("phone"),
        cell: ({ row }) => row.getValue("phone") ?? "-",
        enableSorting: false,
      },
      {
        id: "debt_tl",
        header: () => t("debtTL"),
        cell: () => <span className="text-muted-foreground">&mdash;</span>,
        enableSorting: false,
      },
      {
        id: "debt_usd",
        header: () => t("debtUSD"),
        cell: () => <span className="text-muted-foreground">&mdash;</span>,
        enableSorting: false,
      },
      {
        id: "debt_eur",
        header: () => t("debtEUR"),
        cell: () => <span className="text-muted-foreground">&mdash;</span>,
        enableSorting: false,
      },
      {
        accessorKey: "application_count",
        header: () => t("applicationCount"),
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.getValue("application_count") as number}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => tCommon("actions"),
        cell: ({ row }) => {
          const company = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleEditCompany(company)}
                >
                  <Edit className="mr-2 size-3.5" />
                  {tCommon("edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleToggleActive(company)}
                >
                  <Power className="mr-2 size-3.5" />
                  {company.is_active ? tCommon("passive") : tCommon("active")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDeleteCompany(company)}
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPassive((prev) => !prev)}
        >
          {showPassive ? (
            <EyeOff className="mr-1 size-4" />
          ) : (
            <Eye className="mr-1 size-4" />
          )}
          {showPassive ? t("hidePassive") : t("showPassive")}
        </Button>
        <Button variant="default" size="sm" onClick={handleNewCompany}>
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
        data={filteredData}
        searchKey="company_name"
        searchPlaceholder={t("searchPlaceholder")}
        pageSize={10}
        toolbarExtra={toolbar}
      />

      <CompanyForm
        open={formOpen}
        onOpenChange={setFormOpen}
        company={formCompany}
        onSuccess={handleFormSuccess}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDescription", {
                name: deleteTarget?.company_name ?? "",
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
