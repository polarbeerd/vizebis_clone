"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  LifeBuoy,
  Plus,
  Eye,
  Send,
  MessageCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  created_at: string;
  user_id: string;
}

interface Reply {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  is_admin: boolean;
}

interface Props {
  userId: string;
  initialTickets: Ticket[];
}

const statusStyles: Record<string, string> = {
  acik: "bg-green-100 text-green-800 border-green-300",
  cevaplandi: "bg-blue-100 text-blue-800 border-blue-300",
  kapali: "bg-gray-100 text-gray-700 border-gray-300",
};

const priorityStyles: Record<string, string> = {
  normal: "bg-gray-100 text-gray-700 border-gray-300",
  dusuk: "bg-blue-100 text-blue-800 border-blue-300",
  yuksek: "bg-yellow-100 text-yellow-800 border-yellow-300",
  acil: "bg-red-100 text-red-800 border-red-300",
};

export function SupportClient({ userId, initialTickets }: Props) {
  const t = useTranslations("support");
  const tCommon = useTranslations("common");

  const [tickets, setTickets] = React.useState<Ticket[]>(initialTickets);
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [priority, setPriority] = React.useState("normal");
  const [submitting, setSubmitting] = React.useState(false);

  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null);
  const [replies, setReplies] = React.useState<Reply[]>([]);
  const [replyText, setReplyText] = React.useState("");
  const [sendingReply, setSendingReply] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const supabase = createClient();

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          subject,
          message,
          priority,
          status: "acik",
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      setTickets((prev) => [data, ...prev]);
      setSubject("");
      setMessage("");
      setPriority("normal");
      toast.success(t("createSuccess"));
    } catch {
      toast.error(t("createError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpenTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    setDialogOpen(true);

    const { data } = await supabase
      .from("support_ticket_replies")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    setReplies((data as Reply[]) ?? []);
  }

  async function handleSendReply() {
    if (!replyText.trim() || !selectedTicket) return;

    setSendingReply(true);
    try {
      const { data, error } = await supabase
        .from("support_ticket_replies")
        .insert({
          ticket_id: selectedTicket.id,
          message: replyText,
          user_id: userId,
          is_admin: false,
        })
        .select()
        .single();

      if (error) throw error;
      setReplies((prev) => [...prev, data as Reply]);
      setReplyText("");
      toast.success(t("replySuccess"));
    } catch {
      toast.error(t("replyError"));
    } finally {
      setSendingReply(false);
    }
  }

  const statusKey = (s: string) => {
    const map: Record<string, string> = {
      acik: "statusAcik",
      cevaplandi: "statusCevaplandi",
      kapali: "statusKapali",
    };
    return map[s] ?? "statusAcik";
  };

  const priorityKey = (p: string) => {
    const map: Record<string, string> = {
      normal: "priorityNormal",
      dusuk: "priorityDusuk",
      yuksek: "priorityYuksek",
      acil: "priorityAcil",
    };
    return map[p] ?? "priorityNormal";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LifeBuoy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create Ticket Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("createTicket")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("subject")}</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("subjectPlaceholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("message")}</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("messagePlaceholder")}
                  rows={5}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("priority")}</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">{t("priorityNormal")}</SelectItem>
                    <SelectItem value="dusuk">{t("priorityDusuk")}</SelectItem>
                    <SelectItem value="yuksek">{t("priorityYuksek")}</SelectItem>
                    <SelectItem value="acil">{t("priorityAcil")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? tCommon("loading") : t("submit")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("myTickets")}</CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("noTickets")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("id")}</TableHead>
                      <TableHead>{t("subject")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("priority")}</TableHead>
                      <TableHead>{t("createdDate")}</TableHead>
                      <TableHead>{tCommon("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs">
                          {ticket.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {ticket.subject}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusStyles[ticket.status] ?? ""}
                          >
                            {t(statusKey(ticket.status))}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={priorityStyles[ticket.priority] ?? ""}
                          >
                            {t(priorityKey(ticket.priority))}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(ticket.created_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenTicket(ticket)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t("viewThread")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {t("ticketDetail")}
            </DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {/* Original message */}
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{selectedTicket.subject}</h4>
                  <Badge
                    variant="outline"
                    className={statusStyles[selectedTicket.status] ?? ""}
                  >
                    {t(statusKey(selectedTicket.status))}
                  </Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDateTime(selectedTicket.created_at)}
                </p>
              </div>

              {/* Replies */}
              <div className="space-y-3">
                <h4 className="font-medium">{t("replies")}</h4>
                {replies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("noReplies")}
                  </p>
                ) : (
                  replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`rounded-lg border p-3 ${
                        reply.is_admin ? "bg-blue-50 border-blue-200" : "bg-background"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {reply.is_admin ? "Admin" : "You"} -{" "}
                        {formatDateTime(reply.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Reply form */}
              {selectedTicket.status !== "kapali" && (
                <div className="flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t("replyPlaceholder")}
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
