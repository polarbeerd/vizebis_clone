import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import "../globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.unusual.consulting";

export const metadata: Metadata = {
  title: "Unusual Consulting — Visa Danışmanlık",
  description:
    "Profesyonel vize danışmanlık hizmetleri. Başvurunuzu online yapın, sürecinizi takip edin. Our experience is your power.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: "Unusual Consulting — Visa Danışmanlık",
    description:
      "Profesyonel vize danışmanlık hizmetleri. Başvurunuzu online yapın, sürecinizi takip edin.",
    url: APP_URL,
    siteName: "Unusual Consulting",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Unusual Consulting — Visa Consulting Services",
      },
    ],
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Unusual Consulting — Visa Danışmanlık",
    description:
      "Profesyonel vize danışmanlık hizmetleri. Our experience is your power.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
