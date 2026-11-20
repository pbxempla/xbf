"use client";

import React, { useState } from "react";
import { BadgeCheck, Camera, Pencil, ShieldAlert } from "lucide-react";
import {
  AVATAR_ACCEPT,
  avatarUrl,
  checkAvatarFile,
  updateCurrentUser,
  uploadAvatar,
} from "@/lib/api";
import { ROLE_OPTIONS } from "@/lib/profile";
import type { PrimaryRole, UserProfile } from "@/types/auth";

interface Draft {
  full_name: string;
  job_title: string;
  company_name: string;
  phone_number: string;
  primary_role: PrimaryRole | "";
}

const REQUIRED: Array<keyof Draft> = ["full_name", "job_title", "company_name", "primary_role"];

const inputClass =
  "h-10 w-full rounded-xl border border-app-line bg-white px-3 text-sm text-app-ink outline-none transition-colors placeholder:text-[#8d969e] focus:border-app-accent focus:ring-2 focus:ring-app-accent/15 aria-invalid:border-[#e23b4a]";

function toDraft(profile: UserProfile): Draft {
  return {
    full_name: profile.full_name ?? "",
    job_title: profile.job_title ?? "",
    company_name: profile.company_name ?? "",
    phone_number: profile.phone_number ?? "",
    primary_role: profile.primary_role ?? "",
  };
}

export function ProfileOverviewCard({
  profile,
  onProfile,
}: {
  profile: UserProfile;
  onProfile: (profile: UserProfile) => void;
}) {
  const complete = Boolean(profile.profile_complete);
  const [editing, setEditing] = useState(!complete);
  const [draft, setDraft] = useState<Draft>(() => toDraft(profile));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const displayName = profile.full_name?.trim() || profile.email;
  const initials =
    displayName
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "X";
  const roleLabel =
    ROLE_OPTIONS.find((option) => option.value === profile.primary_role)?.label ?? null;
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const set = (key: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const missing = (key: keyof Draft) =>
    touched && REQUIRED.includes(key) && draft[key].trim() === "";

  const startEditing = () => {
    setDraft(toDraft(profile));
    setTouched(false);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(toDraft(profile));
    setTouched(false);
    setError(null);
    setEditing(false);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setError(null);
    if (REQUIRED.some((key) => draft[key].trim() === "") || draft.primary_role === "") return;
    setSaving(true);
    try {
      const updated = await updateCurrentUser({
        full_name: draft.full_name.trim(),
        job_title: draft.job_title.trim(),
        company_name: draft.company_name.trim(),
        phone_number: draft.phone_number.trim(),
        primary_role: draft.primary_role,
      });
      onProfile(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = checkAvatarFile(file);
    if (problem) {
      setPhotoError(problem);
      return;
    }
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      onProfile(await uploadAvatar(file));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Unable to upload your photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const view: Array<{ label: string; value: string | null }> = [
    { label: "Job title", value: profile.job_title ?? null },
    { label: "Company", value: profile.company_name ?? null },
    { label: "Role", value: roleLabel },
    { label: "Phone", value: profile.phone_number ?? null },
    { label: "Member since", value: memberSince },
  ];

  return (
    <form
      onSubmit={save}
      noValidate
      aria-label="Profile overview"
      className="relative flex h-full flex-col gap-6 rounded-3xl bg-white p-6 sm:p-8"
    >
      {!editing ? (
        <button
          type="button"
          onClick={startEditing}
          aria-label="Edit profile"
          title="Edit profile"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-app-canvas text-app-ink/70 transition-colors hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent sm:right-6 sm:top-6"
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : null}

      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <div className="relative h-24 w-24">
          {profile.avatar_version ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl(profile.avatar_version)}
              alt="Your profile photo"
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-24 w-24 items-center justify-center rounded-full bg-black text-3xl font-medium text-white"
            >
              {initials}
            </div>
          )}
          <label
            className={`absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-black text-white transition-colors hover:bg-app-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-app-accent ${
              photoBusy ? "opacity-60" : ""
            }`}
            title="Change photo"
          >
            <Camera aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">Change profile photo</span>
            <input
              type="file"
              accept={AVATAR_ACCEPT}
              disabled={photoBusy}
              onChange={handlePhoto}
              className="sr-only"
            />
          </label>
        </div>
        {photoError ? (
          <p role="alert" className="max-w-56 text-xs text-[#8b0000]">
            {photoError}
          </p>
        ) : photoBusy ? (
          <p role="status" className="text-xs text-app-muted">
            Uploading photo...
          </p>
        ) : null}

        <div className="w-full min-w-0">
          {editing ? (
            <div className="mx-auto max-w-xs">
              <label htmlFor="full_name" className="sr-only">
                Full name
              </label>
              <input
                id="full_name"
                value={draft.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Full name"
                autoComplete="name"
                maxLength={255}
                aria-invalid={missing("full_name")}
                className={`${inputClass} text-center`}
              />
              {missing("full_name") ? <FieldError /> : null}
            </div>
          ) : (
            <h2 className="text-2xl font-medium tracking-tight">{displayName}</h2>
          )}
          <p className="mt-1 flex items-center justify-center gap-1.5 break-all text-sm text-app-muted">
            <span>{profile.email}</span>
            {profile.is_verified ? (
              <BadgeCheck
                role="img"
                aria-label="Email verified"
                className="h-4 w-4 shrink-0 text-[#00a87e]"
              >
                <title>Email verified</title>
              </BadgeCheck>
            ) : (
              <ShieldAlert
                role="img"
                aria-label="Email not verified"
                className="h-4 w-4 shrink-0 text-[#ec7e00]"
              >
                <title>Email not verified</title>
              </ShieldAlert>
            )}
          </p>
        </div>

        {editing ? (
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white transition-colors hover:bg-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {complete ? (
              <button
                type="button"
                onClick={cancel}
                disabled={saving}
                className="inline-flex h-9 items-center justify-center rounded-full border border-black px-5 text-sm font-medium transition-colors hover:bg-app-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
              >
                Cancel
              </button>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="max-w-xs text-sm text-[#8b0000]">
            {error}
          </p>
        ) : null}
      </div>

      <div aria-hidden="true" className="h-px w-full bg-app-line" />

      {editing ? (
        <div className="grid gap-5 text-sm">
          <Field label="Job title" id="job_title" invalid={missing("job_title")}>
            <input
              id="job_title"
              value={draft.job_title}
              onChange={(e) => set("job_title", e.target.value)}
              placeholder="e.g. Account Manager"
              autoComplete="organization-title"
              maxLength={120}
              aria-invalid={missing("job_title")}
              className={inputClass}
            />
          </Field>
          <Field label="Company" id="company_name" invalid={missing("company_name")}>
            <input
              id="company_name"
              value={draft.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              autoComplete="organization"
              maxLength={255}
              aria-invalid={missing("company_name")}
              className={inputClass}
            />
          </Field>
          <Field label="Role" id="primary_role" invalid={missing("primary_role")}>
            <select
              id="primary_role"
              value={draft.primary_role}
              onChange={(e) => set("primary_role", e.target.value)}
              aria-invalid={missing("primary_role")}
              className={inputClass}
            >
              <option value="">Select your role</option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Phone (optional)" id="phone_number">
            <input
              id="phone_number"
              type="tel"
              value={draft.phone_number}
              onChange={(e) => set("phone_number", e.target.value)}
              placeholder="+44 20 7946 0958"
              autoComplete="tel"
              maxLength={32}
              className={inputClass}
            />
          </Field>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
          {view.map(({ label, value }) => (
            <div key={label} className="min-w-0">
              <dt className="text-app-muted">{label}</dt>
              <dd className={`mt-1 break-words font-medium ${value ? "" : "text-app-ink/35"}`}>
                {value ?? "Not added"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </form>
  );
}

function FieldError() {
  return (
    <p role="alert" className="mt-1 text-xs text-[#8b0000]">
      Required
    </p>
  );
}

function Field({
  label,
  id,
  invalid,
  children,
}: {
  label: string;
  id: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-app-muted">
        {label}
      </label>
      {children}
      {invalid ? <FieldError /> : null}
    </div>
  );
}
