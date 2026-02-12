import { createClient } from "@/lib/supabase/server";
import { DebtCorporateClient } from "./debt-corporate-client";

export interface DebtCorporateRow {
  id: number;
  company_name: string | null;
  company_code: string | null;
  email: string | null;
  phone: string | null;
  debt_tl: number;
  debt_usd: number;
  debt_eur: number;
}

export default async function DebtCorporatePage() {
  const supabase = await createClient();

  let rows: DebtCorporateRow[] = [];

  try {
    // Fetch all active companies
    const { data: companies, error: companyError } = await supabase
      .from("companies")
      .select("id, company_name, company_code, email, phone")
      .eq("is_active", true)
      .order("company_name");

    if (companyError) {
      console.error("Error fetching companies:", companyError);
    }

    // Fetch all unpaid applications with company_id
    const { data: unpaidApps, error: appError } = await supabase
      .from("applications")
      .select("company_id, consulate_fee, service_fee, currency")
      .eq("is_deleted", false)
      .eq("payment_status", "odenmedi");

    if (appError) {
      console.error("Error fetching unpaid applications:", appError);
    }

    // Aggregate debt per company by currency
    const debtMap = new Map<
      number,
      { tl: number; usd: number; eur: number }
    >();

    for (const app of unpaidApps ?? []) {
      if (!app.company_id) continue;
      const existing = debtMap.get(app.company_id) ?? { tl: 0, usd: 0, eur: 0 };
      const total = (app.consulate_fee ?? 0) + (app.service_fee ?? 0);
      const currency = (app.currency ?? "TL").toUpperCase();

      if (currency === "USD") existing.usd += total;
      else if (currency === "EUR") existing.eur += total;
      else existing.tl += total;

      debtMap.set(app.company_id, existing);
    }

    // Build rows: only include companies that have debt
    rows = (companies ?? [])
      .filter((c) => debtMap.has(c.id))
      .map((c) => {
        const debt = debtMap.get(c.id) ?? { tl: 0, usd: 0, eur: 0 };
        return {
          id: c.id,
          company_name: c.company_name,
          company_code: c.company_code,
          email: c.email,
          phone: c.phone,
          debt_tl: debt.tl,
          debt_usd: debt.usd,
          debt_eur: debt.eur,
        };
      });
  } catch (error) {
    console.error("Error fetching corporate debt:", error);
  }

  return <DebtCorporateClient data={rows} />;
}
