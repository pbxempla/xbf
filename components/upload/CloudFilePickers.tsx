"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DropboxLogo, GoogleDriveLogo } from "@/components/icons/Icons";
import {
  cloudPickerAvailability,
  CloudPickerError,
  pickFromDropbox,
  pickFromGoogleDrive,
  preloadDropbox,
  preloadGoogle,
} from "@/lib/upload/cloud-pickers";

interface CloudFilePickersProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

type Provider = "google" | "dropbox";

const buttonClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-app-line bg-white px-6 text-sm font-semibold text-app-ink transition-colors hover:bg-app-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-60";

export function CloudFilePickers({ onFileSelected, disabled }: CloudFilePickersProps) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { google, dropbox } = cloudPickerAvailability;

  // Load the provider scripts early so the Google sign-in popup opens straight from the click.
  useEffect(() => {
    if (google) preloadGoogle().catch(() => undefined);
    if (dropbox) preloadDropbox().catch(() => undefined);
  }, [google, dropbox]);

  if (!google && !dropbox) return null;

  const run = async (provider: Provider, pick: () => Promise<File | null>) => {
    if (busy || disabled) return;
    setBusy(provider);
    setError(null);
    try {
      const file = await pick();
      if (file) onFileSelected(file);
    } catch (err) {
      setError(
        err instanceof CloudPickerError
          ? err.message
          : "Something went wrong while importing the file. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  };

  const locked = Boolean(disabled || busy);

  return (
    <>
      {google ? (
        <button
          type="button"
          onClick={() => void run("google", pickFromGoogleDrive)}
          disabled={locked}
          className={buttonClass}
        >
          {busy === "google" ? (
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          ) : (
            <GoogleDriveLogo className="h-5 w-5" />
          )}
          Google Drive
        </button>
      ) : null}
      {dropbox ? (
        <button
          type="button"
          onClick={() => void run("dropbox", pickFromDropbox)}
          disabled={locked}
          className={buttonClass}
        >
          {busy === "dropbox" ? (
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          ) : (
            <DropboxLogo className="h-5 w-5" />
          )}
          Dropbox
        </button>
      ) : null}
      {busy ? (
        <p role="status" className="w-full text-center text-xs text-app-muted">
          Importing from {busy === "google" ? "Google Drive" : "Dropbox"}…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mx-auto w-full max-w-sm text-center text-sm text-[#8b0000]">
          {error}
        </p>
      ) : null}
    </>
  );
}
