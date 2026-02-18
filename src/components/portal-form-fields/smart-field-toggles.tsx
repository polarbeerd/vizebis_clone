"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export interface SmartTemplate {
  id: number;
  template_key: string;
  label: string;
  description: string;
  sub_fields?: Array<{ key: string; label: string; label_tr: string }>;
}

interface SmartFieldTogglesProps {
  country: string;
  visaType: string;
  allTemplates: SmartTemplate[];
}

interface Assignment {
  id: number;
  template_key: string;
  is_required: boolean;
}

export function SmartFieldToggles({
  country,
  visaType,
  allTemplates,
}: SmartFieldTogglesProps) {
  const t = useTranslations("portalFormFields");
  const supabase = React.useMemo(() => createClient(), []);

  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [toggling, setToggling] = React.useState<string | null>(null);

  const fetchAssignments = React.useCallback(async () => {
    if (!country || !visaType) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("portal_smart_field_assignments")
      .select("id, template_key, is_required")
      .eq("country", country)
      .eq("visa_type", visaType);

    if (error) {
      console.error("Error fetching smart field assignments:", error);
    } else {
      setAssignments(
        (data ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as number,
          template_key: row.template_key as string,
          is_required: row.is_required as boolean,
        }))
      );
    }

    setLoading(false);
  }, [country, visaType, supabase]);

  React.useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const assignedKeys = new Set(assignments.map((a) => a.template_key));

  async function handleToggleEnabled(templateKey: string, enabled: boolean) {
    setToggling(templateKey);

    if (enabled) {
      // Create assignment
      const nextOrder = assignments.length;
      const { error } = await supabase
        .from("portal_smart_field_assignments")
        .insert({
          template_key: templateKey,
          country,
          visa_type: visaType,
          is_required: false,
          sort_order: nextOrder,
        });

      if (error) {
        toast.error(t("saveError"));
      } else {
        await fetchAssignments();
      }
    } else {
      // Remove assignment
      const { error } = await supabase
        .from("portal_smart_field_assignments")
        .delete()
        .eq("template_key", templateKey)
        .eq("country", country)
        .eq("visa_type", visaType);

      if (error) {
        toast.error(t("saveError"));
      } else {
        await fetchAssignments();
      }
    }

    setToggling(null);
  }

  async function handleToggleRequired(
    templateKey: string,
    required: boolean
  ) {
    const assignment = assignments.find((a) => a.template_key === templateKey);
    if (!assignment) return;

    const { error } = await supabase
      .from("portal_smart_field_assignments")
      .update({ is_required: required })
      .eq("id", assignment.id);

    if (error) {
      toast.error(t("saveError"));
    } else {
      setAssignments((prev) =>
        prev.map((a) =>
          a.template_key === templateKey ? { ...a, is_required: required } : a
        )
      );
    }
  }

  if (allTemplates.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {allTemplates.map((tmpl) => {
        const isEnabled = assignedKeys.has(tmpl.template_key);
        const assignment = assignments.find(
          (a) => a.template_key === tmpl.template_key
        );
        const isToggling = toggling === tmpl.template_key;

        return (
          <div
            key={tmpl.template_key}
            className="flex items-center gap-3 rounded-lg border bg-card p-3"
          >
            <Zap className="size-4 text-amber-500 shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {tmpl.label}
                </span>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {t("smartField")}
                </Badge>
              </div>
              {tmpl.description && (
                <p className="text-[11px] text-muted-foreground truncate">
                  {tmpl.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Required toggle (only visible when enabled) */}
              {isEnabled && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    {assignment?.is_required ? t("isRequired") : t("optional")}
                  </span>
                  <Switch
                    checked={assignment?.is_required ?? false}
                    onCheckedChange={(checked) =>
                      handleToggleRequired(tmpl.template_key, checked)
                    }
                  />
                </div>
              )}

              {/* Enable/disable toggle */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">
                  {isEnabled ? t("enabled") : t("disabled")}
                </span>
                {isToggling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      handleToggleEnabled(tmpl.template_key, checked)
                    }
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
