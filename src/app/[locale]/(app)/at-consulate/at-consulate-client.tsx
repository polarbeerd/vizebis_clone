"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { AtConsulateRow } from "./page";

interface AtConsulateClientProps {
  data: AtConsulateRow[];
}

export function AtConsulateClient({ data }: AtConsulateClientProps) {
  const t = useTranslations("atConsulate");

  const columns: ColumnDef<AtConsulateRow, unknown>[] = React.useMemo(
    () => [
      {
        id: "rowNumber",
        header: "#",
        cell: ({ row }) => row.index + 1,
        enableSorting: false,
      },
      {
        accessorKey: "full_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("fullName")} />
        ),
        cell: ({ row }) => (
          <span className="max-w-[180px] truncate font-medium block">
            {row.getValue("full_name") ?? "-"}
          </span>
        ),
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
        accessorKey: "passport_no",
        header: () => t("passportNo"),
        cell: ({ row }) => row.getValue("passport_no") ?? "-",
        enableSorting: false,
      },
      {
        accessorKey: "consulate_app_no",
        header: () => t("consulateAppNo"),
        cell: ({ row }) => row.getValue("consulate_app_no") ?? "-",
        enableSorting: false,
      },
      {
        accessorKey: "company_name",
        header: () => t("company"),
        cell: ({ row }) => row.getValue("company_name") ?? "-",
        enableSorting: false,
      },
      {
        accessorKey: "country",
        header: () => t("country"),
        cell: ({ row }) => row.getValue("country") ?? "-",
        enableSorting: false,
      },
    ],
    [t]
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        searchKey="full_name"
        searchPlaceholder={t("searchPlaceholder")}
        pageSize={10}
        toolbarExtra={
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        }
      />
    </div>
  );
}
