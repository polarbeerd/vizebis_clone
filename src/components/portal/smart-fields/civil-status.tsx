"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SmartFieldProps } from "./registry";

const STATUS_OPTIONS = [
  "divorced",
  "married",
  "registered_partnership",
  "separated",
  "single",
  "widower",
  "other",
] as const;

interface CivilStatusData {
  status: string;
  other_text: string;
}

function parseData(value: Record<string, unknown>): CivilStatusData {
  return {
    status: (value.status as string) ?? "",
    other_text: (value.other_text as string) ?? "",
  };
}

export function CivilStatus({
  value,
  onChange,
  isRequired,
  submitted,
  errors,
}: SmartFieldProps) {
  const t = useTranslations("smartFields.civilStatus");
  const data = parseData(value);
  const showErrors = !!submitted;

  function update(partial: Partial<CivilStatusData>) {
    onChange({ ...value, ...partial });
  }

  function handleStatusChange(newStatus: string) {
    if (newStatus !== "other") {
      update({ status: newStatus, other_text: "" });
    } else {
      update({ status: newStatus });
    }
  }

  // Validation
  const notChosen = !data.status;
  const otherEmpty = data.status === "other" && !data.other_text.trim();
  const hasErrors = notChosen || otherEmpty;

  React.useEffect(() => {
    const current = value._valid as boolean | undefined;
    const valid = !hasErrors;
    if (current !== valid) {
      onChange({ ...value, _valid: valid });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasErrors]);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
      <div>
        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("label")}
          {isRequired && <span className="ml-1 text-red-500">*</span>}
        </Label>
        <Select value={data.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue placeholder={t("placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {t(`options.${opt}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showErrors && notChosen && (
          <p className="mt-1.5 text-xs font-medium text-red-500">{t("required")}</p>
        )}
      </div>

      <AnimatePresence>
        {data.status === "other" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("otherLabel")}
                <span className="ml-1 text-red-500">*</span>
              </Label>
              <Input
                value={data.other_text}
                onChange={(e) => update({ other_text: e.target.value })}
                placeholder={t("otherPlaceholder")}
                className="h-11 rounded-xl"
                aria-invalid={showErrors && otherEmpty ? true : undefined}
              />
              {showErrors && otherEmpty && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {t("otherRequired")}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {errors && errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-500">{err}</p>
          ))}
        </div>
      )}
    </div>
  );
}
