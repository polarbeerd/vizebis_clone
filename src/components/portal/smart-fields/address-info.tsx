"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountryDefaultSelector } from "./_shared/country-default-selector";
import type { SmartFieldProps } from "./registry";

interface AddressInfoData {
  address: string;
  postal_code: string;
  city: string;
  country: "turkey" | "other" | "";
  custom_country: string;
}

function parseData(value: Record<string, unknown>): AddressInfoData {
  return {
    address: (value.address as string) ?? "",
    postal_code: (value.postal_code as string) ?? "",
    city: (value.city as string) ?? "",
    country: (value.country as AddressInfoData["country"]) ?? "",
    custom_country: (value.custom_country as string) ?? "",
  };
}

export function AddressInfo({
  value,
  onChange,
  isRequired,
  submitted,
  errors,
}: SmartFieldProps) {
  const t = useTranslations("smartFields.addressInfo");
  const tShared = useTranslations("smartFields.shared");
  const data = parseData(value);
  const showErrors = !!submitted;

  function update(partial: Partial<AddressInfoData>) {
    onChange({ ...value, ...partial });
  }

  // Validation
  const addressEmpty = !data.address.trim();
  const postalEmpty = !data.postal_code.trim();
  const cityEmpty = !data.city.trim();
  const countryNotChosen = data.country === "";
  const customEmpty = data.country === "other" && !data.custom_country.trim();
  const hasErrors = addressEmpty || postalEmpty || cityEmpty || countryNotChosen || customEmpty;

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
      {/* Address (full width) */}
      <div>
        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("addressLabel")}
          {isRequired && <span className="ml-1 text-red-500">*</span>}
        </Label>
        <Input
          value={data.address}
          onChange={(e) => update({ address: e.target.value })}
          placeholder={t("addressPlaceholder")}
          className="h-11 rounded-xl"
          aria-invalid={showErrors && addressEmpty ? true : undefined}
        />
        {showErrors && addressEmpty && (
          <p className="mt-1.5 text-xs font-medium text-red-500">{t("addressRequired")}</p>
        )}
      </div>

      {/* Postal code + City (2-col) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("postalCodeLabel")}
            {isRequired && <span className="ml-1 text-red-500">*</span>}
          </Label>
          <Input
            value={data.postal_code}
            onChange={(e) => update({ postal_code: e.target.value })}
            placeholder={t("postalCodePlaceholder")}
            className="h-11 rounded-xl"
            aria-invalid={showErrors && postalEmpty ? true : undefined}
          />
          {showErrors && postalEmpty && (
            <p className="mt-1.5 text-xs font-medium text-red-500">{t("postalCodeRequired")}</p>
          )}
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("cityLabel")}
            {isRequired && <span className="ml-1 text-red-500">*</span>}
          </Label>
          <Input
            value={data.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder={t("cityPlaceholder")}
            className="h-11 rounded-xl"
            aria-invalid={showErrors && cityEmpty ? true : undefined}
          />
          {showErrors && cityEmpty && (
            <p className="mt-1.5 text-xs font-medium text-red-500">{t("cityRequired")}</p>
          )}
        </div>
      </div>

      {/* Country */}
      <CountryDefaultSelector
        selection={data.country}
        customValue={data.custom_country}
        onSelectionChange={(sel) =>
          update({ country: sel, custom_country: sel === "turkey" ? "" : data.custom_country })
        }
        onCustomChange={(text) => update({ custom_country: text })}
        label={t("countryLabel")}
        layoutId="address-country-segment"
        isRequired={isRequired}
        showErrors={showErrors}
        errorNotChosen={tShared("countryRequired")}
        errorCustomEmpty={tShared("customCountryRequired")}
        turkeyLabel={tShared("turkey")}
        otherLabel={tShared("other")}
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
