import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations("nav");

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
    </div>
  );
}
