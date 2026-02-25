"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { normalizeText } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountryDefaultSelector } from "./_shared/country-default-selector";
import type { SmartFieldProps } from "./registry";

interface BirthPlaceData {
  birth_city: string;
  birth_country: "turkey" | "other" | "";
  custom_country: string;
}

function parseData(value: Record<string, unknown>): BirthPlaceData {
  return {
    birth_city: (value.birth_city as string) ?? "",
    birth_country: (value.birth_country as BirthPlaceData["birth_country"]) ?? "",
    custom_country: (value.custom_country as string) ?? "",
  };
}

export function BirthPlace({
  value,
  onChange,
  isRequired,
  submitted,
  errors,
}: SmartFieldProps) {
  const t = useTranslations("smartFields.birthPlace");
  const tShared = useTranslations("smartFields.shared");
  const data = parseData(value);
  const showErrors = !!submitted;

  function update(partial: Partial<BirthPlaceData>) {
    onChange({ ...value, ...partial });
  }

  // Validation
  const cityEmpty = !data.birth_city.trim();
  const countryNotChosen = data.birth_country === "";
  const customEmpty = data.birth_country === "other" && !data.custom_country.trim();
  const hasErrors = cityEmpty || countryNotChosen || customEmpty;

  React.useEffect(() => {
    const current = value._valid as boolean | undefined;
    const valid = !hasErrors;
    if (current !== valid) {
      onChange({ ...value, _valid: valid });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasErrors]);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-700/60 dark:bg-slate-800/30">
      {/* City */}
      <div>
        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("cityLabel")}
          {isRequired && <span className="ml-1 text-red-500">*</span>}
        </Label>
        <Input
          value={data.birth_city}
          onChange={(e) => update({ birth_city: normalizeText(e.target.value) })}
          placeholder={t("cityPlaceholder")}
          className="h-11 rounded-xl"
          aria-invalid={showErrors && cityEmpty ? true : undefined}
        />
        {showErrors && cityEmpty && (
          <p className="mt-1.5 text-xs font-medium text-red-500">{t("cityRequired")}</p>
        )}
      </div>

      {/* Country */}
      <CountryDefaultSelector
        selection={data.birth_country}
        customValue={data.custom_country}
        onSelectionChange={(sel) =>
          update({ birth_country: sel, custom_country: sel === "turkey" ? "" : data.custom_country })
        }
        onCustomChange={(text) => update({ custom_country: text })}
        label={t("countryLabel")}
        isRequired={isRequired}
        showErrors={showErrors}
        errorNotChosen={tShared("countryRequired")}
        errorCustomEmpty={tShared("customCountryRequired")}
        turkeyLabel={tShared("turkey")}
        otherLabel={tShared("other")}
        layoutId="birth-country-segment"
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
