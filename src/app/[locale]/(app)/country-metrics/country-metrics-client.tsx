"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/dashboard/stat-card";
import { Globe, CheckCircle, XCircle } from "lucide-react";
import type { ApplicationForMetrics } from "./page";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#a855f7",
];

const visaTypeLabelMap: Record<string, string> = {
  kulturel: "Kulturel",
  ticari: "Ticari",
  turistik: "Turistik",
  ziyaret: "Ziyaret",
  diger: "Diger",
};

interface CountryMetricsClientProps {
  applications: ApplicationForMetrics[];
}

export function CountryMetricsClient({
  applications,
}: CountryMetricsClientProps) {
  const t = useTranslations("countryMetrics");

  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const filteredApps = React.useMemo(() => {
    if (!startDate || !endDate) return applications;
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));
    return applications.filter((app) => {
      if (!app.appointment_date) return false;
      const d = parseISO(app.appointment_date);
      return isWithinInterval(d, { start, end });
    });
  }, [applications, startDate, endDate]);

  // Applications per country (top 10)
  const countryData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const app of filteredApps) {
      const country = app.country || "Bilinmiyor";
      map.set(country, (map.get(country) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredApps]);

  // Visa type distribution
  const visaTypeData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const app of filteredApps) {
      const type = app.visa_type || "diger";
      map.set(type, (map.get(type) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({
      name: visaTypeLabelMap[name] ?? name,
      value,
    }));
  }, [filteredApps]);

  // Summary stats
  const totalApps = filteredApps.length;
  const approved = filteredApps.filter(
    (a) => a.visa_status === "vize_cikti" || a.visa_status === "pasaport_teslim"
  ).length;
  const rejected = filteredApps.filter(
    (a) => a.visa_status === "ret_oldu"
  ).length;
  const approvalRate =
    totalApps > 0 ? ((approved / totalApps) * 100).toFixed(1) : "0";
  const rejectionRate =
    totalApps > 0 ? ((rejected / totalApps) * 100).toFixed(1) : "0";

  if (filteredApps.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-[140px]"
              placeholder={t("startDate")}
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-[140px]"
              placeholder={t("endDate")}
            />
          </div>
        </div>
        <p className="text-muted-foreground">{t("noData")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-[140px]"
            placeholder={t("startDate")}
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 w-[140px]"
            placeholder={t("endDate")}
          />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={t("totalApplications")}
          value={totalApps}
          icon={Globe}
          variant="blue"
        />
        <StatCard
          title={t("approvalRate")}
          value={`${approvalRate}%`}
          icon={CheckCircle}
          variant="green"
        />
        <StatCard
          title={t("rejectionRate")}
          value={`${rejectionRate}%`}
          icon={XCircle}
          variant="red"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart: applications per country */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("applicationsPerCountry")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  name={t("applications")}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart: visa type distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("visaTypeDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={visaTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  dataKey="value"
                  label={(props: PieLabelRenderProps) =>
                    `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {visaTypeData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
