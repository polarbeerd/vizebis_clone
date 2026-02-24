"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Edit, Plus, Trash2, Zap, Loader2, ChevronDown } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FieldDefinitionForm,
  type FieldDefinition,
} from "@/components/portal-form-fields/field-definition-form";
import {
  FieldAssignmentView,
  type SmartTemplate,
} from "@/components/portal-form-fields/field-assignment-view";

interface PortalFormFieldsClientProps {
  definitions: FieldDefinition[];
  smartTemplates: SmartTemplate[];
}

export function PortalFormFieldsClient({
  definitions,
  smartTemplates,
}: PortalFormFieldsClientProps) {
  const t = useTranslations("portalFormFields");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const supabase = React.useMemo(() => createClient(), []);

  // Form dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [formItem, setFormItem] = React.useState<FieldDefinition | null>(null);

  // Delete dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<FieldDefinition | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Smart template edit dialog state
  const [smartEditOpen, setSmartEditOpen] = React.useState(false);
  const [smartEditTarget, setSmartEditTarget] = React.useState<SmartTemplate | null>(null);
  const [smartEditLoading, setSmartEditLoading] = React.useState(false);
  const [smartEditValues, setSmartEditValues] = React.useState({
    label: "",
    label_tr: "",
    description: "",
    description_tr: "",
    sub_fields: [] as Array<{ key: string; label: string; label_tr: string }>,
  });

  // Assignment counts for each definition
  const [assignmentCounts, setAssignmentCounts] = React.useState<
    Map<number, number>
  >(new Map());

  // Field library collapsible
  const [libraryOpen, setLibraryOpen] = React.useState(false);

  // Fetch assignment counts
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

    // Delete assignments first (cascade)
    await supabase
      .from("portal_field_assignments")
      .delete()
      .eq("definition_id", deleteTarget.id);

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

  function handleEditSmartTemplate(tmpl: SmartTemplate) {
    setSmartEditTarget(tmpl);
    setSmartEditValues({
      label: tmpl.label,
      label_tr: tmpl.label_tr,
      description: tmpl.description,
      description_tr: tmpl.description_tr,
      sub_fields: tmpl.sub_fields ? tmpl.sub_fields.map((sf) => ({ ...sf })) : [],
    });
    setSmartEditOpen(true);
  }

  async function handleSaveSmartTemplate() {
    if (!smartEditTarget) return;
    setSmartEditLoading(true);

    const { error } = await supabase
      .from("portal_smart_field_templates")
      .update({
        label: smartEditValues.label,
        label_tr: smartEditValues.label_tr,
        description: smartEditValues.description,
        description_tr: smartEditValues.description_tr,
        sub_fields: smartEditValues.sub_fields,
      })
      .eq("id", smartEditTarget.id);

    if (error) {
      console.error("Error updating smart template:", error);
      toast.error(t("saveError"));
    } else {
      toast.success(t("updateSuccess"));
      setSmartEditOpen(false);
      router.refresh();
    }

    setSmartEditLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 1: Global Field Assignments
         ══════════════════════════════════════════════════ */}
      <div>
        <FieldAssignmentView
          allDefinitions={definitions}
          smartTemplates={smartTemplates}
          onRefresh={fetchAssignmentCounts}
        />
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 2: Field Library (collapsible)
         ══════════════════════════════════════════════════ */}
      <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold hover:text-foreground text-muted-foreground transition-colors">
            <ChevronDown className={`size-4 transition-transform ${libraryOpen ? "rotate-0" : "-rotate-90"}`} />
            {t("fieldLibrary")}
            <Badge variant="secondary" className="text-[10px]">
              {smartTemplates.length + definitions.length}
            </Badge>
          </CollapsibleTrigger>
          <Button size="sm" variant="outline" onClick={handleAddDefinition} className="h-7 text-xs">
            <Plus className="mr-1 size-3" />
            {t("createDefinition")}
          </Button>
        </div>

        <CollapsibleContent className="mt-3">
          <div className="rounded-md border overflow-hidden">
            {/* Smart field templates */}
            {smartTemplates.map((tmpl) => (
              <div
                key={`smart-${tmpl.template_key}`}
                className="flex items-center gap-2 border-b last:border-b-0 px-3 py-1.5 bg-amber-50/30 dark:bg-amber-950/10"
              >
                <Zap className="size-3 text-amber-500 shrink-0" />
                <span className="text-sm font-medium truncate flex-1 min-w-0">
                  {tmpl.label}
                </span>
                <Badge variant="outline" className="text-[10px] shrink-0 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400">
                  {t("smartField")}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={() => handleEditSmartTemplate(tmpl)}
                >
                  <Edit className="size-3" />
                </Button>
              </div>
            ))}

            {/* Regular field definitions */}
            {definitions.map((def) => {
              const usageCount = assignmentCounts.get(def.id) ?? 0;

              return (
                <div
                  key={def.id}
                  className="flex items-center gap-2 border-b last:border-b-0 px-3 py-1.5"
                >
                  <span className="text-sm font-medium truncate flex-1 min-w-0">
                    {def.field_label}
                  </span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {def.field_type}
                  </Badge>
                  {def.max_chars != null && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {def.max_chars}
                    </Badge>
                  )}
                  {usageCount > 0 && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {usageCount}x
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={() => handleEditDefinition(def)}
                  >
                    <Edit className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={() => handleDeleteDefinition(def)}
                  >
                    <Trash2 className={`size-3 ${usageCount > 0 ? "text-orange-500" : "text-destructive"}`} />
                  </Button>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

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

      {/* Smart Template Edit Dialog */}
      <Dialog open={smartEditOpen} onOpenChange={setSmartEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("editSmartTemplate")}</DialogTitle>
            <DialogDescription>
              {t("editSmartTemplateDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-sm font-medium">
                  <span className="mr-1.5">{"\u{1F1EC}\u{1F1E7}"}</span>
                  {t("fieldLabelEN")}
                </Label>
                <Input
                  value={smartEditValues.label}
                  onChange={(e) =>
                    setSmartEditValues((v) => ({ ...v, label: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">
                  <span className="mr-1.5">{"\u{1F1F9}\u{1F1F7}"}</span>
                  {t("fieldLabelTR")}
                </Label>
                <Input
                  value={smartEditValues.label_tr}
                  onChange={(e) =>
                    setSmartEditValues((v) => ({ ...v, label_tr: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-sm font-medium">
                  <span className="mr-1.5">{"\u{1F1EC}\u{1F1E7}"}</span>
                  {t("descriptionEN")}
                </Label>
                <Input
                  value={smartEditValues.description}
                  onChange={(e) =>
                    setSmartEditValues((v) => ({ ...v, description: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">
                  <span className="mr-1.5">{"\u{1F1F9}\u{1F1F7}"}</span>
                  {t("descriptionTR")}
                </Label>
                <Input
                  value={smartEditValues.description_tr}
                  onChange={(e) =>
                    setSmartEditValues((v) => ({ ...v, description_tr: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Sub-field labels */}
            {smartEditValues.sub_fields.length > 0 && (
              <div>
                <Label className="mb-2 block text-sm font-medium">
                  {t("subFieldLabels")}
                </Label>
                <div className="space-y-2 rounded-md border p-3">
                  {smartEditValues.sub_fields.map((sf, idx) => (
                    <div key={sf.key} className="grid grid-cols-[80px_1fr_1fr] gap-2 items-center">
                      <Badge variant="secondary" className="text-[10px] justify-center font-mono">
                        {sf.key}
                      </Badge>
                      <Input
                        className="h-8 text-sm"
                        placeholder="EN"
                        value={sf.label}
                        onChange={(e) => {
                          setSmartEditValues((v) => {
                            const updated = [...v.sub_fields];
                            updated[idx] = { ...updated[idx], label: e.target.value };
                            return { ...v, sub_fields: updated };
                          });
                        }}
                      />
                      <Input
                        className="h-8 text-sm"
                        placeholder="TR"
                        value={sf.label_tr}
                        onChange={(e) => {
                          setSmartEditValues((v) => {
                            const updated = [...v.sub_fields];
                            updated[idx] = { ...updated[idx], label_tr: e.target.value };
                            return { ...v, sub_fields: updated };
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSmartEditOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleSaveSmartTemplate}
              disabled={smartEditLoading}
            >
              {smartEditLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
