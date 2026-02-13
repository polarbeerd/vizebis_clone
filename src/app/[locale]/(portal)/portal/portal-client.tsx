"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { lookupApplication } from "./actions";
import { toast } from "sonner";

export function PortalClient() {
  const t = useTranslations("portal");
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
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-lg text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-xl shadow-blue-500/25"
        >
          <Search className="h-9 w-9 text-white" />
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

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="relative">
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("trackingCodePlaceholder")}
              className="h-14 rounded-xl border-slate-200/80 bg-white/80 pl-5 pr-14 text-lg shadow-lg shadow-slate-200/50 backdrop-blur-sm transition-shadow focus:shadow-xl focus:shadow-blue-200/30 dark:border-slate-700/80 dark:bg-slate-900/80 dark:shadow-none dark:focus:shadow-blue-900/20"
              disabled={loading}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Button
                type="submit"
                size="icon"
                disabled={loading || !code.trim()}
                className="h-10 w-10 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <motion.div
                  animate={loading ? { rotate: 360 } : {}}
                  transition={loading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                >
                  <ArrowRight className="h-5 w-5 text-white" />
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
              className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-base font-medium shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 sm:hidden"
            >
              {loading ? t("searching") : t("trackButton")}
            </Button>
          </motion.div>
        </motion.form>
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
