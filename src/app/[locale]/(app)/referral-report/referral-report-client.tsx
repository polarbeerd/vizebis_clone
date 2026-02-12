"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Edit, MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { ReferralRow, ReferralPerformance } from "./page";

interface ReferralReportClientProps {
  referrals: ReferralRow[];
  performance: ReferralPerformance[];
}

export function ReferralReportClient({
  referrals,
  performance,
}: ReferralReportClientProps) {
  const t = useTranslations("referralReport");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const supabase = React.useMemo(() => createClient(), []);

  // ── Form dialog state ────────────────────────────────────────
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingRef, setEditingRef] = React.useState<ReferralRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [formName, setFormName] = React.useState("");
  const [formPhone, setFormPhone] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formCommission, setFormCommission] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formActive, setFormActive] = React.useState(true);

  // ── Delete dialog state ──────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ReferralRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  function openAddDialog() {
    setEditingRef(null);
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormCommission("");
    setFormDescription("");
    setFormActive(true);
    setFormOpen(true);
  }

  function openEditDialog(ref: ReferralRow) {
    setEditingRef(ref);
    setFormName(ref.name ?? "");
    setFormPhone(ref.phone ?? "");
    setFormEmail(ref.email ?? "");
    setFormCommission(ref.commission_rate?.toString() ?? "");
    setFormDescription(ref.description ?? "");
    setFormActive(ref.is_active);
    setFormOpen(true);
  }

  async function handleSave() {
    setSaving(true);

    const payload = {
      name: formName || null,
      phone: formPhone || null,
      email: formEmail || null,
      commission_rate: formCommission ? parseFloat(formCommission) : null,
      description: formDescription || null,
      is_active: formActive,
    };

    try {
      if (editingRef) {
        const { error } = await supabase
          .from("referrals")
          .update(payload)
          .eq("id", editingRef.id);

        if (error) throw error;
        toast.success(t("updateSuccess"));
      } else {
        const { error } = await supabase.from("referrals").insert(payload);
        if (error) throw error;
        toast.success(t("createSuccess"));
      }

      setFormOpen(false);
      router.refresh();
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from("referrals")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast.success(t("deleteSuccess"));
      setDeleteOpen(false);
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  // ── Columns ────────────────────────────────────────────────────
  const columns: ColumnDef<ReferralRow, unknown>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("name")} />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name") ?? "-"}</span>
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
        accessorKey: "email",
        header: () => t("email"),
        cell: ({ row }) => row.getValue("email") ?? "-",
        enableSorting: false,
      },
      {
        accessorKey: "commission_rate",
        header: () => t("commissionRate"),
        cell: ({ row }) => {
          const rate = row.getValue("commission_rate") as number | null;
          return rate != null ? `%${rate}` : "-";
        },
        enableSorting: false,
      },
      {
        accessorKey: "is_active",
        header: () => tCommon("status"),
        cell: ({ row }) => {
          const active = row.getValue("is_active") as boolean;
          return active ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              {t("active")}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
              {t("inactive")}
            </Badge>
          );
        },
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => tCommon("actions"),
        cell: ({ row }) => {
          const ref = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(ref)}>
                  <Edit className="mr-2 size-3.5" />
                  {tCommon("edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setDeleteTarget(ref);
                    setDeleteOpen(true);
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
    [t, tCommon]
  );

  return (
    <div className="space-y-8">
      {/* Section 1: Referral Sources CRUD */}
      <div className="space-y-4">
        <DataTable
          columns={columns}
          data={referrals}
          searchKey="name"
          searchPlaceholder={t("searchPlaceholder")}
          pageSize={10}
          toolbarExtra={
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">
                {t("title")}
              </h1>
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="mr-1 size-4" />
                {t("addNew")}
              </Button>
            </div>
          }
        />
      </div>

      {/* Section 2: Referral Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("performance")}</CardTitle>
        </CardHeader>
        <CardContent>
          {performance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("applicationCount")}</TableHead>
                  <TableHead>{t("totalCommission")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.map((perf, i) => (
                  <TableRow key={perf.referral_id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      {perf.referral_name}
                    </TableCell>
                    <TableCell>{perf.application_count}</TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(perf.total_commission, "TL")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("noPerformanceData")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Add/Edit Dialog ─────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRef ? t("editReferral") : t("addNew")}
            </DialogTitle>
            <DialogDescription>
              {editingRef ? t("editDescription") : t("addDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ref-name">{t("name")}</Label>
              <Input
                id="ref-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ref-phone">{t("phone")}</Label>
              <Input
                id="ref-phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ref-email">{t("email")}</Label>
              <Input
                id="ref-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ref-commission">{t("commissionRate")}</Label>
              <Input
                id="ref-commission"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={formCommission}
                onChange={(e) => setFormCommission(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ref-desc">{t("description")}</Label>
              <Textarea
                id="ref-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="ref-active"
                checked={formActive}
                onCheckedChange={setFormActive}
              />
              <Label htmlFor="ref-active">
                {formActive ? t("active") : t("inactive")}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? tCommon("loading") : tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
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
