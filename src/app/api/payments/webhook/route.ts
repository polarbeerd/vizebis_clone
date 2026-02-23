import { NextRequest } from "next/server";
import createMollieClient from "@mollie/api-client";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const paymentId = formData.get("id") as string;

    if (!paymentId) {
      return new Response("Missing payment ID", { status: 400 });
    }

    const mollieClient = createMollieClient({
      apiKey: process.env.MOLLIE_API_KEY!,
    });

    const payment = await mollieClient.payments.get(paymentId);
    const metadata = payment.metadata as {
      application_id: string;
      tracking_code: string;
    };

    if (!metadata?.application_id) {
      console.error("Webhook: missing metadata on payment", paymentId);
      return new Response("OK", { status: 200 });
    }

    const supabase = createServiceClient();

    if (payment.status === "paid") {
      await supabase
        .from("applications")
        .update({
          payment_status: "odendi",
          payment_method: "sanal_pos",
        })
        .eq("id", Number(metadata.application_id));
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    // Return 200 to prevent Mollie from retrying on app errors
    return new Response("OK", { status: 200 });
  }
}
