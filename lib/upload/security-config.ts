import { SupportedFileType } from "@/types/upload";

const DEFAULT_EXTENSIONS: SupportedFileType[] = ["csv", "xls", "xlsx"];
const DEFAULT_MAX_FILE_SIZE_MB = 100;
const SUPPORTED_EXTENSIONS = new Set<SupportedFileType>(DEFAULT_EXTENSIONS);

function warn(message: string): void {
  console.warn(`[upload-security] ${message}`);
}

function parseAllowedExtensions(value: string | undefined): SupportedFileType[] {
  if (value === undefined || !value.trim()) {
    warn("NEXT_PUBLIC_ALLOWED_FILE_EXTENSIONS is missing; using .csv,.xls,.xlsx.");
    return DEFAULT_EXTENSIONS;
  }

  const parsed = value
    .split(",")
    .map((extension) => extension.trim().toLowerCase())
    .filter(Boolean);

  const valid = parsed.filter((extension): extension is `.${SupportedFileType}` => {
    if (!/^\.[a-z0-9]+$/.test(extension)) return false;
    return SUPPORTED_EXTENSIONS.has(extension.slice(1) as SupportedFileType);
  });
  const normalized = [...new Set(valid.map((extension) => extension.slice(1) as SupportedFileType))];

  if (normalized.length !== parsed.length) {
    warn("NEXT_PUBLIC_ALLOWED_FILE_EXTENSIONS contains invalid or unsupported formats; they were ignored.");
  }
  if (normalized.length === 0) {
    warn("NEXT_PUBLIC_ALLOWED_FILE_EXTENSIONS has no supported formats; using .csv,.xls,.xlsx.");
    return DEFAULT_EXTENSIONS;
  }
  return normalized;
}

function parseMaximumSize(value: string | undefined): number {
  if (value === undefined || !value.trim()) {
    warn("NEXT_PUBLIC_MAX_FILE_SIZE_MB is missing; using 100 MB.");
    return DEFAULT_MAX_FILE_SIZE_MB;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > Number.MAX_SAFE_INTEGER / (1024 * 1024)) {
    warn("NEXT_PUBLIC_MAX_FILE_SIZE_MB must be a positive number that converts safely to bytes; using 100 MB.");
    return DEFAULT_MAX_FILE_SIZE_MB;
  }
  return parsed;
}

export const UPLOAD_SECURITY_CONFIG = Object.freeze({
  allowedExtensions: Object.freeze(
    parseAllowedExtensions(process.env.NEXT_PUBLIC_ALLOWED_FILE_EXTENSIONS),
  ),
  maxFileSizeMb: parseMaximumSize(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB),
  get maxFileSizeBytes(): number {
    return Math.floor(this.maxFileSizeMb * 1024 * 1024);
  },
});
