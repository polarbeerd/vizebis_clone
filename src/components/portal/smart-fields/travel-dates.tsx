"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SmartFieldProps } from "./registry";

interface TravelDatesData {
  departure_date: string;
  return_date: string;
}

function parseData(value: Record<string, unknown>): TravelDatesData {
  return {
    departure_date: (value.departure_date as string) ?? "",
    return_date: (value.return_date as string) ?? "",
  };
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function TravelDates({
  value,
  onChange,
  isRequired,
  submitted,
  errors,
}: SmartFieldProps) {
  const t = useTranslations("smartFields.travelDates");
  const data = parseData(value);
  const showErrors = !!submitted;
  const today = getTodayDate();

  function update(partial: Partial<TravelDatesData>) {
    onChange({ ...value, ...partial });
  }

  // Validation
  const departureEmpty = !data.departure_date;
  const returnEmpty = !data.return_date;
  const departurePast = !departureEmpty && data.departure_date < today;
  const returnBeforeDeparture =
    !departureEmpty && !returnEmpty && data.return_date <= data.departure_date;

  const hasErrors = departureEmpty || returnEmpty || departurePast || returnBeforeDeparture;

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
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Departure date */}
        <div>
          <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("departureDate")}
            {isRequired && <span className="ml-1 text-red-500">*</span>}
          </Label>
          <Input
            type="date"
            value={data.departure_date}
            onChange={(e) => update({ departure_date: e.target.value })}
            min={today}
            className="h-11 rounded-xl"
            aria-invalid={
              showErrors && (departureEmpty || departurePast) ? true : undefined
            }
          />
          {showErrors && departureEmpty && (
            <p className="mt-1.5 text-xs font-medium text-red-500">
              {t("departureRequired")}
            </p>
          )}
          {showErrors && !departureEmpty && departurePast && (
            <p className="mt-1.5 text-xs font-medium text-red-500">
              {t("departurePast")}
            </p>
          )}
        </div>

        {/* Return date */}
        <div>
          <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("returnDate")}
            {isRequired && <span className="ml-1 text-red-500">*</span>}
          </Label>
          <Input
            type="date"
            value={data.return_date}
            onChange={(e) => update({ return_date: e.target.value })}
            min={data.departure_date || today}
            className="h-11 rounded-xl"
            aria-invalid={
              showErrors && (returnEmpty || returnBeforeDeparture) ? true : undefined
            }
          />
          {showErrors && returnEmpty && (
            <p className="mt-1.5 text-xs font-medium text-red-500">
              {t("returnRequired")}
            </p>
          )}
          {showErrors && !returnEmpty && returnBeforeDeparture && (
            <p className="mt-1.5 text-xs font-medium text-red-500">
              {t("returnBeforeDeparture")}
            </p>
          )}
        </div>
      </div>

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
