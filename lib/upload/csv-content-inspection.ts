import { FileContentFindings } from "@/types/upload";

const LONG_FIELD_WARNING_CHARACTERS = 1024 * 1024;

export function inspectCsvRows(rows: Record<string, unknown>[]): FileContentFindings {
  let formulaLikeValues = false;
  let oversizedFields = false;

  for (const row of rows) {
    for (const value of Object.values(row)) {
      if (value === null || value === undefined) continue;
      const cell = String(value);
      if (/^\s*[=+\-@]/.test(cell)) formulaLikeValues = true;
      if (cell.length > LONG_FIELD_WARNING_CHARACTERS) oversizedFields = true;
    }
  }
  return { formulaLikeValues, oversizedFields };
}
