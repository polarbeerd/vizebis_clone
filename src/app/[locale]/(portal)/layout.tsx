import { PortalHeader } from "@/components/portal/portal-header";
import { AnimatedBackground } from "@/components/portal/animated-background";
import { PortalLocaleProvider } from "@/components/portal/portal-locale-provider";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalLocaleProvider>
      <div className="min-h-screen">
        <AnimatedBackground />
        <PortalHeader />
        <main className="mx-auto max-w-4xl px-2 py-3 sm:px-6 sm:py-8">{children}</main>
      </div>
    </PortalLocaleProvider>
  );
}
