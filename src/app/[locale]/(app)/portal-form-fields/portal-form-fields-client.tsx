"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Edit, Plus, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FieldDefinitionForm,
  type FieldDefinition,
} from "@/components/portal-form-fields/field-definition-form";
import { FieldAssignmentView } from "@/components/portal-form-fields/field-assignment-view";
import type { CountryOption } from "./page";

interface PortalFormFieldsClientProps {
  definitions: FieldDefinition[];
  countries: CountryOption[];
}

const VISA_TYPES = [
  { value: "turistik", labelKey: "turistik" },
  { value: "ticari", labelKey: "ticari" },
  { value: "kultur", labelKey: "kultur" },
  { value: "ziyaret", labelKey: "ziyaret" },
  { value: "diger", labelKey: "diger" },
] as const;

export function PortalFormFieldsClient({
  definitions,
  countries,
}: PortalFormFieldsClientProps) {
  const t = useTranslations("portalFormFields");
  const tCommon = useTranslations("common");
  const tVisaType = useTranslations("visaType");
  const router = useRouter();

  const supabase = React.useMemo(() => createClient(), []);

  // Form dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [formItem, setFormItem] = React.useState<FieldDefinition | null>(null);

  // Delete dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<FieldDefinition | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Assignment counts for each definition (to block delete if in use)
  const [assignmentCounts, setAssignmentCounts] = React.useState<
    Map<number, number>
  >(new Map());

  // Filter state for assignments
  const [selectedCountry, setSelectedCountry] = React.useState("");
  const [selectedVisaType, setSelectedVisaType] = React.useState("");

  const visaTypes = VISA_TYPES.map((vt) => ({
    value: vt.value,
    label: tVisaType(vt.labelKey),
  }));

  // Fetch assignment counts for library delete protection
  const fetchAssignmentCounts = React.useCallback(async () => {
    const { data } = await supabase
      .from("portal_field_assignments")
      .select("definition_id");

    if (data) {
      const counts = new Map<number, number>();
      for (const row of data as Array<{ definition_id: number }>) {
        counts.set(
          row.definition_id,
          (counts.get(row.definition_id) ?? 0) + 1
        );
      }
      setAssignmentCounts(counts);
    }
  }, [supabase]);

  React.useEffect(() => {
    fetchAssignmentCounts();
  }, [fetchAssignmentCounts]);

  function handleAddDefinition() {
    setFormItem(null);
    setFormOpen(true);
  }

  function handleEditDefinition(def: FieldDefinition) {
    setFormItem(def);
    setFormOpen(true);
  }

  function handleDeleteDefinition(def: FieldDefinition) {
    setDeleteTarget(def);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("portal_field_definitions")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error("Error deleting definition:", error);
      toast.error(t("saveError"));
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
    fetchAssignmentCounts();
  }

  const bothSelected = selectedCountry !== "" && selectedVisaType !== "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 1: Field Library
         ══════════════════════════════════════════════════ */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("fieldLibrary")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("fieldLibraryDescription")}
            </p>
          </div>
          <Button size="sm" onClick={handleAddDefinition}>
            <Plus className="mr-1 size-4" />
            {t("createDefinition")}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <TooltipProvider>
            {definitions.map((def) => {
              const usageCount = assignmentCounts.get(def.id) ?? 0;
              const canDelete = usageCount === 0 && !def.is_standard;

              return (
                <div
                  key={def.id}
                  className="flex flex-col justify-between rounded-lg border bg-card p-4"
                >
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {def.field_label}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {def.field_type}
                      </Badge>
                      {def.is_standard && (
                        <Badge variant="outline" className="text-[10px]">
                          {t("isStandard")}
                        </Badge>
                      )}
                    </div>
                    <code className="text-[11px] text-muted-foreground">
                      {def.field_key}
                    </code>
                    {usageCount > 0 && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {usageCount} assignment{usageCount > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleEditDefinition(def)}
                    >
                      <Edit className="size-3.5" />
                    </Button>

                    {canDelete ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => handleDeleteDefinition(def)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              disabled
                            >
                              <Trash2 className="size-3.5 text-muted-foreground" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{t("definitionInUse")}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 2: Field Assignments
         ══════════════════════════════════════════════════ */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">{t("fieldAssignments")}</h2>

        {/* Country + Visa Type dropdowns */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder={t("selectCountry")} />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.id} value={country.name}>
                  {country.flag_emoji ? `${country.flag_emoji} ` : ""}
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedVisaType} onValueChange={setSelectedVisaType}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue placeholder={t("selectVisaType")} />
            </SelectTrigger>
            <SelectContent>
              {visaTypes.map((vt) => (
                <SelectItem key={vt.value} value={vt.value}>
                  {vt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assignment view or empty state */}
        {bothSelected ? (
          <FieldAssignmentView
            key={`${selectedCountry}-${selectedVisaType}`}
            country={selectedCountry}
            visaType={selectedVisaType}
            allDefinitions={definitions}
            onRefresh={fetchAssignmentCounts}
          />
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-12">
            <p className="text-sm text-muted-foreground">
              {t("selectCountry")} & {t("selectVisaType")}
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Definition Dialog */}
      <FieldDefinitionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        item={formItem}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDescription", {
                name: deleteTarget?.field_label ?? "",
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
