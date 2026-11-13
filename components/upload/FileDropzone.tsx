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

  const triggerBrowse = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  return (
    <div
      role="region"
      aria-label="Upload a dataset"
      aria-busy={disabled}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerBrowse}
      className={`flex min-h-[340px] flex-1 cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed px-5 py-10 text-center transition-colors sm:min-h-[380px] lg:min-h-0 lg:py-6 ${
        isDragOver
          ? "border-[#494fdf] bg-[#f4f4f4] ring-2 ring-[#494fdf]/15"
          : "border-[#c9c9cd] bg-white hover:border-[#191c1f] hover:bg-[#f4f4f4]"
      } ${disabled ? "cursor-wait opacity-60" : ""}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedExtensions}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f4f4] text-[#191c1f]">
        <UploadCloud aria-hidden="true" className="h-7 w-7 stroke-[1.6]" />
      </div>

      <h2 className="text-xl font-medium tracking-tight text-[#191c1f] sm:text-2xl">
        Drop your file here
      </h2>
      <p className="mt-2 text-sm text-[#505a63]">or choose one from your device</p>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          triggerBrowse();
        }}
        disabled={disabled}
        className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white transition-colors hover:bg-[#191c1f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FolderOpen aria-hidden="true" className="h-4 w-4" />
        Browse files
      </button>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs">
        {UPLOAD_SECURITY_CONFIG.allowedExtensions.map((extension) => (
          <span
            key={extension}
            className="rounded-full border border-[#e2e2e7] px-3 py-1.5 font-medium text-[#3a3d40]"
          >
            {extension.toUpperCase()}
          </span>
        ))}
        <span className="px-1 text-[#8d969e]">
          Up to {UPLOAD_SECURITY_CONFIG.maxFileSizeMb} MB
        </span>
      </div>
    </div>
  );
}
