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
  Landmark,
  AlertTriangle,
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
  appointment_date: string | null;
  created_at: string;
}

async function getDashboardData() {
  try {
    const supabase = await createClient();

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalResult,
      pendingResult,
      atConsulateResult,
      preparingResult,
      upcomingApptsResult,
      recentAppsResult,
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
        .eq("visa_status", "konsoloslukta"),
      supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false)
        .eq("visa_status", "hazirlaniyor"),
      supabase
        .from("applications")
        .select("id, full_name, country, visa_status, appointment_date, created_at")
        .eq("is_deleted", false)
        .not("appointment_date", "is", null)
        .gte("appointment_date", now.toISOString())
        .lte("appointment_date", sevenDaysFromNow)
        .order("appointment_date", { ascending: true })
        .limit(10),
      supabase
        .from("applications")
        .select("id, full_name, country, visa_status, appointment_date, created_at")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    return {
      totalCount: totalResult.count ?? 0,
      pendingCount: pendingResult.count ?? 0,
      atConsulateCount: atConsulateResult.count ?? 0,
      preparingCount: preparingResult.count ?? 0,
      upcomingAppointments: (upcomingApptsResult.data as Application[]) ?? [],
      recentApplications: (recentAppsResult.data as Application[]) ?? [],
    };
  } catch {
    return {
      totalCount: 0,
      pendingCount: 0,
      atConsulateCount: 0,
      preparingCount: 0,
      upcomingAppointments: [],
      recentApplications: [],
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
    atConsulateCount,
    preparingCount,
    upcomingAppointments,
    recentApplications,
  } = await getDashboardData();

  const now = new Date();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      {/* Actionable stat cards */}
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
          title={t("atConsulate")}
          value={atConsulateCount}
          icon={Landmark}
          variant="green"
        />
        <StatCard
          title={t("preparing")}
          value={preparingCount}
          icon={AlertTriangle}
          variant={preparingCount > 5 ? "red" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming appointments — what needs attention NOW */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              {t("upcomingAppointments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("noUpcoming")}
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingAppointments.map((app) => {
                  const apptDate = app.appointment_date ? new Date(app.appointment_date) : null;
                  const isUrgent = apptDate && (apptDate.getTime() - now.getTime()) < threeDaysMs;

                  return (
                    <div
                      key={app.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        isUrgent ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          isUrgent ? "bg-red-100 dark:bg-red-900/50" : "bg-muted"
                        }`}>
                          {isUrgent ? (
                            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          ) : (
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{app.full_name}</p>
                          {app.country && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Globe className="h-3 w-3" />
                              <span>{app.country}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {app.appointment_date && (
                          <Badge
                            variant="outline"
                            className={
                              isUrgent
                                ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300"
                                : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300"
                            }
                          >
                            <CalendarDays className="h-3 w-3 mr-1" />
                            {formatDate(app.appointment_date)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              {t("recentApplications")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {tCommon("noData")}
              </p>
            ) : (
              <div className="space-y-2">
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
                        <p className="text-sm font-medium truncate">{app.full_name}</p>
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
                        className={statusBadgeStyles[app.visa_status] ?? "bg-gray-100 text-gray-700 border-gray-300"}
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
      </div>
    </div>
  );
}
