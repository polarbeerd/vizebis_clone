import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { application_id, stages = ["mfa"], headless = true } = body;

  if (!application_id) {
    return NextResponse.json(
      { error: "Missing application_id" },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch application export via internal fetch (forward cookies)
    const exportUrl = new URL(
      `/api/applications/${application_id}/export`,
      request.url
    );
    const cookieHeader = request.headers.get("cookie") ?? "";
    const exportRes = await fetch(exportUrl.toString(), {
      headers: { cookie: cookieHeader },
    });

    if (!exportRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch application export" },
        { status: 400 }
      );
    }

    const applicationData = await exportRes.json();

    // 2. Look up hotel via generated_documents JOIN booking_hotels
    const serviceClient = createServiceClient();
    const { data: hotelDoc } = await serviceClient
      .from("generated_documents")
      .select("hotel_id, booking_hotels(name, address, postal_code, city, country, email, phone_country_code, phone)")
      .eq("application_id", application_id)
      .eq("type", "booking_pdf")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const hotelRaw = hotelDoc?.booking_hotels as unknown as Record<string, unknown> | null;
    const hotelData = hotelRaw
      ? {
          name: hotelRaw.name as string,
          address: hotelRaw.address as string,
          postalCode: (hotelRaw.postal_code as string) ?? "",
          city: (hotelRaw.city as string) ?? "",
          country: (hotelRaw.country as string) ?? "",
          email: (hotelRaw.email as string) ?? "",
          phoneCountryCode: (hotelRaw.phone_country_code as string) ?? "",
          phoneNumber: (hotelRaw.phone as string) ?? "",
        }
      : null;

    // 3. Insert automation_jobs row
    const { data: job, error: insertError } = await serviceClient
      .from("automation_jobs")
      .insert({
        application_id,
        country: applicationData.country ?? "Denmark",
        status: "pending",
        triggered_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !job) {
      console.error("Job insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create job" },
        { status: 500 }
      );
    }

    // 4. POST to bot service
    const botUrl = process.env.BOT_SERVICE_URL;
    const botApiKey = process.env.BOT_API_KEY;
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!botUrl || !botApiKey || !webhookSecret) {
      // Update job as failed if bot service is not configured
      await serviceClient
        .from("automation_jobs")
        .update({
          status: "failed",
          error_message: "Bot service not configured (missing environment variables)",
        })
        .eq("id", job.id);

      return NextResponse.json(
        { error: "Bot service not configured" },
        { status: 500 }
      );
    }

    const callbackUrl = new URL("/api/automation/webhook", request.url).toString();

    const botPayload = {
      job_id: job.id,
      application_id,
      country: applicationData.country ?? "Denmark",
      callback_url: callbackUrl,
      webhook_secret: webhookSecret,
      stages,
      dry_run: false,
      headless: !!headless,
      application_data: applicationData,
      hotel_data: hotelData,
    };

    const botRes = await fetch(`${botUrl}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${botApiKey}`,
      },
      body: JSON.stringify(botPayload),
    });

    if (!botRes.ok) {
      const botError = await botRes.text();
      await serviceClient
        .from("automation_jobs")
        .update({
          status: "failed",
          error_message: `Bot service error: ${botError}`,
        })
        .eq("id", job.id);

      return NextResponse.json(
        { error: "Bot service rejected the job" },
        { status: 502 }
      );
    }

    // 5. Update job status to "queued"
    await serviceClient
      .from("automation_jobs")
      .update({ status: "queued" })
      .eq("id", job.id);

    return NextResponse.json({
      job_id: job.id,
      status: "queued",
      message: "Automation job created",
    });
  } catch (err) {
    console.error("Job creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
