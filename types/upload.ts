export type SupportedFileType = "csv" | "xls" | "xlsx";

export interface ParsedFileData {
  fileName: string;
  fileSize: number;
  formattedSize: string;
  fileType: SupportedFileType;
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  columnCount: number;
}

export interface ValidationItem {
  id: "format" | "size" | "readable" | "preview";
  label: string;
  passed: boolean;
  message?: string;
}

export interface FileValidationState {
  isValidating: boolean;
  isValid: boolean;
  items: ValidationItem[];
  error?: string | null;
}

export type SecurityCheckStatus =
  | "passed"
  | "warning"
  | "blocked"
  | "not_applicable"
  | "not_inspected";

export type SecurityOutcome = "passed" | "warning" | "blocked";

export type SecurityCheckId =
  | "extension"
  | "signature"
  | "size"
  | "structure"
  | "macro"
  | "external"
  | "archive"
  | "csv";

export interface SecurityCheck {
  id: SecurityCheckId;
  label: string;
  status: SecurityCheckStatus;
  details: string;
  mandatory: boolean;
}

export interface FileSecurityInspection {
  fileType: SupportedFileType | null;
  checks: SecurityCheck[];
  outcome: SecurityOutcome;
}

export interface FileContentFindings {
  formulaLikeValues: boolean;
  oversizedFields: boolean;
}

export interface FileParseResult {
  data: ParsedFileData | null;
  items: ValidationItem[];
  error?: string;
  contentFindings?: FileContentFindings;
}
