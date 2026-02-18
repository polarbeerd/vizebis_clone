"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/portal/segmented-control";
import type { SmartFieldProps } from "./registry";

interface FingerprintVisaData {
  status: "no" | "yes_unknown" | "yes_date" | "";
  visa_number: string;
  visa_date: string;
}

function parseData(value: Record<string, unknown>): FingerprintVisaData {
  return {
    status: (value.status as FingerprintVisaData["status"]) ?? "",
    visa_number: (value.visa_number as string) ?? "",
    visa_date: (value.visa_date as string) ?? "",
  };
}

/**
 * Enforce visa sticker format: first 3 chars must be letters.
 * Blocks digit input for the first 3 positions.
 */
function handleVisaNumberInput(
  currentValue: string,
  inputValue: string
): string {
  let result = "";
  for (let i = 0; i < inputValue.length; i++) {
    const ch = inputValue[i];
    if (i < 3) {
      // Only letters allowed for first 3 characters
      if (/[a-zA-Z]/.test(ch)) {
        result += ch.toUpperCase();
      }
      // silently skip non-letter chars in first 3 positions
    } else {
      result += ch;
    }
  }
  return result;
}

export function FingerprintVisa({
  value,
  onChange,
  isRequired,
  submitted,
  errors,
}: SmartFieldProps) {
  const t = useTranslations("smartFields.fingerprintVisa");
  const data = parseData(value);
  const showErrors = !!submitted;

  function update(partial: Partial<FingerprintVisaData>) {
    onChange({ ...value, ...partial });
  }

  function handleStatusChange(newStatus: string) {
    if (newStatus === "no") {
      update({ status: "no", visa_number: "", visa_date: "" });
    } else if (newStatus === "yes_unknown") {
      // Keep visa_number if switching from yes_date, clear date
      update({ status: "yes_unknown", visa_date: "" });
    } else if (newStatus === "yes_date") {
      // Keep visa_number if switching from yes_unknown
      update({ status: "yes_date" });
    }
  }

  // Validation
  const notChosen = data.status === "";
  const visaNumberEmpty =
    (data.status === "yes_unknown" || data.status === "yes_date") && !data.visa_number.trim();
  const visaNumberBadFormat =
    (data.status === "yes_unknown" || data.status === "yes_date") &&
    data.visa_number.trim().length > 0 &&
    !/^[A-Za-z]{3}/.test(data.visa_number.trim());
  const visaDateEmpty = data.status === "yes_date" && !data.visa_date;
  const hasErrors = notChosen || visaNumberEmpty || visaNumberBadFormat || visaDateEmpty;

  React.useEffect(() => {
    const current = value._valid as boolean | undefined;
    const valid = !hasErrors;
    if (current !== valid) {
      onChange({ ...value, _valid: valid });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasErrors]);

  const showVisaFields = data.status === "yes_unknown" || data.status === "yes_date";

  const statusOptions = [
    { value: "no", label: t("no") },
    { value: "yes_unknown", label: t("yesUnknown") },
    { value: "yes_date", label: t("yesDate") },
  ];

  return (
    <div className="space-y-4 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
      {/* Question */}
      <div>
        <Label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("question")}
          {isRequired && <span className="ml-1 text-red-500">*</span>}
        </Label>
        <SegmentedControl
          options={statusOptions}
          value={data.status}
          onChange={handleStatusChange}
          layoutId="fingerprint-visa-segment"
          size="sm"
        />
        {showErrors && notChosen && (
          <p className="mt-1.5 text-xs font-medium text-red-500">{t("mustChoose")}</p>
        )}
      </div>

      {/* Visa fields */}
      <AnimatePresence>
        {showVisaFields && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4 overflow-visible"
          >
            {/* Visa sticker number */}
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("visaNumberLabel")}
                <span className="ml-1 text-red-500">*</span>
              </Label>
              <Input
                value={data.visa_number}
                onChange={(e) => {
                  const filtered = handleVisaNumberInput(data.visa_number, e.target.value);
                  update({ visa_number: filtered });
                }}
                placeholder="FRA1234567"
                className="h-11 rounded-xl"
                aria-invalid={showErrors && (visaNumberEmpty || visaNumberBadFormat) ? true : undefined}
              />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {t("visaNumberFormat")}
              </p>
              {showErrors && visaNumberEmpty && (
                <p className="mt-1 text-xs font-medium text-red-500">{t("visaNumberRequired")}</p>
              )}
              {showErrors && visaNumberBadFormat && (
                <p className="mt-1 text-xs font-medium text-red-500">{t("visaNumberFormatError")}</p>
              )}
            </div>

            {/* Date field — only for yes_date */}
            <AnimatePresence>
              {data.status === "yes_date" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-visible"
                >
                  <div>
                    <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t("visaDateLabel")}
                      <span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={data.visa_date}
                      onChange={(e) => update({ visa_date: e.target.value })}
                      className="h-11 rounded-xl"
                      aria-invalid={showErrors && visaDateEmpty ? true : undefined}
                    />
                    {showErrors && visaDateEmpty && (
                      <p className="mt-1.5 text-xs font-medium text-red-500">{t("visaDateRequired")}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
