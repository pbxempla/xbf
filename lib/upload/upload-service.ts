import {
  BackendUploadCheck,
  BackendUploadPreview,
  BackendUploadResponse,
  PreviewColumn,
  SecurityCheckStatus,
  SecurityOutcome,
  SupportedFileType,
} from "@/types/upload";

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

export interface UploadOptions {
  onProgress?: UploadProgressCallback;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class UploadApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly findings: string[] = [],
  ) {
    super(message);
    this.name = "UploadApiError";
  }
}

export const DEFAULT_UPLOAD_TIMEOUT_MS = 120_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function parseFindings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((finding): finding is string => typeof finding === "string")
    : [];
}

function parseCheck(value: unknown): BackendUploadCheck | null {
  if (
    !isRecord(value) ||
    typeof value.check !== "string" ||
    typeof value.message !== "string" ||
    ![
      "passed",
      "warning",
      "blocked",
      "not_applicable",
      "not_inspected",
    ].includes(String(value.status))
  ) {
    return null;
  }
  return {
    check: value.check,
    message: value.message,
    status: value.status as SecurityCheckStatus,
  };
}

function parsePreview(value: unknown): BackendUploadPreview | null {
  if (!isRecord(value)) return null;
  if (value.status !== "ready" && value.status !== "failed") return null;
  if (!Array.isArray(value.columns) || !Array.isArray(value.preview_rows)) return null;
  if (
    typeof value.preview_row_count !== "number" ||
    typeof value.total_rows !== "number" ||
    typeof value.total_columns !== "number"
  ) {
    return null;
  }
  const columns: PreviewColumn[] = [];
  for (const item of value.columns) {
    if (
      !isRecord(item) ||
      typeof item.index !== "number" ||
      typeof item.name !== "string" ||
      typeof item.detected_type !== "string"
    ) {
      return null;
    }
    columns.push({
      index: item.index,
      name: item.name,
      detected_type: item.detected_type,
      original_name: typeof item.original_name === "string" ? item.original_name : null,
    });
  }
  return {
    status: value.status,
    sheet_name: typeof value.sheet_name === "string" ? value.sheet_name : null,
    columns,
    preview_rows: value.preview_rows as unknown[][],
    preview_row_count: value.preview_row_count,
    total_rows: value.total_rows,
    total_columns: value.total_columns,
  };
}

function parseUploadResponse(
  value: unknown,
  file: File,
): BackendUploadResponse | null {
  if (!isRecord(value) || !isRecord(value.validation_report)) return null;
  const report = value.validation_report;
  const checks = Array.isArray(report.checks)
    ? report.checks.map(parseCheck)
    : null;
  const detectedFileType = value.detected_file_type;
  const validationStatus = value.validation_status;
  const reportStatus = report.status;
  if (
    typeof value.upload_id !== "string" ||
    typeof value.original_filename !== "string" ||
    typeof value.file_size !== "number" ||
    !Number.isSafeInteger(value.file_size) ||
    value.file_size !== file.size ||
    (detectedFileType !== "csv" &&
      detectedFileType !== "xls" &&
      detectedFileType !== "xlsx") ||
    typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/i.test(value.sha256) ||
    (validationStatus !== "passed" && validationStatus !== "warning") ||
    reportStatus !== validationStatus ||
    value.quarantine_status !== "quarantined" ||
    !Array.isArray(value.security_findings) ||
    !value.security_findings.every((finding) => typeof finding === "string") ||
    !checks ||
    checks.some((check) => check === null) ||
    !Array.isArray(report.findings) ||
    !report.findings.every((finding) => typeof finding === "string") ||
    typeof value.created_at !== "string"
  ) {
    return null;
  }
  const fileType = detectedFileType as SupportedFileType;
  if (!file.name.toLowerCase().endsWith(`.${fileType}`)) return null;
  const typedChecks = checks as BackendUploadCheck[];
  if (
    validationStatus === "passed" &&
    typedChecks.some((check) =>
      ["warning", "blocked", "not_inspected"].includes(check.status),
    )
  ) {
    return null;
  }
  if (
    validationStatus === "warning" &&
    !typedChecks.some((check) =>
      ["warning", "not_inspected"].includes(check.status),
    )
  ) {
    return null;
  }
  const preview = value.preview
    ? parsePreview(value.preview)
    : {
        status: "ready" as const,
        sheet_name: null,
        columns: [],
        preview_rows: [],
        preview_row_count: 0,
        total_rows: 0,
        total_columns: 0,
      };
  if (!preview) return null;

  return {
    upload_id: value.upload_id,
    original_filename: value.original_filename,
    file_size: value.file_size,
    detected_file_type: fileType,
    sha256: value.sha256,
    validation_status: validationStatus,
    security_findings: parseFindings(value.security_findings),
    validation_report: {
      status: reportStatus as SecurityOutcome,
      checks: typedChecks,
      findings: parseFindings(report.findings),
    },
    quarantine_status: "quarantined",
    created_at: value.created_at,
    preview,
  };
}

function messageForStatus(status: number): string {
  if (status === 401 || status === 403) {
    return "Your session is no longer authorized. Sign in again before uploading.";
  }
  if (status === 413) return "The backend rejected the file because it exceeds the upload size limit.";
  if (status === 415) return "The backend does not accept this file format.";
  if (status === 422) return "The backend rejected the file during security or structure validation.";
  if (status === 429) return "Too many upload attempts. Please wait a moment and try again.";
  if (status >= 500) return "The upload service is temporarily unavailable. Please try again later.";
  return "The upload request could not be completed.";
}

function findingsFromError(value: unknown): string[] {
  if (!isRecord(value) || !isRecord(value.detail)) return [];
  const validationReport = value.detail.validation_report;
  if (!isRecord(validationReport)) return [];
  const reportFindings = parseFindings(validationReport.findings);
  if (reportFindings.length > 0) return reportFindings;
  if (!Array.isArray(validationReport.checks)) return [];
  return validationReport.checks.flatMap((item) => {
    const check = parseCheck(item);
    return check && check.status === "blocked" ? [check.message] : [];
  });
}

export function uploadDataset(
  file: File,
  options: UploadOptions = {},
): Promise<BackendUploadResponse> {
  const { onProgress, signal, timeoutMs = DEFAULT_UPLOAD_TIMEOUT_MS } = options;
  if (signal?.aborted) {
    return Promise.reject(new UploadApiError("Upload canceled.", 0));
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file, file.name);
    xhr.open("POST", "/api/backend/uploads");
    xhr.withCredentials = true;
    xhr.timeout = timeoutMs;

    const removeAbortListener = () => signal?.removeEventListener("abort", abortRequest);
    const abortRequest = () => xhr.abort();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    });
    xhr.addEventListener("load", () => {
      removeAbortListener();
      let responseBody: unknown = null;
      try {
        responseBody = JSON.parse(xhr.responseText);
      } catch {
        responseBody = null;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new UploadApiError(
            messageForStatus(xhr.status),
            xhr.status,
            findingsFromError(responseBody),
          ),
        );
        return;
      }

      const upload = parseUploadResponse(responseBody, file);
      if (!upload) {
        reject(
          new UploadApiError(
            "The backend response did not confirm an accepted, quarantined upload.",
            xhr.status,
          ),
        );
        return;
      }
      onProgress?.(100);
      resolve(upload);
    });
    xhr.addEventListener("error", () => {
      removeAbortListener();
      reject(new UploadApiError("A network error interrupted the upload.", 0));
    });
    xhr.addEventListener("timeout", () => {
      removeAbortListener();
      reject(new UploadApiError("The upload timed out. Please try again.", 0));
    });
    xhr.addEventListener("abort", () => {
      removeAbortListener();
      reject(new UploadApiError("Upload canceled.", 0));
    });

    signal?.addEventListener("abort", abortRequest, { once: true });
    xhr.send(formData);
  });
}
