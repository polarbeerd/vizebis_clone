import { createClient } from "@/lib/supabase/server";
import { CompaniesClient } from "./companies-client";

export interface CompanyRow {
  id: number;
  company_code: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  tax_number: string | null;
  tax_office: string | null;
  customer_type: string | null;
  password: string | null;
  province: string | null;
  district: string | null;
  address: string | null;
  is_active: boolean;
  application_count: number;
}

export default async function CompaniesPage() {
  const supabase = await createClient();

  const { data: companies, error } = await supabase
    .from("companies")
    .select(
      `
      id,
      company_code,
      company_name,
      phone,
      email,
      tax_number,
      tax_office,
      customer_type,
      password,
      province,
      district,
      address,
      is_active,
      applications ( id )
    `
    )
    .order("id", { ascending: false });

  if (error) {
    console.error("Error fetching companies:", error);
  }

  const rows: CompanyRow[] = (companies ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as number,
    company_code: c.company_code as string | null,
    company_name: c.company_name as string | null,
    phone: c.phone as string | null,
    email: c.email as string | null,
    tax_number: c.tax_number as string | null,
    tax_office: c.tax_office as string | null,
    customer_type: c.customer_type as string | null,
    password: c.password as string | null,
    province: c.province as string | null,
    district: c.district as string | null,
    address: c.address as string | null,
    is_active: c.is_active as boolean,
    application_count: Array.isArray(c.applications)
      ? (c.applications as unknown[]).length
      : 0,
  }));

  return <CompaniesClient data={rows} />;
}
