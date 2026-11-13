import { UserProfile } from "@/types/auth";

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
