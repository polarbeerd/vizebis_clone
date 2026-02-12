"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Calendar,
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  startOfDay,
  endOfDay,
  isWithinInterval,
  differenceInDays,
  parseISO,
  isBefore,
} from "date-fns";

import { DataTable } from "@/components/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { FilterableColumn } from "@/components/data-table/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ApplicationRow } from "./page";

// ── Visa status → translation key map ──────────────────────────
const visaStatusKeyMap: Record<string, string> = {
  beklemede: "pending",
  hazirlaniyor: "preparing",
  konsoloslukta: "atConsulate",
  vize_cikti: "approved",
  ret_oldu: "rejected",
  pasaport_teslim: "passportDelivered",
};

// ── Invoice status → translation key map ────────────────────────
const invoiceStatusKeyMap: Record<string, string> = {
  fatura_yok: "none",
  fatura_var: "exists",
  fatura_kesildi: "issued",
};

// ── Payment status → translation key map ────────────────────────
const paymentStatusKeyMap: Record<string, string> = {
  odenmedi: "unpaid",
  odendi: "paid",
};

// ── Date filter type ────────────────────────────────────────────
type DateFilterType =
  | "all"
  | "today"
  | "this_month"
  | "last_month"
  | "next_month"
  | "custom";

interface ApplicationsClientProps {
  data: ApplicationRow[];
}

export function ApplicationsClient({ data }: ApplicationsClientProps) {
  const t = useTranslations("applications");
  const tVisa = useTranslations("visaStatus");
  const tInvoice = useTranslations("invoiceStatus");
  const tPayment = useTranslations("paymentStatus");
  const tCommon = useTranslations("common");

  // ── Date quick-filter state ──────────────────────────────────
  const [dateFilter, setDateFilter] = React.useState<DateFilterType>("all");
  const [customStart, setCustomStart] = React.useState("");
  const [customEnd, setCustomEnd] = React.useState("");

  // ── Filter data by appointment_date ──────────────────────────
  const filteredData = React.useMemo(() => {
    if (dateFilter === "all") return data;

    const now = new Date();

    let start: Date;
    let end: Date;

    switch (dateFilter) {
      case "today":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "this_month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "last_month":
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case "next_month":
        start = startOfMonth(addMonths(now, 1));
        end = endOfMonth(addMonths(now, 1));
        break;
      case "custom":
        if (!customStart || !customEnd) return data;
        start = startOfDay(parseISO(customStart));
        end = endOfDay(parseISO(customEnd));
        break;
      default:
        return data;
    }

    return data.filter((row) => {
      if (!row.appointment_date) return false;
      const d = parseISO(row.appointment_date);
      return isWithinInterval(d, { start, end });
    });
  }, [data, dateFilter, customStart, customEnd]);

  // ── Visa status badge styling ─────────────────────────────────
  function visaStatusBadge(status: string | null) {
    if (!status) return null;
    const key = visaStatusKeyMap[status] ?? status;
    const label = tVisa(key as Parameters<typeof tVisa>[0]);

    const colorMap: Record<string, string> = {
      beklemede: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      hazirlaniyor: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      konsoloslukta:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      vize_cikti:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      ret_oldu:
        "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      pasaport_teslim:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
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
      fatura_var:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      fatura_kesildi:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
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

  // ── Column definitions ────────────────────────────────────────
  const columns: ColumnDef<ApplicationRow, unknown>[] = React.useMemo(
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
        accessorKey: "full_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("fullName")} />
        ),
        cell: ({ row }) => {
          const name = row.getValue("full_name") as string | null;
          const appointmentDate = row.original.appointment_date;
          const now = new Date();
          let warningIcon = null;

          if (appointmentDate) {
            const apptDate = parseISO(appointmentDate);
            const daysUntil = differenceInDays(apptDate, now);
            if (daysUntil >= 0 && daysUntil <= 10) {
              warningIcon = (
                <AlertTriangle className="ml-1 inline size-3.5 text-red-500" />
              );
            }
          }

          return (
            <div className="flex items-center">
              <span className="max-w-[180px] truncate font-medium">
                {name ?? "-"}
              </span>
              {warningIcon}
            </div>
          );
        },
        enableSorting: true,
        filterFn: "includesString",
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
        accessorKey: "phone",
        header: () => t("phone"),
        cell: ({ row }) => row.getValue("phone") ?? "-",
        enableSorting: false,
      },
      {
        id: "fee",
        header: () => t("fee"),
        cell: ({ row }) => {
          const consulate = row.original.consulate_fee ?? 0;
          const service = row.original.service_fee ?? 0;
          const currency = (row.original.currency ?? "TL") as
            | "TL"
            | "USD"
            | "EUR";
          return (
            <div className="text-right text-xs">
              <div>{formatCurrency(consulate, currency)}</div>
              <div className="text-muted-foreground">
                + {formatCurrency(service, currency)}
              </div>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "invoice_status",
        header: () => t("invoiceStatus"),
        cell: ({ row }) =>
          invoiceStatusBadge(row.getValue("invoice_status") as string | null),
        filterFn: (row, id, value: string[]) => {
          return value.includes(row.getValue(id) as string);
        },
        enableSorting: false,
      },
      {
        accessorKey: "payment_status",
        header: () => t("paymentStatus"),
        cell: ({ row }) =>
          paymentStatusBadge(row.getValue("payment_status") as string | null),
        filterFn: (row, id, value: string[]) => {
          return value.includes(row.getValue(id) as string);
        },
        enableSorting: false,
      },
      {
        accessorKey: "visa_status",
        header: () => t("visaStatus"),
        cell: ({ row }) =>
          visaStatusBadge(row.getValue("visa_status") as string | null),
        filterFn: (row, id, value: string[]) => {
          return value.includes(row.getValue(id) as string);
        },
        enableSorting: false,
      },
      {
        accessorKey: "notes",
        header: () => t("notes"),
        cell: ({ row }) => {
          const notes = row.getValue("notes") as string | null;
          if (!notes) return "-";
          return (
            <span
              className="max-w-[120px] truncate block"
              title={notes}
            >
              {notes}
            </span>
          );
        },
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => tCommon("actions"),
        cell: ({ row }) => {
          const application = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    // TODO: View application detail
                    console.log("View", application.id);
                  }}
                >
                  <Eye className="mr-2 size-3.5" />
                  {tCommon("view")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    // TODO: Edit application
                    console.log("Edit", application.id);
                  }}
                >
                  <Edit className="mr-2 size-3.5" />
                  {tCommon("edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    // TODO: Delete application
                    console.log("Delete", application.id);
                  }}
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
    [t, tVisa, tInvoice, tPayment, tCommon]
  );

  // ── Filterable columns config ─────────────────────────────────
  const filterableColumns: FilterableColumn[] = React.useMemo(
    () => [
      {
        id: "visa_status",
        title: t("visaStatus"),
        options: [
          { label: tVisa("pending"), value: "beklemede" },
          { label: tVisa("preparing"), value: "hazirlaniyor" },
          { label: tVisa("atConsulate"), value: "konsoloslukta" },
          { label: tVisa("approved"), value: "vize_cikti" },
          { label: tVisa("rejected"), value: "ret_oldu" },
          { label: tVisa("passportDelivered"), value: "pasaport_teslim" },
        ],
      },
      {
        id: "invoice_status",
        title: t("invoiceStatus"),
        options: [
          { label: tInvoice("none"), value: "fatura_yok" },
          { label: tInvoice("exists"), value: "fatura_var" },
          { label: tInvoice("issued"), value: "fatura_kesildi" },
        ],
      },
      {
        id: "payment_status",
        title: t("paymentStatus"),
        options: [
          { label: tPayment("unpaid"), value: "odenmedi" },
          { label: tPayment("paid"), value: "odendi" },
        ],
      },
    ],
    [t, tVisa, tInvoice, tPayment]
  );

  // ── Row color-coding based on visa_status + appointment proximity ─
  function getRowClassName(row: ApplicationRow): string {
    const now = new Date();

    // Check appointment proximity first (highest priority for visual warning)
    if (row.appointment_date) {
      const apptDate = parseISO(row.appointment_date);
      if (isBefore(apptDate, startOfDay(now))) {
        return "bg-gray-100 dark:bg-gray-900/40";
      }
      const daysUntil = differenceInDays(apptDate, now);
      if (daysUntil >= 0 && daysUntil <= 10) {
        return "bg-red-50 dark:bg-red-950/30";
      }
    }

    // Visa status based coloring
    switch (row.visa_status) {
      case "pasaport_teslim":
        return "bg-green-50 dark:bg-green-950/20";
      case "vize_cikti":
        return "bg-blue-50 dark:bg-blue-950/20";
      case "konsoloslukta":
        return "bg-yellow-50 dark:bg-yellow-950/20";
      case "ret_oldu":
        return "bg-red-50 dark:bg-red-950/20";
      default:
        return "";
    }
  }

  // ── CSV export ────────────────────────────────────────────────
  function handleExportCsv() {
    const headers = [
      "ID",
      t("fullName"),
      t("passportNo"),
      t("company"),
      t("country"),
      t("appointmentDate"),
      t("pickupDate"),
      t("phone"),
      t("consulateFee"),
      t("serviceFee"),
      t("currency"),
      t("invoiceStatus"),
      t("paymentStatus"),
      t("visaStatus"),
      t("notes"),
    ];

    const csvRows = filteredData.map((row) =>
      [
        row.id,
        row.full_name ?? "",
        row.passport_no ?? "",
        row.company_name ?? "",
        row.country ?? "",
        row.appointment_date ?? "",
        row.pickup_date ?? "",
        row.phone ?? "",
        row.consulate_fee ?? "",
        row.service_fee ?? "",
        row.currency ?? "",
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
    link.download = `applications_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // ── Date quick-filter toolbar ──────────────────────────────────
  const dateFilterToolbar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            // TODO: Navigate to new application form
            console.log("New application");
          }}
        >
          <Plus className="mr-1 size-4" />
          {t("addNew")}
        </Button>
      </div>
    </div>
  );

  const dateQuickFilters = (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className="size-4 text-muted-foreground" />
      {(
        [
          ["all", t("allDates")],
          ["today", t("today")],
          ["this_month", t("thisMonth")],
          ["last_month", t("lastMonth")],
          ["next_month", t("nextMonth")],
          ["custom", t("dateRange")],
        ] as [DateFilterType, string][]
      ).map(([value, label]) => (
        <Button
          key={value}
          variant={dateFilter === value ? "default" : "outline"}
          size="sm"
          onClick={() => setDateFilter(value)}
        >
          {label}
        </Button>
      ))}
      {dateFilter === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="h-8 w-[140px]"
            placeholder={t("startDate")}
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-8 w-[140px]"
            placeholder={t("endDate")}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={filteredData}
        searchKey="full_name"
        searchPlaceholder={t("searchPlaceholder")}
        filterableColumns={filterableColumns}
        pageSize={10}
        onExportCsv={handleExportCsv}
        rowClassName={getRowClassName}
        toolbarExtra={
          <div className="space-y-3">
            {dateFilterToolbar}
            {dateQuickFilters}
          </div>
        }
      />
    </div>
  );
}
