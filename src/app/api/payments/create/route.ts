import { NextRequest, NextResponse } from "next/server";
import createMollieClient from "@mollie/api-client";
import { createServiceClient } from "@/lib/supabase/service";

const CURRENCY_MAP: Record<string, string> = {
  TL: "TRY",
  USD: "USD",
  EUR: "EUR",
};

export async function POST(request: NextRequest) {
  try {
    const { trackingCode, locale } = await request.json();

    if (!trackingCode) {
      return NextResponse.json(
        { error: "Missing tracking code" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data: app, error: dbError } = await supabase
      .from("applications")
      .select(
        "id, tracking_code, full_name, country, visa_type, service_fee, consulate_fee, currency, payment_status"
      )
      .eq("tracking_code", trackingCode)
      .eq("is_deleted", false)
      .single();

    if (dbError || !app) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (app.payment_status === "odendi") {
      return NextResponse.json(
        { error: "Already paid" },
        { status: 400 }
      );
    }

    const totalFee =
      (Number(app.service_fee) || 0) + (Number(app.consulate_fee) || 0);

    if (totalFee <= 0) {
      return NextResponse.json(
        { error: "No fee set for this application" },
        { status: 400 }
      );
    }

    const currency = CURRENCY_MAP[app.currency as string] || "EUR";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const loc = locale || "tr";

    const mollieClient = createMollieClient({
      apiKey: process.env.MOLLIE_API_KEY!,
    });

    const payment = await mollieClient.payments.create({
      amount: {
        value: totalFee.toFixed(2),
        currency,
      },
      description: `Visa Application - ${app.tracking_code}`,
      redirectUrl: `${appUrl}/${loc}/portal/payment/complete?code=${app.tracking_code}`,
      webhookUrl: `${appUrl}/api/payments/webhook`,
      metadata: {
        application_id: String(app.id),
        tracking_code: app.tracking_code as string,
      },
    });

    return NextResponse.json({
      checkoutUrl: payment.getCheckoutUrl(),
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
