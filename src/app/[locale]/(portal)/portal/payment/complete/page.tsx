import { getApplicationForPayment } from "../../actions";
import { CompleteClient } from "./complete-client";

interface CompletePageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function CompletePage({ searchParams }: CompletePageProps) {
  const { code } = await searchParams;

  if (!code) {
    return <CompleteClient applications={[]} error="INVALID_CODE" />;
  }

  const { data: applications, error } = await getApplicationForPayment(code);

  return <CompleteClient applications={applications ?? []} error={error} />;
}
