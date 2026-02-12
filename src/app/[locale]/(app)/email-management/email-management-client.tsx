"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Mail,
  Plus,
  Edit,
  Trash2,
  Eye,
  Bell,
  MessageSquare,
  Phone,
  Send,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { EmailTemplate } from "./page";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

interface Props {
  initialTemplates: EmailTemplate[];
  notificationSettings: Record<string, boolean>;
}

export function EmailManagementClient({
  initialTemplates,
  notificationSettings,
}: Props) {
  const t = useTranslations("emailManagement");
  const tCommon = useTranslations("common");

  // Notification state
  const [appointmentReminders, setAppointmentReminders] = React.useState(
    notificationSettings.appointment_reminders ?? false
  );
  const [statusChangeNotifs, setStatusChangeNotifs] = React.useState(
    notificationSettings.status_change_notifications ?? false
  );
  const [emailChannel, setEmailChannel] = React.useState(
    notificationSettings.email_channel ?? true
  );
  const [smsChannel, setSmsChannel] = React.useState(
    notificationSettings.sms_channel ?? false
  );
  const [telegramChannel, setTelegramChannel] = React.useState(
    notificationSettings.telegram_channel ?? false
  );

  // Templates state
  const [templates, setTemplates] =
    React.useState<EmailTemplate[]>(initialTemplates);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] =
    React.useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = React.useState("");

  // Form state
  const [formName, setFormName] = React.useState("");
  const [formSubject, setFormSubject] = React.useState("");
  const [formHtmlContent, setFormHtmlContent] = React.useState("");
  const [formIsActive, setFormIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const supabase = createClient();

  async function saveNotificationSettings() {
    const { error } = await supabase.from("settings").upsert(
      {
        key: "notification_settings",
        value: {
          appointment_reminders: appointmentReminders,
          status_change_notifications: statusChangeNotifs,
          email_channel: emailChannel,
          sms_channel: smsChannel,
          telegram_channel: telegramChannel,
        },
      },
      { onConflict: "key" }
    );

    if (error) {
      toast.error(t("saveError"));
    } else {
      toast.success(t("saveSuccess"));
    }
  }

  function openAddDialog() {
    setEditingTemplate(null);
    setFormName("");
    setFormSubject("");
    setFormHtmlContent("");
    setFormIsActive(true);
    setDialogOpen(true);
  }

  function openEditDialog(template: EmailTemplate) {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormSubject(template.subject);
    setFormHtmlContent(template.html_content);
    setFormIsActive(template.is_active);
    setDialogOpen(true);
  }

  function openPreview(htmlContent: string) {
    setPreviewHtml(htmlContent);
    setPreviewOpen(true);
  }

  async function handleSaveTemplate() {
    setSaving(true);
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from("email_templates")
          .update({
            name: formName,
            subject: formSubject,
            html_content: formHtmlContent,
            is_active: formIsActive,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;

        setTemplates((prev) =>
          prev.map((tpl) =>
            tpl.id === editingTemplate.id
              ? {
                  ...tpl,
                  name: formName,
                  subject: formSubject,
                  html_content: formHtmlContent,
                  is_active: formIsActive,
                  updated_at: new Date().toISOString(),
                }
              : tpl
          )
        );
        toast.success(t("updateSuccess"));
      } else {
        const { data, error } = await supabase
          .from("email_templates")
          .insert({
            name: formName,
            subject: formSubject,
            html_content: formHtmlContent,
            is_active: formIsActive,
          })
          .select()
          .single();

        if (error) throw error;

        setTemplates((prev) => [data as EmailTemplate, ...prev]);
        toast.success(t("createSuccess"));
      }
      setDialogOpen(false);
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    const { error } = await supabase
      .from("email_templates")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(t("deleteError"));
    } else {
      setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
      toast.success(t("deleteSuccess"));
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Notification Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("notificationSettings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {t("appointmentReminders")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("appointmentRemindersDesc")}
                </p>
              </div>
              <Switch
                checked={appointmentReminders}
                onCheckedChange={setAppointmentReminders}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {t("statusChangeNotifications")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("statusChangeNotificationsDesc")}
                </p>
              </div>
              <Switch
                checked={statusChangeNotifs}
                onCheckedChange={setStatusChangeNotifs}
              />
            </div>
          </div>

          <Separator />

          {/* Channel Toggles */}
          <div>
            <p className="text-sm font-medium mb-3">{t("channels")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Mail className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t("channelEmail")}</p>
                </div>
                <Switch
                  checked={emailChannel}
                  onCheckedChange={setEmailChannel}
                />
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Phone className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t("channelSms")}</p>
                </div>
                <Switch
                  checked={smsChannel}
                  onCheckedChange={setSmsChannel}
                />
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Send className="h-5 w-5 text-sky-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t("channelTelegram")}</p>
                </div>
                <Switch
                  checked={telegramChannel}
                  onCheckedChange={setTelegramChannel}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveNotificationSettings}>
              {tCommon("save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Templates Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("emailTemplates")}
          </CardTitle>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addTemplate")}
          </Button>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                {t("noTemplates")}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("templateName")}</TableHead>
                    <TableHead>{t("templateSubject")}</TableHead>
                    <TableHead>{tCommon("status")}</TableHead>
                    <TableHead>{t("lastUpdated")}</TableHead>
                    <TableHead className="text-right">
                      {tCommon("actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        {template.name}
                      </TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            template.is_active ? "default" : "secondary"
                          }
                        >
                          {template.is_active
                            ? tCommon("active")
                            : tCommon("passive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(template.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              openPreview(template.html_content)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              handleDeleteTemplate(template.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t("editTemplate") : t("addTemplate")}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? t("editTemplateDesc")
                : t("addTemplateDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("templateName")}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("templateNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("templateSubject")}</Label>
              <Input
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder={t("templateSubjectPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("htmlContent")}</Label>
              <Textarea
                value={formHtmlContent}
                onChange={(e) => setFormHtmlContent(e.target.value)}
                placeholder={t("htmlContentPlaceholder")}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
              <Label>{tCommon("active")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving ? tCommon("loading") : tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t("preview")}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded border bg-white p-4">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              {tCommon("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
