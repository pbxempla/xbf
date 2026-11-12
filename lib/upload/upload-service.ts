import { ParsedFileData } from "@/types/upload";

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

export interface UploadResponse {
  success: boolean;
  datasetId?: string;
  message?: string;
}

/**
 * Service abstraction for dataset uploads.
 * Currently keeps file state client-side for mapping.
 * When the FastAPI backend upload endpoint is introduced, this service can be pointed to it.
 */
export async function uploadDataset(
  parsedData: ParsedFileData,
  onProgress?: UploadProgressCallback
): Promise<UploadResponse> {
  // Simulate client-side readiness
  if (onProgress) {
    onProgress(100);
  }

  return {
    success: true,
    datasetId: `local-${Date.now()}-${parsedData.fileName.replace(/[^a-zA-Z0-9]/g, "_")}`,
    message: "Dataset parsed and ready for schema mapping.",
  };
}
