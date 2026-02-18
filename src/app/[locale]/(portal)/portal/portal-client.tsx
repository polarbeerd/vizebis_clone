"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { Search, ArrowRight, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { lookupApplication } from "./actions";
import { toast } from "sonner";

export function PortalClient() {
  const t = useTranslations("portal");
  const tApply = useTranslations("portalApply");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    const { data, error } = await lookupApplication(code.trim());
    setLoading(false);

    if (error || !data) {
      toast.error(t("notFound"), { description: t("notFoundDescription") });
      return;
    }

    router.push(`/portal/${data.tracking_code}`);
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-3xl text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FEBEBF] shadow-xl shadow-[#FEBEBF]/25"
        >
          <Search className="h-9 w-9 text-slate-700" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl"
        >
          {t("title")}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="mb-10 text-lg text-slate-600 dark:text-slate-400"
        >
          {t("subtitle")}
        </motion.p>

        {/* Two-path cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card 1: I have a tracking code */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEBEBF] shadow-md shadow-[#FEBEBF]/20">
              <Search className="h-6 w-6 text-white" />
            </div>
            <h2 className="mb-4 text-left text-xl font-semibold text-slate-900 dark:text-white">
              {tApply("haveCode")}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t("trackingCodePlaceholder")}
                  className="h-12 rounded-xl border-slate-200/80 bg-white/80 pl-4 pr-12 text-base shadow-sm backdrop-blur-sm transition-shadow focus:shadow-md focus:shadow-brand-200/30 dark:border-slate-700/80 dark:bg-slate-800/80 dark:shadow-none dark:focus:shadow-brand-900/20"
                  disabled={loading}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Button
                    type="submit"
                    size="icon"
                    disabled={loading || !code.trim()}
                    className="h-8 w-8 rounded-lg bg-[#FEBEBF] shadow-sm transition-transform hover:scale-105 hover:brightness-90 active:scale-95 disabled:opacity-50"
                  >
                    <motion.div
                      animate={loading ? { rotate: 360 } : {}}
                      transition={
                        loading
                          ? { duration: 1, repeat: Infinity, ease: "linear" }
                          : {}
                      }
                    >
                      <ArrowRight className="h-4 w-4 text-slate-700" />
                    </motion.div>
                  </Button>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="h-11 w-full rounded-xl bg-[#FEBEBF] text-white text-base font-semibold shadow-md shadow-[#FEBEBF]/25 transition-all hover:brightness-90"
                >
                  {loading ? t("searching") : t("trackButton")}
                </Button>
              </motion.div>
            </form>
          </motion.div>

          {/* Mobile divider with "or" */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="flex items-center justify-center md:hidden"
          >
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="px-4 text-sm font-medium text-slate-400 dark:text-slate-500">
              {tApply("or")}
            </span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </motion.div>

          {/* Card 2: Start new application */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-col rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEBEBF] shadow-md shadow-brand-400/20">
              <PlusCircle className="h-6 w-6 text-white" />
            </div>
            <h2 className="mb-2 text-left text-xl font-semibold text-slate-900 dark:text-white">
              {tApply("startNew")}
            </h2>
            <p className="mb-6 flex-1 text-left text-sm text-slate-500 dark:text-slate-400">
              {tApply("selectCountrySubtitle")}
            </p>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/portal/apply" className="block">
                <Button className="h-11 w-full rounded-xl bg-[#FEBEBF] text-white text-base font-medium shadow-lg shadow-[#FEBEBF]/25 transition-all hover:brightness-90 hover:shadow-xl hover:shadow-[#FEBEBF]/30">
                  {tApply("startNew")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="mt-16 text-sm text-slate-400 dark:text-slate-600"
      >
        {t("poweredBy")}
      </motion.p>
    </div>
  );
}
