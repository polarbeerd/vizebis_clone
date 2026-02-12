"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";

import { DataTable } from "@/components/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import type { CountryReportRow } from "./page";

const paymentStatusKeyMap: Record<string, string> = {
  odenmedi: "unpaid",
  odendi: "paid",
};

interface CountryReportsClientProps {
  data: CountryReportRow[];
  countries: string[];
}

export function CountryReportsClient({
  data,
  countries,
}: CountryReportsClientProps) {
  const t = useTranslations("countryReports");
  const tPayment = useTranslations("paymentStatus");

  const [selectedCountry, setSelectedCountry] = React.useState<string>("all");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

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

  const filteredData = React.useMemo(() => {
    let result = data;

    if (selectedCountry !== "all") {
      result = result.filter((row) => row.country === selectedCountry);
    }

    if (startDate && endDate) {
      const start = startOfDay(parseISO(startDate));
      const end = endOfDay(parseISO(endDate));
      result = result.filter((row) => {
        if (!row.appointment_date) return false;
        const d = parseISO(row.appointment_date);
        return isWithinInterval(d, { start, end });
      });
    }

    return result;
  }, [data, selectedCountry, startDate, endDate]);

  const columns: ColumnDef<CountryReportRow, unknown>[] = React.useMemo(
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
        accessorKey: "payment_status",
        header: () => t("paymentStatus"),
        cell: ({ row }) =>
          paymentStatusBadge(row.getValue("payment_status") as string | null),
        enableSorting: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tPayment]
  );

  const filterToolbar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder={t("allCountries")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCountries")}</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-9 w-[140px]"
          placeholder={t("startDate")}
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-9 w-[140px]"
          placeholder={t("endDate")}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={filteredData}
        searchKey="full_name"
        searchPlaceholder={t("searchPlaceholder")}
        pageSize={10}
        toolbarExtra={filterToolbar}
      />
    </div>
  );
}
