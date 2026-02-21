import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  // Authenticate via Bearer token
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    job_id,
    status,
    current_stage,
    stage_progress,
    stages_completed,
    mfa_case_number,
    vfs_confirmation,
    error_message,
    error_stage,
  } = body;

  if (!job_id) {
    return NextResponse.json(
      { error: "Missing job_id" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Build update payload
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (status) update.status = status;
  if (current_stage !== undefined) update.current_stage = current_stage;
  if (stage_progress !== undefined) update.stage_progress = stage_progress;
  if (stages_completed !== undefined) update.stages_completed = stages_completed;
  if (mfa_case_number !== undefined) update.mfa_case_number = mfa_case_number;
  if (vfs_confirmation !== undefined) update.vfs_confirmation = vfs_confirmation;
  if (error_message !== undefined) update.error_message = error_message;
  if (error_stage !== undefined) update.error_stage = error_stage;

  // Set started_at on first "running" status
  if (status === "running") {
    const { data: job } = await supabase
      .from("automation_jobs")
      .select("started_at")
      .eq("id", job_id)
      .single();

    if (job && !job.started_at) {
      update.started_at = new Date().toISOString();
    }
  }

  // Set completed_at on terminal states
  if (["completed", "failed", "cancelled"].includes(status)) {
    update.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("automation_jobs")
    .update(update)
    .eq("id", job_id);

  if (error) {
    console.error("Webhook update error:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
