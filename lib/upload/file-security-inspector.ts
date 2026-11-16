import {
  FileSecurityInspection,
  SecurityCheck,
  SecurityCheckId,
  SecurityCheckStatus,
  SecurityOutcome,
  SupportedFileType,
} from "@/types/upload";
import { getFileExtension } from "./file-validator";
import { UPLOAD_SECURITY_CONFIG } from "./security-config";

const CSV_SCAN_CHUNK_BYTES = 64 * 1024;
const MAX_ZIP_DIRECTORY_BYTES = 4 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 20_000;
const MAX_INSPECTED_XML_COMPRESSED_BYTES = 128 * 1024;
const MAX_INSPECTED_XML_BYTES = 512 * 1024;
const MAX_ZIP_EXPANSION_BYTES = 512 * 1024 * 1024;
const MAX_ZIP_ENTRY_EXPANSION_BYTES = 256 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 200;

interface ZipEntry {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
  localHeaderOffset: number;
}

function makeCheck(
  id: SecurityCheckId,
  label: string,
  status: SecurityCheckStatus,
  details: string,
  mandatory: boolean,
): SecurityCheck {
  return { id, label, status, details, mandatory };
}

function calculateOutcome(checks: SecurityCheck[]): SecurityOutcome {
  if (checks.some((check) => check.mandatory && ["blocked", "not_inspected"].includes(check.status))) {
    return "blocked";
  }
  if (checks.some((check) => check.status === "warning" || check.status === "not_inspected")) {
    return "warning";
  }
  return "passed";
}

export function updateSecurityCheck(
  inspection: FileSecurityInspection,
  id: SecurityCheckId,
  status: SecurityCheckStatus,
  details: string,
): FileSecurityInspection {
  const checks = inspection.checks.map((check) =>
    check.id === id ? { ...check, status, details } : check,
  );
  return { ...inspection, checks, outcome: calculateOutcome(checks) };
}

export function createInspectionFailure(message: string): FileSecurityInspection {
  const checks = createInitialChecks(null).map((check) => ({
    ...check,
    status: "not_inspected" as const,
    details: check.id === "structure" ? message : "Not inspected because local inspection failed.",
  }));
  return { fileType: null, checks, outcome: "blocked" };
}

function isMimeAccepted(file: File, fileType: SupportedFileType): boolean {
  const mimeType = file.type.trim().toLowerCase().split(";", 1)[0].trim();
  if (!mimeType) return true;

  const accepted: Record<SupportedFileType, string[]> = {
    csv: ["text/csv", "text/plain", "application/csv", "application/vnd.ms-excel"],
    xls: ["application/vnd.ms-excel", "application/x-ole-storage", "application/octet-stream"],
    xlsx: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip",
      "application/octet-stream",
    ],
  };
  return accepted[fileType].includes(mimeType);
}

function decodeXmlCharacterReferences(value: string): string {
  return value.replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (entity, hexadecimal: string, decimal: string) => {
    const codePoint = Number.parseInt(hexadecimal || decimal, hexadecimal ? 16 : 10);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : entity;
  });
}

function createInitialChecks(fileType: SupportedFileType | null): SecurityCheck[] {
  return [
    makeCheck("extension", "File extension validation", "not_inspected", "Not inspected.", true),
    makeCheck("signature", "File signature validation", "not_inspected", "Not inspected.", true),
    makeCheck("size", "File size validation", "not_inspected", "Not inspected.", true),
    makeCheck("structure", "File structure validation", "not_inspected", "Not inspected.", true),
    makeCheck(
      "macro",
      "Macro inspection",
      fileType === "csv" ? "not_applicable" : "not_inspected",
      fileType === "csv"
        ? "Macros do not apply to CSV files."
        : fileType === "xls"
          ? "Legacy XLS macros cannot be reliably enumerated by this browser check."
          : "Not inspected.",
      fileType === "xlsx",
    ),
    makeCheck(
      "external",
      "External relationship inspection",
      fileType === "xlsx" ? "not_inspected" : "not_applicable",
      fileType === "xlsx"
        ? "Not inspected."
        : "External workbook relationships do not apply to this format.",
      fileType === "xlsx",
    ),
    makeCheck(
      "archive",
      "Suspicious archive inspection",
      fileType === "xlsx" ? "not_inspected" : "not_applicable",
      fileType === "xlsx"
        ? "Not inspected."
        : "Archive inspection does not apply to this format.",
      fileType === "xlsx",
    ),
    makeCheck(
      "csv",
      "CSV content inspection",
      fileType === "csv" ? "not_inspected" : "not_applicable",
      fileType === "csv" ? "Not inspected." : "CSV content checks do not apply to this format.",
      fileType === "csv",
    ),
  ];
}

export async function inspectFileSecurity(file: File): Promise<FileSecurityInspection> {
  const extension = getFileExtension(file.name);
  const fileType = (["csv", "xls", "xlsx"] as const).find((type) => type === extension) ?? null;
  let inspection: FileSecurityInspection = {
    fileType,
    checks: createInitialChecks(fileType),
    outcome: "blocked",
  };
  const allowed = fileType !== null && UPLOAD_SECURITY_CONFIG.allowedExtensions.includes(fileType);
  inspection = updateSecurityCheck(
    inspection,
    "extension",
    allowed ? "passed" : "blocked",
    allowed
      ? `The .${fileType} extension is configured as an allowed format.`
      : `The .${extension || "(missing)"} extension is not allowed. Configured formats: ${UPLOAD_SECURITY_CONFIG.allowedExtensions.map((type) => `.${type}`).join(", ")}.`,
  );

  const sizePassed = file.size > 0 && file.size <= UPLOAD_SECURITY_CONFIG.maxFileSizeBytes;
  inspection = updateSecurityCheck(
    inspection,
    "size",
    sizePassed ? "passed" : "blocked",
    file.size === 0
      ? "The selected file is empty."
      : file.size > UPLOAD_SECURITY_CONFIG.maxFileSizeBytes
        ? `File exceeds the maximum allowed size of ${UPLOAD_SECURITY_CONFIG.maxFileSizeMb} MB.`
        : `${(file.size / (1024 * 1024)).toFixed(2)} MB; configured maximum is ${UPLOAD_SECURITY_CONFIG.maxFileSizeMb} MB.`,
  );

  if (!allowed || !sizePassed || fileType === null) {
    return { ...inspection, outcome: calculateOutcome(inspection.checks) };
  }

  if (!isMimeAccepted(file, fileType)) {
    inspection = updateSecurityCheck(
      inspection,
      "signature",
      "blocked",
      `The browser-reported MIME type "${file.type}" does not match the .${fileType} format.`,
    );
    return { ...inspection, outcome: calculateOutcome(inspection.checks) };
  }

  try {
    if (fileType === "csv") {
      const csvScan = await inspectCsvBytes(file);
      inspection = updateSecurityCheck(
        inspection,
        "signature",
        csvScan.ok ? "passed" : "blocked",
        csvScan.message,
      );
    } else if (fileType === "xls") {
      const signatureScan = await inspectXlsHeader(file);
      inspection = updateSecurityCheck(
        inspection,
        "signature",
        signatureScan.ok ? "passed" : "blocked",
        signatureScan.message,
      );
      if (signatureScan.ok) {
        inspection = updateSecurityCheck(
          inspection,
          "structure",
          "not_inspected",
          "OLE Compound File header is present; workbook structure will be checked by the local parser.",
        );
      }
    } else {
      const zipInspection = await inspectXlsxArchive(file);
      inspection = updateSecurityCheck(
        inspection,
        "signature",
        zipInspection.ok ? "passed" : "blocked",
        zipInspection.message,
      );
      if (zipInspection.ok) {
        inspection = updateSecurityCheck(
          inspection,
          "structure",
          zipInspection.hasWorkbookStructure ? "passed" : "blocked",
          zipInspection.hasWorkbookStructure
            ? "ZIP central directory and required XLSX workbook entries are present."
            : "The archive is missing required XLSX workbook entries.",
        );
        inspection = updateSecurityCheck(
          inspection,
          "archive",
          zipInspection.archiveStatus,
          zipInspection.archiveDetails,
        );
        inspection = updateSecurityCheck(
          inspection,
          "macro",
          zipInspection.macroStatus,
          zipInspection.macroDetails,
        );
        inspection = updateSecurityCheck(
          inspection,
          "external",
          zipInspection.externalStatus,
          zipInspection.externalDetails,
        );
      } else {
        inspection = updateSecurityCheck(
          inspection,
          "structure",
          "blocked",
          zipInspection.message,
        );
        inspection = updateSecurityCheck(inspection, "archive", "blocked", zipInspection.message);
        inspection = updateSecurityCheck(inspection, "macro", "not_inspected", "Archive structure could not be inspected.");
        inspection = updateSecurityCheck(inspection, "external", "not_inspected", "Archive structure could not be inspected.");
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "The browser could not inspect this file.";
    inspection = updateSecurityCheck(inspection, "signature", "blocked", message);
    inspection = updateSecurityCheck(inspection, "structure", "blocked", "Inspection failed before workbook structure could be validated.");
  }

  return { ...inspection, outcome: calculateOutcome(inspection.checks) };
}

async function inspectCsvBytes(file: File): Promise<{ ok: boolean; message: string }> {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let prefix = "";
  for (let offset = 0; offset < file.size; offset += CSV_SCAN_CHUNK_BYTES) {
    const bytes = new Uint8Array(
      await file.slice(offset, Math.min(offset + CSV_SCAN_CHUNK_BYTES, file.size)).arrayBuffer(),
    );
    for (const byte of bytes) {
      if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) || byte === 127) {
        return { ok: false, message: "Binary or unsupported control bytes were found in the CSV." };
      }
    }
    const text = decoder.decode(bytes, { stream: offset + bytes.length < file.size });
    if (prefix.length < 512) prefix += text.slice(0, 512 - prefix.length);
  }
  decoder.decode();
  if (/^\uFEFF?\s*(?:<!doctype\s+html|<html\b|<script\b|<\?xml)/i.test(prefix)) {
    return { ok: false, message: "The file begins with HTML/XML content, not a CSV record structure." };
  }
  return {
    ok: true,
    message: "CSV contains valid UTF-8 text without unexpected binary control bytes. CSV structure is checked separately.",
  };
}

async function inspectXlsHeader(file: File): Promise<{ ok: boolean; message: string }> {
  if (file.size < 512) {
    return { ok: false, message: "The file is too short to contain a valid OLE Compound File." };
  }
  const header = new DataView(await file.slice(0, 512).arrayBuffer());
  const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  if (signature.some((byte, index) => header.getUint8(index) !== byte)) {
    return { ok: false, message: "The file does not have the OLE Compound File signature required for XLS." };
  }
  const byteOrder = header.getUint16(28, true);
  const sectorShift = header.getUint16(30, true);
  const miniSectorShift = header.getUint16(32, true);
  const fatSectorCount = header.getUint32(44, true);
  if (byteOrder !== 0xfffe || ![9, 12].includes(sectorShift) || miniSectorShift !== 6) {
    return { ok: false, message: "The OLE Compound File header contains invalid sector metadata." };
  }
  const sectorSize = 1 << sectorShift;
  if (fatSectorCount > Math.floor(file.size / sectorSize)) {
    return { ok: false, message: "The OLE Compound File FAT metadata exceeds the file bounds." };
  }
  return {
    ok: true,
    message: "OLE Compound File signature and basic header metadata are valid; legacy workbook internals are checked by the local parser.",
  };
}

async function inspectXlsxArchive(
  file: File,
): Promise<
  | {
      ok: true;
      message: string;
      hasWorkbookStructure: boolean;
      archiveStatus: SecurityCheckStatus;
      archiveDetails: string;
      macroStatus: SecurityCheckStatus;
      macroDetails: string;
      externalStatus: SecurityCheckStatus;
      externalDetails: string;
    }
  | { ok: false; message: string }
> {
  const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (
    signature.length < 4 ||
    signature[0] !== 0x50 ||
    signature[1] !== 0x4b ||
    signature[2] !== 0x03 ||
    signature[3] !== 0x04
  ) {
    return { ok: false, message: "The file does not have a ZIP signature required for XLSX." };
  }

  const zipResult = await readZipDirectory(file);
  if (!zipResult.ok) return zipResult;

  const names = new Set(zipResult.entries.map((entry) => entry.name.toLowerCase()));
  const hasWorkbookStructure =
    names.has("[content_types].xml") && names.has("xl/workbook.xml");
  const hasMacroEntry = names.has("xl/vbaproject.bin");
  const hasEmbeddedContent = zipResult.suspiciousArchiveDetails.length > 0;
  const contentTypes = zipResult.entries.find((entry) => entry.name.toLowerCase() === "[content_types].xml");
  let macroStatus: SecurityCheckStatus = "not_inspected";
  let macroDetails = "Macro metadata could not be inspected.";

  if (hasMacroEntry) {
    macroStatus = "blocked";
    macroDetails = "The archive contains xl/vbaProject.bin; macro-enabled workbook content is not accepted.";
  } else if (contentTypes) {
    const xml = await readZipEntryText(file, contentTypes);
    if (xml === null) {
      macroStatus = "not_inspected";
      macroDetails = "The workbook content-type metadata could not be safely inspected.";
    } else if (/macroEnabled|vbaProject/i.test(decodeXmlCharacterReferences(xml))) {
      macroStatus = "blocked";
      macroDetails = "Macro-enabled workbook content was declared in the archive.";
    } else {
      macroStatus = "passed";
      macroDetails = "No VBA project or macro-enabled workbook content was found in the inspected package metadata.";
    }
  }

  const relationshipEntries = zipResult.entries.filter((entry) => entry.name.toLowerCase().endsWith(".rels"));
  let externalStatus: SecurityCheckStatus = "passed";
  let externalDetails = "Inspected workbook relationships; none declare an external target.";
  if (relationshipEntries.length > 128) {
    externalStatus = "not_inspected";
    externalDetails = "The workbook contains too many relationship parts for bounded browser inspection.";
  } else {
    for (const entry of relationshipEntries) {
      const xml = await readZipEntryText(file, entry);
      if (xml === null) {
        externalStatus = "not_inspected";
        externalDetails = "At least one relationship part could not be safely inspected.";
        break;
      }
      const hasExternalTarget = [...xml.matchAll(/\bTargetMode\s*=\s*(["'])(.*?)\1/gi)].some(
        (match) => decodeXmlCharacterReferences(match[2]).trim().toLowerCase() === "external",
      );
      if (hasExternalTarget) {
        externalStatus = "warning";
        externalDetails = "One or more workbook relationships reference external targets; review before proceeding.";
        break;
      }
    }
  }

  let archiveStatus: SecurityCheckStatus = "passed";
  let archiveDetails = "ZIP entry names and archive bounds passed inspection.";
  if (hasEmbeddedContent) {
    archiveStatus = "blocked";
    archiveDetails = zipResult.suspiciousArchiveDetails.join(" ");
  } else if (zipResult.archiveWarnings.length > 0) {
    archiveStatus = "warning";
    archiveDetails = zipResult.archiveWarnings.join(" ");
  }

  return {
    ok: true,
    message: "ZIP signature and central directory are readable.",
    hasWorkbookStructure,
    archiveStatus,
    archiveDetails,
    macroStatus,
    macroDetails,
    externalStatus,
    externalDetails,
  };
}

async function readZipDirectory(
  file: File,
): Promise<{ ok: true; entries: ZipEntry[]; suspiciousArchiveDetails: string[]; archiveWarnings: string[] } | { ok: false; message: string }> {
  const tailOffset = Math.max(0, file.size - 65_557);
  const tail = new Uint8Array(await file.slice(tailOffset).arrayBuffer());
  const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let eocdOffset = -1;
  for (let offset = tail.length - 22; offset >= 0; offset -= 1) {
    if (tailView.getUint32(offset, true) === 0x06054b50) {
      const commentLength = tailView.getUint16(offset + 20, true);
      if (offset + 22 + commentLength === tail.length) {
        eocdOffset = offset;
        break;
      }
    }
  }
  if (eocdOffset < 0) return { ok: false, message: "The ZIP end-of-central-directory record is missing or malformed." };

  const diskNumber = tailView.getUint16(eocdOffset + 4, true);
  const centralDisk = tailView.getUint16(eocdOffset + 6, true);
  const diskEntries = tailView.getUint16(eocdOffset + 8, true);
  const entryCount = tailView.getUint16(eocdOffset + 10, true);
  const centralSize = tailView.getUint32(eocdOffset + 12, true);
  const centralOffset = tailView.getUint32(eocdOffset + 16, true);
  const eocdAbsoluteOffset = tailOffset + eocdOffset;
  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    diskEntries !== entryCount ||
    entryCount === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff
  ) {
    return { ok: false, message: "Multi-disk or ZIP64 workbook archives are not supported by bounded browser inspection." };
  }
  if (entryCount > MAX_ZIP_ENTRIES || centralSize > MAX_ZIP_DIRECTORY_BYTES) {
    return { ok: false, message: "The ZIP central directory exceeds safe browser inspection limits." };
  }
  if (centralOffset + centralSize > eocdAbsoluteOffset || centralOffset + centralSize > file.size) {
    return { ok: false, message: "The ZIP central directory points outside the file." };
  }

  const central = new Uint8Array(
    await file.slice(centralOffset, centralOffset + centralSize).arrayBuffer(),
  );
  const view = new DataView(central.buffer, central.byteOffset, central.byteLength);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const entries: ZipEntry[] = [];
  const suspiciousArchiveDetails: string[] = [];
  const archiveWarnings: string[] = [];
  const addSuspicious = (message: string) => {
    if (suspiciousArchiveDetails.length < 20) suspiciousArchiveDetails.push(message);
    else if (suspiciousArchiveDetails.length === 20) {
      suspiciousArchiveDetails.push("Additional suspicious ZIP entries were omitted from this report.");
    }
  };
  const addWarning = (message: string) => {
    if (archiveWarnings.length < 20) archiveWarnings.push(message);
    else if (archiveWarnings.length === 20) {
      archiveWarnings.push("Additional ZIP expansion warnings were omitted from this report.");
    }
  };
  let totalUncompressed = 0;
  let offset = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > central.length || view.getUint32(offset, true) !== 0x02014b50) {
      return { ok: false, message: "A ZIP central directory entry is malformed." };
    }
    const flags = view.getUint16(offset + 8, true);
    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const entryEnd = offset + 46 + fileNameLength + extraLength + commentLength;
    if (entryEnd > central.length || fileNameLength === 0) {
      return { ok: false, message: "A ZIP entry name or metadata is malformed." };
    }
    let name: string;
    try {
      name = decoder.decode(central.slice(offset + 46, offset + 46 + fileNameLength));
    } catch {
      return { ok: false, message: "A ZIP entry name is not valid UTF-8." };
    }
    const normalizedName = name.replaceAll("\\", "/");
    if (
      normalizedName.startsWith("/") ||
      normalizedName.includes("\0") ||
      normalizedName.split("/").some((part) => part === "..") ||
      /^[a-z]:/i.test(normalizedName)
    ) {
      addSuspicious(`Unsafe ZIP entry path detected: ${name}.`);
    }
    if ((flags & 1) !== 0) {
      addSuspicious(`Encrypted ZIP entry is not accepted: ${name}.`);
    }
    if (![0, 8].includes(compressionMethod)) {
      addSuspicious(`Unsupported compression method in ZIP entry: ${name}.`);
    }
    if (localHeaderOffset + 30 > file.size || compressedSize > file.size) {
      return { ok: false, message: `ZIP entry data exceeds file bounds: ${name}.` };
    }
    const lowerName = normalizedName.toLowerCase();
    if (
      lowerName.startsWith("xl/embeddings/") ||
      lowerName.startsWith("xl/activex/") ||
      /\.(exe|dll|js|html?|bat|cmd|ps1|vbs)$/i.test(lowerName)
    ) {
      addSuspicious(`Embedded or executable-like content is not accepted: ${name}.`);
    }
    if (uncompressedSize > MAX_ZIP_ENTRY_EXPANSION_BYTES) {
      addSuspicious(`ZIP entry exceeds the safe expansion limit: ${name}.`);
    } else if (
      compressedSize === 0
        ? uncompressedSize > 0
        : uncompressedSize / compressedSize > MAX_COMPRESSION_RATIO
    ) {
      addWarning(`Unusual expansion ratio detected in ${name}.`);
    }
    totalUncompressed += uncompressedSize;
    if (
      totalUncompressed > MAX_ZIP_EXPANSION_BYTES &&
      !suspiciousArchiveDetails.some((detail) => detail.includes("512 MiB"))
    ) {
      addSuspicious("The archive declares more than 512 MiB of expanded content.");
    }

    entries.push({
      name: normalizedName,
      compressedSize,
      uncompressedSize,
      compressionMethod,
      localHeaderOffset,
    });
    offset = entryEnd;
  }
  if (offset !== central.length) {
    return { ok: false, message: "The ZIP central directory contains unexpected trailing data." };
  }
  return { ok: true, entries, suspiciousArchiveDetails, archiveWarnings };
}

async function readZipEntryText(file: File, entry: ZipEntry): Promise<string | null> {
  if (
    entry.compressedSize > MAX_INSPECTED_XML_COMPRESSED_BYTES ||
    entry.uncompressedSize > MAX_INSPECTED_XML_BYTES ||
    entry.localHeaderOffset + 30 > file.size
  ) {
    return null;
  }
  const header = new DataView(await file.slice(entry.localHeaderOffset, entry.localHeaderOffset + 30).arrayBuffer());
  if (header.getUint32(0, true) !== 0x04034b50) return null;
  const nameLength = header.getUint16(26, true);
  const extraLength = header.getUint16(28, true);
  const dataOffset = entry.localHeaderOffset + 30 + nameLength + extraLength;
  if (dataOffset + entry.compressedSize > file.size) return null;
  const compressed = new Uint8Array(
    await file.slice(dataOffset, dataOffset + entry.compressedSize).arrayBuffer(),
  );

  try {
    let bytes: Uint8Array;
    if (entry.compressionMethod === 0) {
      bytes = compressed;
    } else if (entry.compressionMethod === 8 && typeof DecompressionStream !== "undefined") {
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_INSPECTED_XML_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
      bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
    } else {
      return null;
    }
    if (bytes.byteLength !== entry.uncompressedSize) return null;
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function finalizeInspection(
  inspection: FileSecurityInspection,
  updates: Partial<Record<SecurityCheckId, { status: SecurityCheckStatus; details: string }>>,
): FileSecurityInspection {
  let finalized = inspection;
  for (const [id, update] of Object.entries(updates) as [SecurityCheckId, { status: SecurityCheckStatus; details: string }][]) {
    finalized = updateSecurityCheck(finalized, id, update.status, update.details);
  }
  return finalized;
}
