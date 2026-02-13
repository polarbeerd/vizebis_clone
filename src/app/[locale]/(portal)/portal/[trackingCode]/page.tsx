import { lookupApplication } from "../actions";
import { StatusClient } from "./status-client";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ trackingCode: string; locale: string }>;
}

export default async function StatusPage({ params }: Props) {
  const { trackingCode, locale } = await params;
  const { data, error } = await lookupApplication(trackingCode);

  if (error || !data) {
    redirect(`/${locale === "tr" ? "" : locale + "/"}portal`);
  }

  return <StatusClient application={data} />;
}
