import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ParsedFileData, SupportedFileType, ValidationItem } from "@/types/upload";
import { formatFileSize, getFileExtension } from "./file-validator";

export interface ParseResult {
  data: ParsedFileData | null;
  items: ValidationItem[];
  error?: string;
}

/**
 * Parses a CSV or Excel file and extracts headers, row/column counts,
 * and the first 5 rows for immediate preview.
 */
export async function parseDatasetFile(file: File): Promise<ParseResult> {
  const ext = getFileExtension(file.name) as SupportedFileType;
  const formattedSize = formatFileSize(file.size);

  const baseItems: ValidationItem[] = [
    {
      id: "format",
      label: `File format supported (.${ext})`,
      passed: true,
    },
    {
      id: "size",
      label: `File size within limit (${formattedSize} / 100 MB)`,
      passed: true,
    },
    {
      id: "readable",
      label: "File is readable",
      passed: false,
    },
    {
      id: "preview",
      label: "Data preview available",
      passed: false,
    },
  ];

  try {
    if (ext === "csv") {
      return await parseCsvFile(file, ext, formattedSize, baseItems);
    } else if (ext === "xls" || ext === "xlsx") {
      return await parseExcelFile(file, ext, formattedSize, baseItems);
    } else {
      throw new Error(`Unsupported file type .${ext}`);
    }
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to parse file. The file may be corrupted.";
    return {
      data: null,
      items: [
        baseItems[0],
        baseItems[1],
        { id: "readable", label: "File is readable", passed: false, message: errorMsg },
        { id: "preview", label: "Data preview available", passed: false },
      ],
      error: errorMsg,
    };
  }
}

function parseCsvFile(
  file: File,
  ext: SupportedFileType,
  formattedSize: string,
  baseItems: ValidationItem[]
): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (results.errors && results.errors.length > 0 && results.data.length === 0) {
          const firstErr = results.errors[0]?.message || "Invalid CSV format";
          resolve({
            data: null,
            items: [
              baseItems[0],
              baseItems[1],
              { id: "readable", label: "File is readable", passed: false, message: firstErr },
              { id: "preview", label: "Data preview available", passed: false },
            ],
            error: firstErr,
          });
          return;
        }

        const headers = results.meta.fields || [];
        const rows = results.data;
        const rowCount = rows.length;
        const columnCount = headers.length;

        if (rowCount === 0 && columnCount === 0) {
          resolve({
            data: null,
            items: [
              baseItems[0],
              baseItems[1],
              {
                id: "readable",
                label: "File is readable",
                passed: false,
                message: "The CSV file contains no data rows or columns.",
              },
              { id: "preview", label: "Data preview available", passed: false },
            ],
            error: "The CSV file contains no data rows or columns.",
          });
          return;
        }

        const previewRows = rows.slice(0, 5);

        const data: ParsedFileData = {
          file,
          fileName: file.name,
          fileSize: file.size,
          formattedSize,
          fileType: ext,
          headers,
          rows: previewRows,
          rowCount,
          columnCount,
        };

        const validatedItems: ValidationItem[] = [
          baseItems[0],
          baseItems[1],
          { id: "readable", label: "File is readable", passed: true },
          { id: "preview", label: "Data preview available", passed: true },
        ];

        resolve({
          data,
          items: validatedItems,
        });
      },
      error: (error) => {
        resolve({
          data: null,
          items: [
            baseItems[0],
            baseItems[1],
            { id: "readable", label: "File is readable", passed: false, message: error.message },
            { id: "preview", label: "Data preview available", passed: false },
          ],
          error: error.message,
        });
      },
    });
  });
}

async function parseExcelFile(
  file: File,
  ext: SupportedFileType,
  formattedSize: string,
  baseItems: ValidationItem[]
): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("Excel workbook contains no sheets.");
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  if (!worksheet) {
    throw new Error("Unable to read the first worksheet.");
  }

  // Convert worksheet to 2D array of rows
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("Worksheet is empty.");
  }

  const headerRow = rawRows[0] as unknown[];
  const headers = headerRow.map((h, idx) =>
    h !== undefined && h !== null && String(h).trim() !== "" ? String(h).trim() : `Column_${idx + 1}`
  );

  const dataRowsRaw = rawRows.slice(1);
  const rowCount = dataRowsRaw.length;
  const columnCount = headers.length;

  // Format first 5 rows as objects keyed by headers
  const previewRows: Record<string, unknown>[] = dataRowsRaw.slice(0, 5).map((rowArr) => {
    const rowObj: Record<string, unknown> = {};
    headers.forEach((hdr, idx) => {
      rowObj[hdr] = (rowArr as unknown[])[idx] ?? "";
    });
    return rowObj;
  });

  const data: ParsedFileData = {
    file,
    fileName: file.name,
    fileSize: file.size,
    formattedSize,
    fileType: ext,
    headers,
    rows: previewRows,
    rowCount,
    columnCount,
  };

  const validatedItems: ValidationItem[] = [
    baseItems[0],
    baseItems[1],
    { id: "readable", label: "File is readable", passed: true },
    { id: "preview", label: "Data preview available", passed: true },
  ];

  return {
    data,
    items: validatedItems,
  };
}
