"use client";

import React, { useRef, useState } from "react";
import { Folder } from "lucide-react";
import { FolderUploadIllustration } from "./FolderUploadIllustration";

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFileSelected, disabled }: FileDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      onFileSelected(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      onFileSelected(selectedFile);
      e.target.value = "";
    }
  };

  const triggerBrowse = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerBrowse}
      className={`w-full flex-1 min-h-90 lg:min-h-0 bg-white/90 rounded-3xl p-4 sm:p-5 border border-[#E4E0FF] shadow-xs flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
        isDragOver
          ? "border-[#5142F5] ring-2 ring-[#5142F5]/20 bg-[#F6F3FF]"
          : "hover:border-[#C7BDFF]"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Dashed Border Inner Container matching screenshot */}
      <div className="w-full h-full border border-dashed border-[#DDD7FE] rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center">
        {/* Prominent 3D Purple Folder Upload Illustration */}
        <FolderUploadIllustration className="mb-2 sm:mb-3" />

        {/* Text labels */}
        <h3 className="text-base sm:text-lg font-bold text-[#101744] tracking-tight">
          Drag &amp; drop your file here
        </h3>
        <p className="text-xs text-[#64749A] mt-0.5 mb-4 sm:mb-5">
          or click to browse
        </p>

        {/* Browse Files Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerBrowse();
          }}
          disabled={disabled}
          className="px-6 py-2.5 rounded-xl bg-[#3024D8] hover:bg-[#251BB8] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Folder className="w-4 h-4 fill-white/20 stroke-white" />
          <span>Browse Files</span>
        </button>

        {/* Constraints Footnote */}
        <p className="text-[11px] text-[#64749A] mt-4 sm:mt-5 font-normal">
          Supports CSV, XLS, XLSX &nbsp;|&nbsp; Max file size: 100 MB
        </p>
      </div>
    </div>
  );
}
