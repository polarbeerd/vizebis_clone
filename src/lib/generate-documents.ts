import { createServiceClient } from "@/lib/supabase/service";
import { fetchFxRates } from "@/lib/fx-rates";

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || "http://localhost:8000";
const PDF_SERVICE_API_KEY = process.env.PDF_SERVICE_API_KEY || "";

interface GenerateOptions {
  hotelId?: string;
  type?: "booking" | "letter" | "all";
}

export async function generateDocumentsForApplication(
  applicationId: number,
  options: GenerateOptions = {}
) {
  const { hotelId, type = "all" } = options;
  const supabase = createServiceClient();

  // 1. Fetch application
  const { data: app, error: appError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (appError || !app) {
    console.error("Failed to fetch application:", appError);
    return;
  }

  // 2. Run requested generation(s)
  const tasks: Promise<unknown>[] = [];

  if (type === "booking" || type === "all") {
    tasks.push(generateBookingPdf(supabase, app, hotelId));
  }

  if (type === "letter" || type === "all") {
    tasks.push(generateLetterOfIntent(supabase, app));
  }

  await Promise.allSettled(tasks);
}

async function generateBookingPdf(
  supabase: ReturnType<typeof createServiceClient>,
  app: Record<string, unknown>,
  sharedHotelId?: string
) {
  try {
    let hotel: Record<string, unknown>;

    if (sharedHotelId) {
      // Use pre-selected hotel (group submissions share one hotel)
      const { data: hotelData } = await supabase
        .from("booking_hotels")
        .select("*")
        .eq("id", sharedHotelId)
        .single();
      if (!hotelData) {
        console.warn("Shared hotel not found:", sharedHotelId);
        return;
      }
      hotel = hotelData;
    } else {
      // Pick random active hotel, preferring one matching the application's country
      const country = app.country as string | undefined;

      let query = supabase
        .from("booking_hotels")
        .select("*")
        .eq("is_active", true);

      if (country) {
        query = query.eq("country", country);
      }

      const { data: hotels } = await query;

      // Fallback: if no country-matched hotels, try without country filter
      if (!hotels?.length && country) {
        const { data: fallbackHotels } = await supabase
          .from("booking_hotels")
          .select("*")
          .eq("is_active", true);

        if (!fallbackHotels?.length) {
          console.warn("No active hotels — skipping booking PDF");
          return;
        }

        hotel = fallbackHotels[Math.floor(Math.random() * fallbackHotels.length)];
      } else if (!hotels?.length) {
        console.warn("No active hotels — skipping booking PDF");
        return;
      } else {
        hotel = hotels[Math.floor(Math.random() * hotels.length)];
      }
    }

    // Create generating record
    const { data: doc, error: insertError } = await supabase
      .from("generated_documents")
      .insert({
        application_id: app.id as number,
        type: "booking_pdf",
        hotel_id: hotel.id,
        status: "generating",
        generated_by: "auto",
      })
      .select()
      .single();

    if (insertError || !doc) {
      console.error("Failed to create generated_documents row:", insertError);
      return;
    }

    // Get template URL
    const { data: urlData } = supabase.storage
      .from("booking-templates")
      .getPublicUrl(hotel.template_path as string);

    // Extract guest name and dates from application
    const guestName = (app.full_name as string) || "GUEST";
    const customFields = (app.custom_fields as Record<string, unknown>) || {};

    // Try to get dates from travel_date or custom fields
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const checkinDate =
      (app.travel_date as string) ||
      (customFields.travel_date as string) ||
      nextWeek.toISOString().split("T")[0];

    // Default checkout = checkin + 7 days
    const checkin = new Date(checkinDate);
    const defaultCheckout = new Date(
      checkin.getTime() + 7 * 24 * 60 * 60 * 1000
    );
    const checkoutDate = defaultCheckout.toISOString().split("T")[0];

    // Calculate nights
    const checkout = new Date(checkoutDate);
    const nights = Math.max(
      1,
      Math.round(
        (checkout.getTime() - checkin.getTime()) / (24 * 60 * 60 * 1000)
      )
    );

    // Determine number of guests (group_id → count group members, otherwise 1)
    let numGuests = 1;
    const groupId = app.group_id as string | null;
    if (groupId) {
      const { count } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("group_id", groupId);
      if (count && count > 0) numGuests = count;
    }

    // Dynamic pricing from hotel.price_per_night_eur
    const pricePerNight = Number(hotel.price_per_night_eur) || 0;
    let priceTotalTl = 0;
    let priceTotalDkk = 0;
    let refundAmountTl = 0;

    if (pricePerNight > 0) {
      try {
        const rates = await fetchFxRates();
        const totalEur = pricePerNight * nights * numGuests;
        priceTotalTl = Math.round(totalEur * rates.EUR_TRY * 100) / 100;
        priceTotalDkk = Math.round(totalEur * rates.EUR_DKK * 100) / 100;
        refundAmountTl =
          nights > 1
            ? Math.round(priceTotalTl * ((nights - 1) / nights) * 100) / 100
            : 0;
      } catch (fxError) {
        console.warn("FX rate fetch failed, using zero prices:", fxError);
      }
    }

    // Call Python service (30s timeout)
    const pdfController = new AbortController();
    const pdfTimeout = setTimeout(() => pdfController.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(`${PDF_SERVICE_URL}/generate-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(PDF_SERVICE_API_KEY ? { "x-api-key": PDF_SERVICE_API_KEY } : {}),
        },
        body: JSON.stringify({
          template_url: urlData.publicUrl,
          guest_name: guestName,
          checkin_date: checkinDate,
          checkout_date: checkoutDate,
          num_guests: numGuests,
          price_total_tl: priceTotalTl,
          price_total_dkk: priceTotalDkk,
          refund_amount_tl: refundAmountTl,
          edit_config: hotel.edit_config || {},
        }),
        signal: pdfController.signal,
      });
    } finally {
      clearTimeout(pdfTimeout);
    }

    if (!response.ok) {
      throw new Error(`PDF service returned ${response.status}`);
    }

    const result = await response.json();

    if (result.status !== "success") {
      throw new Error(result.error || "PDF generation failed");
    }

    // Decode base64 and upload
    const pdfBuffer = Buffer.from(result.pdf_base64, "base64");
    const storagePath = `${app.id}/booking.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("generated-docs")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Update record
    await supabase
      .from("generated_documents")
      .update({
        status: "ready",
        file_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", doc.id);

    console.log(`Booking PDF generated for application ${app.id}`);
  } catch (error) {
    console.error(
      `Booking PDF generation failed for application ${app.id}:`,
      error
    );

    // Try to update status to error
    await supabase
      .from("generated_documents")
      .update({
        status: "error",
        error_message: String(error),
        updated_at: new Date().toISOString(),
      })
      .eq("application_id", app.id as number)
      .eq("type", "booking_pdf")
      .eq("status", "generating");
  }
}

async function generateLetterOfIntent(
  supabase: ReturnType<typeof createServiceClient>,
  app: Record<string, unknown>
) {
  try {
    // Create generating record
    const { data: doc, error: insertError } = await supabase
      .from("generated_documents")
      .insert({
        application_id: app.id as number,
        type: "letter_of_intent",
        status: "generating",
        generated_by: "auto",
      })
      .select()
      .single();

    if (insertError || !doc) {
      console.error("Failed to create generated_documents row:", insertError);
      return;
    }

    // Fetch example letters (prefer matching country/visa, fallback to all)
    const country = app.country as string;
    const visaType = app.visa_type as string;

    let examples: string[] = [];

    // Try country+visa match first
    if (country && visaType) {
      const { data: matched } = await supabase
        .from("letter_intent_examples")
        .select("extracted_text")
        .eq("country", country)
        .eq("visa_type", visaType)
        .eq("is_active", true)
        .limit(3);

      if (matched?.length) {
        examples = matched
          .map((e) => e.extracted_text)
          .filter(Boolean) as string[];
      }
    }

    // Fallback to all active examples
    if (!examples.length) {
      const { data: allExamples } = await supabase
        .from("letter_intent_examples")
        .select("extracted_text")
        .eq("is_active", true)
        .limit(3);

      examples = (allExamples || [])
        .map((e) => e.extracted_text)
        .filter(Boolean) as string[];
    }

    // Fetch generation config
    const { data: configRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "letter_intent_config")
      .single();

    const config = (configRow?.value as Record<string, unknown>) || {};
    const systemPrompt =
      (config.systemPrompt as string) ||
      "You are a professional visa consultant. Write a formal letter of intent for a visa application. The letter should be professional, clear, and persuasive.";

    // Build application data for the prompt
    const applicationData = {
      full_name: app.full_name,
      country: app.country,
      visa_type: app.visa_type,
      travel_date: app.travel_date,
      email: app.email,
      phone: app.phone,
      custom_fields: app.custom_fields,
    };

    // Build the full prompt for Gemini
    let prompt = `${systemPrompt}\n\n`;
    prompt += `Application Data:\n${JSON.stringify(applicationData, null, 2)}\n\n`;

    if (examples.length > 0) {
      prompt += `Here are example letters for reference:\n\n`;
      examples.forEach((example, i) => {
        prompt += `--- Example ${i + 1} ---\n${example}\n\n`;
      });
    }

    prompt +=
      "Generate a professional letter of intent in HTML format. Use proper HTML tags (h1, p, strong, etc.) for formatting. Do not include <html>, <head>, or <body> tags — just the inner content.";

    // Call Gemini API directly
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const geminiController = new AbortController();
    const geminiTimeout = setTimeout(() => geminiController.abort(), 60_000);

    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
          signal: geminiController.signal,
        }
      );
    } finally {
      clearTimeout(geminiTimeout);
    }

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      throw new Error(
        `Gemini API returned ${geminiResponse.status}: ${errorBody}`
      );
    }

    const geminiResult = await geminiResponse.json();
    const htmlContent =
      geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!htmlContent) {
      throw new Error("Empty response from Gemini");
    }

    // Convert HTML to PDF via Python service
    let storagePath: string | null = null;
    try {
      const pdfController = new AbortController();
      const pdfTimeout = setTimeout(() => pdfController.abort(), 30_000);

      let pdfResponse: Response;
      try {
        pdfResponse = await fetch(`${PDF_SERVICE_URL}/html-to-pdf`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(PDF_SERVICE_API_KEY ? { "x-api-key": PDF_SERVICE_API_KEY } : {}),
          },
          body: JSON.stringify({ html: htmlContent }),
          signal: pdfController.signal,
        });
      } finally {
        clearTimeout(pdfTimeout);
      }

      if (pdfResponse.ok) {
        const pdfResult = await pdfResponse.json();
        if (pdfResult.status === "success") {
          const pdfBuffer = Buffer.from(pdfResult.pdf_base64, "base64");
          storagePath = `${app.id}/letter-of-intent.pdf`;

          await supabase.storage
            .from("generated-docs")
            .upload(storagePath, pdfBuffer, {
              contentType: "application/pdf",
              upsert: true,
            });
        }
      }
    } catch (pdfError) {
      console.warn(
        "HTML-to-PDF conversion failed, saving HTML only:",
        pdfError
      );
    }

    // Update record with content and optional PDF
    await supabase
      .from("generated_documents")
      .update({
        status: "ready",
        content: htmlContent,
        file_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", doc.id);

    console.log(`Letter of intent generated for application ${app.id}`);
  } catch (error) {
    console.error(
      `Letter generation failed for application ${app.id}:`,
      error
    );

    await supabase
      .from("generated_documents")
      .update({
        status: "error",
        error_message: String(error),
        updated_at: new Date().toISOString(),
      })
      .eq("application_id", app.id as number)
      .eq("type", "letter_of_intent")
      .eq("status", "generating");
  }
}
