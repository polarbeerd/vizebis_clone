import { NextRequest, NextResponse } from "next/server";
import createMollieClient from "@mollie/api-client";
import { createServiceClient } from "@/lib/supabase/service";
import { differenceInYears } from "date-fns";

const CURRENCY_MAP: Record<string, string> = {
  TL: "TRY",
  USD: "USD",
  EUR: "EUR",
};

function isChildExempt(dob: string | null): boolean {
  if (!dob) return false;
  const age = differenceInYears(new Date(), new Date(dob));
  return age <= 11;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationIds, locale, trackingCode } = body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json(
        { error: "Missing application IDs" },
        { status: 400 }
      );
    }

    // Require tracking code for validation
    if (!trackingCode || typeof trackingCode !== "string") {
      return NextResponse.json(
        { error: "Missing tracking code" },
        { status: 400 }
      );
    }

    // Validate all IDs are numbers
    if (!applicationIds.every((id: unknown) => typeof id === "number" && Number.isInteger(id))) {
      return NextResponse.json(
        { error: "Invalid application IDs" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch all applications by IDs
    const { data: apps, error: dbError } = await supabase
      .from("applications")
      .select(
        "id, tracking_code, full_name, date_of_birth, country, visa_type, service_fee, consulate_fee, currency, payment_status, group_id"
      )
      .in("id", applicationIds)
      .eq("is_deleted", false);

    if (dbError || !apps || apps.length === 0) {
      return NextResponse.json(
        { error: "Applications not found" },
        { status: 404 }
      );
    }

    // Verify the tracking code belongs to one of the requested applications
    // or to their group — prevents creating payments for arbitrary application IDs
    const trackingCodeMatch = apps.some((a) => a.tracking_code === trackingCode);
    if (!trackingCodeMatch) {
      // Also check if tracking code belongs to the group
      const groupId = apps[0]?.group_id;
      let groupMatch = false;
      if (groupId) {
        const { data: group } = await supabase
          .from("application_groups")
          .select("tracking_code")
          .eq("id", groupId)
          .single();
        groupMatch = group?.tracking_code === trackingCode;
      }
      if (!groupMatch) {
        return NextResponse.json(
          { error: "Tracking code does not match applications" },
          { status: 403 }
        );
      }
    }

    // Verify none are already paid
    const alreadyPaid = apps.filter((a) => a.payment_status === "odendi");
    if (alreadyPaid.length > 0) {
      return NextResponse.json(
        { error: "One or more applications already paid" },
        { status: 400 }
      );
    }

    // Calculate total: sum fees, skip children <=11
    let totalFee = 0;
    for (const app of apps) {
      if (isChildExempt(app.date_of_birth as string | null)) continue;
      totalFee += (Number(app.service_fee) || 0) + (Number(app.consulate_fee) || 0);
    }

    if (totalFee <= 0) {
      return NextResponse.json(
        { error: "No fee set for these applications" },
        { status: 400 }
      );
    }

    const firstApp = apps[0];
    const currency = CURRENCY_MAP[firstApp.currency as string] || "EUR";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const loc = locale || "tr";

    const mollieClient = createMollieClient({
      apiKey: process.env.MOLLIE_API_KEY!,
    });

    const description = apps.length === 1
      ? `Visa Application - ${firstApp.tracking_code}`
      : `Group Visa Application - ${apps.length} members`;

    const payment = await mollieClient.payments.create({
      amount: {
        value: totalFee.toFixed(2),
        currency,
      },
      description,
      redirectUrl: `${appUrl}/${loc}/portal/payment/complete?code=${firstApp.tracking_code}`,
      webhookUrl: `${appUrl}/api/payments/webhook`,
      metadata: {
        application_ids: apps.map((a) => a.id).join(","),
        tracking_code: firstApp.tracking_code as string,
      },
    });

    return NextResponse.json({
      checkoutUrl: payment.getCheckoutUrl(),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : "";
    console.error("Payment creation error:", errMsg, errStack);
    return NextResponse.json(
      { error: "Failed to create payment", details: errMsg },
      { status: 500 }
    );
  }
}
