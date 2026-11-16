import * as XLSX from "xlsx";
import { XlsxWorkerResponse } from "./xlsx-worker-protocol";

const PREVIEW_ROW_LIMIT = 10;
const LONG_FIELD_WARNING_CHARACTERS = 1024 * 1024;

self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    const workbook = XLSX.read(event.data, {
      type: "array",
      bookVBA: false,
      cellFormula: true,
    });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
    if (!worksheet || !worksheet["!ref"]) {
      throw new Error("Excel workbook contains no readable worksheet data.");
    }

    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    const cellsByRow = new Map<number, Map<number, XLSX.CellObject>>();
    for (const address in worksheet) {
      if (address.startsWith("!") || !Object.hasOwn(worksheet, address)) continue;
      const cell = worksheet[address];
      if (!cell) continue;
      const position = XLSX.utils.decode_cell(address);
      let row = cellsByRow.get(position.r);
      if (!row) {
        row = new Map<number, XLSX.CellObject>();
        cellsByRow.set(position.r, row);
      }
      row.set(position.c, cell);
    }

    const headers = Array.from(
      { length: range.e.c - range.s.c + 1 },
      (_, columnIndex) => {
        const cell = cellsByRow.get(range.s.r)?.get(range.s.c + columnIndex);
        const value = cell?.v;
        return value !== undefined && value !== null && String(value).trim() !== ""
          ? String(value).trim()
          : `Column_${columnIndex + 1}`;
      },
    );
    const rows: Record<string, unknown>[] = [];
    let rowCount = 0;
    let formulaLikeValues = false;
    let oversizedFields = false;

    for (const [rowIndex, cells] of [...cellsByRow.entries()].sort(([a], [b]) => a - b)) {
      let hasData = false;
      for (const cell of cells.values()) {
        if (typeof cell.f === "string" && cell.f.length > 0) formulaLikeValues = true;
        if (String(cell.v ?? "").length > LONG_FIELD_WARNING_CHARACTERS) oversizedFields = true;
        if ((cell.v !== undefined && cell.v !== "") || Boolean(cell.f)) hasData = true;
      }
      if (rowIndex <= range.s.r || !hasData) continue;
      rowCount += 1;
      if (rows.length < PREVIEW_ROW_LIMIT) {
        const row: Record<string, unknown> = {};
        headers.forEach((header, columnIndex) => {
          row[header] = cells.get(range.s.c + columnIndex)?.v ?? "";
        });
        rows.push(row);
      }
    }

    const result: XlsxWorkerResponse = {
      ok: true,
      headers,
      rows,
      rowCount,
      columnCount: headers.length,
      formulaLikeValues,
      oversizedFields,
    };
    self.postMessage(result);
  } catch (error) {
    const result: XlsxWorkerResponse = {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to parse the Excel workbook.",
    };
    self.postMessage(result);
  }
};
