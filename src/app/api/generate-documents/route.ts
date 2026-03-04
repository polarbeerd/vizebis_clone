import { NextRequest, NextResponse } from "next/server";
import { generateDocumentsForApplication } from "@/lib/generate-documents";
import { getAuthenticatedUser } from "@/lib/auth";

// Allow up to 60s for PDF generation + upload
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { applicationId, hotelId, type } = body;

    if (!applicationId || typeof applicationId !== "number") {
      return NextResponse.json({ error: "Invalid applicationId" }, { status: 400 });
    }

    // Await generation so the serverless function stays alive until completion
    await generateDocumentsForApplication(applicationId, {
      hotelId: hotelId || undefined,
      type: type || "all",
    });

    return NextResponse.json({ status: "done" });
  } catch (err) {
    console.error("Document generation failed:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
