"use client";

import React, { useRef, useState } from "react";
import { FolderOpen, UploadCloud } from "lucide-react";
import { UPLOAD_SECURITY_CONFIG } from "@/lib/upload/security-config";

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFileSelected, disabled }: FileDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const acceptedExtensions = UPLOAD_SECURITY_CONFIG.allowedExtensions
    .map((extension) => `.${extension}`)
    .join(",");

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    if (!disabled && event.dataTransfer.files.length > 0) {
      onFileSelected(event.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
    event.target.value = "";
  };

  return (
    <div
      role="region"
      aria-label="Upload a dataset"
      aria-busy={disabled}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-3xl border border-dashed px-5 py-8 text-center transition-colors sm:min-h-[320px] lg:min-h-[360px] lg:py-10 ${
        isDragOver
          ? "border-app-accent bg-app-accent-wash ring-2 ring-app-accent/15"
          : "border-app-ink/25 bg-white hover:border-app-ink"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedExtensions}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-app-canvas text-app-ink">
        <UploadCloud aria-hidden="true" className="h-7 w-7 stroke-[1.6]" />
      </div>

      <h2 className="text-xl font-medium tracking-tight text-app-ink sm:text-2xl">
        Choose a facility data file
      </h2>
      <p className="mt-2 text-sm text-app-muted">Drop it here, or browse your device.</p>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white transition-colors hover:bg-app-ink active:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:bg-app-muted"
      >
        <FolderOpen aria-hidden="true" className="h-4 w-4" />
        Browse files
      </button>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs">
        {UPLOAD_SECURITY_CONFIG.allowedExtensions.map((extension) => (
          <span
            key={extension}
            className="rounded-full bg-app-canvas px-3 py-1.5 font-medium text-app-ink"
          >
            {extension.toUpperCase()}
          </span>
        ))}
        <span className="px-1 text-app-muted">
          Up to {UPLOAD_SECURITY_CONFIG.maxFileSizeMb} MB
        </span>
      </div>
    </div>
  );
}
