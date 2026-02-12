"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Headphones,
  Search,
  Mail,
  Phone,
  HelpCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_KEYS = [
  "faq1",
  "faq2",
  "faq3",
  "faq4",
  "faq5",
  "faq6",
] as const;

export default function SupportCenterPage() {
  const t = useTranslations("supportCenter");

  const [searchQuery, setSearchQuery] = React.useState("");

  const faqs = FAQ_KEYS.map((key) => ({
    key,
    title: t(`${key}Title`),
    content: t(`${key}Content`),
  }));

  const filteredFaqs = searchQuery.trim()
    ? faqs.filter(
        (faq) =>
          faq.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Headphones className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-10"
        />
      </div>

      {/* FAQ Accordion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {t("faq")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFaqs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("noResults")}
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faq) => (
                <AccordionItem key={faq.key} value={faq.key}>
                  <AccordionTrigger className="text-left">
                    {faq.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {faq.content}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("contactTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("contactDescription")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a
                href={`mailto:${t("contactEmail")}`}
                className="text-primary hover:underline"
              >
                {t("contactEmail")}
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{t("contactPhone")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
