"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/stat-card";
import { DebtIndividualClient } from "../debt-individual/debt-individual-client";
import { DebtCorporateClient } from "../debt-corporate/debt-corporate-client";
import { AtConsulateClient } from "../at-consulate/at-consulate-client";
import { DollarSign, Banknote, Euro, CheckCircle } from "lucide-react";
import type {
  FinanceSummary,
  DebtIndividualRow,
  DebtCorporateRow,
  AtConsulateRow,
} from "./page";

interface FinanceHubClientProps {
  summary: FinanceSummary;
  individualDebt: DebtIndividualRow[];
  corporateDebt: DebtCorporateRow[];
  atConsulate: AtConsulateRow[];
}

const formatNum = (n: number) =>
  new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export function FinanceHubClient({
  summary,
  individualDebt,
  corporateDebt,
  atConsulate,
}: FinanceHubClientProps) {
  const t = useTranslations("finance");
  const tNav = useTranslations("nav");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{tNav("finance")}</h1>

      {/* Summary cards — always visible */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("totalDebtTL")}
          value={`${formatNum(summary.debtTL)} TL`}
          icon={Banknote}
          variant="red"
        />
        <StatCard
          title={t("totalDebtUSD")}
          value={`$${formatNum(summary.debtUSD)}`}
          icon={DollarSign}
          variant="yellow"
        />
        <StatCard
          title={t("totalDebtEUR")}
          value={`${formatNum(summary.debtEUR)} EUR`}
          icon={Euro}
          variant="blue"
        />
        <StatCard
          title={t("paidThisMonth")}
          value={`${formatNum(summary.paidThisMonth)} TL`}
          icon={CheckCircle}
          variant="green"
        />
      </div>

      {/* Tabs for details */}
      <Tabs defaultValue="individual">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="individual">
            {tNav("debtIndividual")}
            <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">
              {individualDebt.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="corporate">
            {tNav("debtCorporate")}
            <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">
              {corporateDebt.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="consulate">
            {tNav("atConsulate")}
            <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">
              {atConsulate.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="mt-4">
          <DebtIndividualClient data={individualDebt} />
        </TabsContent>

        <TabsContent value="corporate" className="mt-4">
          <DebtCorporateClient data={corporateDebt} />
        </TabsContent>

        <TabsContent value="consulate" className="mt-4">
          <AtConsulateClient data={atConsulate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
