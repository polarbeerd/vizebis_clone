import { getApplicationForPayment } from "../../actions";
import { PaymentClient } from "./payment-client";

interface PaymentPageProps {
  params: Promise<{ trackingCode: string }>;
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { trackingCode } = await params;
  const { data: application, error } =
    await getApplicationForPayment(trackingCode);

  return (
    <PaymentClient application={application} error={error} />
  );
}
