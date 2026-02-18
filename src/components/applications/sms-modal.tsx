"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, MessageSquare, Phone, User } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Props ─────────────────────────────────────────────────────────
interface SmsApplication {
  id: number;
  full_name: string | null;
  phone: string | null;
}

interface SmsModalProps {
  application: SmsApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SmsModal({ application, open, onOpenChange }: SmsModalProps) {
  const t = useTranslations("sms");
  const tCommon = useTranslations("common");

  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState("");

  // ── Templates ──────────────────────────────────────────────
  const appName = application?.full_name ?? "";
  const templates: Record<string, string> = React.useMemo(
    () => ({
      appointment: t("templateAppointment", { name: appName }),
      passport_pickup: t("templatePassportPickup", { name: appName }),
      missing_docs: t("templateMissingDocs", { name: appName }),
    }),
    [t, appName]
  );

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setMessage("");
      setSelectedTemplate("");
    }
  }, [open]);

  function handleTemplateChange(value: string) {
    setSelectedTemplate(value);
    if (value && templates[value]) {
      setMessage(templates[value]);
    }
  }

  async function handleSend() {
    if (!message.trim()) {
      toast.error(t("emptyMessage"));
      return;
    }
    if (!application?.phone) {
      toast.error(t("noPhone"));
      return;
    }

    setSending(true);

    // Simulate SMS sending (actual integration is a later task)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success(t("sendSuccess"));
    setSending(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="size-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient info */}
          <div className="rounded-md border p-3 space-y-2 bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <User className="size-4 text-muted-foreground" />
              <span className="font-medium">
                {application?.full_name ?? "-"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-muted-foreground" />
              <span>{application?.phone ?? t("noPhone")}</span>
            </div>
          </div>

          {/* Template selector */}
          <div className="space-y-2">
            <Label>{t("template")}</Label>
            <Select
              value={selectedTemplate}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectTemplate")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appointment">
                  {t("appointmentInfo")}
                </SelectItem>
                <SelectItem value="passport_pickup">
                  {t("passportPickup")}
                </SelectItem>
                <SelectItem value="missing_docs">
                  {t("missingDocs")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>{t("message")}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder={t("messagePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {message.length} {t("characters")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSend} disabled={sending || !message.trim()}>
            {sending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
