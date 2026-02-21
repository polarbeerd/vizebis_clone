import { createClient } from "@/lib/supabase/server";
import { FinanceHubClient } from "./finance-hub-client";

export interface DebtIndividualRow {
  id: number;
  full_name: string | null;
  phone: string | null;
  passport_no: string | null;
  company_name: string | null;
  country: string | null;
  appointment_date: string | null;
  pickup_date: string | null;
  consulate_fee: number | null;
  service_fee: number | null;
  currency: string | null;
  invoice_status: string | null;
  payment_status: string | null;
  visa_status: string | null;
  notes: string | null;
  passport_photo: string | null;
  visa_photo: string | null;
}

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

export interface AtConsulateRow {
  id: number;
  full_name: string | null;
  phone: string | null;
  passport_no: string | null;
  consulate_app_no: string | null;
  company_name: string | null;
  country: string | null;
}

export interface FinanceSummary {
  debtTL: number;
  debtUSD: number;
  debtEUR: number;
  paidThisMonth: number;
}

export default async function FinanceHubPage() {
  const supabase = await createClient();

  // Fetch all data in parallel
  const [unpaidRes, paidRes, individualRes, companiesRes, unpaidAppsRes, consulateRes] =
    await Promise.all([
      // For summary cards
      supabase
        .from("applications")
        .select("consulate_fee, service_fee, currency")
        .eq("is_deleted", false)
        .eq("payment_status", "odenmedi"),

      // For paid this month
      (() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        return supabase
          .from("applications")
          .select("consulate_fee, service_fee, currency, payment_date")
          .eq("is_deleted", false)
          .eq("payment_status", "odendi")
          .gte("payment_date", startOfMonth)
          .lte("payment_date", endOfMonth);
      })(),

      // Individual debt
      supabase
        .from("applications")
        .select(
          `id, full_name, phone, passport_no, country, appointment_date, pickup_date,
           consulate_fee, service_fee, currency, invoice_status, payment_status,
           visa_status, notes, passport_photo, visa_photo,
           companies ( company_name )`
        )
        .eq("is_deleted", false)
        .eq("payment_status", "odenmedi")
        .order("id", { ascending: false }),

      // Companies for corporate debt
      supabase
        .from("companies")
        .select("id, company_name, company_code, email, phone")
        .eq("is_active", true)
        .order("company_name"),

      // Unpaid apps for corporate aggregation
      supabase
        .from("applications")
        .select("company_id, consulate_fee, service_fee, currency")
        .eq("is_deleted", false)
        .eq("payment_status", "odenmedi"),

      // At consulate
      supabase
        .from("applications")
        .select(
          `id, full_name, phone, passport_no, consulate_app_no, country,
           companies ( company_name )`
        )
        .eq("is_deleted", false)
        .eq("visa_status", "konsoloslukta")
        .order("id", { ascending: false }),
    ]);

  // Calculate summary
  let debtTL = 0, debtUSD = 0, debtEUR = 0, paidThisMonth = 0;

  for (const app of unpaidRes.data ?? []) {
    const total = (app.consulate_fee ?? 0) + (app.service_fee ?? 0);
    const currency = (app.currency ?? "TL").toUpperCase();
    if (currency === "USD") debtUSD += total;
    else if (currency === "EUR") debtEUR += total;
    else debtTL += total;
  }

  for (const app of paidRes.data ?? []) {
    paidThisMonth += (app.consulate_fee ?? 0) + (app.service_fee ?? 0);
  }

  const summary: FinanceSummary = { debtTL, debtUSD, debtEUR, paidThisMonth };

  // Individual debt rows
  const individualRows: DebtIndividualRow[] = (individualRes.data ?? []).map(
    (app: Record<string, unknown>) => ({
      id: app.id as number,
      full_name: app.full_name as string | null,
      phone: app.phone as string | null,
      passport_no: app.passport_no as string | null,
      company_name: (app.companies as { company_name: string } | null)?.company_name ?? null,
      country: app.country as string | null,
      appointment_date: app.appointment_date as string | null,
      pickup_date: app.pickup_date as string | null,
      consulate_fee: app.consulate_fee as number | null,
      service_fee: app.service_fee as number | null,
      currency: app.currency as string | null,
      invoice_status: app.invoice_status as string | null,
      payment_status: app.payment_status as string | null,
      visa_status: app.visa_status as string | null,
      notes: app.notes as string | null,
      passport_photo: app.passport_photo as string | null,
      visa_photo: app.visa_photo as string | null,
    })
  );

  // Corporate debt rows
  const debtMap = new Map<number, { tl: number; usd: number; eur: number }>();
  for (const app of unpaidAppsRes.data ?? []) {
    if (!app.company_id) continue;
    const existing = debtMap.get(app.company_id) ?? { tl: 0, usd: 0, eur: 0 };
    const total = (app.consulate_fee ?? 0) + (app.service_fee ?? 0);
    const currency = (app.currency ?? "TL").toUpperCase();
    if (currency === "USD") existing.usd += total;
    else if (currency === "EUR") existing.eur += total;
    else existing.tl += total;
    debtMap.set(app.company_id, existing);
  }

  const corporateRows: DebtCorporateRow[] = (companiesRes.data ?? [])
    .filter((c: Record<string, unknown>) => debtMap.has(c.id as number))
    .map((c: Record<string, unknown>) => {
      const debt = debtMap.get(c.id as number) ?? { tl: 0, usd: 0, eur: 0 };
      return {
        id: c.id as number,
        company_name: c.company_name as string | null,
        company_code: c.company_code as string | null,
        email: c.email as string | null,
        phone: c.phone as string | null,
        debt_tl: debt.tl,
        debt_usd: debt.usd,
        debt_eur: debt.eur,
      };
    });

  // At consulate rows
  const consulateRows: AtConsulateRow[] = (consulateRes.data ?? []).map(
    (app: Record<string, unknown>) => ({
      id: app.id as number,
      full_name: app.full_name as string | null,
      phone: app.phone as string | null,
      passport_no: app.passport_no as string | null,
      consulate_app_no: app.consulate_app_no as string | null,
      company_name: (app.companies as { company_name: string } | null)?.company_name ?? null,
      country: app.country as string | null,
    })
  );

  return (
    <FinanceHubClient
      summary={summary}
      individualDebt={individualRows}
      corporateDebt={corporateRows}
      atConsulate={consulateRows}
    />
  );
}
