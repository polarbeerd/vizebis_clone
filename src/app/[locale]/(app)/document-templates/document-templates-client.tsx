"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookingTemplatesClient } from "../booking-templates/booking-templates-client";
import { LetterTemplatesClient } from "../letter-templates/letter-templates-client";
import type { HotelRow, LetterExampleRow, LetterConfig } from "./page";

interface DocumentTemplatesClientProps {
  hotels: HotelRow[];
  letterExamples: LetterExampleRow[];
  letterConfig: LetterConfig;
}

export function DocumentTemplatesClient({
  hotels,
  letterExamples,
  letterConfig,
}: DocumentTemplatesClientProps) {
  const t = useTranslations("nav");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("documentTemplates")}</h1>

      <Tabs defaultValue="booking">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="booking">{t("bookingTemplates")}</TabsTrigger>
          <TabsTrigger value="letter">{t("letterTemplates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="booking" className="mt-4">
          <BookingTemplatesClient data={hotels} />
        </TabsContent>

        <TabsContent value="letter" className="mt-4">
          <LetterTemplatesClient data={letterExamples} config={letterConfig} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
