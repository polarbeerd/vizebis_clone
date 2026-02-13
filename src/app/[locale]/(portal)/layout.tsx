import { PortalHeader } from "@/components/portal/portal-header";
import { AnimatedBackground } from "@/components/portal/animated-background";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <PortalHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
