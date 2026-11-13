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
import { BackgroundDecorations } from "./BackgroundDecorations";
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
  { id: "format", label: "File format supported (.xlsx)", passed: false },
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
    <div className="min-h-screen lg:h-screen lg:max-h-screen w-full bg-linear-to-br from-[#FAF8FF] via-[#F4F1FF] to-[#ECE7FE] flex flex-col justify-between overflow-y-auto lg:overflow-hidden relative select-none">
      {/* 3D Floating Pillows & Wave Background Decoration */}
      <BackgroundDecorations />

      {/* Top Header */}
      <UploadHeader
        userEmail={userEmail}
        userName={userName}
        emailType={emailType}
        creditBalance={creditBalance}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 w-full px-6 sm:px-8 lg:px-10 pt-2 sm:pt-3 pb-3 sm:pb-4 flex flex-col justify-between z-10">
        {/* Page Heading on Upper Left */}
        <UploadTitleSection />

        {/* 50% / 50% Two-Column Layout */}
        <div className="flex-1 min-h-0 w-full flex flex-col lg:flex-row gap-5 lg:gap-6 items-stretch mb-2.5">
          {/* Left Column (~50% width): Upload Dropzone with 3D Purple Folder */}
          <div className="w-full lg:w-[50%] flex flex-col min-h-0">
            <FileDropzone
              onFileSelected={handleFileSelected}
              disabled={isValidating}
            />
          </div>

          {/* Right Column (~50% width): White Card holding File Details, Validation, Preview */}
          <div className="w-full lg:w-[50%] bg-white rounded-3xl p-4 sm:p-5 border border-[#E6E1FF] shadow-xs flex flex-col gap-3 min-h-0 justify-between">
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
          </div>
        </div>

        {/* Bottom Right: Continue to Mapping Action */}
        <div className="shrink-0 w-full flex justify-end pt-1">
          <button
            type="button"
            onClick={handleContinueToMapping}
            disabled={!isReadyToContinue}
            className={`w-full sm:w-auto px-7 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              isReadyToContinue
                ? "bg-[#3024D8] hover:bg-[#251BB8] text-white active:scale-[0.99] shadow-indigo-600/25"
                : "bg-[#D8D3FB] text-[#867CC8] cursor-not-allowed shadow-none"
            }`}
          >
            <span>Continue to Mapping</span>
            <ArrowRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </main>
    </div>
  );
}
