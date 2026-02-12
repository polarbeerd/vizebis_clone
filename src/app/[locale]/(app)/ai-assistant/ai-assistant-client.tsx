"use client";

import * as React from "react";
import { Bot, Copy, Printer, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AiAssistantClientProps {
  translations: {
    title: string;
    subtitle: string;
    fullName: string;
    country: string;
    city: string;
    district: string;
    departureDate: string;
    returnDate: string;
    workplace: string;
    position: string;
    passportNo: string;
    visitReason: string;
    specialNotes: string;
    letterLanguage: string;
    generate: string;
    generating: string;
    result: string;
    copy: string;
    print: string;
    copied: string;
    countryGermany: string;
    countryFrance: string;
    countryNetherlands: string;
    countrySpain: string;
    countryItaly: string;
    reasonTourist: string;
    reasonCultural: string;
    reasonCommercial: string;
    reasonFamily: string;
    reasonFriend: string;
    langTurkish: string;
    langEnglish: string;
    langGerman: string;
    langItalian: string;
    placeholderLetter: string;
    fullNamePlaceholder: string;
    cityPlaceholder: string;
    districtPlaceholder: string;
    workplacePlaceholder: string;
    positionPlaceholder: string;
    passportNoPlaceholder: string;
    specialNotesPlaceholder: string;
    selectCountry: string;
    selectReason: string;
    selectLanguage: string;
  };
}

interface FormData {
  adSoyad: string;
  ulke: string;
  sehir: string;
  ilce: string;
  gidisTarihi: string;
  donusTarihi: string;
  isYeri: string;
  pozisyon: string;
  pasaportNo: string;
  ziyaretSebebi: string;
  ozelNotlar: string;
  mektupDili: string;
}

export function AiAssistantClient({ translations: t }: AiAssistantClientProps) {
  const [formData, setFormData] = React.useState<FormData>({
    adSoyad: "",
    ulke: "",
    sehir: "",
    ilce: "",
    gidisTarihi: "",
    donusTarihi: "",
    isYeri: "",
    pozisyon: "",
    pasaportNo: "",
    ziyaretSebebi: "",
    ozelNotlar: "",
    mektupDili: "",
  });
  const [generatedLetter, setGeneratedLetter] = React.useState<string | null>(
    null
  );
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const countries = [
    { value: "Almanya", label: t.countryGermany },
    { value: "Fransa", label: t.countryFrance },
    { value: "Hollanda", label: t.countryNetherlands },
    { value: "İspanya", label: t.countrySpain },
    { value: "İtalya", label: t.countryItaly },
  ];

  const visitReasons = [
    { value: "Turistik", label: t.reasonTourist },
    { value: "Kültürel", label: t.reasonCultural },
    { value: "Ticari", label: t.reasonCommercial },
    { value: "Aile", label: t.reasonFamily },
    { value: "Arkadaş", label: t.reasonFriend },
  ];

  const languages = [
    { value: "Türkçe", label: t.langTurkish },
    { value: "İngilizce", label: t.langEnglish },
    { value: "Almanca", label: t.langGerman },
    { value: "İtalyanca", label: t.langItalian },
  ];

  function handleInputChange(
    field: keyof FormData,
    value: string
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleGenerate() {
    setIsGenerating(true);

    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get display labels for country and visit reason
    const countryLabel =
      countries.find((c) => c.value === formData.ulke)?.label || formData.ulke;
    const reasonLabel =
      visitReasons.find((r) => r.value === formData.ziyaretSebebi)?.label ||
      formData.ziyaretSebebi;

    // Generate placeholder letter by replacing template variables
    const letter = t.placeholderLetter
      .replace("{name}", formData.adSoyad || "...")
      .replace("{country}", countryLabel || "...")
      .replace("{workplace}", formData.isYeri || "...")
      .replace("{position}", formData.pozisyon || "...")
      .replace("{departureDate}", formData.gidisTarihi || "...")
      .replace("{returnDate}", formData.donusTarihi || "...")
      .replace("{reason}", reasonLabel || "...")
      .replace("{passportNo}", formData.pasaportNo || "...");

    setGeneratedLetter(letter);
    setIsGenerating(false);
  }

  async function handleCopy() {
    if (!generatedLetter) return;
    await navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    if (!generatedLetter) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>${t.result}</title></head>
          <body style="font-family: serif; padding: 40px; white-space: pre-wrap; line-height: 1.8;">
            ${generatedLetter}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-6 w-6" />
          {t.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="adSoyad">{t.fullName}</Label>
              <Input
                id="adSoyad"
                value={formData.adSoyad}
                onChange={(e) => handleInputChange("adSoyad", e.target.value)}
                placeholder={t.fullNamePlaceholder}
              />
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="ulke">{t.country}</Label>
              <Select
                value={formData.ulke}
                onValueChange={(value) => handleInputChange("ulke", value)}
              >
                <SelectTrigger id="ulke">
                  <SelectValue placeholder={t.selectCountry} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="sehir">{t.city}</Label>
              <Input
                id="sehir"
                value={formData.sehir}
                onChange={(e) => handleInputChange("sehir", e.target.value)}
                placeholder={t.cityPlaceholder}
              />
            </div>

            {/* District */}
            <div className="space-y-2">
              <Label htmlFor="ilce">{t.district}</Label>
              <Input
                id="ilce"
                value={formData.ilce}
                onChange={(e) => handleInputChange("ilce", e.target.value)}
                placeholder={t.districtPlaceholder}
              />
            </div>

            {/* Departure Date */}
            <div className="space-y-2">
              <Label htmlFor="gidisTarihi">{t.departureDate}</Label>
              <Input
                id="gidisTarihi"
                type="date"
                value={formData.gidisTarihi}
                onChange={(e) =>
                  handleInputChange("gidisTarihi", e.target.value)
                }
              />
            </div>

            {/* Return Date */}
            <div className="space-y-2">
              <Label htmlFor="donusTarihi">{t.returnDate}</Label>
              <Input
                id="donusTarihi"
                type="date"
                value={formData.donusTarihi}
                onChange={(e) =>
                  handleInputChange("donusTarihi", e.target.value)
                }
              />
            </div>

            {/* Workplace */}
            <div className="space-y-2">
              <Label htmlFor="isYeri">{t.workplace}</Label>
              <Input
                id="isYeri"
                value={formData.isYeri}
                onChange={(e) => handleInputChange("isYeri", e.target.value)}
                placeholder={t.workplacePlaceholder}
              />
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label htmlFor="pozisyon">{t.position}</Label>
              <Input
                id="pozisyon"
                value={formData.pozisyon}
                onChange={(e) => handleInputChange("pozisyon", e.target.value)}
                placeholder={t.positionPlaceholder}
              />
            </div>

            {/* Passport Number */}
            <div className="space-y-2">
              <Label htmlFor="pasaportNo">{t.passportNo}</Label>
              <Input
                id="pasaportNo"
                value={formData.pasaportNo}
                onChange={(e) =>
                  handleInputChange("pasaportNo", e.target.value)
                }
                placeholder={t.passportNoPlaceholder}
              />
            </div>

            {/* Visit Reason */}
            <div className="space-y-2">
              <Label htmlFor="ziyaretSebebi">{t.visitReason}</Label>
              <Select
                value={formData.ziyaretSebebi}
                onValueChange={(value) =>
                  handleInputChange("ziyaretSebebi", value)
                }
              >
                <SelectTrigger id="ziyaretSebebi">
                  <SelectValue placeholder={t.selectReason} />
                </SelectTrigger>
                <SelectContent>
                  {visitReasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Letter Language */}
            <div className="space-y-2">
              <Label htmlFor="mektupDili">{t.letterLanguage}</Label>
              <Select
                value={formData.mektupDili}
                onValueChange={(value) =>
                  handleInputChange("mektupDili", value)
                }
              >
                <SelectTrigger id="mektupDili">
                  <SelectValue placeholder={t.selectLanguage} />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Special Notes - spans full width */}
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="ozelNotlar">{t.specialNotes}</Label>
              <Textarea
                id="ozelNotlar"
                value={formData.ozelNotlar}
                onChange={(e) =>
                  handleInputChange("ozelNotlar", e.target.value)
                }
                placeholder={t.specialNotesPlaceholder}
                rows={3}
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-6">
            <Button onClick={handleGenerate} disabled={isGenerating} size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.generating}
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-4 w-4" />
                  {t.generate}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Letter Result */}
      {generatedLetter && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t.result}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      {t.copied}
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" />
                      {t.copy}
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="mr-1 h-4 w-4" />
                  {t.print}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30 p-6">
              <p className="whitespace-pre-wrap text-sm leading-relaxed font-serif">
                {generatedLetter}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
