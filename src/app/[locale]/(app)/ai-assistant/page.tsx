import { getTranslations } from "next-intl/server";
import { AiAssistantClient } from "./ai-assistant-client";

export default async function AiAssistantPage() {
  const t = await getTranslations("aiAssistant");

  return (
    <AiAssistantClient
      translations={{
        title: t("title"),
        subtitle: t("subtitle"),
        fullName: t("fullName"),
        country: t("country"),
        city: t("city"),
        district: t("district"),
        departureDate: t("departureDate"),
        returnDate: t("returnDate"),
        workplace: t("workplace"),
        position: t("position"),
        passportNo: t("passportNo"),
        visitReason: t("visitReason"),
        specialNotes: t("specialNotes"),
        letterLanguage: t("letterLanguage"),
        generate: t("generate"),
        generating: t("generating"),
        result: t("result"),
        copy: t("copy"),
        print: t("print"),
        copied: t("copied"),
        countryGermany: t("countryGermany"),
        countryFrance: t("countryFrance"),
        countryNetherlands: t("countryNetherlands"),
        countrySpain: t("countrySpain"),
        countryItaly: t("countryItaly"),
        reasonTourist: t("reasonTourist"),
        reasonCultural: t("reasonCultural"),
        reasonCommercial: t("reasonCommercial"),
        reasonFamily: t("reasonFamily"),
        reasonFriend: t("reasonFriend"),
        langTurkish: t("langTurkish"),
        langEnglish: t("langEnglish"),
        langGerman: t("langGerman"),
        langItalian: t("langItalian"),
        placeholderLetter: t("placeholderLetter"),
        fullNamePlaceholder: t("fullNamePlaceholder"),
        cityPlaceholder: t("cityPlaceholder"),
        districtPlaceholder: t("districtPlaceholder"),
        workplacePlaceholder: t("workplacePlaceholder"),
        positionPlaceholder: t("positionPlaceholder"),
        passportNoPlaceholder: t("passportNoPlaceholder"),
        specialNotesPlaceholder: t("specialNotesPlaceholder"),
        selectCountry: t("selectCountry"),
        selectReason: t("selectReason"),
        selectLanguage: t("selectLanguage"),
      }}
    />
  );
}
