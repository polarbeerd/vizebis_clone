"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Edit,
  ExternalLink,
  MoreHorizontal,
  Plus,
  Trash2,
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
import { formatDate } from "@/lib/utils";
import type { AppointmentRow } from "./page";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import type { AppointmentForForm } from "@/components/appointments/appointment-form";

// Payment status key map
const paymentStatusKeyMap: Record<string, string> = {
  beklemede: "pending",
  odendi: "paid",
  iptal: "cancelled",
};

interface AppointmentsClientProps {
  data: AppointmentRow[];
}

export function AppointmentsClient({ data }: AppointmentsClientProps) {
  const t = useTranslations("appointments");
  const tPayment = useTranslations("appointmentPayment");
  const tVisaType = useTranslations("visaType");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [formOpen, setFormOpen] = React.useState(false);
  const [formAppointment, setFormAppointment] = React.useState<
    AppointmentForForm | undefined
  >(undefined);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] =
    React.useState<AppointmentRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const supabase = React.useMemo(() => createClient(), []);

  function handleNewAppointment() {
    setFormAppointment(undefined);
    setFormOpen(true);
  }

  function handleEditAppointment(appt: AppointmentRow) {
    setFormAppointment({
      id: appt.id,
      full_name: appt.full_name,
      passport_no: appt.passport_no,
      id_number: appt.id_number,
      date_of_birth: appt.date_of_birth,
      email: appt.email,
      passport_expiry: appt.passport_expiry,
      company_name: appt.company_name,
      country: appt.country,
      visa_type: appt.visa_type,
      travel_date: appt.travel_date,
      appointment_date: appt.appointment_date,
      payment_status: appt.payment_status,
      notes: appt.notes,
      passport_photo: appt.passport_photo,
    });
    setFormOpen(true);
  }

  function handleDeleteAppointment(appt: AppointmentRow) {
    setDeleteTarget(appt);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error("Error deleting appointment:", error);
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

  // Visa type label map
  const visaTypeKeyMap: Record<string, string> = {
    kultur: "cultural",
    ticari: "commercial",
    turistik: "tourist",
    ziyaret: "visit",
    diger: "other",
  };

  // Payment status badge
  function paymentBadge(status: string | null) {
    if (!status) return null;
    const key = paymentStatusKeyMap[status] ?? status;
    const label = tPayment(key as Parameters<typeof tPayment>[0]);

    const colorMap: Record<string, string> = {
      beklemede:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      odendi:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      iptal: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };

    return (
      <Badge variant="outline" className={colorMap[status] ?? ""}>
        {label}
      </Badge>
    );
  }

  // Column definitions
  const columns: ColumnDef<AppointmentRow, unknown>[] = React.useMemo(
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
        header: () => t("fullName"),
        cell: ({ row }) => (
          <span className="max-w-[150px] truncate font-medium block">
            {(row.getValue("full_name") as string | null) ?? "-"}
          </span>
        ),
        enableSorting: false,
        filterFn: "includesString",
      },
      {
        accessorKey: "passport_no",
        header: () => t("passportNo"),
        cell: ({ row }) => row.getValue("passport_no") ?? "-",
        enableSorting: false,
      },
      {
        accessorKey: "id_number",
        header: () => t("idNumber"),
        cell: ({ row }) => row.getValue("id_number") ?? "-",
        enableSorting: false,
      },
      {
        accessorKey: "date_of_birth",
        header: () => t("dateOfBirth"),
        cell: ({ row }) => {
          const date = row.getValue("date_of_birth") as string | null;
          return date ? formatDate(date) : "-";
        },
        enableSorting: false,
      },
      {
        accessorKey: "email",
        header: () => t("email"),
        cell: ({ row }) => row.getValue("email") ?? "-",
        enableSorting: false,
      },
      {
        accessorKey: "passport_expiry",
        header: () => t("passportExpiry"),
        cell: ({ row }) => {
          const date = row.getValue("passport_expiry") as string | null;
          return date ? formatDate(date) : "-";
        },
        enableSorting: false,
      },
      {
        accessorKey: "company_name",
        header: () => t("companyName"),
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
        accessorKey: "visa_type",
        header: () => t("visaType"),
        cell: ({ row }) => {
          const type = row.getValue("visa_type") as string | null;
          if (!type) return "-";
          const key = visaTypeKeyMap[type] ?? type;
          return tVisaType(key as Parameters<typeof tVisaType>[0]);
        },
        enableSorting: false,
      },
      {
        accessorKey: "travel_date",
        header: () => t("travelDate"),
        cell: ({ row }) => {
          const date = row.getValue("travel_date") as string | null;
          return date ? formatDate(date) : "-";
        },
        enableSorting: false,
      },
      {
        accessorKey: "appointment_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("appointmentDate")}
          />
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
          paymentBadge(row.getValue("payment_status") as string | null),
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
        accessorKey: "passport_photo",
        header: () => t("passportPhoto"),
        cell: ({ row }) => {
          const photo = row.getValue("passport_photo") as string | null;
          if (!photo) return <span className="text-muted-foreground">{t("noPhoto")}</span>;
          return (
            <a
              href={photo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
            >
              <ExternalLink className="size-3" />
              {t("viewPhoto")}
            </a>
          );
        },
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => tCommon("actions"),
        cell: ({ row }) => {
          const appt = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleEditAppointment(appt)}
                >
                  <Edit className="mr-2 size-3.5" />
                  {tCommon("edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDeleteAppointment(appt)}
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
    [t, tPayment, tVisaType, tCommon]
  );

  const toolbar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" onClick={handleNewAppointment}>
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
        data={data}
        searchKey="full_name"
        searchPlaceholder={t("searchPlaceholder")}
        pageSize={10}
        toolbarExtra={toolbar}
      />

      <AppointmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={formAppointment}
        onSuccess={handleFormSuccess}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDescription", {
                name: deleteTarget?.full_name ?? "",
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
