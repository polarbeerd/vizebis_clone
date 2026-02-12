"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DebtIndividualRow } from "./page";

const visaStatusKeyMap: Record<string, string> = {
  beklemede: "pending",
  hazirlaniyor: "preparing",
  konsoloslukta: "atConsulate",
  vize_cikti: "approved",
  ret_oldu: "rejected",
  pasaport_teslim: "passportDelivered",
};

const invoiceStatusKeyMap: Record<string, string> = {
  fatura_yok: "none",
  fatura_var: "exists",
  fatura_kesildi: "issued",
};

const paymentStatusKeyMap: Record<string, string> = {
  odenmedi: "unpaid",
  odendi: "paid",
};

interface DebtIndividualClientProps {
  data: DebtIndividualRow[];
}

export function DebtIndividualClient({ data }: DebtIndividualClientProps) {
  const t = useTranslations("debtIndividual");
  const tVisa = useTranslations("visaStatus");
  const tInvoice = useTranslations("invoiceStatus");
  const tPayment = useTranslations("paymentStatus");

  function visaStatusBadge(status: string | null) {
    if (!status) return null;
    const key = visaStatusKeyMap[status] ?? status;
    const label = tVisa(key as Parameters<typeof tVisa>[0]);
    const colorMap: Record<string, string> = {
      beklemede: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      hazirlaniyor: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      konsoloslukta: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      vize_cikti: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      ret_oldu: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      pasaport_teslim: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    };
    return (
      <Badge variant="outline" className={colorMap[status] ?? ""}>
        {label}
      </Badge>
    );
  }

  function invoiceStatusBadge(status: string | null) {
    if (!status) return null;
    const key = invoiceStatusKeyMap[status] ?? status;
    const label = tInvoice(key as Parameters<typeof tInvoice>[0]);
    const colorMap: Record<string, string> = {
      fatura_yok: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      fatura_var: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      fatura_kesildi: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    };
    return (
      <Badge variant="outline" className={colorMap[status] ?? ""}>
        {label}
      </Badge>
    );
  }

  function paymentStatusBadge(status: string | null) {
    if (!status) return null;
    const key = paymentStatusKeyMap[status] ?? status;
    const label = tPayment(key as Parameters<typeof tPayment>[0]);
    const colorMap: Record<string, string> = {
      odenmedi: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      odendi: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    };
    return (
      <Badge variant="outline" className={colorMap[status] ?? ""}>
        {label}
      </Badge>
    );
  }

  const columns: ColumnDef<DebtIndividualRow, unknown>[] = React.useMemo(
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
          <span className="max-w-[160px] truncate font-medium block">
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
      {
        accessorKey: "appointment_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("appointmentDate")} />
        ),
        cell: ({ row }) => {
          const date = row.getValue("appointment_date") as string | null;
          return date ? formatDate(date) : "-";
        },
        enableSorting: true,
      },
      {
        accessorKey: "pickup_date",
        header: () => t("pickupDate"),
        cell: ({ row }) => {
          const date = row.getValue("pickup_date") as string | null;
          return date ? formatDate(date) : "-";
        },
        enableSorting: false,
      },
      {
        accessorKey: "consulate_fee",
        header: () => t("consulateFee"),
        cell: ({ row }) => {
          const fee = row.original.consulate_fee ?? 0;
          const currency = (row.original.currency ?? "TL") as "TL" | "USD" | "EUR";
          return formatCurrency(fee, currency);
        },
        enableSorting: false,
      },
      {
        accessorKey: "service_fee",
        header: () => t("serviceFee"),
        cell: ({ row }) => {
          const fee = row.original.service_fee ?? 0;
          const currency = (row.original.currency ?? "TL") as "TL" | "USD" | "EUR";
          return formatCurrency(fee, currency);
        },
        enableSorting: false,
      },
      {
        accessorKey: "invoice_status",
        header: () => t("invoiceStatus"),
        cell: ({ row }) =>
          invoiceStatusBadge(row.getValue("invoice_status") as string | null),
        enableSorting: false,
      },
      {
        accessorKey: "payment_status",
        header: () => t("paymentStatus"),
        cell: ({ row }) =>
          paymentStatusBadge(row.getValue("payment_status") as string | null),
        enableSorting: false,
      },
      {
        accessorKey: "visa_status",
        header: () => t("visaStatus"),
        cell: ({ row }) =>
          visaStatusBadge(row.getValue("visa_status") as string | null),
        enableSorting: false,
      },
      {
        accessorKey: "notes",
        header: () => t("notes"),
        cell: ({ row }) => {
          const notes = row.getValue("notes") as string | null;
          if (!notes) return "-";
          return (
            <span className="max-w-[120px] truncate block" title={notes}>
              {notes}
            </span>
          );
        },
        enableSorting: false,
      },
      {
        id: "passport_photo",
        header: () => t("passportPhoto"),
        cell: ({ row }) => {
          const url = row.original.passport_photo;
          if (!url) return <span className="text-muted-foreground">{t("noPhoto")}</span>;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
            >
              {t("viewPhoto")} <ExternalLink className="size-3" />
            </a>
          );
        },
        enableSorting: false,
      },
      {
        id: "visa_photo",
        header: () => t("visaPhoto"),
        cell: ({ row }) => {
          const url = row.original.visa_photo;
          if (!url) return <span className="text-muted-foreground">{t("noPhoto")}</span>;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
            >
              {t("viewPhoto")} <ExternalLink className="size-3" />
            </a>
          );
        },
        enableSorting: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tVisa, tInvoice, tPayment]
  );

  function handleExportCsv() {
    const headers = [
      "#",
      t("fullName"),
      t("phone"),
      t("passportNo"),
      t("company"),
      t("country"),
      t("appointmentDate"),
      t("pickupDate"),
      t("consulateFee"),
      t("serviceFee"),
      t("invoiceStatus"),
      t("paymentStatus"),
      t("visaStatus"),
      t("notes"),
    ];

    const csvRows = data.map((row, i) =>
      [
        i + 1,
        row.full_name ?? "",
        row.phone ?? "",
        row.passport_no ?? "",
        row.company_name ?? "",
        row.country ?? "",
        row.appointment_date ?? "",
        row.pickup_date ?? "",
        row.consulate_fee ?? "",
        row.service_fee ?? "",
        row.invoice_status ?? "",
        row.payment_status ?? "",
        row.visa_status ?? "",
        (row.notes ?? "").replace(/"/g, '""'),
      ]
        .map((val) => `"${val}"`)
        .join(",")
    );

    const csvContent = [headers.map((h) => `"${h}"`).join(","), ...csvRows].join(
      "\n"
    );

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `debt_individual_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        searchKey="full_name"
        searchPlaceholder={t("searchPlaceholder")}
        pageSize={10}
        onExportCsv={handleExportCsv}
        toolbarExtra={
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        }
      />
    </div>
  );
}
