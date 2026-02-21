"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Bot, Play, Loader2, AlertCircle, CheckCircle2, Clock, RefreshCw
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
  completed: <CheckCircle2 className="h-4 w-4" />,
  failed: <AlertCircle className="h-4 w-4" />,
  cancelled: <AlertCircle className="h-4 w-4" />,
};

export function AutomationTab({ applicationId, country }: AutomationTabProps) {
  const [jobs, setJobs] = React.useState<AutomationJob[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [starting, setStarting] = React.useState(false);
  const [selectedStages, setSelectedStages] = React.useState("mfa");

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

  // Poll every 5s when there's an active job
  const activeJob = jobs.find((j) =>
    ["pending", "queued", "running"].includes(j.status)
  );

  React.useEffect(() => {
    if (!activeJob) return;
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [activeJob, fetchJobs]);

  async function handleStartAutomation() {
    setStarting(true);
    try {
      const stages = selectedStages === "all" ? ["mfa", "vfs"] : [selectedStages];
      const res = await fetch("/api/automation/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId, stages }),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Start automation controls */}
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
          <Button
            size="sm"
            onClick={handleStartAutomation}
            disabled={starting}
          >
            {starting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-1.5 h-3.5 w-3.5" />
            )}
            Start Automation
          </Button>
        </div>
      )}

      {/* Active job card */}
      {activeJob && (
        <Card className="border-2 border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {statusIcons[activeJob.status]}
                Active Job
              </CardTitle>
              <Badge variant="outline" className={statusColors[activeJob.status]}>
                {activeJob.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeJob.current_stage && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Stage:</span>{" "}
                  <span className="font-medium">{activeJob.current_stage.toUpperCase()}</span>
                </p>
              )}
              {activeJob.stage_progress && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Progress:</span>{" "}
                  {activeJob.stage_progress}
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
              <p className="text-xs text-muted-foreground">
                Started: {activeJob.started_at ? new Date(activeJob.started_at).toLocaleString() : "Pending..."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job history */}
      {jobs.filter((j) => !["pending", "queued", "running"].includes(j.status)).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Job History</h4>
          <div className="space-y-2">
            {jobs
              .filter((j) => !["pending", "queued", "running"].includes(j.status))
              .map((job) => (
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
