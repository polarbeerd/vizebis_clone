import { lookupApplication } from "../../actions";
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

  return <UploadClient application={data} />;
}
