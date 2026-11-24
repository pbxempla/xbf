"use client";

import { useParams } from "next/navigation";
import { ReportPage } from "@/components/reports/ReportPage";

/** A report for one specific upload, chosen from History. */
export function ReportRoute() {
  const { uploadId } = useParams<{ uploadId: string }>();
  return <ReportPage forUploadId={uploadId} />;
}
