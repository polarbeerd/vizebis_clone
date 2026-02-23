import { getApplicationForPayment } from "../../actions";
import { CompleteClient } from "./complete-client";

interface CompletePageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function CompletePage({ searchParams }: CompletePageProps) {
  const { code } = await searchParams;

  if (!code) {
    return <CompleteClient application={null} error="INVALID_CODE" />;
  }

  const { data: application, error } = await getApplicationForPayment(code);

  return <CompleteClient application={application} error={error} />;
}
