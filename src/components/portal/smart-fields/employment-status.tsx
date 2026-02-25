"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { normalizeText } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/portal/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryDefaultSelector } from "./_shared/country-default-selector";
import { PhoneInput } from "@/components/portal/phone-input";
import type { SmartFieldProps } from "./registry";

const OCCUPATION_OPTIONS = [
  "adm_tech_service_staff",
  "architect",
  "artisan",
  "artist",
  "banker",
  "blue_collar_worker",
  "chauffeur",
  "chemist",
  "civil_servant",
  "company_executive",
  "computer_expert",
  "diplomat",
  "diplomat_private_servant",
  "electronics_expert",
  "farmer",
  "fashion_cosmetics",
  "journalist",
  "legal_profession",
  "magistrate",
  "manager",
  "med_paramed_prof",
  "other_technician",
  "pensioner",
  "policeman_soldier",
  "politician",
  "professional_sportsperson",
  "scientific_researcher",
  "seaman",
  "self_employed",
  "teacher",
  "tradesman",
  "white_collar_worker",
  "other",
] as const;

interface EmploymentStatusData {
  is_employed: "yes" | "no" | "";
  occupation: string;
  occupation_other: string;
  title_description: string;
  employer_name: string;
  employer_address: string;
  employer_postal_code: string;
  employer_city: string;
  employer_country: "turkey" | "other" | "";
  employer_country_custom: string;
  employer_phone: string;
  is_student: "yes" | "no" | "";
  school_name: string;
  school_address: string;
  school_postal_code: string;
  school_city: string;
  school_country: "turkey" | "other" | "";
  school_country_custom: string;
  school_phone: string;
  is_retired: "yes" | "no" | "";
}

const EMPTY_DATA: EmploymentStatusData = {
  is_employed: "",
  occupation: "",
  occupation_other: "",
  title_description: "",
  employer_name: "",
  employer_address: "",
  employer_postal_code: "",
  employer_city: "",
  employer_country: "",
  employer_country_custom: "",
  employer_phone: "",
  is_student: "",
  school_name: "",
  school_address: "",
  school_postal_code: "",
  school_city: "",
  school_country: "",
  school_country_custom: "",
  school_phone: "",
  is_retired: "",
};

function parseData(value: Record<string, unknown>): EmploymentStatusData {
  return {
    is_employed: (value.is_employed as EmploymentStatusData["is_employed"]) ?? "",
    occupation: (value.occupation as string) ?? "",
    occupation_other: (value.occupation_other as string) ?? "",
    title_description: (value.title_description as string) ?? "",
    employer_name: (value.employer_name as string) ?? "",
    employer_address: (value.employer_address as string) ?? "",
    employer_postal_code: (value.employer_postal_code as string) ?? "",
    employer_city: (value.employer_city as string) ?? "",
    employer_country: (value.employer_country as EmploymentStatusData["employer_country"]) ?? "",
    employer_country_custom: (value.employer_country_custom as string) ?? "",
    employer_phone: (value.employer_phone as string) ?? "",
    is_student: (value.is_student as EmploymentStatusData["is_student"]) ?? "",
    school_name: (value.school_name as string) ?? "",
    school_address: (value.school_address as string) ?? "",
    school_postal_code: (value.school_postal_code as string) ?? "",
    school_city: (value.school_city as string) ?? "",
    school_country: (value.school_country as EmploymentStatusData["school_country"]) ?? "",
    school_country_custom: (value.school_country_custom as string) ?? "",
    school_phone: (value.school_phone as string) ?? "",
    is_retired: (value.is_retired as EmploymentStatusData["is_retired"]) ?? "",
  };
}

// Hook to manage overflow during Framer Motion height animations.
// overflow-hidden is needed during animate/exit to prevent layout jumps,
// but must switch to overflow-visible once settled so dropdowns aren't clipped.
function useAnimOverflow() {
  const [overflow, setOverflow] = React.useState(false); // true = visible
  return {
    className: overflow ? "overflow-visible" : "overflow-hidden",
    onAnimationComplete: (def: string) => {
      if (def === "animate") setOverflow(true);
    },
    onAnimationStart: () => setOverflow(false),
  };
}

export function EmploymentStatus({
  value,
  onChange,
  isRequired,
  submitted,
  errors,
}: SmartFieldProps) {
  const t = useTranslations("smartFields.employmentStatus");
  const tShared = useTranslations("smartFields.shared");
  const data = parseData(value);
  const showErrors = !!submitted;

  // Overflow toggles for each AnimatePresence section
  const employedYesOverflow = useAnimOverflow();
  const occupationOtherOverflow = useAnimOverflow();
  const employedNoOverflow = useAnimOverflow();
  const studentYesOverflow = useAnimOverflow();
  const retiredOverflow = useAnimOverflow();

  function update(partial: Partial<EmploymentStatusData>) {
    onChange({ ...value, ...partial });
  }

  // ── Branch handlers with state reset ──
  function handleEmployed(val: "yes" | "no") {
    if (val === "yes") {
      // Clear student/retired branches
      update({
        is_employed: "yes",
        is_student: "",
        school_name: "",
        school_address: "",
        school_postal_code: "",
        school_city: "",
        school_country: "",
        school_country_custom: "",
        school_phone: "",
        is_retired: "",
      });
    } else {
      // Clear employer branch
      update({
        is_employed: "no",
        occupation: "",
        occupation_other: "",
        title_description: "",
        employer_name: "",
        employer_address: "",
        employer_postal_code: "",
        employer_city: "",
        employer_country: "",
        employer_country_custom: "",
        employer_phone: "",
      });
    }
  }

  function handleStudent(val: "yes" | "no") {
    if (val === "yes") {
      update({
        is_student: "yes",
        is_retired: "",
      });
    } else {
      // Clear school branch
      update({
        is_student: "no",
        school_name: "",
        school_address: "",
        school_postal_code: "",
        school_city: "",
        school_country: "",
        school_country_custom: "",
        school_phone: "",
      });
    }
  }

  function handleRetired(val: "yes" | "no") {
    update({ is_retired: val });
  }

  function handleOccupationChange(occ: string) {
    if (occ !== "other") {
      update({ occupation: occ, occupation_other: "" });
    } else {
      update({ occupation: occ });
    }
  }

  // ── Validation ──
  const employedNotChosen = data.is_employed === "";

  // Employed = yes validation
  const occupationEmpty = data.is_employed === "yes" && !data.occupation;
  const occupationOtherEmpty =
    data.is_employed === "yes" && data.occupation === "other" && !data.occupation_other.trim();
  const employerNameEmpty = data.is_employed === "yes" && !data.employer_name.trim();
  const employerAddressEmpty = data.is_employed === "yes" && !data.employer_address.trim();
  const employerPostalEmpty = data.is_employed === "yes" && !data.employer_postal_code.trim();
  const employerCityEmpty = data.is_employed === "yes" && !data.employer_city.trim();
  const employerCountryNotChosen = data.is_employed === "yes" && data.employer_country === "";
  const employerCountryCustomEmpty =
    data.is_employed === "yes" && data.employer_country === "other" && !data.employer_country_custom.trim();
  const employerPhoneEmpty = data.is_employed === "yes" && !data.employer_phone.trim();

  // Not employed → student/retired validation
  const studentNotChosen = data.is_employed === "no" && data.is_student === "";

  // Student = yes validation
  const schoolNameEmpty =
    data.is_employed === "no" && data.is_student === "yes" && !data.school_name.trim();
  const schoolAddressEmpty =
    data.is_employed === "no" && data.is_student === "yes" && !data.school_address.trim();
  const schoolPostalEmpty =
    data.is_employed === "no" && data.is_student === "yes" && !data.school_postal_code.trim();
  const schoolCityEmpty =
    data.is_employed === "no" && data.is_student === "yes" && !data.school_city.trim();
  const schoolCountryNotChosen =
    data.is_employed === "no" && data.is_student === "yes" && data.school_country === "";
  const schoolCountryCustomEmpty =
    data.is_employed === "no" && data.is_student === "yes" && data.school_country === "other" && !data.school_country_custom.trim();
  const schoolPhoneEmpty =
    data.is_employed === "no" && data.is_student === "yes" && !data.school_phone.trim();

  // Not student → retired validation
  const retiredNotChosen =
    data.is_employed === "no" && data.is_student === "no" && data.is_retired === "";

  const hasErrors =
    employedNotChosen ||
    occupationEmpty ||
    occupationOtherEmpty ||
    employerNameEmpty ||
    employerAddressEmpty ||
    employerPostalEmpty ||
    employerCityEmpty ||
    employerCountryNotChosen ||
    employerCountryCustomEmpty ||
    employerPhoneEmpty ||
    studentNotChosen ||
    schoolNameEmpty ||
    schoolAddressEmpty ||
    schoolPostalEmpty ||
    schoolCityEmpty ||
    schoolCountryNotChosen ||
    schoolCountryCustomEmpty ||
    schoolPhoneEmpty ||
    retiredNotChosen;

  React.useEffect(() => {
    const current = value._valid as boolean | undefined;
    const valid = !hasErrors;
    if (current !== valid) {
      onChange({ ...value, _valid: valid });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasErrors]);

  // ── Reusable entity fields (employer/school) ──
  function renderEntityFields(
    prefix: "employer" | "school",
    nameVal: string,
    addressVal: string,
    postalVal: string,
    cityVal: string,
    countryVal: "turkey" | "other" | "",
    countryCustomVal: string,
    phoneVal: string,
    nameEmpty: boolean,
    addressEmpty: boolean,
    postalEmpty: boolean,
    cityEmpty: boolean,
    countryNotChosen: boolean,
    countryCustomEmpty: boolean,
    phoneEmpty: boolean
  ) {
    return (
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {t(`${prefix}Title`)}
        </h5>

        {/* Name */}
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            {t(`${prefix}Name`)}
            <span className="ml-0.5 text-red-500">*</span>
          </Label>
          <Input
            value={nameVal}
            onChange={(e) => update({ [`${prefix}_name`]: normalizeText(e.target.value) } as Partial<EmploymentStatusData>)}
            placeholder={t(`${prefix}NamePlaceholder`)}
            className="h-10 rounded-lg"
            aria-invalid={showErrors && nameEmpty ? true : undefined}
          />
          {showErrors && nameEmpty && (
            <p className="mt-1 text-xs font-medium text-red-500">{t(`${prefix}NameRequired`)}</p>
          )}
        </div>

        {/* Address */}
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            {t(`${prefix}Address`)}
            <span className="ml-0.5 text-red-500">*</span>
          </Label>
          <Input
            value={addressVal}
            onChange={(e) => update({ [`${prefix}_address`]: normalizeText(e.target.value) } as Partial<EmploymentStatusData>)}
            placeholder={t(`${prefix}AddressPlaceholder`)}
            className="h-10 rounded-lg"
            aria-invalid={showErrors && addressEmpty ? true : undefined}
          />
          {showErrors && addressEmpty && (
            <p className="mt-1 text-xs font-medium text-red-500">{t(`${prefix}AddressRequired`)}</p>
          )}
        </div>

        {/* Postal + City */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              {t(`${prefix}PostalCode`)}
              <span className="ml-0.5 text-red-500">*</span>
            </Label>
            <Input
              value={postalVal}
              onChange={(e) => update({ [`${prefix}_postal_code`]: normalizeText(e.target.value) } as Partial<EmploymentStatusData>)}
              placeholder={t(`${prefix}PostalCodePlaceholder`)}
              className="h-10 rounded-lg"
              aria-invalid={showErrors && postalEmpty ? true : undefined}
            />
            {showErrors && postalEmpty && (
              <p className="mt-1 text-xs font-medium text-red-500">{t(`${prefix}PostalCodeRequired`)}</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              {t(`${prefix}City`)}
              <span className="ml-0.5 text-red-500">*</span>
            </Label>
            <Input
              value={cityVal}
              onChange={(e) => update({ [`${prefix}_city`]: normalizeText(e.target.value) } as Partial<EmploymentStatusData>)}
              placeholder={t(`${prefix}CityPlaceholder`)}
              className="h-10 rounded-lg"
              aria-invalid={showErrors && cityEmpty ? true : undefined}
            />
            {showErrors && cityEmpty && (
              <p className="mt-1 text-xs font-medium text-red-500">{t(`${prefix}CityRequired`)}</p>
            )}
          </div>
        </div>

        {/* Country */}
        <CountryDefaultSelector
          selection={countryVal}
          customValue={countryCustomVal}
          onSelectionChange={(sel) =>
            update({
              [`${prefix}_country`]: sel,
              [`${prefix}_country_custom`]: sel === "turkey" ? "" : countryCustomVal,
            } as Partial<EmploymentStatusData>)
          }
          onCustomChange={(text) =>
            update({ [`${prefix}_country_custom`]: text } as Partial<EmploymentStatusData>)
          }
          label={t(`${prefix}Country`)}
          isRequired={true}
          showErrors={showErrors}
          errorNotChosen={tShared("countryRequired")}
          errorCustomEmpty={tShared("customCountryRequired")}
          turkeyLabel={tShared("turkey")}
          otherLabel={tShared("other")}
          customPlaceholder={tShared("customCountryPlaceholder")}
          layoutId={`${prefix}-country-segment`}
        />

        {/* Phone */}
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            {t(`${prefix}Phone`)}
            <span className="ml-0.5 text-red-500">*</span>
          </Label>
          <PhoneInput
            value={phoneVal}
            onChange={(phone) => update({ [`${prefix}_phone`]: phone } as Partial<EmploymentStatusData>)}
            placeholder={t(`${prefix}PhonePlaceholder`)}
            aria-invalid={showErrors && phoneEmpty ? true : undefined}
          />
          {showErrors && phoneEmpty && (
            <p className="mt-1 text-xs font-medium text-red-500">{t(`${prefix}PhoneRequired`)}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Q1: Are you employed? */}
      <div>
        <Label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("employedQuestion")}
          {isRequired && <span className="ml-1 text-red-500">*</span>}
        </Label>
        <SegmentedControl
          options={[
            { value: "yes", label: tShared("yes") },
            { value: "no", label: tShared("no") },
          ]}
          value={data.is_employed}
          onChange={(val) => handleEmployed(val as "yes" | "no")}
          layoutId="employed-segment"
          size="sm"
        />
        {showErrors && employedNotChosen && (
          <p className="mt-1.5 text-xs font-medium text-red-500">{tShared("mustChoose")}</p>
        )}
      </div>

      {/* ── EMPLOYED = YES ── */}
      <AnimatePresence>
        {data.is_employed === "yes" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className={`space-y-4 ${employedYesOverflow.className}`}
            onAnimationComplete={employedYesOverflow.onAnimationComplete}
            onAnimationStart={employedYesOverflow.onAnimationStart}
          >
            {/* Occupation */}
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("occupationLabel")}
                <span className="ml-1 text-red-500">*</span>
              </Label>
              <Select value={data.occupation} onValueChange={handleOccupationChange}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder={t("occupationPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {OCCUPATION_OPTIONS.map((occ) => (
                    <SelectItem key={occ} value={occ}>
                      {t(`occupations.${occ}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showErrors && occupationEmpty && (
                <p className="mt-1.5 text-xs font-medium text-red-500">{t("occupationRequired")}</p>
              )}
            </div>

            {/* Occupation other */}
            <AnimatePresence>
              {data.occupation === "other" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={occupationOtherOverflow.className}
                  onAnimationComplete={occupationOtherOverflow.onAnimationComplete}
                  onAnimationStart={occupationOtherOverflow.onAnimationStart}
                >
                  <div>
                    <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t("occupationOtherLabel")}
                      <span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      value={data.occupation_other}
                      onChange={(e) => update({ occupation_other: normalizeText(e.target.value) })}
                      placeholder={t("occupationOtherPlaceholder")}
                      className="h-11 rounded-xl"
                      aria-invalid={showErrors && occupationOtherEmpty ? true : undefined}
                    />
                    {showErrors && occupationOtherEmpty && (
                      <p className="mt-1.5 text-xs font-medium text-red-500">{t("occupationOtherRequired")}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Title description (optional) */}
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("titleDescription")}
              </Label>
              <Input
                value={data.title_description}
                onChange={(e) => update({ title_description: normalizeText(e.target.value) })}
                placeholder={t("titleDescriptionPlaceholder")}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Employer fields */}
            {renderEntityFields(
              "employer",
              data.employer_name,
              data.employer_address,
              data.employer_postal_code,
              data.employer_city,
              data.employer_country,
              data.employer_country_custom,
              data.employer_phone,
              employerNameEmpty,
              employerAddressEmpty,
              employerPostalEmpty,
              employerCityEmpty,
              employerCountryNotChosen,
              employerCountryCustomEmpty,
              employerPhoneEmpty
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EMPLOYED = NO → Student question ── */}
      <AnimatePresence>
        {data.is_employed === "no" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className={`space-y-4 ${employedNoOverflow.className}`}
            onAnimationComplete={employedNoOverflow.onAnimationComplete}
            onAnimationStart={employedNoOverflow.onAnimationStart}
          >
            {/* Q2: Are you a student? */}
            <div>
              <Label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("studentQuestion")}
                <span className="ml-1 text-red-500">*</span>
              </Label>
              <SegmentedControl
                options={[
                  { value: "yes", label: tShared("yes") },
                  { value: "no", label: tShared("no") },
                ]}
                value={data.is_student}
                onChange={(val) => handleStudent(val as "yes" | "no")}
                layoutId="student-segment"
                size="sm"
              />
              {showErrors && studentNotChosen && (
                <p className="mt-1.5 text-xs font-medium text-red-500">{tShared("mustChoose")}</p>
              )}
            </div>

            {/* Student = yes → school fields */}
            <AnimatePresence>
              {data.is_student === "yes" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className={studentYesOverflow.className}
                  onAnimationComplete={studentYesOverflow.onAnimationComplete}
                  onAnimationStart={studentYesOverflow.onAnimationStart}
                >
                  {renderEntityFields(
                    "school",
                    data.school_name,
                    data.school_address,
                    data.school_postal_code,
                    data.school_city,
                    data.school_country,
                    data.school_country_custom,
                    data.school_phone,
                    schoolNameEmpty,
                    schoolAddressEmpty,
                    schoolPostalEmpty,
                    schoolCityEmpty,
                    schoolCountryNotChosen,
                    schoolCountryCustomEmpty,
                    schoolPhoneEmpty
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Student = no → retired question */}
            <AnimatePresence>
              {data.is_student === "no" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className={retiredOverflow.className}
                  onAnimationComplete={retiredOverflow.onAnimationComplete}
                  onAnimationStart={retiredOverflow.onAnimationStart}
                >
                  <div>
                    <Label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t("retiredQuestion")}
                      <span className="ml-1 text-red-500">*</span>
                    </Label>
                    <SegmentedControl
                      options={[
                        { value: "yes", label: tShared("yes") },
                        { value: "no", label: tShared("no") },
                      ]}
                      value={data.is_retired}
                      onChange={(val) => handleRetired(val as "yes" | "no")}
                      layoutId="retired-segment"
                      size="sm"
                    />
                    {showErrors && retiredNotChosen && (
                      <p className="mt-1.5 text-xs font-medium text-red-500">{tShared("mustChoose")}</p>
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
