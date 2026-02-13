import { lookupApplication, getApplicationDocuments, getPortalContent } from "../actions";
import type { ApplicationDocument, PortalContentItem } from "../actions";
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

  // Fetch additional V2 data
  const { documents } = await getApplicationDocuments(trackingCode);
  const guides = data.country ? await getPortalContent(data.country, data.visa_type) : [];

  return <StatusClient application={data} documents={documents} guides={guides} />;
}
