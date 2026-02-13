import { lookupApplication, getApplicationDocuments } from "../../actions";
import type { ApplicationDocument } from "../../actions";
import { UploadClient } from "./upload-client";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ trackingCode: string; locale: string }>;
}

export default async function UploadPage({ params }: Props) {
  const { trackingCode, locale } = await params;
  const { data, error } = await lookupApplication(trackingCode);

  if (error || !data) {
    redirect(`/${locale === "tr" ? "" : locale + "/"}portal`);
  }

  const { documents } = await getApplicationDocuments(trackingCode);

  return <UploadClient application={data} documents={documents} />;
}
