"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ScrollText,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

interface LogEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface Props {
  initialLogs: LogEntry[];
}

const actionStyles: Record<string, string> = {
  create: "bg-green-100 text-green-800 border-green-300",
  update: "bg-blue-100 text-blue-800 border-blue-300",
  delete: "bg-red-100 text-red-800 border-red-300",
  login: "bg-purple-100 text-purple-800 border-purple-300",
  logout: "bg-gray-100 text-gray-700 border-gray-300",
};

export function LogsClient({ initialLogs }: Props) {
  const t = useTranslations("logs");
  const tCommon = useTranslations("common");

  const [logs] = React.useState<LogEntry[]>(initialLogs);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (startDate && new Date(log.created_at) < new Date(startDate)) return false;
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      if (new Date(log.created_at) > end) return false;
    }
    return true;
  });

  function handleExport() {
    const headers = ["ID", "User", "Action", "Entity Type", "Entity ID", "IP Address", "Timestamp"];
    const rows = filteredLogs.map((log) => [
      log.id,
      log.user_email ?? log.user_id ?? "",
      log.action,
      log.entity_type ?? "",
      log.entity_id ?? "",
      log.ip_address ?? "",
      log.created_at,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScrollText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          {t("exportLogs")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            {t("filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("startDate")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("endDate")}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("actionType")}</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allActions")}</SelectItem>
                  <SelectItem value="create">{t("actionCreate")}</SelectItem>
                  <SelectItem value="update">{t("actionUpdate")}</SelectItem>
                  <SelectItem value="delete">{t("actionDelete")}</SelectItem>
                  <SelectItem value="login">{t("actionLogin")}</SelectItem>
                  <SelectItem value="logout">{t("actionLogout")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("noLogs")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>{t("id")}</TableHead>
                    <TableHead>{t("user")}</TableHead>
                    <TableHead>{t("action")}</TableHead>
                    <TableHead>{t("entityType")}</TableHead>
                    <TableHead>{t("entityId")}</TableHead>
                    <TableHead>{t("ipAddress")}</TableHead>
                    <TableHead>{t("timestamp")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedRow(expandedRow === log.id ? null : log.id)
                        }
                      >
                        <TableCell>
                          {log.details ? (
                            expandedRow === log.id ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.user_email ?? log.user_id?.slice(0, 8) ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={actionStyles[log.action] ?? ""}
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.entity_type ?? "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.entity_id?.slice(0, 8) ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.ip_address ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </TableCell>
                      </TableRow>
                      {expandedRow === log.id && log.details && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30">
                            <div className="p-3">
                              <p className="text-xs font-medium mb-1">
                                {t("details")}:
                              </p>
                              <pre className="text-xs bg-background rounded p-2 overflow-x-auto border">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
