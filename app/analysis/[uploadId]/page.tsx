import { redirect } from "next/navigation";

// The analysis now lives in the dashboard's "Latest analysis" panel. Old links (for example in
// emails sent earlier) land there.
export default function AnalysisRedirect(): never {
  redirect("/dashboard");
}
