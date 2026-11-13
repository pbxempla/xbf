"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { UploadHeader } from "./UploadHeader";
import { UploadTitleSection } from "./UploadTitleSection";
import { FileDropzone } from "./FileDropzone";
import { UploadedFileCard } from "./UploadedFileCard";
import { FileValidationCard } from "./FileValidationCard";
import { DataPreviewTable } from "./DataPreviewTable";
import { ParsedFileData, ValidationItem } from "@/types/upload";
import { validateSelectedFile } from "@/lib/upload/file-validator";
import { parseDatasetFile } from "@/lib/upload/file-parser";

interface UploadScreenProps {
  userEmail?: string;
  userName?: string;
  emailType?: "personal" | "work";
  creditBalance?: number;
  onLogout?: () => void;
}

const DEFAULT_VALIDATION_ITEMS: ValidationItem[] = [
  { id: "format", label: "File format supported (CSV, XLS, XLSX)", passed: false },
  { id: "size", label: "File size within limit (Max 100 MB)", passed: false },
  { id: "readable", label: "File is readable", passed: false },
  { id: "preview", label: "Data preview available", passed: false },
];

export function UploadScreen({
  userEmail,
  userName,
  emailType,
  creditBalance,
  onLogout,
}: UploadScreenProps) {
  const router = useRouter();

  const [parsedData, setParsedData] = useState<ParsedFileData | null>(null);
  const [validationItems, setValidationItems] = useState<ValidationItem[]>(DEFAULT_VALIDATION_ITEMS);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    setErrorMessage(null);
    setIsValidating(true);

    const quickCheck = validateSelectedFile(file);
    setValidationItems(quickCheck.items);

    if (!quickCheck.isValid) {
      setIsValidating(false);
      setErrorMessage(quickCheck.error || "File validation failed.");
      setParsedData(null);
      return;
    }

    try {
      const parseResult = await parseDatasetFile(file);
      setValidationItems(parseResult.items);

      if (parseResult.data) {
        setParsedData(parseResult.data);
      } else {
        setParsedData(null);
        setErrorMessage(parseResult.error || "Could not read data from file.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error reading dataset.";
      setErrorMessage(msg);
      setParsedData(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveFile = () => {
    setParsedData(null);
    setErrorMessage(null);
    setValidationItems(DEFAULT_VALIDATION_ITEMS);
  };

  const isReadyToContinue = Boolean(
    parsedData &&
      validationItems.length > 0 &&
      validationItems.every((item) => item.passed)
  );

  const handleContinueToMapping = () => {
    if (!isReadyToContinue || !parsedData) return;

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          "xempla_current_dataset",
          JSON.stringify({
            fileName: parsedData.fileName,
            fileSize: parsedData.fileSize,
            formattedSize: parsedData.formattedSize,
            fileType: parsedData.fileType,
            headers: parsedData.headers,
            rowCount: parsedData.rowCount,
            columnCount: parsedData.columnCount,
            previewRows: parsedData.rows,
          })
        );
      } catch {
        // Ignore quota errors if dataset preview is large
      }
    }

    router.push("/mapping");
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-white text-[#191c1f]">
      <UploadHeader
        userEmail={userEmail}
        userName={userName}
        emailType={emailType}
        creditBalance={creditBalance}
        onLogout={onLogout}
      />

      <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <UploadTitleSection />

        <div className="grid flex-1 items-stretch gap-5 lg:grid-cols-[1.05fr_.95fr] lg:gap-7">
          <FileDropzone onFileSelected={handleFileSelected} disabled={isValidating} />

          <section className="flex min-h-[520px] flex-col gap-6 rounded-[20px] border border-[#e2e2e7] bg-white p-5 sm:p-6 lg:p-7">
            <h2 className="text-xl font-medium tracking-tight text-[#191c1f]">Dataset details</h2>
            <UploadedFileCard
              data={parsedData}
              onRemove={handleRemoveFile}
              disabled={isValidating}
            />

            <FileValidationCard
              items={validationItems}
              isValidating={isValidating}
              hasFile={Boolean(parsedData || errorMessage)}
              error={errorMessage}
            />
            <DataPreviewTable
              data={parsedData}
              isLoading={isValidating}
            />
          </section>
        </div>

        <div className="mt-6 flex w-full flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-xs leading-5 text-[#5c5e60]">
            Next step: map your columns to Xempla fields.
          </p>
          <button
            type="button"
            onClick={handleContinueToMapping}
            disabled={!isReadyToContinue}
            className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf] sm:w-auto ${
              isReadyToContinue
                ? "cursor-pointer bg-black text-white hover:bg-[#191c1f]"
                : "cursor-not-allowed border border-[#e2e2e7] bg-[#f4f4f4] text-[#8d969e]"
            }`}
          >
            <span>Continue to mapping</span>
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
