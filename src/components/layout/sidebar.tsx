"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Building2,
  CalendarClock,
  Calendar,
  FolderOpen,
  Tags,
  ClipboardList,
  KeyRound,
  Wallet,
  UserMinus,
  Building,
  Globe,
  Landmark,
  BarChart3,
  PieChart,
  Users,
  Brain,
  Bot,
  MessageSquare,
  Settings as SettingsIcon,
  Mail,
  MailCheck,
  Shield,
  FileSignature,
  ScrollText,
  Receipt,
  HardDrive,
  LifeBuoy,
  Headphones,
  CheckSquare,
  BookOpen,
  Flag,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function useNavGroups(): NavGroup[] {
  const t = useTranslations("nav");

  return [
    {
      title: t("main"),
      items: [
        { label: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
        { label: t("applications"), href: "/applications", icon: FileText },
        { label: t("companies"), href: "/companies", icon: Building2 },
        { label: t("appointments"), href: "/appointments", icon: CalendarClock },
        { label: t("calendar"), href: "/calendar", icon: Calendar },
      ],
    },
    {
      title: t("management"),
      items: [
        { label: t("documents"), href: "/documents", icon: FolderOpen },
        { label: t("tags"), href: "/tags", icon: Tags },
        { label: t("forms"), href: "/forms", icon: ClipboardList },
        { label: t("passwords"), href: "/passwords", icon: KeyRound },
      ],
    },
    {
      title: t("financeGroup"),
      items: [
        { label: t("finance"), href: "/finance", icon: Wallet },
        { label: t("debtIndividual"), href: "/debt-individual", icon: UserMinus },
        { label: t("debtCorporate"), href: "/debt-corporate", icon: Building },
      ],
    },
    {
      title: t("reports"),
      items: [
        { label: t("countryReports"), href: "/country-reports", icon: Globe },
        { label: t("atConsulate"), href: "/at-consulate", icon: Landmark },
        { label: t("consulateMetrics"), href: "/consulate-metrics", icon: BarChart3 },
        { label: t("countryMetrics"), href: "/country-metrics", icon: PieChart },
        { label: t("referralReport"), href: "/referral-report", icon: Users },
      ],
    },
    {
      title: t("ai"),
      items: [
        { label: t("aiAnalysis"), href: "/ai-analysis", icon: Brain },
        { label: t("aiAssistant"), href: "/ai-assistant", icon: Bot },
        { label: t("aiPrompts"), href: "/ai-prompts", icon: MessageSquare },
        { label: t("aiSettings"), href: "/ai-settings", icon: SettingsIcon },
      ],
    },
    {
      title: t("emailGroup"),
      items: [
        { label: t("emailHosting"), href: "/email-hosting", icon: Mail },
        { label: t("emailManagement"), href: "/email-management", icon: MailCheck },
      ],
    },
    {
      title: t("portalGroup"),
      items: [
        { label: t("documentChecklists"), href: "/document-checklists", icon: CheckSquare },
        { label: t("portalContent"), href: "/portal-content", icon: BookOpen },
        { label: t("countriesManagement"), href: "/countries", icon: Flag },
      ],
    },
    {
      title: t("system"),
      items: [
        { label: t("settings"), href: "/settings", icon: SettingsIcon },
        { label: t("security"), href: "/security", icon: Shield },
        { label: t("contracts"), href: "/contracts", icon: FileSignature },
        { label: t("logs"), href: "/logs", icon: ScrollText },
        { label: t("invoices"), href: "/invoices", icon: Receipt },
        { label: t("cdnFiles"), href: "/cdn-files", icon: HardDrive },
        { label: t("support"), href: "/support", icon: LifeBuoy },
        { label: t("supportCenter"), href: "/support-center", icon: Headphones },
      ],
    },
  ];
}

function SidebarNav({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const navGroups = useNavGroups();

  return (
    <nav className="space-y-4">
      {navGroups.map((group, groupIndex) => (
        <div key={group.title}>
          {groupIndex > 0 && <Separator className="mb-3" />}
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onLinkClick}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary border-r-2 border-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex h-screen w-64 shrink-0 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <img src="/logo.jpg" alt="Unusual Consulting" className="h-9 w-full object-contain object-left" />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3">
        <SidebarNav />
      </ScrollArea>
    </aside>
  );
}

export function MobileSidebarContent({ onClose }: { onClose: () => void }) {
  return (
    <ScrollArea className="flex-1 px-3 py-3">
      <SidebarNav onLinkClick={onClose} />
    </ScrollArea>
  );
}
