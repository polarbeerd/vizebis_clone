import { getTranslations } from "next-intl/server";
import { AiAnalysisClient } from "./ai-analysis-client";

export default async function AiAnalysisPage() {
  const t = await getTranslations("aiAnalysis");

  return (
    <AiAnalysisClient
      translations={{
        title: t("title"),
        subtitle: t("subtitle"),
        placeholder: t("placeholder"),
        send: t("send"),
        thinking: t("thinking"),
        exampleQueries: t("exampleQueries"),
        query1: t("query1"),
        query2: t("query2"),
        query3: t("query3"),
        query4: t("query4"),
        query5: t("query5"),
        placeholderResponse: t("placeholderResponse"),
        clearChat: t("clearChat"),
      }}
    />
  );
}
