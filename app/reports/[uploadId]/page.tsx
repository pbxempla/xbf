import { Suspense } from "react";
import { WorkspaceSkeleton } from "@/components/ui/Skeleton";
import { ReportRoute } from "@/components/reports/ReportRoute";

export default function ReportByUploadPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton variant="reports" label="Loading your report" />}>
      <ReportRoute />
    </Suspense>
  );
}
