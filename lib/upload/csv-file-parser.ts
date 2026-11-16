import Papa from "papaparse";
import { FileParseResult, ParsedFileData, SupportedFileType, ValidationItem } from "@/types/upload";
import { inspectCsvRows } from "./csv-content-inspection";

const PREVIEW_ROW_LIMIT = 10;
const CSV_PARSE_CHUNK_BYTES = 1024 * 1024;

export function parseCsvFile(
  file: File,
  ext: SupportedFileType,
  formattedSize: string,
  baseItems: ValidationItem[],
): Promise<FileParseResult> {
  return new Promise((resolve) => {
    const previewRows: Record<string, unknown>[] = [];
    let headers: string[] = [];
    let rowCount = 0;
    let parseError: string | undefined;
    let formulaLikeValues = false;
    let oversizedFields = false;

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      worker: true,
      chunkSize: CSV_PARSE_CHUNK_BYTES,
      chunk: (results) => {
        headers = results.meta.fields || headers;
        const structuralError = results.errors.find((error) => error.code !== "UndetectableDelimiter");
        if (structuralError && !parseError) {
          parseError = structuralError.message || "Malformed CSV structure.";
        }

        const findings = inspectCsvRows(results.data);
        formulaLikeValues ||= findings.formulaLikeValues;
        oversizedFields ||= findings.oversizedFields;
        for (const row of results.data) {
          rowCount += 1;
          if (previewRows.length < PREVIEW_ROW_LIMIT) previewRows.push(row);
        }
      },
      complete: () => {
        if (parseError) {
          resolve({
            data: null,
            items: [
              baseItems[0],
              baseItems[1],
              {
                id: "readable",
                label: "File structure validated",
                passed: false,
                message: parseError,
              },
              { id: "preview", label: "Data preview available", passed: false },
            ],
            error: `CSV structure validation failed: ${parseError}`,
          });
          return;
        }

        const columnCount = headers.length;
        if (rowCount === 0 && columnCount === 0) {
          resolve({
            data: null,
            items: [
              baseItems[0],
              baseItems[1],
              {
                id: "readable",
                label: "File structure validated",
                passed: false,
                message: "The CSV file contains no data rows or columns.",
              },
              { id: "preview", label: "Data preview available", passed: false },
            ],
            error: "The CSV file contains no data rows or columns.",
          });
          return;
        }

        const data: ParsedFileData = {
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
          { id: "readable", label: "File structure validated", passed: true },
          { id: "preview", label: "Data preview available", passed: true },
        ];

        resolve({
          data,
          items: validatedItems,
          contentFindings: { formulaLikeValues, oversizedFields },
        });
      },
      error: (error) => {
        resolve({
          data: null,
          items: [
            baseItems[0],
            baseItems[1],
            {
              id: "readable",
              label: "File structure validated",
              passed: false,
              message: error.message,
            },
            { id: "preview", label: "Data preview available", passed: false },
          ],
          error: error.message,
        });
      },
    });
  });
}
