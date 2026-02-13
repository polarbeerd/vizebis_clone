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
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { FieldDefinition } from "./field-definition-form";

export interface FieldAssignment {
  id: number;
  definition_id: number;
  country: string;
  visa_type: string;
  is_required: boolean;
  sort_order: number;
  // joined from definition
  field_key: string;
  field_label: string;
  field_type: string;
  is_standard: boolean;
}

interface FieldAssignmentViewProps {
  country: string;
  visaType: string;
  allDefinitions: FieldDefinition[];
  onRefresh: () => void;
}

// ── Sortable active field card ──
function SortableFieldCard({
  assignment,
  onRemove,
  onToggleRequired,
}: {
  assignment: FieldAssignment;
  onRemove: (id: number) => void;
  onToggleRequired: (id: number, required: boolean) => void;
}) {
  const t = useTranslations("portalFormFields");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: assignment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-sm"
    >
      <button
        className="cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {assignment.field_label}
          </span>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {assignment.field_type}
          </Badge>
          {assignment.is_standard && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              {t("isStandard")}
            </Badge>
          )}
        </div>
        <code className="text-[11px] text-muted-foreground">
          {assignment.field_key}
        </code>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">
            {assignment.is_required ? t("isRequired") : t("optional")}
          </span>
          <Switch
            checked={assignment.is_required}
            onCheckedChange={(checked) =>
              onToggleRequired(assignment.id, checked)
            }
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => onRemove(assignment.id)}
        >
          <X className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// ── Available field card ──
function AvailableFieldCard({
  definition,
  onAssign,
  assigning,
}: {
  definition: FieldDefinition;
  onAssign: (defId: number) => void;
  assigning: boolean;
}) {
  const t = useTranslations("portalFormFields");

  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {definition.field_label}
          </span>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {definition.field_type}
          </Badge>
          {definition.is_standard && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              {t("isStandard")}
            </Badge>
          )}
        </div>
        <code className="text-[11px] text-muted-foreground">
          {definition.field_key}
        </code>
      </div>

      <Button
        variant="outline"
        size="icon"
        className="size-7 shrink-0"
        onClick={() => onAssign(definition.id)}
        disabled={assigning}
      >
        {assigning ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Plus className="size-3.5" />
        )}
      </Button>
    </div>
  );
}

// ── Main component ──
export function FieldAssignmentView({
  country,
  visaType,
  allDefinitions,
  onRefresh,
}: FieldAssignmentViewProps) {
  const t = useTranslations("portalFormFields");
  const supabase = React.useMemo(() => createClient(), []);

  const [assignments, setAssignments] = React.useState<FieldAssignment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [assigningId, setAssigningId] = React.useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch assignments for this country+visa combo
  const fetchAssignments = React.useCallback(async () => {
    if (!country || !visaType) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("portal_field_assignments")
      .select(
        "id, definition_id, country, visa_type, is_required, sort_order, definition:portal_field_definitions(field_key, field_label, field_type, is_standard)"
      )
      .eq("country", country)
      .eq("visa_type", visaType)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching assignments:", error);
      setAssignments([]);
    } else {
      setAssignments(
        (data ?? []).map((row: Record<string, unknown>) => {
          const def = row.definition as Record<string, unknown> | null;
          return {
            id: row.id as number,
            definition_id: row.definition_id as number,
            country: row.country as string,
            visa_type: row.visa_type as string,
            is_required: row.is_required as boolean,
            sort_order: row.sort_order as number,
            field_key: def?.field_key as string ?? "",
            field_label: def?.field_label as string ?? "",
            field_type: def?.field_type as string ?? "",
            is_standard: def?.is_standard as boolean ?? false,
          };
        })
      );
    }

    setLoading(false);
  }, [country, visaType, supabase]);

  React.useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Available = definitions NOT in current assignments
  const assignedDefIds = new Set(assignments.map((a) => a.definition_id));
  const availableDefinitions = allDefinitions.filter(
    (d) => !assignedDefIds.has(d.id)
  );

  // ── Assign a field ──
  async function handleAssign(definitionId: number) {
    setAssigningId(definitionId);
    const nextOrder = assignments.length;

    const { error } = await supabase.from("portal_field_assignments").insert({
      definition_id: definitionId,
      country,
      visa_type: visaType,
      is_required: true,
      sort_order: nextOrder,
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
      await fetchAssignments();
      onRefresh();
    }
  }

  // ── Toggle required ──
  async function handleToggleRequired(
    assignmentId: number,
    required: boolean
  ) {
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

  // ── Drag end: reorder ──
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = assignments.findIndex((a) => a.id === active.id);
    const newIndex = assignments.findIndex((a) => a.id === over.id);

    const reordered = arrayMove(assignments, oldIndex, newIndex);
    setAssignments(reordered);

    // Persist new sort_order values
    const updates = reordered.map((a, i) => ({
      id: a.id,
      sort_order: i,
    }));

    for (const u of updates) {
      await supabase
        .from("portal_field_assignments")
        .update({ sort_order: u.sort_order })
        .eq("id", u.id);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: Available Fields */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("availableFields")} ({availableDefinitions.length})
        </h3>
        <div className="space-y-2">
          {availableDefinitions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("noFields")}
            </p>
          ) : (
            availableDefinitions.map((def) => (
              <AvailableFieldCard
                key={def.id}
                definition={def}
                onAssign={handleAssign}
                assigning={assigningId === def.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Active Fields (sortable) */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("activeFields")} ({assignments.length})
        </h3>
        {assignments.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-12">
            <p className="text-sm text-muted-foreground">
              {t("noAssignedFields")}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={assignments.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <SortableFieldCard
                    key={assignment.id}
                    assignment={assignment}
                    onRemove={handleRemove}
                    onToggleRequired={handleToggleRequired}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
