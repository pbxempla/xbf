import { SupportedFileType, ValidationItem } from "@/types/upload";
import { UPLOAD_SECURITY_CONFIG } from "./security-config";

export const MAX_FILE_SIZE_BYTES = UPLOAD_SECURITY_CONFIG.maxFileSizeBytes;
export const SUPPORTED_EXTENSIONS = UPLOAD_SECURITY_CONFIG.allowedExtensions;

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formatted = (bytes / Math.pow(k, i)).toFixed(1);
  return `${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() || "";
  const dotIndex = basename.lastIndexOf(".");
  return dotIndex <= 0 ? "" : basename.slice(dotIndex + 1).toLowerCase();
}

export function isSupportedFileType(extension: string): extension is SupportedFileType {
  return SUPPORTED_EXTENSIONS.includes(extension.toLowerCase() as SupportedFileType);
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
  const allowedFormats = SUPPORTED_EXTENSIONS.map((extension) => `.${extension}`).join(", ");
  const maxSizeLabel = `${UPLOAD_SECURITY_CONFIG.maxFileSizeMb} MB`;

  const items: ValidationItem[] = [
    {
      id: "format",
      label: isTypeSupported
        ? `File format supported (.${ext})`
        : `File format supported (${allowedFormats})`,
      passed: isTypeSupported,
      message: isTypeSupported
        ? undefined
        : `Unsupported file format. Please upload ${allowedFormats}.`,
    },
    {
      id: "size",
      label: isSizeWithinLimit
        ? `File size within limit (${formattedSize} / ${maxSizeLabel})`
        : `File size within limit (Max ${maxSizeLabel})`,
      passed: isSizeWithinLimit,
      message:
        file.size === 0
          ? "The selected file is empty (0 bytes)."
          : file.size > MAX_FILE_SIZE_BYTES
            ? `File exceeds the maximum allowed size of ${UPLOAD_SECURITY_CONFIG.maxFileSizeMb} MB.`
            : undefined,
    },
    {
      id: "readable",
      label: "File structure validated",
      passed: false,
    },
    {
      id: "preview",
      label: "Data preview available",
      passed: false,
    },
  ];

  const isValid = isTypeSupported && isSizeWithinLimit;

  return {
    isValid,
    fileType: isTypeSupported ? (ext as SupportedFileType) : null,
    items,
    error: items.find((item) => !item.passed)?.message,
  };
}
