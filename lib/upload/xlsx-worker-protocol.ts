export interface XlsxWorkerSuccess {
  ok: true;
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  columnCount: number;
  formulaLikeValues: boolean;
  oversizedFields: boolean;
}

export interface XlsxWorkerFailure {
  ok: false;
  error: string;
}

export type XlsxWorkerResponse = XlsxWorkerSuccess | XlsxWorkerFailure;
