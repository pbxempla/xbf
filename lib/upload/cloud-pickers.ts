import { UPLOAD_SECURITY_CONFIG } from "@/lib/upload/security-config";

/**
 * Browser-only file pickers for Google Drive (Google Picker) and Dropbox (Chooser).
 * The chosen file is downloaded into the browser and then goes through the exact same
 * inspection, preview and upload flow as a file picked from the device. Access tokens are
 * kept in memory only for the single download and are never stored or sent to our servers.
 * All NEXT_PUBLIC_* values below are public identifiers, not secrets.
 */

// Referenced literally so Next.js can inline them at build time.
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY?.trim() ?? "";
const GOOGLE_APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID?.trim() ?? "";
const DROPBOX_APP_KEY = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY?.trim() ?? "";

export const cloudPickerAvailability = {
  google: Boolean(GOOGLE_CLIENT_ID && GOOGLE_API_KEY && GOOGLE_APP_ID),
  dropbox: Boolean(DROPBOX_APP_KEY),
};

/** An error whose message is safe to show to the user. */
export class CloudPickerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudPickerError";
  }
}

const EXTENSIONS = UPLOAD_SECURITY_CONFIG.allowedExtensions.map((extension) => `.${extension}`);
const MAX_BYTES = UPLOAD_SECURITY_CONFIG.maxFileSizeBytes;
const MAX_MB = UPLOAD_SECURITY_CONFIG.maxFileSizeMb;

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const PICKER_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  XLSX_MIME,
  GOOGLE_SHEET_MIME,
].join(",");

/* ------------------------------------------------------------------ */
/* Script loading                                                      */
/* ------------------------------------------------------------------ */

const scriptCache = new Map<string, Promise<void>>();

function loadScript(src: string, attributes: Record<string, string> = {}): Promise<void> {
  const cached = scriptCache.get(src);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
    script.onload = () => resolve();
    script.onerror = () => {
      scriptCache.delete(src);
      script.remove();
      reject(
        new CloudPickerError(
          `Could not load the file picker from ${new URL(src).hostname}. Check your connection, and make sure a firewall, proxy or ad blocker is not blocking that site.`,
        ),
      );
    };
    document.head.appendChild(script);
  });
  scriptCache.set(src, promise);
  return promise;
}

/* ------------------------------------------------------------------ */
/* Minimal typings for the third-party globals                         */
/* ------------------------------------------------------------------ */

interface GooglePickerDoc {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
}
interface GooglePickerResponse {
  action: string;
  docs?: GooglePickerDoc[];
}
interface GoogleDocsView {
  setMimeTypes(mimeTypes: string): GoogleDocsView;
  setIncludeFolders(include: boolean): GoogleDocsView;
  setSelectFolderEnabled(enabled: boolean): GoogleDocsView;
}
interface GooglePickerBuilder {
  addView(view: GoogleDocsView): GooglePickerBuilder;
  setOAuthToken(token: string): GooglePickerBuilder;
  setDeveloperKey(key: string): GooglePickerBuilder;
  setAppId(appId: string): GooglePickerBuilder;
  setCallback(callback: (data: GooglePickerResponse) => void): GooglePickerBuilder;
  build(): { setVisible(visible: boolean): void };
}
interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}
interface GoogleTokenClient {
  requestAccessToken(options?: { prompt?: string }): void;
}
interface GoogleGlobal {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback?: (error: { type?: string }) => void;
      }): GoogleTokenClient;
    };
  };
  picker: {
    PickerBuilder: new () => GooglePickerBuilder;
    DocsView: new (viewId?: unknown) => GoogleDocsView;
    ViewId: { DOCS: unknown };
    Action: { PICKED: string; CANCEL: string };
  };
}
interface GapiGlobal {
  load(api: string, callback: () => void): void;
}
interface DropboxChooserFile {
  name: string;
  link: string;
  bytes: number;
}
interface DropboxGlobal {
  isBrowserSupported(): boolean;
  choose(options: {
    success: (files: DropboxChooserFile[]) => void;
    cancel?: () => void;
    linkType: "direct" | "preview";
    multiselect: boolean;
    extensions: string[];
    sizeLimit: number;
  }): void;
}
type PickerWindow = Window & {
  google?: GoogleGlobal;
  gapi?: GapiGlobal;
  Dropbox?: DropboxGlobal;
};
const pickerWindow = (): PickerWindow => window as PickerWindow;

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function hasAllowedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function assertSize(bytes: number | undefined): void {
  if (typeof bytes === "number" && bytes > MAX_BYTES) {
    throw new CloudPickerError(`That file is larger than the ${MAX_MB} MB limit.`);
  }
}

async function downloadAsFile(
  response: Response,
  name: string,
  type: string,
): Promise<File> {
  if (!response.ok) {
    throw new CloudPickerError(
      response.status === 403 || response.status === 401
        ? "You do not have permission to download that file."
        : "The file could not be downloaded. Please try again.",
    );
  }
  const blob = await response.blob();
  assertSize(blob.size);
  if (blob.size === 0) throw new CloudPickerError("That file is empty.");
  return new File([blob], name, { type });
}

/* ------------------------------------------------------------------ */
/* Google Drive                                                        */
/* ------------------------------------------------------------------ */

let googleReady: Promise<void> | null = null;

/** Loads the Google scripts ahead of the click so the sign-in popup is not blocked. */
export function preloadGoogle(): Promise<void> {
  if (!cloudPickerAvailability.google) return Promise.resolve();
  if (!googleReady) {
    googleReady = (async () => {
      await Promise.all([
        loadScript("https://apis.google.com/js/api.js"),
        loadScript("https://accounts.google.com/gsi/client"),
      ]);
      const gapi = pickerWindow().gapi;
      if (!gapi) throw new CloudPickerError("Google Drive is unavailable right now.");
      await new Promise<void>((resolve) => gapi.load("picker", () => resolve()));
    })().catch((error: unknown) => {
      googleReady = null;
      throw error;
    });
  }
  return googleReady;
}

function requestGoogleToken(): Promise<string> {
  const google = pickerWindow().google;
  if (!google) throw new CloudPickerError("Google Drive is unavailable right now.");
  return new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      // drive.file only exposes files the user explicitly picks in the Picker.
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else reject(new CloudPickerError("Google sign-in was not completed."));
      },
      error_callback: (error) => {
        reject(
          new CloudPickerError(
            error.type === "popup_closed"
              ? "Google sign-in was closed."
              : "Google sign-in could not be started. Allow pop-ups and try again.",
          ),
        );
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

function showGooglePicker(token: string): Promise<GooglePickerDoc | null> {
  const google = pickerWindow().google;
  if (!google) throw new CloudPickerError("Google Drive is unavailable right now.");
  return new Promise<GooglePickerDoc | null>((resolve) => {
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setMimeTypes(PICKER_MIME_TYPES)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);
    new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setAppId(GOOGLE_APP_ID)
      .setCallback((data) => {
        if (data.action === google.picker.Action.PICKED) resolve(data.docs?.[0] ?? null);
        else if (data.action === google.picker.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
}

/** Returns the chosen file, or null if the user cancelled. */
export async function pickFromGoogleDrive(): Promise<File | null> {
  if (!cloudPickerAvailability.google) {
    throw new CloudPickerError("Google Drive is not set up for this app.");
  }
  await preloadGoogle();
  const token = await requestGoogleToken();
  const doc = await showGooglePicker(token);
  if (!doc) return null;

  const isSheet = doc.mimeType === GOOGLE_SHEET_MIME;
  if (!isSheet && !hasAllowedExtension(doc.name)) {
    throw new CloudPickerError("Choose a CSV, XLS or XLSX file.");
  }
  assertSize(doc.sizeBytes);

  const id = encodeURIComponent(doc.id);
  const url = isSheet
    ? `https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=${encodeURIComponent(XLSX_MIME)}`
    : `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (isSheet && response.status === 403) {
    throw new CloudPickerError(
      "Google could not export that spreadsheet (exports are limited to about 10 MB). Download it as CSV or XLSX instead.",
    );
  }
  const name = isSheet ? `${doc.name.replace(/\.[^.]+$/, "")}.xlsx` : doc.name;
  return downloadAsFile(response, name, isSheet ? XLSX_MIME : doc.mimeType);
}

/* ------------------------------------------------------------------ */
/* Dropbox                                                             */
/* ------------------------------------------------------------------ */

export function preloadDropbox(): Promise<void> {
  if (!cloudPickerAvailability.dropbox) return Promise.resolve();
  return loadScript("https://www.dropbox.com/static/api/2/dropins.js", {
    id: "dropboxjs",
    "data-app-key": DROPBOX_APP_KEY,
  });
}

/** Returns the chosen file, or null if the user cancelled. */
export async function pickFromDropbox(): Promise<File | null> {
  if (!cloudPickerAvailability.dropbox) {
    throw new CloudPickerError("Dropbox is not set up for this app.");
  }
  await preloadDropbox();
  const dropbox = pickerWindow().Dropbox;
  if (!dropbox || !dropbox.isBrowserSupported()) {
    throw new CloudPickerError("Dropbox is not supported in this browser.");
  }

  const chosen = await new Promise<DropboxChooserFile | null>((resolve) => {
    dropbox.choose({
      success: (files) => resolve(files[0] ?? null),
      cancel: () => resolve(null),
      linkType: "direct",
      multiselect: false,
      extensions: EXTENSIONS,
      sizeLimit: MAX_BYTES,
    });
  });
  if (!chosen) return null;

  if (!hasAllowedExtension(chosen.name)) {
    throw new CloudPickerError("Choose a CSV, XLS or XLSX file.");
  }
  assertSize(chosen.bytes);
  // Only ever fetch from Dropbox's own content hosts, whatever the Chooser returned.
  let host = "";
  try {
    host = new URL(chosen.link).hostname;
  } catch {
    throw new CloudPickerError("Dropbox returned an invalid link. Please try again.");
  }
  if (!/(^|\.)dropboxusercontent\.com$|(^|\.)dropbox\.com$/.test(host)) {
    throw new CloudPickerError("Dropbox returned an unexpected link. Please try again.");
  }

  let response: Response;
  try {
    response = await fetch(chosen.link, { credentials: "omit" });
  } catch {
    throw new CloudPickerError(
      "The browser could not download that file from Dropbox. Try again, or download it and use Browse files.",
    );
  }
  return downloadAsFile(response, chosen.name, "");
}
