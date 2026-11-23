import { PrimaryRole, UserProfile } from "@/types/auth";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getCurrentUser(): Promise<UserProfile> {
  const response = await fetch("/api/backend/users/me", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as
    | (Partial<UserProfile> & { detail?: string })
    | null;

  if (!response.ok) {
    throw new ApiError(
      data?.detail || "Unable to load the authenticated user profile.",
      response.status,
    );
  }

  if (
    !data ||
    typeof data.id !== "string" ||
    typeof data.email !== "string" ||
    (data.email_type !== "work" && data.email_type !== "personal") ||
    typeof data.credit_balance !== "number" ||
    typeof (data.email_verified ?? data.is_verified) !== "boolean"
  ) {
    throw new ApiError("The backend returned an invalid user profile.", response.status);
  }

  const emailType = data.email_type;
  const isVerified = data.email_verified ?? data.is_verified;
  if (typeof isVerified !== "boolean") {
    throw new ApiError("The backend returned an invalid user profile.", response.status);
  }

  return {
    ...data,
    id: data.id,
    email: data.email,
    normalized_email: data.normalized_email || data.email.toLowerCase(),
    email_type: emailType,
    emailType,
    credit_balance: data.credit_balance,
    creditBalance: data.credit_balance,
    email_verified: isVerified,
    is_verified: isVerified,
    isVerified,
    auth_provider: data.auth_provider || "better_auth",
    full_name: data.full_name || null,
  };
}

export interface CreditTransaction {
  id: string;
  /** Positive for credits added, negative for credits used. */
  amount: number;
  balance_after: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

/** The signed-in user's credit ledger, newest first. */
export async function getCreditTransactions(): Promise<CreditTransaction[]> {
  const response = await fetch("/api/backend/users/me/credits/transactions", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok || !Array.isArray(data)) {
    throw new ApiError("Unable to load your credit usage.", response.status);
  }
  return data as CreditTransaction[];
}

export interface ProfileUpdate {
  full_name: string;
  job_title: string;
  company_name: string;
  phone_number: string;
  primary_role: PrimaryRole;
}

function messageFromDetail(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: unknown } | undefined;
    if (first && typeof first.msg === "string") {
      return first.msg.replace(/^Value error, /, "");
    }
  }
  return null;
}

/** The backend validates every field; an empty string clears an optional one. */
export async function updateCurrentUser(update: ProfileUpdate): Promise<UserProfile> {
  const response = await fetch("/api/backend/users/me", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  const data = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  if (!response.ok) {
    throw new ApiError(
      messageFromDetail(data?.detail) || "Unable to save your profile.",
      response.status,
    );
  }
  return getCurrentUser();
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

/** Same-origin URL of the signed-in user's image; `version` busts the browser cache. */
export function avatarUrl(version: string): string {
  return `/api/backend/users/me/avatar?v=${encodeURIComponent(version)}`;
}

/** Early feedback only; the backend validates type and size authoritatively. */
export function checkAvatarFile(file: File): string | null {
  if (!AVATAR_ACCEPT.split(",").includes(file.type)) {
    return "Choose a JPEG, PNG or WebP image.";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "Choose an image that is 2 MB or smaller.";
  }
  return null;
}

export async function uploadAvatar(file: File): Promise<UserProfile> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/backend/users/me/avatar", {
    method: "POST",
    credentials: "same-origin",
    body,
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    throw new ApiError(
      messageFromDetail(data?.detail) || "Unable to upload your photo.",
      response.status,
    );
  }
  return getCurrentUser();
}
