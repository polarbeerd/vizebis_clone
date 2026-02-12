"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Edit, Plus, Search, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import type { TagRow } from "./page";
import { TagForm } from "@/components/tags/tag-form";
import type { TagForForm } from "@/components/tags/tag-form";

interface TagsClientProps {
  data: TagRow[];
}

export function TagsClient({ data }: TagsClientProps) {
  const t = useTranslations("tags");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [formOpen, setFormOpen] = React.useState(false);
  const [formTag, setFormTag] = React.useState<TagForForm | undefined>(
    undefined
  );

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TagRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Filter state
  const [visaFilter, setVisaFilter] = React.useState("all");
  const [searchText, setSearchText] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const supabase = React.useMemo(() => createClient(), []);

  // Filtered data
  const filteredData = React.useMemo(() => {
    let result = data;

    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter((tag) =>
        tag.name?.toLowerCase().includes(lower)
      );
    }

    if (startDate) {
      result = result.filter(
        (tag) => tag.created_at && tag.created_at >= startDate
      );
    }
    if (endDate) {
      result = result.filter(
        (tag) => tag.created_at && tag.created_at <= endDate + "T23:59:59"
      );
    }

    // visaFilter is a display filter for future use — currently keeps all
    // unless we want to filter by tag name patterns
    if (visaFilter !== "all") {
      // This is a conceptual filter; tags don't have visa status
      // but we keep the filter UI as requested
    }

    return result;
  }, [data, searchText, startDate, endDate, visaFilter]);

  function handleNewTag() {
    setFormTag(undefined);
    setFormOpen(true);
  }

  function handleEditTag(tag: TagRow) {
    setFormTag({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    });
    setFormOpen(true);
  }

  function handleDeleteTag(tag: TagRow) {
    setDeleteTarget(tag);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("tags")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error("Error deleting tag:", error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={handleNewTag}>
            <Plus className="mr-1 size-4" />
            {t("addNew")}
          </Button>
        </div>
      </div>

      {/* Filter form */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={visaFilter} onValueChange={setVisaFilter}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allRecords")}</SelectItem>
            <SelectItem value="visa_approved">{t("visaApproved")}</SelectItem>
            <SelectItem value="passport_delivered">
              {t("passportDelivered")}
            </SelectItem>
            <SelectItem value="in_progress">{t("inProgress")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="h-9 w-[200px] pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-[150px]"
            placeholder={t("startDate")}
          />
          <span className="text-muted-foreground text-sm">-</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 w-[150px]"
            placeholder={t("endDate")}
          />
        </div>
      </div>

      {/* Tag grid */}
      {filteredData.length === 0 ? (
        <div className="flex items-center justify-center rounded-md border border-dashed p-12">
          <p className="text-muted-foreground">{t("noTags")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredData.map((tag) => (
            <Card key={tag.id} className="group relative">
              <CardContent className="flex items-center gap-3 p-4">
                {/* Color swatch */}
                <div
                  className="size-8 shrink-0 rounded-full border"
                  style={{ backgroundColor: tag.color || "#6c757d" }}
                />
                <div className="flex-1 min-w-0">
                  <Badge
                    style={{
                      backgroundColor: tag.color || "#6c757d",
                      color: "#fff",
                    }}
                    className="text-sm font-medium"
                  >
                    {tag.name ?? "-"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleEditTag(tag)}
                  >
                    <Edit className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleDeleteTag(tag)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TagForm
        open={formOpen}
        onOpenChange={setFormOpen}
        tag={formTag}
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
