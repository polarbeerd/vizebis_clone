"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { FolderPlus, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedControl } from "@/components/portal/segmented-control";
import { SmartFieldRenderer } from "@/components/portal/smart-fields/smart-field-renderer";
import {
  getCitiesForCountry,
  SEGMENTED_THRESHOLD,
  type CityOption,
} from "@/config/application-cities";

interface GroupFolderFormProps {
  country: string;
  onCreateFolder: (data: {
    groupName: string;
    city: string;
    travelDates?: Record<string, unknown>;
  }) => Promise<void>;
  loading: boolean;
}

export function GroupFolderForm({
  country,
  onCreateFolder,
  loading,
}: GroupFolderFormProps) {
  const t = useTranslations("portalApply");
  const locale = useLocale();

  const [groupName, setGroupName] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [travelDates, setTravelDates] = useState<Record<string, unknown>>({});

  const countryCities = useMemo(
    () => getCitiesForCountry(country),
    [country]
  );
  const cityLabel = (c: CityOption) =>
    locale === "en" ? c.label_en : c.label_tr;
  const useSegmented = countryCities.length <= SEGMENTED_THRESHOLD;
  const citySegmentOptions = useMemo(
    () =>
      countryCities.map((c) => ({
        value: c.value,
        label: locale === "en" ? c.label_en : c.label_tr,
        icon: <MapPin className="h-3.5 w-3.5" />,
      })),
    [countryCities, locale]
  );

  const canSubmit = groupName.trim().length > 0 && selectedCity.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onCreateFolder({
      groupName: groupName.trim(),
      city: selectedCity,
      travelDates: Object.keys(travelDates).length > 0 ? travelDates : undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {t("groupFolderTitle")}
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 sm:mt-2 sm:text-base dark:text-slate-400">
          {t("groupFolderSubtitle")}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/60 bg-white/60 p-4 backdrop-blur-sm sm:p-6 dark:border-slate-700/60 dark:bg-slate-800/40 space-y-5">
        {/* Group name */}
        <div>
          <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("groupName")} <span className="text-red-500">*</span>
          </Label>
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t("groupNamePlaceholder")}
            className="h-11 rounded-xl"
          />
        </div>

        {/* Application city */}
        <div>
          <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("applicationCity")} <span className="text-red-500">*</span>
          </Label>
          {useSegmented ? (
            <SegmentedControl
              options={citySegmentOptions}
              value={selectedCity}
              onChange={setSelectedCity}
              layoutId="group-city-segment"
              fullWidth
            />
          ) : (
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder={t("applicationCity")} />
              </SelectTrigger>
              <SelectContent>
                {countryCities.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {cityLabel(c)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Travel dates smart field */}
        <div>
          <SmartFieldRenderer
            templateKey="travelDates"
            label={t("sectionTravel")}
            description=""
            isRequired={false}
            value={travelDates}
            onChange={setTravelDates}
            submitted={false}
          />
        </div>
      </div>

      {/* Create button */}
      <div className="flex justify-center">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="h-11 rounded-xl bg-[#FEBEBF] text-white px-8 text-sm font-semibold shadow-md shadow-brand-400/25 transition-all hover:brightness-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FolderPlus className="mr-2 h-4 w-4" />
            )}
            {t("createFolder")}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
