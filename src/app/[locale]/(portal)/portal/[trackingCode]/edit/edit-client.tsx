"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitPersonalInfo } from "../../actions";
import type { PortalApplication } from "../../actions";

const formSchema = z.object({
  full_name: z.string().min(1),
  id_number: z.string(),
  date_of_birth: z.string(),
  phone: z.string(),
  email: z.string().email().or(z.literal("")),
  passport_no: z.string(),
  passport_expiry: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditClientProps {
  application: PortalApplication;
}

export function EditClient({ application }: EditClientProps) {
  const t = useTranslations("portal");
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: application.full_name ?? "",
      id_number: application.id_number ?? "",
      date_of_birth: application.date_of_birth ?? "",
      phone: application.phone ?? "",
      email: application.email ?? "",
      passport_no: application.passport_no ?? "",
      passport_expiry: application.passport_expiry ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    setSaving(true);
    const { success, error } = await submitPersonalInfo(
      application.tracking_code,
      data
    );
    setSaving(false);

    if (success) {
      toast.success(t("editSuccess"));
      router.push(`/portal/${application.tracking_code}`);
    } else {
      toast.error(t("editError"));
    }
  }

  const fields = [
    { name: "full_name" as const, label: t("fullName"), type: "text" },
    { name: "id_number" as const, label: t("idNumber"), type: "text" },
    { name: "date_of_birth" as const, label: t("dateOfBirth"), type: "date" },
    { name: "phone" as const, label: t("phone"), type: "tel" },
    { name: "email" as const, label: t("email"), type: "email" },
    { name: "passport_no" as const, label: t("passportNo"), type: "text" },
    { name: "passport_expiry" as const, label: t("passportExpiry"), type: "date" },
  ];

  return (
    <div className="space-y-8">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link href={`/portal/${application.tracking_code}`}>
          <Button variant="ghost" size="sm" className="gap-2 text-slate-600 dark:text-slate-400">
            <ArrowLeft className="h-4 w-4" />
            {t("backToSearch")}
          </Button>
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("editTitle")}
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{t("editSubtitle")}</p>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mx-auto max-w-lg"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md sm:p-8 dark:border-slate-700/60 dark:bg-slate-900/70"
        >
          <div className="space-y-5">
            {fields.map((field, index) => (
              <motion.div
                key={field.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.07, duration: 0.4 }}
              >
                <Label
                  htmlFor={field.name}
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {field.label}
                </Label>
                <Input
                  id={field.name}
                  type={field.type}
                  {...register(field.name)}
                  className="h-11 rounded-xl border-slate-200/80 bg-white/80 transition-shadow focus:shadow-md focus:shadow-brand-100/50 dark:border-slate-700/80 dark:bg-slate-800/80 dark:focus:shadow-brand-900/20"
                />
                {errors[field.name] && (
                  <p className="mt-1 text-xs text-red-500">
                    {field.name === "email" ? t("invalidEmail") : t("required")}
                  </p>
                )}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.4 }}
            className="mt-8"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={saving}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 text-base font-medium shadow-lg shadow-brand-500/25 transition-all hover:shadow-xl hover:shadow-brand-500/30"
              >
                {saving ? (
                  t("saving")
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t("saveChanges")}
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
