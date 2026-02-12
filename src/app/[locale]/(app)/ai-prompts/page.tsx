import { getTranslations } from "next-intl/server";
import { AiPromptsClient } from "./ai-prompts-client";

export default async function AiPromptsPage() {
  const t = await getTranslations("aiPrompts");
  const tCommon = await getTranslations("common");

  return (
    <AiPromptsClient
      translations={{
        title: t("title"),
        subtitle: t("subtitle"),
        addNew: t("addNew"),
        editPrompt: t("editPrompt"),
        addDescription: t("addDescription"),
        editDescription: t("editDescription"),
        searchPlaceholder: t("searchPlaceholder"),
        name: t("name"),
        promptText: t("promptText"),
        promptTextPlaceholder: t("promptTextPlaceholder"),
        variables: t("variables"),
        isActive: t("isActive"),
        inactive: t("inactive"),
        noPrompts: t("noPrompts"),
        createSuccess: t("createSuccess"),
        updateSuccess: t("updateSuccess"),
        saveError: t("saveError"),
        deleteSuccess: t("deleteSuccess"),
        deleteError: t("deleteError"),
        deleteConfirmTitle: t("deleteConfirmTitle"),
        deleteConfirmDescription: t("deleteConfirmDescription"),
        templateVariables: t("templateVariables"),
        templateVariablesDescription: t("templateVariablesDescription"),
        varFullName: t("varFullName"),
        varCountry: t("varCountry"),
        varCity: t("varCity"),
        varDate: t("varDate"),
        varCompany: t("varCompany"),
        varPassportNo: t("varPassportNo"),
        varPosition: t("varPosition"),
        varVisitReason: t("varVisitReason"),
        varDepartureDate: t("varDepartureDate"),
        varReturnDate: t("varReturnDate"),
        autoDetected: t("autoDetected"),
        save: tCommon("save"),
        cancel: tCommon("cancel"),
        delete: tCommon("delete"),
        edit: tCommon("edit"),
        actions: tCommon("actions"),
        status: tCommon("status"),
      }}
    />
  );
}
