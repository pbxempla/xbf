import { SupportedFileType, ValidationItem } from "@/types/upload";

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const SUPPORTED_EXTENSIONS: SupportedFileType[] = ["csv", "xls", "xlsx"];

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formatted = (bytes / Math.pow(k, i)).toFixed(1);
  return `${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].toLowerCase();
}

export function isSupportedFileType(extension: string): extension is SupportedFileType {
  return SUPPORTED_EXTENSIONS.includes(extension as SupportedFileType);
}

export interface QuickValidationResult {
  isValid: boolean;
  fileType: SupportedFileType | null;
  items: ValidationItem[];
  error?: string;
}

export function validateSelectedFile(file: File): QuickValidationResult {
  const ext = getFileExtension(file.name);
  const isTypeSupported = isSupportedFileType(ext);
  const isSizeWithinLimit = file.size > 0 && file.size <= MAX_FILE_SIZE_BYTES;
  const formattedSize = formatFileSize(file.size);

  const items: ValidationItem[] = [
    {
      id: "format",
      label: isTypeSupported
        ? `File format supported (.${ext})`
        : `File format supported (.csv, .xls, .xlsx)`,
      passed: isTypeSupported,
      message: isTypeSupported
        ? undefined
        : `Unsupported file format. Please upload a .csv, .xls, or .xlsx file.`,
    },
    {
      id: "size",
      label: isSizeWithinLimit
        ? `File size within limit (${formattedSize} / 100 MB)`
        : `File size within limit (Max 100 MB)`,
      passed: isSizeWithinLimit,
      message:
        file.size === 0
          ? "The selected file is empty (0 bytes)."
          : file.size > MAX_FILE_SIZE_BYTES
          ? `File size exceeds 100 MB limit (${formattedSize}).`
          : undefined,
    },
    {
      id: "readable",
      label: "File is readable",
      passed: false, // Updated after parsing
    },
    {
      id: "preview",
      label: "Data preview available",
      passed: false, // Updated after parsing
    },
  ];

  const hasImmediateError = !isTypeSupported || !isSizeWithinLimit;

  return {
    isValid: !hasImmediateError,
    fileType: isTypeSupported ? (ext as SupportedFileType) : null,
    items,
    error: items.find((i) => !i.passed)?.message,
  };
}
