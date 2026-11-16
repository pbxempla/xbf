import { FileParseResult, ParsedFileData, SupportedFileType, ValidationItem } from "@/types/upload";
import { formatFileSize, getFileExtension } from "./file-validator";
import { UPLOAD_SECURITY_CONFIG } from "./security-config";
import { XlsxWorkerResponse } from "./xlsx-worker-protocol";
import { parseCsvFile } from "./csv-file-parser";

export type ParseResult = FileParseResult;

/**
 * Parses a CSV or Excel file and extracts headers, row/column counts,
 * and the first 10 rows for immediate preview. CSV rows are processed in
 * chunks so the complete row set is not retained in browser memory.
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
      label: `File size within limit (${formattedSize} / ${UPLOAD_SECURITY_CONFIG.maxFileSizeMb} MB)`,
      passed: true,
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
        { id: "readable", label: "File structure validated", passed: false, message: errorMsg },
        { id: "preview", label: "Data preview available", passed: false },
      ],
      error: errorMsg,
    };
  }
}

async function parseExcelFile(
  file: File,
  ext: SupportedFileType,
  formattedSize: string,
  baseItems: ValidationItem[]
): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workerResult = await parseXlsxInWorker(arrayBuffer);
  if (!workerResult.ok) throw new Error(workerResult.error);

  const data: ParsedFileData = {
    fileName: file.name,
    fileSize: file.size,
    formattedSize,
    fileType: ext,
    headers: workerResult.headers,
    rows: workerResult.rows,
    rowCount: workerResult.rowCount,
    columnCount: workerResult.columnCount,
  };

  const validatedItems: ValidationItem[] = [
    baseItems[0],
    baseItems[1],
    { id: "readable", label: "File structure validated", passed: true },
    { id: "preview", label: "Data preview available", passed: true },
  ];

  return {
    data,
    items: validatedItems,
    contentFindings: {
      formulaLikeValues: workerResult.formulaLikeValues,
      oversizedFields: workerResult.oversizedFields,
    },
  };
}

function parseXlsxInWorker(buffer: ArrayBuffer): Promise<XlsxWorkerResponse> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./xlsx-parser.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<XlsxWorkerResponse>) => {
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "The Excel parsing worker failed."));
    };
    worker.postMessage(buffer, [buffer]);
  });
}
