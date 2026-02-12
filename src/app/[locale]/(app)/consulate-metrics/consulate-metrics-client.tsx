"use client";

import { useTranslations } from "next-intl";
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
  LineChart,
  Line,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ConsulateOfficeData,
  VisaStatusData,
  MonthlyTrendData,
} from "./page";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
];

const visaStatusLabelMap: Record<string, string> = {
  beklemede: "Beklemede",
  hazirlaniyor: "Hazirlanıyor",
  konsoloslukta: "Konsoloslukta",
  vize_cikti: "Vize Çıktı",
  ret_oldu: "Ret Oldu",
  pasaport_teslim: "Pasaport Teslim",
};

interface ConsulateMetricsClientProps {
  officeData: ConsulateOfficeData[];
  visaStatusData: VisaStatusData[];
  monthlyData: MonthlyTrendData[];
}

export function ConsulateMetricsClient({
  officeData,
  visaStatusData,
  monthlyData,
}: ConsulateMetricsClientProps) {
  const t = useTranslations("consulateMetrics");

  const pieData = visaStatusData.map((d) => ({
    ...d,
    name: visaStatusLabelMap[d.name] ?? d.name,
  }));

  const hasData =
    officeData.length > 0 ||
    visaStatusData.length > 0 ||
    monthlyData.length > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("noData")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart: applications per consulate office */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("applicationsPerOffice")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {officeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={officeData}>
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
                  <Bar dataKey="count" fill="#3b82f6" name={t("applications")} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">{t("noData")}</p>
            )}
          </CardContent>
        </Card>

        {/* Pie chart: visa status distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("visaStatusDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    dataKey="value"
                    label={(props: PieLabelRenderProps) =>
                      `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((_, index) => (
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
            ) : (
              <p className="text-muted-foreground text-sm">{t("noData")}</p>
            )}
          </CardContent>
        </Card>

        {/* Line chart: monthly trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("monthlyTrends")}</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name={t("applications")}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">{t("noData")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
