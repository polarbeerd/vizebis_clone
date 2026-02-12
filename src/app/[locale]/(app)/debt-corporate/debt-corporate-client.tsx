"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import type { DebtCorporateRow } from "./page";

interface DebtCorporateClientProps {
  data: DebtCorporateRow[];
}

export function DebtCorporateClient({ data }: DebtCorporateClientProps) {
  const t = useTranslations("debtCorporate");
  const router = useRouter();

  const columns: ColumnDef<DebtCorporateRow, unknown>[] = React.useMemo(
    () => [
      {
        id: "rowNumber",
        header: "#",
        cell: ({ row }) => row.index + 1,
        enableSorting: false,
      },
      {
        accessorKey: "company_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("companyName")} />
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.getValue("company_name") ?? "-"}
          </span>
        ),
        enableSorting: true,
        filterFn: "includesString",
      },
      {
        accessorKey: "company_code",
        header: () => t("companyCode"),
        cell: ({ row }) => row.getValue("company_code") ?? "-",
        enableSorting: false,
      },
      {
        accessorKey: "email",
        header: () => t("email"),
        cell: ({ row }) => row.getValue("email") ?? "-",
        enableSorting: false,
      },
      {
        accessorKey: "phone",
        header: () => t("phone"),
        cell: ({ row }) => row.getValue("phone") ?? "-",
        enableSorting: false,
      },
      {
        accessorKey: "debt_tl",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("debtTL")} />
        ),
        cell: ({ row }) => {
          const val = row.getValue("debt_tl") as number;
          return val > 0 ? (
            <span className="font-medium text-red-600">
              {formatCurrency(val, "TL")}
            </span>
          ) : (
            "-"
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "debt_usd",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("debtUSD")} />
        ),
        cell: ({ row }) => {
          const val = row.getValue("debt_usd") as number;
          return val > 0 ? (
            <span className="font-medium text-red-600">
              {formatCurrency(val, "USD")}
            </span>
          ) : (
            "-"
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "debt_eur",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("debtEUR")} />
        ),
        cell: ({ row }) => {
          const val = row.getValue("debt_eur") as number;
          return val > 0 ? (
            <span className="font-medium text-red-600">
              {formatCurrency(val, "EUR")}
            </span>
          ) : (
            "-"
          );
        },
        enableSorting: true,
      },
      {
        id: "actions",
        header: () => t("viewDetails"),
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/debt-individual?company=${row.original.id}`)}
          >
            <Eye className="mr-1 size-3.5" />
            {t("viewDetails")}
          </Button>
        ),
        enableSorting: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, router]
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        searchKey="company_name"
        searchPlaceholder={t("searchPlaceholder")}
        pageSize={10}
        toolbarExtra={
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        }
      />
    </div>
  );
}
