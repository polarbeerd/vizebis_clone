import { NextRequest, NextResponse } from "next/server";
import { generateDocumentsForApplication } from "@/lib/generate-documents";

export async function POST(req: NextRequest) {
  try {
    const { applicationId } = await req.json();
    if (!applicationId || typeof applicationId !== "number") {
      return NextResponse.json({ error: "Invalid applicationId" }, { status: 400 });
    }

    // Fire and forget — return immediately, generation happens in background
    generateDocumentsForApplication(applicationId).catch((err) => {
      console.error("Manual generation failed for application", applicationId, err);
    });

    return NextResponse.json({ status: "started" });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
