"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  X,
  Loader2,
  Zap,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldDefinition } from "./field-definition-form";

const SECTION_OPTIONS = [
  "personal_details",
  "birth_info",
  "nationality_civil",
  "address",
  "passport",
  "fingerprint",
  "travel",
  "employment",
  "other",
] as const;

export interface FieldAssignment {
  id: number;
  definition_id: number;
  is_required: boolean;
  sort_order: number;
  section: string;
  field_key: string;
  field_label: string;
  field_type: string;
}

export interface SmartTemplate {
  id: number;
  template_key: string;
  label: string;
  label_tr: string;
  description: string;
  description_tr: string;
  sub_fields?: Array<{ key: string; label: string; label_tr: string }>;
}

interface SmartAssignment {
  id: number;
  template_key: string;
  is_required: boolean;
  sort_order: number;
  section: string;
}

type UnifiedItem =
  | { kind: "regular"; id: string; data: FieldAssignment }
  | { kind: "smart"; id: string; data: SmartAssignment };

interface FieldAssignmentViewProps {
  allDefinitions: FieldDefinition[];
  smartTemplates: SmartTemplate[];
  onRefresh: () => void;
}

// ── Section label helper ──
function sectionLabel(t: ReturnType<typeof useTranslations>, section: string) {
  const key = `section${section.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join("")}` as Parameters<typeof t>[0];
  return t(key);
}

// ── Compact sortable row for regular fields ──
function SortableFieldRow({
  assignment,
  onRemove,
  onToggleRequired,
  onSectionChange,
}: {
  assignment: FieldAssignment;
  onRemove: (id: number) => void;
  onToggleRequired: (id: number, required: boolean) => void;
  onSectionChange: (id: number, section: string) => void;
}) {
  const t = useTranslations("portalFormFields");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `regular-${assignment.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 border-b px-2 py-1.5 last:border-b-0 bg-background"
    >
      <button
        className="cursor-grab text-muted-foreground hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>

      <span className="text-sm font-medium truncate flex-1 min-w-0">
        {assignment.field_label}
      </span>

      <Select
        value={assignment.section}
        onValueChange={(val) => onSectionChange(assignment.id, val)}
      >
        <SelectTrigger className="h-6 w-[110px] text-[10px] shrink-0 px-1.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SECTION_OPTIONS.map((sec) => (
            <SelectItem key={sec} value={sec} className="text-xs">
              {sectionLabel(t, sec)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Badge variant="secondary" className="text-[10px] shrink-0 hidden sm:inline-flex">
        {assignment.field_type}
      </Badge>

      <div className="flex items-center gap-1 shrink-0">
        <Switch
          checked={assignment.is_required}
          onCheckedChange={(checked) =>
            onToggleRequired(assignment.id, checked)
          }
          className="scale-75"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="size-6 shrink-0"
        onClick={() => onRemove(assignment.id)}
      >
        <X className="size-3 text-destructive" />
      </Button>
    </div>
  );
}

// ── Compact sortable row for smart fields ──
function SortableSmartRow({
  template,
  assignment,
  onRemove,
  onToggleRequired,
  onSectionChange,
}: {
  template: SmartTemplate;
  assignment: SmartAssignment;
  onRemove: (key: string) => void;
  onToggleRequired: (key: string, required: boolean) => void;
  onSectionChange: (key: string, section: string) => void;
}) {
  const t = useTranslations("portalFormFields");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `smart-${assignment.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 border-b px-2 py-1.5 last:border-b-0 bg-amber-50/30 dark:bg-amber-950/10"
    >
      <button
        className="cursor-grab text-amber-500 hover:text-amber-600 shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>

      <Zap className="size-3 text-amber-500 shrink-0" />

      <span className="text-sm font-medium truncate flex-1 min-w-0">
        {template.label}
      </span>

      <Select
        value={assignment.section}
        onValueChange={(val) => onSectionChange(template.template_key, val)}
      >
        <SelectTrigger className="h-6 w-[110px] text-[10px] shrink-0 px-1.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SECTION_OPTIONS.map((sec) => (
            <SelectItem key={sec} value={sec} className="text-xs">
              {sectionLabel(t, sec)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1 shrink-0">
        <Switch
          checked={assignment.is_required}
          onCheckedChange={(checked) =>
            onToggleRequired(template.template_key, checked)
          }
          className="scale-75"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="size-6 shrink-0"
        onClick={() => onRemove(template.template_key)}
      >
        <X className="size-3 text-destructive" />
      </Button>
    </div>
  );
}

// ── Main component ──
export function FieldAssignmentView({
  allDefinitions,
  smartTemplates,
  onRefresh,
}: FieldAssignmentViewProps) {
  const t = useTranslations("portalFormFields");
  const supabase = React.useMemo(() => createClient(), []);

  const [assignments, setAssignments] = React.useState<FieldAssignment[]>([]);
  const [smartAssignments, setSmartAssignments] = React.useState<SmartAssignment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [assigningId, setAssigningId] = React.useState<number | null>(null);
  const [assigningSmartKey, setAssigningSmartKey] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Normalize sort_orders across both tables (0, 1, 2, ...)
  const normalizeSortOrders = React.useCallback(
    async (regular: FieldAssignment[], smart: SmartAssignment[]) => {
      // Build unified list sorted by current sort_order
      const all: { kind: "regular" | "smart"; id: number; sort_order: number }[] = [];
      for (const a of regular) all.push({ kind: "regular", id: a.id, sort_order: a.sort_order });
      for (const s of smart) all.push({ kind: "smart", id: s.id, sort_order: s.sort_order });
      all.sort((a, b) => a.sort_order - b.sort_order);

      // Check if normalization needed (gaps or duplicates)
      let needsNormalize = false;
      for (let i = 0; i < all.length; i++) {
        if (all[i].sort_order !== i) {
          needsNormalize = true;
          break;
        }
      }
      if (!needsNormalize) return { regular, smart };

      // Persist normalized values
      for (let i = 0; i < all.length; i++) {
        if (all[i].sort_order !== i) {
          const table = all[i].kind === "regular" ? "portal_field_assignments" : "portal_smart_field_assignments";
          await supabase.from(table).update({ sort_order: i }).eq("id", all[i].id);
        }
      }

      // Update local data
      const normalizedRegular = regular.map((a) => {
        const idx = all.findIndex((x) => x.kind === "regular" && x.id === a.id);
        return { ...a, sort_order: idx };
      });
      const normalizedSmart = smart.map((s) => {
        const idx = all.findIndex((x) => x.kind === "smart" && x.id === s.id);
        return { ...s, sort_order: idx };
      });

      return { regular: normalizedRegular, smart: normalizedSmart };
    },
    [supabase]
  );

  // Fetch both regular and smart assignments (global: country IS NULL, visa_type IS NULL)
  const fetchAssignments = React.useCallback(async () => {
    setLoading(true);

    const [regularRes, smartRes] = await Promise.all([
      supabase
        .from("portal_field_assignments")
        .select(
          "id, definition_id, is_required, sort_order, section, definition:portal_field_definitions(field_key, field_label, field_type)"
        )
        .is("country", null)
        .is("visa_type", null)
        .order("sort_order", { ascending: true }),
      supabase
        .from("portal_smart_field_assignments")
        .select("id, template_key, is_required, sort_order, section")
        .is("country", null)
        .is("visa_type", null)
        .order("sort_order", { ascending: true }),
    ]);

    let regular: FieldAssignment[] = [];
    let smart: SmartAssignment[] = [];

    if (!regularRes.error) {
      regular = (regularRes.data ?? []).map((row: Record<string, unknown>) => {
        const def = row.definition as Record<string, unknown> | null;
        return {
          id: row.id as number,
          definition_id: row.definition_id as number,
          is_required: row.is_required as boolean,
          sort_order: row.sort_order as number,
          section: (row.section as string) ?? "other",
          field_key: (def?.field_key as string) ?? "",
          field_label: (def?.field_label as string) ?? "",
          field_type: (def?.field_type as string) ?? "",
        };
      });
    }

    if (!smartRes.error) {
      smart = (smartRes.data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as number,
        template_key: row.template_key as string,
        is_required: row.is_required as boolean,
        sort_order: (row.sort_order as number) ?? 0,
        section: (row.section as string) ?? "other",
      }));
    }

    // Auto-normalize sort_orders if there are gaps or duplicates
    const normalized = await normalizeSortOrders(regular, smart);
    setAssignments(normalized.regular);
    setSmartAssignments(normalized.smart);

    setLoading(false);
  }, [supabase, normalizeSortOrders]);

  React.useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Available = definitions NOT in current assignments
  const assignedDefIds = new Set(assignments.map((a) => a.definition_id));
  const availableDefinitions = allDefinitions.filter(
    (d) => !assignedDefIds.has(d.id)
  );

  // Available smart = templates NOT in current smart assignments
  const assignedSmartKeys = new Set(smartAssignments.map((a) => a.template_key));
  const availableSmartTemplates = smartTemplates.filter(
    (t) => !assignedSmartKeys.has(t.template_key)
  );

  const totalAvailable = availableDefinitions.length + availableSmartTemplates.length;
  const totalActive = assignments.length + smartAssignments.length;

  // Build unified sorted list for DnD
  const unifiedItems: UnifiedItem[] = React.useMemo(() => {
    const items: UnifiedItem[] = [];
    for (const a of assignments) {
      items.push({ kind: "regular", id: `regular-${a.id}`, data: a });
    }
    for (const sa of smartAssignments) {
      items.push({ kind: "smart", id: `smart-${sa.id}`, data: sa });
    }
    items.sort((a, b) => a.data.sort_order - b.data.sort_order);
    return items;
  }, [assignments, smartAssignments]);

  // ── Assign a field (global) ──
  async function handleAssign(definitionId: number) {
    setAssigningId(definitionId);
    const maxOrder = unifiedItems.length > 0
      ? Math.max(...unifiedItems.map((i) => i.data.sort_order))
      : -1;

    const { error } = await supabase.from("portal_field_assignments").insert({
      definition_id: definitionId,
      country: null,
      visa_type: null,
      is_required: true,
      sort_order: maxOrder + 1,
      section: "other",
    });

    if (error) {
      console.error("Error assigning field:", error);
      toast.error(t("saveError"));
    } else {
      toast.success(t("createSuccess"));
      await fetchAssignments();
      onRefresh();
    }

    setAssigningId(null);
  }

  // ── Assign a smart field (global) ──
  async function handleAssignSmart(templateKey: string) {
    setAssigningSmartKey(templateKey);
    const maxOrder = unifiedItems.length > 0
      ? Math.max(...unifiedItems.map((i) => i.data.sort_order))
      : -1;

    const { error } = await supabase.from("portal_smart_field_assignments").insert({
      template_key: templateKey,
      country: null,
      visa_type: null,
      is_required: false,
      sort_order: maxOrder + 1,
      section: "other",
    });

    if (error) {
      console.error("Error assigning smart field:", error);
      toast.error(t("saveError"));
    } else {
      toast.success(t("createSuccess"));
      await fetchAssignments();
    }

    setAssigningSmartKey(null);
  }

  // ── Remove assignment ──
  async function handleRemove(assignmentId: number) {
    const { error } = await supabase
      .from("portal_field_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      console.error("Error removing assignment:", error);
      toast.error(t("saveError"));
    } else {
      toast.success(t("deleteSuccess"));
      await fetchAssignments(); // will auto-normalize
      onRefresh();
    }
  }

  // ── Remove smart assignment (global) ──
  async function handleRemoveSmart(templateKey: string) {
    const { error } = await supabase
      .from("portal_smart_field_assignments")
      .delete()
      .eq("template_key", templateKey)
      .is("country", null)
      .is("visa_type", null);

    if (error) {
      console.error("Error removing smart assignment:", error);
      toast.error(t("saveError"));
    } else {
      toast.success(t("deleteSuccess"));
      await fetchAssignments(); // will auto-normalize
    }
  }

  // ── Toggle required ──
  async function handleToggleRequired(assignmentId: number, required: boolean) {
    const { error } = await supabase
      .from("portal_field_assignments")
      .update({ is_required: required })
      .eq("id", assignmentId);

    if (error) {
      toast.error(t("saveError"));
    } else {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId ? { ...a, is_required: required } : a
        )
      );
    }
  }

  // ── Toggle smart required ──
  async function handleToggleSmartRequired(templateKey: string, required: boolean) {
    const assignment = smartAssignments.find((a) => a.template_key === templateKey);
    if (!assignment) return;

    const { error } = await supabase
      .from("portal_smart_field_assignments")
      .update({ is_required: required })
      .eq("id", assignment.id);

    if (error) {
      toast.error(t("saveError"));
    } else {
      setSmartAssignments((prev) =>
        prev.map((a) =>
          a.template_key === templateKey ? { ...a, is_required: required } : a
        )
      );
    }
  }

  // ── Change section for regular field ──
  async function handleSectionChange(assignmentId: number, section: string) {
    const { error } = await supabase
      .from("portal_field_assignments")
      .update({ section })
      .eq("id", assignmentId);

    if (error) {
      toast.error(t("saveError"));
    } else {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId ? { ...a, section } : a
        )
      );
    }
  }

  // ── Change section for smart field ──
  async function handleSmartSectionChange(templateKey: string, section: string) {
    const assignment = smartAssignments.find((a) => a.template_key === templateKey);
    if (!assignment) return;

    const { error } = await supabase
      .from("portal_smart_field_assignments")
      .update({ section })
      .eq("id", assignment.id);

    if (error) {
      toast.error(t("saveError"));
    } else {
      setSmartAssignments((prev) =>
        prev.map((a) =>
          a.template_key === templateKey ? { ...a, section } : a
        )
      );
    }
  }

  // ── Drag end: reorder unified list ──
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = unifiedItems.findIndex((item) => item.id === active.id);
    const newIndex = unifiedItems.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(unifiedItems, oldIndex, newIndex);

    // Optimistic update
    const newRegular: FieldAssignment[] = [];
    const newSmart: SmartAssignment[] = [];
    for (let i = 0; i < reordered.length; i++) {
      const item = reordered[i];
      if (item.kind === "regular") {
        newRegular.push({ ...item.data, sort_order: i });
      } else {
        newSmart.push({ ...item.data, sort_order: i });
      }
    }
    setAssignments(newRegular);
    setSmartAssignments(newSmart);

    // Persist
    for (let i = 0; i < reordered.length; i++) {
      const item = reordered[i];
      const table = item.kind === "regular" ? "portal_field_assignments" : "portal_smart_field_assignments";
      await supabase.from(table).update({ sort_order: i }).eq("id", item.data.id);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active fields — compact sortable list */}
      <div>
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("activeFields")} ({totalActive})
        </h3>
        {totalActive === 0 ? (
          <div className="flex items-center justify-center rounded-md border border-dashed py-6">
            <p className="text-xs text-muted-foreground">
              {t("noAssignedFields")}
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={unifiedItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {unifiedItems.map((item) => {
                  if (item.kind === "regular") {
                    return (
                      <SortableFieldRow
                        key={item.id}
                        assignment={item.data}
                        onRemove={handleRemove}
                        onToggleRequired={handleToggleRequired}
                        onSectionChange={handleSectionChange}
                      />
                    );
                  }
                  const tmpl = smartTemplates.find(
                    (t) => t.template_key === item.data.template_key
                  );
                  if (!tmpl) return null;
                  return (
                    <SortableSmartRow
                      key={item.id}
                      template={tmpl}
                      assignment={item.data}
                      onRemove={handleRemoveSmart}
                      onToggleRequired={handleToggleSmartRequired}
                      onSectionChange={handleSmartSectionChange}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      {/* Available fields — compact add list */}
      {totalAvailable > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("availableFields")} ({totalAvailable})
          </h3>
          <div className="rounded-md border border-dashed overflow-hidden">
            {availableDefinitions.map((def) => (
              <div
                key={def.id}
                className="flex items-center gap-2 border-b last:border-b-0 px-2 py-1.5"
              >
                <span className="text-sm truncate flex-1 min-w-0">
                  {def.field_label}
                </span>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {def.field_type}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={() => handleAssign(def.id)}
                  disabled={assigningId === def.id}
                >
                  {assigningId === def.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                </Button>
              </div>
            ))}
            {availableSmartTemplates.map((tmpl) => (
              <div
                key={tmpl.template_key}
                className="flex items-center gap-2 border-b last:border-b-0 px-2 py-1.5 bg-amber-50/30 dark:bg-amber-950/10"
              >
                <Zap className="size-3 text-amber-500 shrink-0" />
                <span className="text-sm truncate flex-1 min-w-0">
                  {tmpl.label}
                </span>
                <Badge variant="outline" className="text-[10px] shrink-0 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400">
                  {t("smartField")}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={() => handleAssignSmart(tmpl.template_key)}
                  disabled={assigningSmartKey === tmpl.template_key}
                >
                  {assigningSmartKey === tmpl.template_key ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
