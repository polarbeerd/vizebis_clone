"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Building2,
  MessageSquare,
  Bell,
  Bot,
  Users,
  Globe,
  BarChart3,
  Copy,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Check,
  Upload,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { ProfileRow } from "./page";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
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
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Permission groups with their keys ────────────────────────────
const PERMISSION_GROUPS = [
  {
    group: "permGroupBasvuru",
    permissions: [
      "basvuru_goruntule",
      "basvuru_ekle",
      "basvuru_duzenle",
      "basvuru_sil",
      "basvuru_export",
    ],
  },
  {
    group: "permGroupFirma",
    permissions: ["firma_goruntule", "firma_ekle", "firma_duzenle", "firma_sil"],
  },
  {
    group: "permGroupRandevu",
    permissions: [
      "randevu_goruntule",
      "randevu_ekle",
      "randevu_duzenle",
      "randevu_sil",
    ],
  },
  {
    group: "permGroupEvrak",
    permissions: ["evrak_goruntule", "evrak_ekle", "evrak_duzenle", "evrak_sil"],
  },
  {
    group: "permGroupEtiket",
    permissions: [
      "etiket_goruntule",
      "etiket_ekle",
      "etiket_duzenle",
      "etiket_sil",
    ],
  },
  {
    group: "permGroupForm",
    permissions: ["form_goruntule", "form_ekle", "form_duzenle", "form_sil"],
  },
  {
    group: "permGroupRaporlar",
    permissions: ["rapor_goruntule", "rapor_export"],
  },
  {
    group: "permGroupFinans",
    permissions: ["finans_goruntule", "finans_duzenle"],
  },
  {
    group: "permGroupAi",
    permissions: ["ai_kullan", "ai_ayarlar"],
  },
  {
    group: "permGroupSistem",
    permissions: [
      "ayarlar_goruntule",
      "ayarlar_duzenle",
      "kullanici_yonetimi",
      "log_goruntule",
      "sifre_yonetimi",
    ],
  },
  {
    group: "permGroupIletisim",
    permissions: ["sms_gonder", "email_gonder", "sohbet_kullan"],
  },
];

// Map permission key to translation key
const PERM_TRANSLATION_MAP: Record<string, string> = {
  basvuru_goruntule: "permBasvuruGoruntule",
  basvuru_ekle: "permBasvuruEkle",
  basvuru_duzenle: "permBasvuruDuzenle",
  basvuru_sil: "permBasvuruSil",
  basvuru_export: "permBasvuruExport",
  firma_goruntule: "permFirmaGoruntule",
  firma_ekle: "permFirmaEkle",
  firma_duzenle: "permFirmaDuzenle",
  firma_sil: "permFirmaSil",
  randevu_goruntule: "permRandevuGoruntule",
  randevu_ekle: "permRandevuEkle",
  randevu_duzenle: "permRandevuDuzenle",
  randevu_sil: "permRandevuSil",
  evrak_goruntule: "permEvrakGoruntule",
  evrak_ekle: "permEvrakEkle",
  evrak_duzenle: "permEvrakDuzenle",
  evrak_sil: "permEvrakSil",
  etiket_goruntule: "permEtiketGoruntule",
  etiket_ekle: "permEtiketEkle",
  etiket_duzenle: "permEtiketDuzenle",
  etiket_sil: "permEtiketSil",
  form_goruntule: "permFormGoruntule",
  form_ekle: "permFormEkle",
  form_duzenle: "permFormDuzenle",
  form_sil: "permFormSil",
  rapor_goruntule: "permRaporGoruntule",
  rapor_export: "permRaporExport",
  finans_goruntule: "permFinansGoruntule",
  finans_duzenle: "permFinansDuzenle",
  ai_kullan: "permAiKullan",
  ai_ayarlar: "permAiAyarlar",
  ayarlar_goruntule: "permAyarlarGoruntule",
  ayarlar_duzenle: "permAyarlarDuzenle",
  kullanici_yonetimi: "permKullaniciYonetimi",
  log_goruntule: "permLogGoruntule",
  sifre_yonetimi: "permSifreYonetimi",
  sms_gonder: "permSmsGonder",
  email_gonder: "permEmailGonder",
  sohbet_kullan: "permSohbetKullan",
};

// ── Template color map ────────────────────────────────────────────
const TEMPLATE_COLORS: Record<string, string> = {
  login_only: "bg-gray-100 border-gray-300 dark:bg-gray-800",
  kurumsal_lacivert: "bg-blue-950 border-blue-800 text-white",
  luks_gold: "bg-amber-100 border-amber-500",
  modern_mavi: "bg-blue-500 border-blue-700 text-white",
  minimal_petrol: "bg-teal-700 border-teal-900 text-white",
  tech_indigo: "bg-indigo-600 border-indigo-800 text-white",
};

interface SettingsClientProps {
  settingsMap: Record<string, Record<string, unknown>>;
  users: ProfileRow[];
}

export function SettingsClient({ settingsMap, users: initialUsers }: SettingsClientProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const supabase = createClient();

  // ── Users state ──────────────────────────────────────────────────
  const [users, setUsers] = React.useState<ProfileRow[]>(initialUsers);
  const [userDialogOpen, setUserDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<ProfileRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingUser, setDeletingUser] = React.useState<ProfileRow | null>(null);

  // ── SMS Settings state ─────────────────────────────────────────
  const smsDefaults = settingsMap["sms_settings"] ?? {};
  const [smsSystem, setSmsSystem] = React.useState<string>(
    (smsDefaults.sms_sistemi as string) ?? "netgsm"
  );
  const [netgsmUsercode, setNetgsmUsercode] = React.useState<string>(
    (smsDefaults.netgsm_usercode as string) ?? ""
  );
  const [netgsmPassword, setNetgsmPassword] = React.useState<string>(
    (smsDefaults.netgsm_password as string) ?? ""
  );
  const [netgsmMsgheader, setNetgsmMsgheader] = React.useState<string>(
    (smsDefaults.netgsm_msgheader as string) ?? ""
  );

  // ── Notification Settings state ─────────────────────────────────
  const notifDefaults = settingsMap["notification_settings"] ?? {};
  const [randevuAktif, setRandevuAktif] = React.useState(
    (notifDefaults.randevu_aktif as boolean) ?? false
  );
  const [randevuGun, setRandevuGun] = React.useState<number>(
    (notifDefaults.randevu_gun as number) ?? 1
  );
  const [randevuSaat, setRandevuSaat] = React.useState<string>(
    (notifDefaults.randevu_saat as string) ?? "09:00"
  );
  const [randevuTelegram, setRandevuTelegram] = React.useState(
    (notifDefaults.randevu_telegram as boolean) ?? false
  );
  const [randevuSms, setRandevuSms] = React.useState(
    (notifDefaults.randevu_sms as boolean) ?? false
  );
  const [randevuOtomatik, setRandevuOtomatik] = React.useState(
    (notifDefaults.randevu_otomatik as boolean) ?? false
  );
  const [durumAktif, setDurumAktif] = React.useState(
    (notifDefaults.durum_aktif as boolean) ?? false
  );
  const [durumTelegram, setDurumTelegram] = React.useState(
    (notifDefaults.durum_telegram as boolean) ?? false
  );
  const [durumSms, setDurumSms] = React.useState(
    (notifDefaults.durum_sms as boolean) ?? false
  );
  const [emailAcik, setEmailAcik] = React.useState(
    (notifDefaults.email_acik as boolean) ?? false
  );
  const [telegramAcik, setTelegramAcik] = React.useState(
    (notifDefaults.telegram_acik as boolean) ?? false
  );
  const [yeniBasvuruSms, setYeniBasvuruSms] = React.useState(
    (notifDefaults.yenibasvuru_sms as boolean) ?? false
  );

  // ── Telegram Bot state ──────────────────────────────────────────
  const telegramDefaults = settingsMap["telegram_settings"] ?? {};
  const [tgNewCompany, setTgNewCompany] = React.useState(
    (telegramDefaults.notify_new_company as boolean) ?? false
  );
  const [tgNewApp, setTgNewApp] = React.useState(
    (telegramDefaults.notify_new_application as boolean) ?? false
  );
  const [tgNewAppt, setTgNewAppt] = React.useState(
    (telegramDefaults.notify_new_appointment as boolean) ?? false
  );
  const [tgFormSubmit, setTgFormSubmit] = React.useState(
    (telegramDefaults.notify_form_submission as boolean) ?? false
  );

  // ── Website Settings state ──────────────────────────────────────
  const websiteDefaults = settingsMap["website_settings"] ?? {};
  const [displayMode, setDisplayMode] = React.useState<string>(
    (websiteDefaults.display_mode as string) ?? "login_only"
  );
  const [template, setTemplate] = React.useState<string>(
    (websiteDefaults.template as string) ?? "login_only"
  );

  // ── Report Settings state ───────────────────────────────────────
  const reportDefaults = settingsMap["report_settings"] ?? {};
  const [reportDateType, setReportDateType] = React.useState<string>(
    (reportDefaults.rapor_tarih_tipi as string) ?? "appointment"
  );

  // ── Company Info (display only) ─────────────────────────────────
  const companyDefaults = settingsMap["company_info"] ?? {};

  // ── Invite code ─────────────────────────────────────────────────
  const inviteDefaults = settingsMap["invite_settings"] ?? {};
  const [inviteCode, setInviteCode] = React.useState<string>(
    (inviteDefaults.invite_code as string) ?? "VZB-" + Math.random().toString(36).substring(2, 8).toUpperCase()
  );

  // ── User form state ─────────────────────────────────────────────
  const [formUsername, setFormUsername] = React.useState("");
  const [formRole, setFormRole] = React.useState("firma_calisan");
  const [formFullName, setFormFullName] = React.useState("");
  const [formPhone, setFormPhone] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formPassword, setFormPassword] = React.useState("");
  const [formPermissions, setFormPermissions] = React.useState<Record<string, boolean>>({});

  // ── Saving states ───────────────────────────────────────────────
  const [savingSms, setSavingSms] = React.useState(false);
  const [savingNotif, setSavingNotif] = React.useState(false);
  const [savingTelegram, setSavingTelegram] = React.useState(false);
  const [savingWebsite, setSavingWebsite] = React.useState(false);
  const [savingReport, setSavingReport] = React.useState(false);
  const [savingUser, setSavingUser] = React.useState(false);

  // ── Helper: save a settings key ─────────────────────────────────
  async function saveSetting(key: string, value: Record<string, unknown>) {
    // Try to update first, insert if not found
    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .eq("key", key)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("settings")
        .update({ value })
        .eq("key", key);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("settings")
        .insert({ key, value });
      if (error) throw error;
    }
  }

  // ── SMS save handler ────────────────────────────────────────────
  async function handleSaveSms() {
    setSavingSms(true);
    try {
      await saveSetting("sms_settings", {
        sms_sistemi: smsSystem,
        netgsm_usercode: netgsmUsercode,
        netgsm_password: netgsmPassword,
        netgsm_msgheader: netgsmMsgheader,
      });
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSavingSms(false);
    }
  }

  // ── Notification save handler ───────────────────────────────────
  async function handleSaveNotifications() {
    setSavingNotif(true);
    try {
      await saveSetting("notification_settings", {
        randevu_aktif: randevuAktif,
        randevu_gun: randevuGun,
        randevu_saat: randevuSaat,
        randevu_telegram: randevuTelegram,
        randevu_sms: randevuSms,
        randevu_otomatik: randevuOtomatik,
        durum_aktif: durumAktif,
        durum_telegram: durumTelegram,
        durum_sms: durumSms,
        email_acik: emailAcik,
        telegram_acik: telegramAcik,
        yenibasvuru_sms: yeniBasvuruSms,
      });
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSavingNotif(false);
    }
  }

  // ── Telegram save handler ───────────────────────────────────────
  async function handleSaveTelegram() {
    setSavingTelegram(true);
    try {
      await saveSetting("telegram_settings", {
        notify_new_company: tgNewCompany,
        notify_new_application: tgNewApp,
        notify_new_appointment: tgNewAppt,
        notify_form_submission: tgFormSubmit,
      });
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSavingTelegram(false);
    }
  }

  // ── Website save handler ────────────────────────────────────────
  async function handleSaveWebsite() {
    setSavingWebsite(true);
    try {
      await saveSetting("website_settings", {
        display_mode: displayMode,
        template,
      });
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSavingWebsite(false);
    }
  }

  // ── Report save handler ─────────────────────────────────────────
  async function handleSaveReport() {
    setSavingReport(true);
    try {
      await saveSetting("report_settings", {
        rapor_tarih_tipi: reportDateType,
      });
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSavingReport(false);
    }
  }

  // ── User form helpers ───────────────────────────────────────────
  function openNewUserDialog() {
    setEditingUser(null);
    setFormUsername("");
    setFormRole("firma_calisan");
    setFormFullName("");
    setFormPhone("");
    setFormEmail("");
    setFormPassword("");
    setFormPermissions({});
    setUserDialogOpen(true);
  }

  function openEditUserDialog(user: ProfileRow) {
    setEditingUser(user);
    setFormUsername(user.username ?? "");
    setFormRole(user.role ?? "firma_calisan");
    setFormFullName(user.full_name ?? "");
    setFormPhone(user.phone ?? "");
    setFormEmail(user.email ?? "");
    setFormPassword("");
    setFormPermissions(user.permissions ?? {});
    setUserDialogOpen(true);
  }

  async function handleSaveUser() {
    setSavingUser(true);
    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from("profiles")
          .update({
            username: formUsername,
            role: formRole,
            full_name: formFullName,
            phone: formPhone,
            email: formEmail,
            permissions: formPermissions,
          })
          .eq("id", editingUser.id);
        if (error) throw error;

        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  username: formUsername,
                  role: formRole,
                  full_name: formFullName,
                  phone: formPhone,
                  email: formEmail,
                  permissions: formPermissions,
                }
              : u
          )
        );
        toast.success(t("userUpdateSuccess"));
      } else {
        // Create new user
        const { data, error } = await supabase
          .from("profiles")
          .insert({
            username: formUsername,
            role: formRole,
            full_name: formFullName,
            phone: formPhone,
            email: formEmail,
            permissions: formPermissions,
          })
          .select()
          .single();
        if (error) throw error;

        const newUser: ProfileRow = {
          id: (data as Record<string, unknown>).id as string,
          username: formUsername,
          full_name: formFullName,
          phone: formPhone,
          email: formEmail,
          role: formRole,
          telegram_id: null,
          permissions: formPermissions,
          created_at: new Date().toISOString(),
        };
        setUsers((prev) => [newUser, ...prev]);
        toast.success(t("userCreateSuccess"));
      }
      setUserDialogOpen(false);
    } catch {
      toast.error(t("userSaveError"));
    } finally {
      setSavingUser(false);
    }
  }

  async function handleDeleteUser() {
    if (!deletingUser) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", deletingUser.id);
      if (error) throw error;
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      toast.success(t("userDeleteSuccess"));
    } catch {
      toast.error(t("userDeleteError"));
    } finally {
      setDeleteDialogOpen(false);
      setDeletingUser(null);
    }
  }

  function handleRegenerateInviteCode() {
    const newCode =
      "VZB-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    setInviteCode(newCode);
    saveSetting("invite_settings", { invite_code: newCode }).catch(() => {
      toast.error(t("saveError"));
    });
    toast.success(t("saveSuccess"));
  }

  function handleCopyInviteCode() {
    navigator.clipboard.writeText(inviteCode);
    toast.success(t("codeCopied"));
  }

  function togglePermission(key: string) {
    setFormPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  // ── Telegram commands list ──────────────────────────────────────
  const telegramCommands = [
    { cmd: "/start", descKey: "telegramCmdStart" },
    { cmd: "/istatistikler", descKey: "telegramCmdStats" },
    { cmd: "/raporlar", descKey: "telegramCmdReports" },
    { cmd: "/takvim", descKey: "telegramCmdCalendar" },
    { cmd: "/randevular", descKey: "telegramCmdAppointments" },
    { cmd: "/basvurular", descKey: "telegramCmdApplications" },
    { cmd: "/firmalar", descKey: "telegramCmdCompanies" },
    { cmd: "/chatid", descKey: "telegramCmdChatid" },
  ];

  // ── Template options ────────────────────────────────────────────
  const templateOptions = [
    { value: "login_only", labelKey: "templateLoginOnly" },
    { value: "kurumsal_lacivert", labelKey: "templateKurumsalLacivert" },
    { value: "luks_gold", labelKey: "templateLuksGold" },
    { value: "modern_mavi", labelKey: "templateModernMavi" },
    { value: "minimal_petrol", labelKey: "templateMinimalPetrol" },
    { value: "tech_indigo", labelKey: "templateTechIndigo" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="company" className="gap-1.5">
            <Building2 className="size-4" />
            <span className="hidden sm:inline">{t("tabCompany")}</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-1.5">
            <MessageSquare className="size-4" />
            <span className="hidden sm:inline">{t("tabSms")}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="size-4" />
            <span className="hidden sm:inline">{t("tabNotifications")}</span>
          </TabsTrigger>
          <TabsTrigger value="telegram" className="gap-1.5">
            <Bot className="size-4" />
            <span className="hidden sm:inline">{t("tabTelegram")}</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="size-4" />
            <span className="hidden sm:inline">{t("tabUsers")}</span>
          </TabsTrigger>
          <TabsTrigger value="website" className="gap-1.5">
            <Globe className="size-4" />
            <span className="hidden sm:inline">{t("tabWebsite")}</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <BarChart3 className="size-4" />
            <span className="hidden sm:inline">{t("tabReports")}</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════
            Tab 1: Company Info
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabCompany")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("companyName")}</Label>
                  <Input
                    value={(companyDefaults.company_name as string) ?? ""}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("subdomain")}</Label>
                  <Input
                    value={(companyDefaults.subdomain as string) ?? ""}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("licenseNumber")}</Label>
                  <Input
                    value={(companyDefaults.license_number as string) ?? ""}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("membershipExpiry")}</Label>
                  <Input
                    value={
                      companyDefaults.membership_expiry
                        ? formatDate(companyDefaults.membership_expiry as string)
                        : ""
                    }
                    disabled
                  />
                </div>
              </div>

              <Separator />

              {/* Logo placeholder */}
              <div className="space-y-2">
                <Label>{t("logo")}</Label>
                <div className="flex h-32 w-48 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50">
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Upload className="size-6" />
                    <span className="text-xs">{t("logoUpload")}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contracts placeholder */}
              <div className="space-y-2">
                <Label>{t("contracts")}</Label>
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  {t("noContracts")}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            Tab 2: SMS Settings
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabSms")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>{t("smsSystem")}</Label>
                <Select value={smsSystem} onValueChange={setSmsSystem}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("smsSystemSelect")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="netgsm">NetGSM</SelectItem>
                    <SelectItem value="twilio">Twilio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("netgsmUsercode")}</Label>
                  <Input
                    value={netgsmUsercode}
                    onChange={(e) => setNetgsmUsercode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("netgsmPassword")}</Label>
                  <Input
                    type="password"
                    value={netgsmPassword}
                    onChange={(e) => setNetgsmPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("netgsmMsgheader")}</Label>
                  <Input
                    value={netgsmMsgheader}
                    onChange={(e) => setNetgsmMsgheader(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleSaveSms} disabled={savingSms}>
                {savingSms ? tc("loading") : tc("save")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            Tab 3: Notifications
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabNotifications")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Appointment Reminders */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {t("appointmentReminders")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>{t("appointmentActive")}</Label>
                    <Switch
                      checked={randevuAktif}
                      onCheckedChange={setRandevuAktif}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("appointmentDaysBefore")}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={randevuGun}
                        onChange={(e) =>
                          setRandevuGun(parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("appointmentTime")}</Label>
                      <Input
                        type="time"
                        value={randevuSaat}
                        onChange={(e) => setRandevuSaat(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("appointmentTelegram")}</Label>
                    <Switch
                      checked={randevuTelegram}
                      onCheckedChange={setRandevuTelegram}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("appointmentSms")}</Label>
                    <Switch
                      checked={randevuSms}
                      onCheckedChange={setRandevuSms}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("appointmentAuto")}</Label>
                    <Switch
                      checked={randevuOtomatik}
                      onCheckedChange={setRandevuOtomatik}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Status Change Notifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {t("statusNotifications")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>{t("statusActive")}</Label>
                    <Switch
                      checked={durumAktif}
                      onCheckedChange={setDurumAktif}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("statusTelegram")}</Label>
                    <Switch
                      checked={durumTelegram}
                      onCheckedChange={setDurumTelegram}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("statusSms")}</Label>
                    <Switch
                      checked={durumSms}
                      onCheckedChange={setDurumSms}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Channel Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {t("channelSettings")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>{t("emailEnabled")}</Label>
                    <Switch
                      checked={emailAcik}
                      onCheckedChange={setEmailAcik}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("telegramEnabled")}</Label>
                    <Switch
                      checked={telegramAcik}
                      onCheckedChange={setTelegramAcik}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("newApplicationSms")}</Label>
                    <Switch
                      checked={yeniBasvuruSms}
                      onCheckedChange={setYeniBasvuruSms}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveNotifications}
                disabled={savingNotif}
              >
                {savingNotif ? tc("loading") : tc("save")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            Tab 4: Telegram Bot
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="telegram">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabTelegram")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bot Name */}
              <div className="space-y-2">
                <Label>{t("telegramBotName")}</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    @VizeBisV2Bot
                  </Badge>
                  <Badge
                    variant="outline"
                    className="gap-1"
                  >
                    <div className="size-2 rounded-full bg-red-500" />
                    {t("telegramDisconnected")}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Setup Steps */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">
                  {t("telegramSetupTitle")}
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>{t("telegramStep1")}</li>
                  <li>{t("telegramStep2")}</li>
                  <li>{t("telegramStep3")}</li>
                  <li>{t("telegramStep4")}</li>
                </ol>
              </div>

              <Separator />

              {/* Commands Table */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">
                  {t("telegramCommands")}
                </h3>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">
                          {tc("actions")}
                        </TableHead>
                        <TableHead>{tc("description")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {telegramCommands.map((cmd) => (
                        <TableRow key={cmd.cmd}>
                          <TableCell className="font-mono text-sm">
                            {cmd.cmd}
                          </TableCell>
                          <TableCell className="text-sm">
                            {t(cmd.descKey)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              {/* Auto-notifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {t("telegramAutoNotifications")}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tg-new-company"
                      checked={tgNewCompany}
                      onCheckedChange={(v) => setTgNewCompany(v === true)}
                    />
                    <label
                      htmlFor="tg-new-company"
                      className="text-sm leading-none"
                    >
                      {t("telegramNotifyNewCompany")}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tg-new-app"
                      checked={tgNewApp}
                      onCheckedChange={(v) => setTgNewApp(v === true)}
                    />
                    <label
                      htmlFor="tg-new-app"
                      className="text-sm leading-none"
                    >
                      {t("telegramNotifyNewApplication")}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tg-new-appt"
                      checked={tgNewAppt}
                      onCheckedChange={(v) => setTgNewAppt(v === true)}
                    />
                    <label
                      htmlFor="tg-new-appt"
                      className="text-sm leading-none"
                    >
                      {t("telegramNotifyNewAppointment")}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tg-form-submit"
                      checked={tgFormSubmit}
                      onCheckedChange={(v) => setTgFormSubmit(v === true)}
                    />
                    <label
                      htmlFor="tg-form-submit"
                      className="text-sm leading-none"
                    >
                      {t("telegramNotifyFormSubmission")}
                    </label>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveTelegram}
                disabled={savingTelegram}
              >
                {savingTelegram ? tc("loading") : tc("save")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            Tab 5: Users
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="users">
          <div className="space-y-6">
            {/* Invite System Card */}
            <Card>
              <CardHeader>
                <CardTitle>{t("inviteSystem")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <Label>{t("inviteCode")}</Label>
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-3 py-1.5 font-mono text-sm">
                        {inviteCode}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyInviteCode}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRegenerateInviteCode}
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("userLimit")}: {users.length} / 10
                </div>
              </CardContent>
            </Card>

            {/* User Management Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("userManagement")}</CardTitle>
                <Button onClick={openNewUserDialog} size="sm" className="gap-1">
                  <Plus className="size-4" />
                  {t("addUser")}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">ID</TableHead>
                        <TableHead>{t("username")}</TableHead>
                        <TableHead>{t("fullName")}</TableHead>
                        <TableHead>{t("phone")}</TableHead>
                        <TableHead>{t("email")}</TableHead>
                        <TableHead>{t("role")}</TableHead>
                        <TableHead>{t("telegramId")}</TableHead>
                        <TableHead>{t("createdDate")}</TableHead>
                        <TableHead className="w-[100px]">
                          {tc("actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="text-center text-muted-foreground py-8"
                          >
                            {tc("noData")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user, idx) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-mono text-xs">
                              {idx + 1}
                            </TableCell>
                            <TableCell>{user.username ?? "-"}</TableCell>
                            <TableCell>{user.full_name ?? "-"}</TableCell>
                            <TableCell>{user.phone ?? "-"}</TableCell>
                            <TableCell>{user.email ?? "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.role === "firma_admin"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {user.role === "firma_admin"
                                  ? t("roleFirmaAdmin")
                                  : t("roleFirmaCalisan")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.telegram_id ?? "-"}
                            </TableCell>
                            <TableCell>
                              {user.created_at
                                ? formatDate(user.created_at)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditUserDialog(user)}
                                >
                                  <Edit className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setDeletingUser(user);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            Tab 6: Website
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="website">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabWebsite")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display Mode */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {t("displayMode")}
                </Label>
                <RadioGroup
                  value={displayMode}
                  onValueChange={setDisplayMode}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="login_only" id="mode-login" />
                    <label htmlFor="mode-login" className="text-sm">
                      {t("displayLoginOnly")}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="website_login"
                      id="mode-website"
                    />
                    <label htmlFor="mode-website" className="text-sm">
                      {t("displayWebsiteLogin")}
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Template Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {t("templateSelection")}
                </Label>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {templateOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTemplate(opt.value)}
                      className={`relative rounded-xl border-2 p-4 text-center transition-all ${
                        template === opt.value
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-muted hover:border-muted-foreground/40"
                      }`}
                    >
                      <div
                        className={`mx-auto mb-3 flex h-24 w-full items-center justify-center rounded-lg border ${
                          TEMPLATE_COLORS[opt.value] ?? "bg-gray-100"
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {t(opt.labelKey)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{t(opt.labelKey)}</p>
                      {template === opt.value && (
                        <div className="absolute right-2 top-2">
                          <Check className="size-5 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSaveWebsite}
                disabled={savingWebsite}
              >
                {savingWebsite ? tc("loading") : tc("save")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            Tab 7: Report Settings
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabReports")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {t("reportDateType")}
                </Label>
                <RadioGroup
                  value={reportDateType}
                  onValueChange={setReportDateType}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="appointment"
                      id="report-appointment"
                    />
                    <label
                      htmlFor="report-appointment"
                      className="text-sm"
                    >
                      {t("reportByAppointment")}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="creation"
                      id="report-creation"
                    />
                    <label
                      htmlFor="report-creation"
                      className="text-sm"
                    >
                      {t("reportByCreation")}
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                onClick={handleSaveReport}
                disabled={savingReport}
              >
                {savingReport ? tc("loading") : tc("save")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════
          User Form Dialog
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? t("editUser") : t("addUser")}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? t("editUserDescription")
                : t("addUserDescription")}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-2">
              {/* Basic fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("username")} *</Label>
                  <Input
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("role")}</Label>
                  <Select value={formRole} onValueChange={setFormRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="firma_admin">
                        {t("roleFirmaAdmin")}
                      </SelectItem>
                      <SelectItem value="firma_calisan">
                        {t("roleFirmaCalisan")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("fullName")}</Label>
                  <Input
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("phone")}</Label>
                  <Input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("email")}</Label>
                  <Input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                {!editingUser && (
                  <div className="space-y-2">
                    <Label>
                      {t("password")}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({t("passwordNewOnly")})
                      </span>
                    </Label>
                    <Input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Permissions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t("permissions")}</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  {PERMISSION_GROUPS.map((pg) => (
                    <div key={pg.group} className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        {t(pg.group)}
                      </h4>
                      <div className="space-y-1.5">
                        {pg.permissions.map((perm) => (
                          <div
                            key={perm}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`perm-${perm}`}
                              checked={!!formPermissions[perm]}
                              onCheckedChange={() => togglePermission(perm)}
                            />
                            <label
                              htmlFor={`perm-${perm}`}
                              className="text-sm leading-none"
                            >
                              {t(PERM_TRANSLATION_MAP[perm])}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUserDialogOpen(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={savingUser || !formUsername.trim()}
            >
              {savingUser ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          Delete User Confirmation Dialog
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("userDeleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("userDeleteConfirmDescription", {
                name: deletingUser?.full_name ?? deletingUser?.username ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {tc("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              {tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
