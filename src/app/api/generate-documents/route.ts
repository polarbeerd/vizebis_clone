import { NextRequest, NextResponse } from "next/server";
import { generateDocumentsForApplication } from "@/lib/generate-documents";
import { getAuthenticatedUser } from "@/lib/auth";

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

    // Fire and forget — return immediately, generation happens in background
    generateDocumentsForApplication(applicationId, {
      hotelId: hotelId || undefined,
      type: type || "all",
    }).catch((err) => {
      console.error("Manual generation failed for application", applicationId, err);
    });

    return NextResponse.json({ status: "started" });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
