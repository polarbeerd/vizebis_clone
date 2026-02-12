import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-bold">{t("loading")}</h1>
    </div>
  );
}
