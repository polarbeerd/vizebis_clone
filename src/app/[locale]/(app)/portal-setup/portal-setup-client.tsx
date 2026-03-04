"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PortalFormFieldsClient } from "../portal-form-fields/portal-form-fields-client";
import { CountriesClient } from "../countries/countries-client";
import { VisaTypesClient } from "../visa-types/visa-types-client";
import { CountryGuidesClient } from "../portal-content/portal-content-client";
import type { CountryRow, VisaTypeRow, GuideRow } from "./page";
import type { FieldDefinition } from "@/components/portal-form-fields/field-definition-form";
import type { SmartTemplate } from "@/components/portal-form-fields/field-assignment-view";

interface PortalSetupClientProps {
  countriesAll: CountryRow[];
  visaTypesAll: VisaTypeRow[];
  definitions: FieldDefinition[];
  smartTemplates: SmartTemplate[];
  guideContent: GuideRow[];
  activeCountries: { id: number; name: string; flag_emoji: string | null }[];
}

export function PortalSetupClient({
  countriesAll,
  visaTypesAll,
  definitions,
  smartTemplates,
  guideContent,
  activeCountries,
}: PortalSetupClientProps) {
  const t = useTranslations("nav");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("portalGroup")}</h1>

      <Tabs defaultValue="country-guides">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="country-guides">{t("portalContent")}</TabsTrigger>
          <TabsTrigger value="form-fields">{t("portalFormFields")}</TabsTrigger>
          <TabsTrigger value="reference-data">{t("countriesAndVisaTypes")}</TabsTrigger>
        </TabsList>

        <TabsContent value="country-guides" className="mt-4">
          <CountryGuidesClient data={guideContent} countries={activeCountries} embedded />
        </TabsContent>

        <TabsContent value="form-fields" className="mt-4">
          <PortalFormFieldsClient
            definitions={definitions}
            smartTemplates={smartTemplates}
          />
        </TabsContent>

        <TabsContent value="reference-data" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <CountriesClient data={countriesAll} />
            </div>
            <div>
              <VisaTypesClient data={visaTypesAll} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
