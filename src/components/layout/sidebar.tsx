"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  CalendarClock,
  Calendar,
  Wallet,
  Settings as SettingsIcon,
  ScrollText,
  Sliders,
  BookOpen,
  FileStack,
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
        { label: t("appointments"), href: "/appointments", icon: CalendarClock },
        { label: t("calendar"), href: "/calendar", icon: Calendar },
      ],
    },
    {
      title: t("portalGroup"),
      items: [
        { label: t("portalSetup"), href: "/portal-setup", icon: Sliders },
        { label: t("portalContent"), href: "/portal-content", icon: BookOpen },
        { label: t("documentTemplates"), href: "/document-templates", icon: FileStack },
      ],
    },
    {
      title: t("financeGroup"),
      items: [
        { label: t("financeHub"), href: "/finance-hub", icon: Wallet },
      ],
    },
    {
      title: t("system"),
      items: [
        { label: t("settings"), href: "/settings", icon: SettingsIcon },
        { label: t("logs"), href: "/logs", icon: ScrollText },
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
      <ScrollArea className="min-h-0 flex-1 px-3 py-3">
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
