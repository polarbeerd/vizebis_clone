import { createClient } from "@/lib/supabase/server";
import { ReferralReportClient } from "./referral-report-client";

export interface ReferralRow {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  commission_rate: number | null;
  description: string | null;
  is_active: boolean;
}

export interface ReferralPerformance {
  referral_id: number;
  referral_name: string;
  application_count: number;
  total_commission: number;
}

export default async function ReferralReportPage() {
  const supabase = await createClient();

  let referrals: ReferralRow[] = [];
  let performance: ReferralPerformance[] = [];

  try {
    // Fetch referrals
    const { data: refData, error: refError } = await supabase
      .from("referrals")
      .select("id, name, phone, email, commission_rate, description, is_active")
      .order("name");

    if (refError) {
      console.error("Error fetching referrals:", refError);
    }

    referrals = (refData ?? []).map((r) => ({
      id: r.id as number,
      name: r.name as string | null,
      phone: r.phone as string | null,
      email: r.email as string | null,
      commission_rate: r.commission_rate as number | null,
      description: r.description as string | null,
      is_active: (r.is_active as boolean) ?? true,
    }));

    // Calculate performance for active referrals
    const activeRefs = referrals.filter((r) => r.is_active);
    if (activeRefs.length > 0) {
      const { data: apps, error: appError } = await supabase
        .from("applications")
        .select("reference, consulate_fee, service_fee")
        .eq("is_deleted", false);

      if (appError) {
        console.error("Error fetching applications for referral performance:", appError);
      }

      const appData = apps ?? [];

      for (const ref of activeRefs) {
        const refName = ref.name ?? "";
        const matchingApps = appData.filter(
          (a) =>
            a.reference &&
            (a.reference as string).toLowerCase() === refName.toLowerCase()
        );
        const count = matchingApps.length;
        const totalFee = matchingApps.reduce(
          (sum, a) => sum + (a.consulate_fee ?? 0) + (a.service_fee ?? 0),
          0
        );
        const commission =
          ref.commission_rate != null
            ? (totalFee * ref.commission_rate) / 100
            : 0;

        if (count > 0) {
          performance.push({
            referral_id: ref.id,
            referral_name: refName,
            application_count: count,
            total_commission: commission,
          });
        }
      }
    }
  } catch (error) {
    console.error("Error fetching referral data:", error);
  }

  return (
    <ReferralReportClient referrals={referrals} performance={performance} />
  );
}
