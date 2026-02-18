"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { CountryDefaultSelector } from "./_shared/country-default-selector";
import type { SmartFieldProps } from "./registry";

interface PassportCountryData {
  country: "turkey" | "other" | "";
  custom_country: string;
}

function parseData(value: Record<string, unknown>): PassportCountryData {
  return {
    country: (value.country as PassportCountryData["country"]) ?? "",
    custom_country: (value.custom_country as string) ?? "",
  };
}

export function PassportCountry({
  value,
  onChange,
  isRequired,
  submitted,
  errors,
}: SmartFieldProps) {
  const t = useTranslations("smartFields.passportCountry");
  const tShared = useTranslations("smartFields.shared");
  const data = parseData(value);
  const showErrors = !!submitted;

  function update(partial: Partial<PassportCountryData>) {
    onChange({ ...value, ...partial });
  }

  // Validation
  const notChosen = data.country === "";
  const customEmpty = data.country === "other" && !data.custom_country.trim();
  const hasErrors = notChosen || customEmpty;

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
      <CountryDefaultSelector
        selection={data.country}
        customValue={data.custom_country}
        onSelectionChange={(sel) =>
          update({ country: sel, custom_country: sel === "turkey" ? "" : data.custom_country })
        }
        onCustomChange={(text) => update({ custom_country: text })}
        label={t("label")}
        isRequired={isRequired}
        showErrors={showErrors}
        errorNotChosen={tShared("countryRequired")}
        errorCustomEmpty={tShared("customCountryRequired")}
        turkeyLabel={tShared("turkey")}
        otherLabel={tShared("other")}
        layoutId="passport-country-segment"
        customPlaceholder={tShared("customCountryPlaceholder")}
      />

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
