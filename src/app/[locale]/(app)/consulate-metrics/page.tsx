import { createClient } from "@/lib/supabase/server";
import { ConsulateMetricsClient } from "./consulate-metrics-client";

export interface ConsulateOfficeData {
  name: string;
  count: number;
}

export interface VisaStatusData {
  name: string;
  value: number;
}

export interface MonthlyTrendData {
  month: string;
  count: number;
}

export default async function ConsulateMetricsPage() {
  const supabase = await createClient();

  let officeData: ConsulateOfficeData[] = [];
  let visaStatusData: VisaStatusData[] = [];
  let monthlyData: MonthlyTrendData[] = [];

  try {
    const { data: applications, error } = await supabase
      .from("applications")
      .select("consulate_office, visa_status, created_at")
      .eq("is_deleted", false);

    if (error) {
      console.error("Error fetching consulate metrics:", error);
    }

    const apps = applications ?? [];

    // 1. Applications per consulate office
    const officeMap = new Map<string, number>();
    for (const app of apps) {
      const office = (app.consulate_office as string) || "Bilinmiyor";
      officeMap.set(office, (officeMap.get(office) ?? 0) + 1);
    }
    officeData = Array.from(officeMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 2. Visa status distribution
    const statusMap = new Map<string, number>();
    for (const app of apps) {
      const status = (app.visa_status as string) || "beklemede";
      statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
    }
    visaStatusData = Array.from(statusMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    // 3. Monthly trends (last 6 months)
    const now = new Date();
    const monthMap = new Map<string, number>();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, 0);
    }

    for (const app of apps) {
      if (!app.created_at) continue;
      const d = new Date(app.created_at as string);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthMap.has(key)) {
        monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
      }
    }

    monthlyData = Array.from(monthMap.entries()).map(([month, count]) => ({
      month,
      count,
    }));
  } catch (error) {
    console.error("Error fetching consulate metrics:", error);
  }

  return (
    <ConsulateMetricsClient
      officeData={officeData}
      visaStatusData={visaStatusData}
      monthlyData={monthlyData}
    />
  );
}
