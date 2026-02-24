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
      application_ids?: string;
      application_id?: string;
      tracking_code?: string;
    };

    // Support both new format (application_ids, comma-separated) and old format (application_id, singular)
    let ids: number[] = [];
    if (metadata?.application_ids) {
      ids = metadata.application_ids.split(",").map(Number).filter((n) => !isNaN(n));
    } else if (metadata?.application_id) {
      const id = Number(metadata.application_id);
      if (!isNaN(id)) ids = [id];
    }

    if (ids.length === 0) {
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
        .in("id", ids);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    // Return 200 to prevent Mollie from retrying on app errors
    return new Response("OK", { status: 200 });
  }
}
