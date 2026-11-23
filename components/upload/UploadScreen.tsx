"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Trash2, Upload } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { UploadTitleSection } from "./UploadTitleSection";
import { FileDropzone } from "./FileDropzone";
import { UploadedFileCardSkeleton } from "@/components/ui/Skeleton";
import { UploadedFileCard } from "./UploadedFileCard";
import { FileValidationCard } from "./FileValidationCard";
import { DataPreviewTable } from "./DataPreviewTable";
import { SecurityInspectionPanel } from "./SecurityInspectionPanel";
import { BackendUploadResultPanel } from "./BackendUploadResultPanel";
import {
  BackendUploadResponse,
  FileSecurityInspection,
  ParsedFileData,
  SecurityCheckId,
  SecurityCheckStatus,
  ValidationItem,
} from "@/types/upload";
import { validateSelectedFile } from "@/lib/upload/file-validator";
import { parseDatasetFile } from "@/lib/upload/file-parser";
import {
  createInspectionFailure,
  finalizeInspection,
  inspectFileSecurity,
} from "@/lib/upload/file-security-inspector";
import { UPLOAD_SECURITY_CONFIG } from "@/lib/upload/security-config";
import { uploadDataset, UploadApiError } from "@/lib/upload/upload-service";

interface UploadScreenProps {
  userEmail?: string;
  userName?: string;
  creditBalance: number;
  onLogout?: () => void;
  /** Called once an accepted upload hands off to mapping, so the parent can discard this screen. */
  onAccepted?: () => void;
}

const DEFAULT_VALIDATION_ITEMS: ValidationItem[] = [
  {
    id: "format",
    label: `File format supported (${UPLOAD_SECURITY_CONFIG.allowedExtensions.map((extension) => `.${extension}`).join(", ")})`,
    passed: false,
  },
  { id: "size", label: `File size within limit (Max ${UPLOAD_SECURITY_CONFIG.maxFileSizeMb} MB)`, passed: false },
  { id: "readable", label: "File structure validated", passed: false },
  { id: "preview", label: "Data preview available", passed: false },
];

interface ProcessedFileCache {
  file: File;
  parsedData: ParsedFileData | null;
  validationItems: ValidationItem[];
  inspection: FileSecurityInspection;
  errorMessage: string | null;
}

export function UploadScreen({
  userEmail,
  userName,
  creditBalance,
  onLogout,
  onAccepted,
}: UploadScreenProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedFileRef = useRef<ProcessedFileCache | null>(null);
  const inspectionRunRef = useRef(0);
  const uploadControllerRef = useRef<AbortController | null>(null);

  const [parsedData, setParsedData] = useState<ParsedFileData | null>(null);
  const [validationItems, setValidationItems] = useState<ValidationItem[]>(DEFAULT_VALIDATION_ITEMS);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inspection, setInspection] = useState<FileSecurityInspection | null>(null);
  const [hasSelectedFile, setHasSelectedFile] = useState(false);
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const [backendWarningsAcknowledged, setBackendWarningsAcknowledged] = useState(false);
  const [backendUpload, setBackendUpload] = useState<BackendUploadResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadErrorFindings, setUploadErrorFindings] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [datasetCacheSaved, setDatasetCacheSaved] = useState(false);

  const clearSavedDataset = () => {
    try {
      sessionStorage.removeItem("xempla_current_dataset");
    } catch {
      setUploadError("Could not clear the previous browser preview. Refresh before selecting another file.");
    }
  };

  const handleFileSelected = async (file: File) => {
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
    setIsUploading(false);
    setBackendUpload(null);
    setBackendWarningsAcknowledged(false);
    setUploadError(null);
    setUploadErrorFindings([]);
    setUploadProgress(0);
    setDatasetCacheSaved(false);
    const requestId = ++inspectionRunRef.current;
    const cached = processedFileRef.current;
    setHasSelectedFile(true);
    setErrorMessage(null);
    setWarningsAcknowledged(false);
    clearSavedDataset();
    setIsValidating(true);

    if (cached?.file === file) {
      setParsedData(cached.parsedData);
      setValidationItems(cached.validationItems);
      setInspection(cached.inspection);
      setErrorMessage(cached.errorMessage);
      setIsValidating(false);
      return;
    }

    setParsedData(null);
    setInspection(null);
    const quickCheck = validateSelectedFile(file);
    let activeInspection: FileSecurityInspection | null = null;
    let activeItems = quickCheck.items;
    setValidationItems(quickCheck.items);

    try {
      let nextInspection = await inspectFileSecurity(file);
      if (requestId !== inspectionRunRef.current) return;
      activeInspection = nextInspection;
      setInspection(nextInspection);

      const blockingCheck = nextInspection.checks.find(
        (check) => check.mandatory && check.status === "blocked",
      );
      if (blockingCheck) {
        const message = blockingCheck.details;
        const checks = nextInspection.checks.map((check) =>
          check.id === "structure" && check.status === "not_inspected"
            ? {
                ...check,
                status: "not_inspected" as SecurityCheckStatus,
                details: "Not inspected because an earlier mandatory check failed.",
              }
            : check,
        );
        nextInspection = { ...nextInspection, checks, outcome: "blocked" };
        const failedItems = quickCheck.items.map((item) =>
          item.id === "readable" || item.id === "preview"
            ? { ...item, message: "Not inspected because file security validation failed." }
            : item,
        );
        activeInspection = nextInspection;
        activeItems = failedItems;
        setInspection(nextInspection);
        setValidationItems(failedItems);
        setErrorMessage(message);
        processedFileRef.current = {
          file,
          parsedData: null,
          validationItems: failedItems,
          inspection: nextInspection,
          errorMessage: message,
        };
        return;
      }

      const parseResult = await parseDatasetFile(file);
      if (requestId !== inspectionRunRef.current) return;
      const nextItems = parseResult.items;
      activeItems = nextItems;
      const updates: Partial<Record<SecurityCheckId, { status: SecurityCheckStatus; details: string }>> = {
        structure: parseResult.data
          ? {
              status: "passed",
              details: "The local parser validated the workbook structure and record layout.",
            }
          : {
              status: "blocked",
              details: parseResult.error || "The local parser could not validate the file structure.",
            },
      };

      if (nextInspection.fileType === "csv") {
        if (!parseResult.data) {
          updates.csv = {
            status: "blocked",
            details: parseResult.error || "CSV content structure could not be validated.",
          };
        } else if (parseResult.contentFindings?.formulaLikeValues || parseResult.contentFindings?.oversizedFields) {
          const findings = [
            parseResult.contentFindings.formulaLikeValues
              ? "Formula-like cell values were found; they are treated as untrusted text and are not executed."
              : null,
            parseResult.contentFindings.oversizedFields
              ? "One or more CSV fields exceed 1 MiB and may be unusually large."
              : null,
          ].filter((finding): finding is string => finding !== null);
          updates.csv = { status: "warning", details: findings.join(" ") };
        } else {
          updates.csv = {
            status: "passed",
            details: "CSV quoting and record widths are consistent; no formula-like values or unusually long fields were found.",
          };
        }
      }

      nextInspection = finalizeInspection(nextInspection, updates);
      activeInspection = nextInspection;

      if (parseResult.data) {
        setParsedData(parseResult.data);
      } else {
        setParsedData(null);
        setErrorMessage(parseResult.error || "Could not validate this file's structure.");
      }
      setValidationItems(nextItems);
      setInspection(nextInspection);
      processedFileRef.current = {
        file,
        parsedData: parseResult.data,
        validationItems: nextItems,
        inspection: nextInspection,
        errorMessage: parseResult.data ? null : parseResult.error || "Could not validate this file's structure.",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error reading dataset.";
      if (requestId !== inspectionRunRef.current) return;
      const failedInspection = activeInspection
        ? finalizeInspection(activeInspection, {
            structure: { status: "blocked", details: msg },
            ...(activeInspection.fileType === "csv"
              ? { csv: { status: "blocked" as const, details: msg } }
              : {}),
          })
        : createInspectionFailure(msg);
      setInspection(failedInspection);
      setErrorMessage(msg);
      setParsedData(null);
      processedFileRef.current = {
        file,
        parsedData: null,
        validationItems: activeItems,
        inspection: failedInspection,
        errorMessage: msg,
      };
    } finally {
      if (requestId === inspectionRunRef.current) setIsValidating(false);
    }
  };

  const handleRemoveFile = () => {
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
    inspectionRunRef.current += 1;
    processedFileRef.current = null;
    setParsedData(null);
    setErrorMessage(null);
    setValidationItems(DEFAULT_VALIDATION_ITEMS);
    setInspection(null);
    setHasSelectedFile(false);
    setWarningsAcknowledged(false);
    setBackendWarningsAcknowledged(false);
    setBackendUpload(null);
    setUploadError(null);
    setUploadErrorFindings([]);
    setUploadProgress(0);
    setIsUploading(false);
    setDatasetCacheSaved(false);
    setIsValidating(false);
    clearSavedDataset();
  };

  const handleReplaceFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleFileSelected(file);
    event.target.value = "";
  };

  const isReadyForUpload = Boolean(
    parsedData &&
      !isValidating &&
      inspection &&
      inspection.outcome !== "blocked" &&
      (inspection.outcome !== "warning" || warningsAcknowledged) &&
      validationItems.length > 0 &&
      validationItems.every((item) => item.passed)
  );

  const handleContinueToMapping = async () => {
    if (isValidating || isUploading || !isReadyForUpload || !parsedData) return;
    if (backendUpload) {
      if (
        backendUpload.validation_status === "warning" &&
        !backendWarningsAcknowledged
      ) {
        return;
      }
      if (!datasetCacheSaved) return;
      router.push("/mapping");
      onAccepted?.();
      return;
    }

    const selectedFile = processedFileRef.current?.file;
    if (!selectedFile || selectedFile.name !== parsedData.fileName) return;
    const controller = new AbortController();
    uploadControllerRef.current = controller;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadErrorFindings([]);

    try {
      const upload = await uploadDataset(selectedFile, {
        signal: controller.signal,
        onProgress: setUploadProgress,
      });
      if (upload.validation_status !== "passed" && upload.validation_status !== "warning") {
        throw new UploadApiError(
          "The backend did not confirm an accepted validation status.",
          200,
          upload.security_findings,
        );
      }
      setBackendUpload(upload);
      setBackendWarningsAcknowledged(upload.validation_status === "passed");

      try {
        const datasetPayload = {
          fileName: upload.original_filename,
          fileSize: upload.file_size,
          formattedSize: parsedData.formattedSize,
          fileType: upload.detected_file_type,
          headers: upload.preview?.columns?.length
            ? upload.preview.columns.map((c) => c.name)
            : parsedData.headers,
          rowCount: upload.preview?.total_rows ?? parsedData.rowCount,
          columnCount: upload.preview?.total_columns ?? parsedData.columnCount,
          previewRows: upload.preview?.preview_rows ?? parsedData.rows,
          columns: upload.preview?.columns ?? null,
          sheetName: upload.preview?.sheet_name ?? null,
          backendUploadId: upload.upload_id,
          backendValidationStatus: upload.validation_status,
          backendSecurityFindings: upload.security_findings,
        };
        sessionStorage.setItem(
          "xempla_current_dataset",
          JSON.stringify(datasetPayload),
        );
        setDatasetCacheSaved(true);
        // Clean pass: skip the extra "Continue" click. Warnings still need acknowledgement.
        if (upload.validation_status === "passed") {
          setIsRedirecting(true);
          router.push("/mapping");
          onAccepted?.();
        }
      } catch {
        setDatasetCacheSaved(false);
        setUploadError(
          "The backend accepted the file, but this browser could not save the local preview. Remove the file and try again.",
        );
      }
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      if (error instanceof UploadApiError) {
        setUploadError(error.message);
        setUploadErrorFindings(error.findings);
      } else {
        setUploadError("The upload could not be completed. Please try again.");
      }
    } finally {
      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
        setIsUploading(false);
      }
    }
  };

  const isBusy = isValidating || isUploading || isRedirecting;
  const canContinueToMapping = Boolean(
    backendUpload &&
      datasetCacheSaved &&
      (backendUpload.validation_status !== "warning" ||
        backendWarningsAcknowledged),
  );
  const isContinueButtonEnabled = Boolean(
    isReadyForUpload &&
      !isBusy &&
      (!backendUpload || canContinueToMapping),
  );

  return (
    <DashboardShell
      current="upload"
      userEmail={userEmail ?? ""}
      userName={userName}
      creditBalance={creditBalance}
      onLogout={onLogout ?? (() => {})}
    >
      <div
        className={`flex w-full flex-1 flex-col ${
          hasSelectedFile ? "lg:h-[calc(100dvh-76px-1.5rem)] lg:min-h-0 lg:overflow-hidden" : ""
        }`}
      >
        <UploadTitleSection />

        <div
          className={`grid min-w-0 flex-1 items-stretch gap-5 lg:gap-6 ${
            hasSelectedFile
              ? "lg:min-h-0 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:grid-rows-[minmax(0,1fr)]"
              : ""
          }`}
        >
          {!hasSelectedFile && (
            <FileDropzone onFileSelected={handleFileSelected} disabled={isBusy} />
          )}

          {hasSelectedFile && (
            <section className="flex min-w-0 flex-col gap-5 rounded-3xl bg-white p-4 sm:p-6 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
              <h2 className="text-xl font-medium tracking-tight text-app-ink">File details</h2>
              {parsedData || !isBusy ? (
                <UploadedFileCard data={parsedData} backendUpload={backendUpload} />
              ) : (
                <UploadedFileCardSkeleton />
              )}

              <FileValidationCard
                items={validationItems}
                isValidating={isBusy}
                hasFile={hasSelectedFile}
                error={errorMessage}
              />
              <>
                <SecurityInspectionPanel inspection={inspection} isInspecting={isBusy && !isUploading} />
                {isUploading && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl border border-app-line bg-app-canvas p-3 text-xs text-app-muted"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-[#191c1f]">
                        {uploadProgress < 100
                          ? `Uploading your file (${uploadProgress}%)…`
                          : "Preparing your preview…"}
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="File upload progress"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={uploadProgress}
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-app-line"
                    >
                      {uploadProgress < 100 ? (
                        <div
                          className="h-full rounded-full bg-app-accent transition-[width] duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      ) : (
                        <div className="h-full w-full rounded-full bg-app-accent" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-app-muted">
                      {uploadProgress < 100
                        ? "Uploading the original file."
                        : "Checking the file and preparing its preview."}
                    </p>
                  </div>
                )}
                {backendUpload && (
                  <BackendUploadResultPanel upload={backendUpload} />
                )}
                {backendUpload?.validation_status === "warning" && (
                  <label className="flex items-start gap-2 text-xs leading-5 text-[#3a3d40]">
                    <input
                      type="checkbox"
                      checked={backendWarningsAcknowledged}
                      onChange={(event) =>
                        setBackendWarningsAcknowledged(event.target.checked)
                      }
                      disabled={isBusy}
                      className="mt-1 accent-app-accent"
                    />
                    I reviewed the backend findings and want to continue.
                  </label>
                )}
                {uploadError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#e23b4a]/20 bg-[#e23b4a]/5 p-3 text-xs leading-5 text-[#8b0000]"
                  >
                    <p>{uploadError}</p>
                    {uploadErrorFindings.length > 0 && (
                      <ul className="mt-2 list-inside list-disc space-y-1">
                        {uploadErrorFindings.slice(0, 3).map((finding) => (
                          <li key={finding}>{finding}</li>
                        ))}
                        {uploadErrorFindings.length > 3 && (
                          <li>
                            {uploadErrorFindings.length - 3} additional finding(s) were reported.
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
                {backendUpload && !datasetCacheSaved && (
                  <p role="alert" className="text-xs leading-5 text-[#8b0000]">
                    The upload is quarantined by the backend, but the local mapping preview could not be saved.
                  </p>
                )}
                {inspection?.outcome === "warning" && (
                  <label className="flex items-start gap-2 text-xs leading-5 text-[#3a3d40]">
                    <input
                      type="checkbox"
                      checked={warningsAcknowledged}
                      onChange={(event) => setWarningsAcknowledged(event.target.checked)}
                      disabled={isBusy}
                      className="mt-1 accent-app-accent"
                    />
                    I reviewed the inspection warnings and want to continue.
                  </label>
                )}
              </>
            </section>
          )}

          {hasSelectedFile && (
            <section className="flex min-w-0 flex-col gap-4 rounded-3xl bg-white p-4 sm:p-6 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-medium tracking-tight text-app-ink">Data preview</h2>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={UPLOAD_SECURITY_CONFIG.allowedExtensions.map((extension) => `.${extension}`).join(",")}
                    onChange={handleReplaceFile}
                    className="hidden"
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBusy}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-app-canvas px-5 text-sm font-semibold text-app-ink transition-colors hover:bg-app-line active:bg-app-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Upload aria-hidden="true" className="h-4 w-4" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    disabled={isBusy}
                    aria-label="Remove uploaded file"
                    title="Remove uploaded file"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-app-canvas text-app-muted transition-colors hover:bg-[#fff1f2] hover:text-[#e23b4a] active:bg-[#ffe4e6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <DataPreviewTable
                data={parsedData}
                backendPreview={backendUpload?.preview ?? null}
                isLoading={isValidating}
                showQuickOverview={hasSelectedFile}
              />
            </section>
          )}
        </div>

        {hasSelectedFile && (
          <div className="mt-6 flex w-full justify-end lg:mt-4 lg:shrink-0">
            <button
              type="button"
              onClick={() => void handleContinueToMapping()}
              disabled={!isContinueButtonEnabled}
              className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent sm:w-auto ${
                isContinueButtonEnabled
                  ? "cursor-pointer bg-black text-white hover:bg-app-ink active:bg-black"
                  : "cursor-not-allowed bg-white text-app-muted"
              }`}
            >
              <span>
                {isRedirecting
                  ? "Opening mapping…"
                  : isUploading
                  ? uploadProgress < 100
                    ? `Uploading ${uploadProgress}%`
                    : "Validating upload…"
                  : backendUpload
                    ? "Continue to mapping"
                    : "Upload and validate"}
              </span>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
