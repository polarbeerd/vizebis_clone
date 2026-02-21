"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PortalFormFieldsClient } from "../portal-form-fields/portal-form-fields-client";
import { CountriesClient } from "../countries/countries-client";
import { VisaTypesClient } from "../visa-types/visa-types-client";
import type { CountryOption, VisaTypeOption, CountryRow, VisaTypeRow } from "./page";
import type { FieldDefinition } from "@/components/portal-form-fields/field-definition-form";
import type { SmartTemplate } from "@/components/portal-form-fields/field-assignment-view";

interface PortalSetupClientProps {
  countriesActive: CountryOption[];
  countriesAll: CountryRow[];
  visaTypesActive: VisaTypeOption[];
  visaTypesAll: VisaTypeRow[];
  definitions: FieldDefinition[];
  smartTemplates: SmartTemplate[];
}

export function PortalSetupClient({
  countriesActive,
  countriesAll,
  visaTypesActive,
  visaTypesAll,
  definitions,
  smartTemplates,
}: PortalSetupClientProps) {
  const t = useTranslations("nav");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("portalGroup")}</h1>

      <Tabs defaultValue="form-fields">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="form-fields">{t("portalFormFields")}</TabsTrigger>
          <TabsTrigger value="reference-data">{t("countriesAndVisaTypes")}</TabsTrigger>
        </TabsList>

        <TabsContent value="form-fields" className="mt-4">
          <PortalFormFieldsClient
            definitions={definitions}
            countries={countriesActive}
            smartTemplates={smartTemplates}
            visaTypes={visaTypesActive}
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
