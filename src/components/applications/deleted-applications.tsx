"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Types ─────────────────────────────────────────────────────────
interface DeletedApp {
  id: number;
  full_name: string | null;
  country: string | null;
  visa_status: string | null;
  deleted_at: string | null;
  updated_at: string | null;
}

interface DeletedApplicationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore?: () => void;
}

const visaStatusKeyMap: Record<string, string> = {
  beklemede: "pending",
  hazirlaniyor: "preparing",
  konsoloslukta: "atConsulate",
  vize_cikti: "approved",
  ret_oldu: "rejected",
  pasaport_teslim: "passportDelivered",
};

export function DeletedApplications({
  open,
  onOpenChange,
  onRestore,
}: DeletedApplicationsProps) {
  const t = useTranslations("applications");
  const tVisa = useTranslations("visaStatus");
  const tCommon = useTranslations("common");

  const [apps, setApps] = React.useState<DeletedApp[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [restoringId, setRestoringId] = React.useState<number | null>(null);

  const supabase = React.useMemo(() => createClient(), []);

  // ── Fetch deleted applications ──────────────────────────────
  const fetchDeleted = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select("id, full_name, country, visa_status, deleted_at, updated_at")
      .eq("is_deleted", true)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching deleted applications:", error);
    } else {
      setApps((data as DeletedApp[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    if (open) {
      fetchDeleted();
    }
  }, [open, fetchDeleted]);

  // ── Restore handler ─────────────────────────────────────────
  async function handleRestore(id: number) {
    setRestoringId(id);
    const { error } = await supabase
      .from("applications")
      .update({ is_deleted: false, deleted_at: null })
      .eq("id", id);

    if (error) {
      console.error("Error restoring application:", error);
      toast.error(t("restoreError"));
    } else {
      toast.success(t("restoreSuccess"));
      setApps((prev) => prev.filter((a) => a.id !== id));
      onRestore?.();
    }
    setRestoringId(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5" />
            {t("deletedApplications")}
          </DialogTitle>
          <DialogDescription>
            {t("deletedDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : apps.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {tCommon("noData")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>{t("fullName")}</TableHead>
                  <TableHead>{t("country")}</TableHead>
                  <TableHead>{t("visaStatus")}</TableHead>
                  <TableHead>{t("deletedDate")}</TableHead>
                  <TableHead className="w-24">{tCommon("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.id}</TableCell>
                    <TableCell>{app.full_name ?? "-"}</TableCell>
                    <TableCell>{app.country ?? "-"}</TableCell>
                    <TableCell>
                      {app.visa_status ? (
                        <Badge variant="outline">
                          {tVisa(
                            (visaStatusKeyMap[app.visa_status] ??
                              app.visa_status) as Parameters<typeof tVisa>[0]
                          )}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {app.deleted_at
                        ? formatDate(app.deleted_at)
                        : app.updated_at
                          ? formatDate(app.updated_at)
                          : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(app.id)}
                        disabled={restoringId === app.id}
                      >
                        {restoringId === app.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="size-3.5" />
                        )}
                        <span className="ml-1">{t("restore")}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
