import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { DollarSign, Banknote, Euro, CheckCircle } from "lucide-react";

export default async function FinancePage() {
  const supabase = await createClient();
  const t = await getTranslations("finance");

  // Fetch unpaid applications to calculate debt by currency
  let debtTL = 0;
  let debtUSD = 0;
  let debtEUR = 0;
  let paidThisMonth = 0;

  try {
    const { data: unpaid } = await supabase
      .from("applications")
      .select("consulate_fee, service_fee, currency")
      .eq("is_deleted", false)
      .eq("payment_status", "odenmedi");

    if (unpaid) {
      for (const app of unpaid) {
        const total = (app.consulate_fee ?? 0) + (app.service_fee ?? 0);
        const currency = (app.currency ?? "TL").toUpperCase();
        if (currency === "USD") debtUSD += total;
        else if (currency === "EUR") debtEUR += total;
        else debtTL += total;
      }
    }

    // Fetch paid this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: paid } = await supabase
      .from("applications")
      .select("consulate_fee, service_fee, currency, payment_date")
      .eq("is_deleted", false)
      .eq("payment_status", "odendi")
      .gte("payment_date", startOfMonth)
      .lte("payment_date", endOfMonth);

    if (paid) {
      for (const app of paid) {
        const total = (app.consulate_fee ?? 0) + (app.service_fee ?? 0);
        paidThisMonth += total;
      }
    }
  } catch (error) {
    console.error("Error fetching finance data:", error);
  }

  const formatNum = (n: number) =>
    new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("totalDebtTL")}
          value={`${formatNum(debtTL)} TL`}
          icon={Banknote}
          variant="red"
        />
        <StatCard
          title={t("totalDebtUSD")}
          value={`$${formatNum(debtUSD)}`}
          icon={DollarSign}
          variant="yellow"
        />
        <StatCard
          title={t("totalDebtEUR")}
          value={`${formatNum(debtEUR)} EUR`}
          icon={Euro}
          variant="blue"
        />
        <StatCard
          title={t("paidThisMonth")}
          value={`${formatNum(paidThisMonth)} TL`}
          icon={CheckCircle}
          variant="green"
        />
      </div>
    </div>
  );
}
