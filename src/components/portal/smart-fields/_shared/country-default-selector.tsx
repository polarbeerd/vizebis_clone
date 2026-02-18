"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/portal/segmented-control";

interface CountryDefaultSelectorProps {
  selection: "turkey" | "other" | "";
  customValue: string;
  onSelectionChange: (sel: "turkey" | "other") => void;
  onCustomChange: (text: string) => void;
  label: string;
  isRequired: boolean;
  showErrors: boolean;
  errorNotChosen: string;
  errorCustomEmpty: string;
  turkeyLabel: string;
  otherLabel: string;
  customPlaceholder: string;
  /** Unique layoutId to avoid animation conflicts between multiple instances */
  layoutId?: string;
}

export function CountryDefaultSelector({
  selection,
  customValue,
  onSelectionChange,
  onCustomChange,
  label,
  isRequired,
  showErrors,
  errorNotChosen,
  errorCustomEmpty,
  turkeyLabel,
  otherLabel,
  customPlaceholder,
  layoutId = "country-default-segment",
}: CountryDefaultSelectorProps) {
  const notChosen = selection === "";
  const customEmpty = selection === "other" && !customValue.trim();

  const options = [
    { value: "turkey", label: turkeyLabel },
    { value: "other", label: otherLabel },
  ];

  return (
    <div>
      <Label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {isRequired && <span className="ml-1 text-red-500">*</span>}
      </Label>
      <SegmentedControl
        options={options}
        value={selection}
        onChange={(val) => onSelectionChange(val as "turkey" | "other")}
        layoutId={layoutId}
        size="sm"
      />
      {showErrors && notChosen && (
        <p className="mt-1.5 text-xs font-medium text-red-500">{errorNotChosen}</p>
      )}

      <AnimatePresence>
        {selection === "other" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2">
              <Input
                value={customValue}
                onChange={(e) => onCustomChange(e.target.value)}
                placeholder={customPlaceholder}
                className="h-11 rounded-xl"
                aria-invalid={showErrors && customEmpty ? true : undefined}
              />
              {showErrors && customEmpty && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errorCustomEmpty}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
