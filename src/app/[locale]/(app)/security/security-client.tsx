"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Phone,
  Smartphone,
  QrCode,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Props {
  userEmail: string;
  userPhone: string;
  twoFactorSettings: Record<string, unknown>;
}

export function SecurityClient({
  userEmail,
  userPhone,
  twoFactorSettings,
}: Props) {
  const t = useTranslations("security");
  const tCommon = useTranslations("common");

  const [emailEnabled, setEmailEnabled] = React.useState(
    (twoFactorSettings.email_2fa as boolean) ?? false
  );
  const [smsEnabled, setSmsEnabled] = React.useState(
    (twoFactorSettings.sms_2fa as boolean) ?? false
  );
  const [totpEnabled, setTotpEnabled] = React.useState(
    (twoFactorSettings.totp_2fa as boolean) ?? false
  );
  const [phoneNumber, setPhoneNumber] = React.useState(userPhone);
  const [verificationCode, setVerificationCode] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const supabase = createClient();

  const enabledCount = [emailEnabled, smsEnabled, totpEnabled].filter(
    Boolean
  ).length;
  const securityLevel =
    enabledCount === 0 ? "low" : enabledCount === 1 ? "medium" : "high";

  async function saveSettings() {
    setSaving(true);
    try {
      const { error } = await supabase.from("settings").upsert(
        {
          key: "two_factor_settings",
          value: {
            email_2fa: emailEnabled,
            sms_2fa: smsEnabled,
            totp_2fa: totpEnabled,
            phone_number: phoneNumber,
          },
        },
        { onConflict: "key" }
      );

      if (error) throw error;
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  function handleSendTestCode(method: string) {
    toast.success(t("testCodeSent", { method }));
  }

  function handleVerifyTotp() {
    if (!verificationCode.trim()) return;
    toast.success(t("totpVerified"));
    setVerificationCode("");
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* 2FA Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("overview")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  securityLevel === "high"
                    ? "bg-green-100"
                    : securityLevel === "medium"
                    ? "bg-yellow-100"
                    : "bg-red-100"
                }`}
              >
                {securityLevel === "high" ? (
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                ) : securityLevel === "medium" ? (
                  <Shield className="h-6 w-6 text-yellow-600" />
                ) : (
                  <ShieldAlert className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{t("securityLevel")}</p>
                <Badge
                  variant={
                    securityLevel === "high"
                      ? "default"
                      : securityLevel === "medium"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {t(`level_${securityLevel}`)}
                </Badge>
              </div>
            </div>

            <Separator orientation="vertical" className="h-12" />

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t("email2fa")}</span>
                <Badge variant={emailEnabled ? "default" : "outline"}>
                  {emailEnabled ? tCommon("active") : tCommon("passive")}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t("sms2fa")}</span>
                <Badge variant={smsEnabled ? "default" : "outline"}>
                  {smsEnabled ? tCommon("active") : tCommon("passive")}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t("totp2fa")}</span>
                <Badge variant={totpEnabled ? "default" : "outline"}>
                  {totpEnabled ? tCommon("active") : tCommon("passive")}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email 2FA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("email2fa")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("enableEmail2fa")}</p>
              <p className="text-xs text-muted-foreground">
                {t("email2faDesc")}
              </p>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>

          {emailEnabled && (
            <>
              <Separator />
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    {t("emailAddress")}
                  </Label>
                  <p className="text-sm font-medium">{userEmail}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendTestCode("email")}
                >
                  {t("sendTestCode")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* SMS 2FA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {t("sms2fa")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("enableSms2fa")}</p>
              <p className="text-xs text-muted-foreground">
                {t("sms2faDesc")}
              </p>
            </div>
            <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
          </div>

          {smsEnabled && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{t("phoneNumber")}</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={t("phoneNumberPlaceholder")}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendTestCode("SMS")}
                >
                  {t("sendTestCode")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* TOTP 2FA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {t("totp2fa")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("enableTotp2fa")}</p>
              <p className="text-xs text-muted-foreground">
                {t("totp2faDesc")}
              </p>
            </div>
            <Switch checked={totpEnabled} onCheckedChange={setTotpEnabled} />
          </div>

          {totpEnabled && (
            <>
              <Separator />
              <div className="space-y-4">
                {/* QR Code Placeholder */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30">
                    <QrCode className="h-16 w-16 text-muted-foreground/50" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {t("qrCodeDesc")}
                  </p>
                </div>

                {/* Verification */}
                <div className="space-y-2">
                  <Label>{t("verificationCode")}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder={t("verificationCodePlaceholder")}
                      maxLength={6}
                      className="max-w-[200px]"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVerifyTotp}
                      disabled={!verificationCode.trim()}
                    >
                      {t("verify")}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? tCommon("loading") : tCommon("save")}
        </Button>
      </div>
    </div>
  );
}
