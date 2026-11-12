export type SupportedFileType = "csv" | "xls" | "xlsx";

export interface ParsedFileData {
  file: File;
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
