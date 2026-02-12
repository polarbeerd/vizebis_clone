import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Clock,
  CheckCircle2,
  DollarSign,
  CalendarDays,
  User,
  Globe,
} from "lucide-react";

type VisaStatus =
  | "beklemede"
  | "hazirlaniyor"
  | "konsoloslukta"
  | "vize_cikti"
  | "ret_oldu"
  | "pasaport_teslim";

const statusBadgeStyles: Record<VisaStatus, string> = {
  beklemede: "bg-gray-100 text-gray-700 border-gray-300",
  hazirlaniyor: "bg-gray-100 text-gray-700 border-gray-300",
  konsoloslukta: "bg-yellow-100 text-yellow-800 border-yellow-300",
  vize_cikti: "bg-blue-100 text-blue-800 border-blue-300",
  ret_oldu: "bg-red-100 text-red-800 border-red-300",
  pasaport_teslim: "bg-green-100 text-green-800 border-green-300",
};

const statusTranslationKeys: Record<VisaStatus, string> = {
  beklemede: "pending",
  hazirlaniyor: "preparing",
  konsoloslukta: "atConsulate",
  vize_cikti: "approved",
  ret_oldu: "rejected",
  pasaport_teslim: "passportDelivered",
};

interface Application {
  id: string;
  full_name: string;
  country: string | null;
  visa_status: VisaStatus;
  created_at: string;
}

interface Appointment {
  id: string;
  full_name: string;
  country: string | null;
  appointment_date: string | null;
  created_at: string;
}

async function getDashboardData() {
  try {
    const supabase = await createClient();

    const [
      totalResult,
      pendingResult,
      completedResult,
      recentAppsResult,
      recentAppointmentsResult,
    ] = await Promise.all([
      supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false),
      supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false)
        .eq("visa_status", "beklemede"),
      supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false)
        .eq("visa_status", "pasaport_teslim"),
      supabase
        .from("applications")
        .select("id, full_name, country, visa_status, created_at")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("applications")
        .select("id, full_name, country, appointment_date, created_at")
        .eq("is_deleted", false)
        .not("appointment_date", "is", null)
        .order("appointment_date", { ascending: false })
        .limit(5),
    ]);

    return {
      totalCount: totalResult.count ?? 0,
      pendingCount: pendingResult.count ?? 0,
      completedCount: completedResult.count ?? 0,
      recentApplications: (recentAppsResult.data as Application[]) ?? [],
      recentAppointments: (recentAppointmentsResult.data as Appointment[]) ?? [],
      error: null,
    };
  } catch {
    return {
      totalCount: 0,
      pendingCount: 0,
      completedCount: 0,
      recentApplications: [],
      recentAppointments: [],
      error: "Failed to fetch dashboard data",
    };
  }
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tVisa = await getTranslations("visaStatus");
  const tCommon = await getTranslations("common");

  const {
    totalCount,
    pendingCount,
    completedCount,
    recentApplications,
    recentAppointments,
  } = await getDashboardData();

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("totalApplications")}
          value={totalCount}
          icon={FileText}
          variant="blue"
        />
        <StatCard
          title={t("pendingApplications")}
          value={pendingCount}
          icon={Clock}
          variant="yellow"
        />
        <StatCard
          title={t("completedApplications")}
          value={completedCount}
          icon={CheckCircle2}
          variant="green"
        />
        <StatCard
          title={t("totalDebt")}
          value={"—"}
          icon={DollarSign}
          variant="red"
        />
      </div>

      {/* Recent Applications & Appointments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Applications */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recentApplications")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {tCommon("noData")}
              </p>
            ) : (
              <div className="space-y-3">
                {recentApplications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {app.full_name}
                        </p>
                        {app.country && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <span>{app.country}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge
                        variant="outline"
                        className={
                          statusBadgeStyles[app.visa_status] ?? "bg-gray-100 text-gray-700 border-gray-300"
                        }
                      >
                        {tVisa(statusTranslationKeys[app.visa_status] ?? "pending")}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(app.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recentAppointments")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {tCommon("noData")}
              </p>
            ) : (
              <div className="space-y-3">
                {recentAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {apt.full_name}
                        </p>
                        {apt.country && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <span>{apt.country}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {apt.appointment_date && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <CalendarDays className="h-3 w-3 mr-1" />
                          {formatDate(apt.appointment_date)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
