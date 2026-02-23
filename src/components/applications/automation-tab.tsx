"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Play, Loader2, AlertCircle, CheckCircle2, Clock,
  Square, RotateCcw, Terminal, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";

interface AutomationJob {
  id: string;
  application_id: number;
  country: string;
  status: string;
  current_stage: string | null;
  stage_progress: string | null;
  stages_completed: Record<string, unknown>;
  mfa_case_number: string | null;
  vfs_confirmation: string | null;
  error_message: string | null;
  error_stage: string | null;
  triggered_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface AutomationTabProps {
  applicationId: number;
  country: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  queued: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  running: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  queued: <Clock className="h-4 w-4" />,
  running: <Loader2 className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  failed: <AlertCircle className="h-4 w-4 text-red-600" />,
  cancelled: <Square className="h-4 w-4 text-gray-500" />,
};

/** Extract step number from progress string like "Step 5/20 — Waiting for OTP..." */
function parseProgress(progress: string | null): { step: number; total: number } | null {
  if (!progress) return null;
  const m = progress.match(/Step (\d+)\/(\d+)/);
  if (!m) return null;
  return { step: parseInt(m[1]), total: parseInt(m[2]) };
}

export function AutomationTab({ applicationId, country }: AutomationTabProps) {
  const [jobs, setJobs] = React.useState<AutomationJob[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [starting, setStarting] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [selectedStages, setSelectedStages] = React.useState("mfa");
  const [headless, setHeadless] = React.useState(true);
  // Accumulate progress logs for the active job
  const [progressLog, setProgressLog] = React.useState<string[]>([]);
  const prevProgressRef = React.useRef<string | null>(null);
  const logEndRef = React.useRef<HTMLDivElement>(null);

  const supabase = React.useMemo(() => createClient(), []);

  const fetchJobs = React.useCallback(async () => {
    const { data } = await supabase
      .from("automation_jobs")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false });

    setJobs((data ?? []) as AutomationJob[]);
    setLoading(false);
  }, [applicationId, supabase]);

  React.useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Poll every 3s when there's an active job
  const activeJob = jobs.find((j) =>
    ["pending", "queued", "running"].includes(j.status)
  );

  React.useEffect(() => {
    if (!activeJob) return;
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, [activeJob, fetchJobs]);

  // Accumulate progress messages into log
  React.useEffect(() => {
    if (!activeJob?.stage_progress) return;
    if (activeJob.stage_progress !== prevProgressRef.current) {
      prevProgressRef.current = activeJob.stage_progress;
      const time = new Date().toLocaleTimeString();
      setProgressLog((prev) => [...prev, `[${time}] ${activeJob.stage_progress}`]);
    }
  }, [activeJob?.stage_progress]);

  // Auto-scroll log
  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progressLog]);

  // Reset log when a new job starts
  React.useEffect(() => {
    if (activeJob && progressLog.length === 0 && activeJob.stage_progress) {
      const time = new Date().toLocaleTimeString();
      setProgressLog([`[${time}] ${activeJob.stage_progress}`]);
      prevProgressRef.current = activeJob.stage_progress;
    }
  }, [activeJob, progressLog.length]);

  async function handleStartAutomation() {
    setStarting(true);
    setProgressLog([]);
    prevProgressRef.current = null;
    try {
      const stages = selectedStages === "all" ? ["mfa", "vfs"] : [selectedStages];
      const res = await fetch("/api/automation/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId, stages, headless }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to start automation");
        return;
      }

      toast.success("Automation job started");
      await fetchJobs();
    } catch {
      toast.error("Failed to start automation");
    } finally {
      setStarting(false);
    }
  }

  async function handleCancel(jobId: string) {
    setCancelling(true);
    try {
      const res = await fetch(`/api/automation/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      if (!res.ok) {
        toast.error("Failed to cancel job");
        return;
      }

      toast.success("Job cancelled");
      await fetchJobs();
    } catch {
      toast.error("Failed to cancel job");
    } finally {
      setCancelling(false);
    }
  }

  async function handleRetry() {
    setProgressLog([]);
    prevProgressRef.current = null;
    await handleStartAutomation();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const completedJobs = jobs.filter(
    (j) => !["pending", "queued", "running"].includes(j.status)
  );
  const lastJob = completedJobs[0];
  const canRetry = !activeJob && lastJob && ["failed", "cancelled"].includes(lastJob.status);

  return (
    <div className="space-y-4">
      {/* Start / Retry controls */}
      {!activeJob && (
        <div className="flex items-center gap-3">
          <Select value={selectedStages} onValueChange={setSelectedStages}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mfa">MFA Only</SelectItem>
              <SelectItem value="vfs">VFS Only</SelectItem>
              <SelectItem value="all">MFA + VFS</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch
              id="headless-toggle"
              checked={!headless}
              onCheckedChange={(checked) => setHeadless(!checked)}
            />
            <Label htmlFor="headless-toggle" className="text-xs cursor-pointer flex items-center gap-1">
              {headless ? (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-green-600" />
              )}
              {headless ? "Headless" : "Visible"}
            </Label>
          </div>
          {canRetry ? (
            <Button size="sm" onClick={handleRetry} disabled={starting}>
              {starting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Retry
            </Button>
          ) : (
            <Button size="sm" onClick={handleStartAutomation} disabled={starting}>
              {starting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-3.5 w-3.5" />
              )}
              Start Automation
            </Button>
          )}
        </div>
      )}

      {/* Active job card */}
      {activeJob && (
        <Card className="border-2 border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {statusIcons[activeJob.status]}
                Active Job
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusColors[activeJob.status]}>
                  {activeJob.status}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancel(activeJob.id)}
                  disabled={cancelling}
                  className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  {cancelling ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Square className="mr-1 h-3 w-3" />
                  )}
                  Cancel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Progress bar */}
            {(() => {
              const p = parseProgress(activeJob.stage_progress);
              if (!p) return null;
              const pct = Math.round((p.step / p.total) * 100);
              return (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{activeJob.current_stage?.toUpperCase()} — Step {p.step}/{p.total}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Current step description */}
            {activeJob.stage_progress && (
              <p className="text-sm font-medium">
                {activeJob.stage_progress.replace(/^Step \d+\/\d+ — /, "")}
              </p>
            )}

            {activeJob.mfa_case_number && (
              <p className="text-sm">
                <span className="text-muted-foreground">MFA Case #:</span>{" "}
                <span className="font-mono font-medium">{activeJob.mfa_case_number}</span>
              </p>
            )}

            {activeJob.error_message && (
              <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {activeJob.error_message}
              </div>
            )}

            {/* Live logs */}
            {progressLog.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Activity Log</span>
                  </div>
                  <ScrollArea className="h-32 rounded-md border bg-muted/30 p-2">
                    <div className="space-y-0.5 font-mono text-xs">
                      {progressLog.map((line, i) => (
                        <p key={i} className={i === progressLog.length - 1 ? "text-foreground" : "text-muted-foreground"}>
                          {line}
                        </p>
                      ))}
                      <div ref={logEndRef} />
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}

            <p className="text-xs text-muted-foreground">
              Started: {activeJob.started_at ? new Date(activeJob.started_at).toLocaleString() : "Pending..."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Job history */}
      {completedJobs.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Job History</h4>
          <div className="space-y-2">
            {completedJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  {statusIcons[job.status]}
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${statusColors[job.status]}`}>
                        {job.status}
                      </Badge>
                      {job.current_stage && (
                        <span className="text-xs text-muted-foreground">
                          {job.current_stage.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {job.stage_progress && (
                      <p className="text-xs mt-0.5 text-muted-foreground">
                        {job.stage_progress}
                      </p>
                    )}
                    {job.mfa_case_number && (
                      <p className="text-xs mt-0.5">
                        Case #: <span className="font-mono">{job.mfa_case_number}</span>
                      </p>
                    )}
                    {job.error_message && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 max-w-md truncate">
                        {job.error_message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <p>{new Date(job.created_at).toLocaleDateString()}</p>
                  <p>{new Date(job.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {jobs.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">
          No automation jobs yet. Select stages and click Start Automation to begin.
        </p>
      )}
    </div>
  );
}
