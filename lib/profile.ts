import type { PrimaryRole } from "@/types/auth";

export const ROLE_OPTIONS: Array<{ value: PrimaryRole; label: string; hint: string }> = [
  { value: "fm_provider", label: "FM provider", hint: "Account or contract manager" },
  { value: "bid_manager", label: "Bid manager", hint: "Pricing tenders from job history" },
  { value: "asset_owner", label: "Estates / asset owner", hint: "Reviewing provider performance" },
  { value: "operations_manager", label: "Operations manager", hint: "Service delivery and callouts" },
  { value: "compliance_lead", label: "Compliance lead", hint: "Audit and assurance" },
];
