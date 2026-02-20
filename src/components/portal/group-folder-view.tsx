"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import {
  UserPlus,
  Pencil,
  Trash2,
  Send,
  MapPin,
  Plane,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GroupData, GroupMember } from "@/app/[locale]/(portal)/portal/actions";
import type { CountryOption, VisaTypeOption } from "@/app/[locale]/(portal)/portal/actions";

interface GroupFolderViewProps {
  group: GroupData;
  members: GroupMember[];
  countries: CountryOption[];
  visaTypes: VisaTypeOption[];
  onAddMember: () => void;
  onEditMember: (member: GroupMember) => void;
  onDeleteMember: (member: GroupMember) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export function GroupFolderView({
  group,
  members,
  countries,
  visaTypes,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onSubmit,
  submitting,
}: GroupFolderViewProps) {
  const t = useTranslations("portalApply");
  const locale = useLocale();

  const country = countries.find((c) => c.name === group.country);
  const flagEmoji = country?.flag_emoji || "\u{1F3F3}\u{FE0F}";
  const countryName = locale === "en" && country?.name_en ? country.name_en : group.country;

  const visaLabel = (value: string) => {
    const vt = visaTypes.find((v) => v.value === value);
    if (!vt) return value;
    return locale === "tr" ? vt.label_tr : vt.label_en;
  };

  const travelInfo = group.travel_dates as Record<string, string> | null;
  const departure = travelInfo?.departure;
  const returnDate = travelInfo?.return;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="rounded-xl border border-slate-200/60 bg-white/60 p-4 backdrop-blur-sm sm:p-5 dark:border-slate-700/60 dark:bg-slate-800/40">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
            <Users className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {group.group_name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                {flagEmoji} {countryName}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {group.application_city}
              </span>
              {departure && (
                <span className="flex items-center gap-1">
                  <Plane className="h-3.5 w-3.5" />
                  {departure}
                  {returnDate ? ` – ${returnDate}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t("folderMembers")}
          </h3>
          <span className="text-xs text-slate-400">
            {t("memberCount", { count: members.length })}
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          {members.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center dark:border-slate-600 dark:bg-slate-800/30"
            >
              <UserPlus className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {t("noMembers")}
              </p>
            </motion.div>
          )}

          {members.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/60 p-4 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/40"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {member.full_name || "—"}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {member.passport_no && <span>{member.passport_no}</span>}
                  {member.id_number && <span>| {member.id_number}</span>}
                  {member.date_of_birth && <span>| {member.date_of_birth}</span>}
                </div>
              </div>
              {member.visa_type && (
                <span className="hidden shrink-0 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 sm:inline-block dark:bg-brand-900/30 dark:text-brand-400">
                  {visaLabel(member.visa_type)}
                </span>
              )}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditMember(member)}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-brand-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteMember(member)}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-white/60 p-4 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/40">
        <Button
          variant="outline"
          onClick={onAddMember}
          className="h-10 rounded-xl border-brand-300 text-brand-600 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-400 dark:hover:bg-brand-900/20"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {t("addMember")}
        </Button>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={onSubmit}
            disabled={members.length === 0 || submitting}
            className="h-10 rounded-xl bg-[#FEBEBF] text-white px-6 text-sm font-semibold shadow-md shadow-brand-400/25 transition-all hover:brightness-90 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {t("submitGroup")}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
