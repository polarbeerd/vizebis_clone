"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { normalizeText } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/portal/segmented-control";
import type { SmartFieldProps } from "./registry";

interface NationalityData {
  selection: "tc" | "other" | "";
  custom_nationality: string;
}

function parseData(value: Record<string, unknown>): NationalityData {
  return {
    selection: (value.selection as NationalityData["selection"]) ?? "",
    custom_nationality: (value.custom_nationality as string) ?? "",
  };
}

export function Nationality({
  value,
  onChange,
  isRequired,
  submitted,
  errors,
}: SmartFieldProps) {
  const t = useTranslations("smartFields.nationality");
  const data = parseData(value);
  const showErrors = !!submitted;

  function update(partial: Partial<NationalityData>) {
    onChange({ ...value, ...partial });
  }

  function handleToggle(val: string) {
    if (val === "tc") {
      update({ selection: "tc", custom_nationality: "" });
    } else {
      update({ selection: "other" });
    }
  }

  const notChosen = data.selection === "";
  const customEmpty = data.selection === "other" && !data.custom_nationality.trim();
  const hasErrors = notChosen || customEmpty;

  React.useEffect(() => {
    const current = value._valid as boolean | undefined;
    const valid = !hasErrors;
    if (current !== valid) {
      onChange({ ...value, _valid: valid });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasErrors]);

  const options = [
    { value: "tc", label: t("tc") },
    { value: "other", label: t("other") },
  ];

  return (
    <div className="space-y-3">
      <div>
        <Label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("question")}
          {isRequired && <span className="ml-1 text-red-500">*</span>}
        </Label>
        <SegmentedControl
          options={options}
          value={data.selection}
          onChange={handleToggle}
          layoutId="nationality-segment"
          size="sm"
        />
        {showErrors && notChosen && (
          <p className="mt-1.5 text-xs font-medium text-red-500">{t("mustChoose")}</p>
        )}
      </div>

      <AnimatePresence>
        {data.selection === "other" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("customLabel")}
                <span className="ml-1 text-red-500">*</span>
              </Label>
              <Input
                value={data.custom_nationality}
                onChange={(e) => update({ custom_nationality: normalizeText(e.target.value) })}
                placeholder={t("customPlaceholder")}
                className="h-11 rounded-xl"
                aria-invalid={showErrors && customEmpty ? true : undefined}
              />
              {showErrors && customEmpty && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {t("customRequired")}
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
