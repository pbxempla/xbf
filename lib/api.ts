import {
  AuthSessionResponse,
  OAuthAuthorizeResponse,
  OtpRequestResponse,
  UserProfile,
} from "@/types/auth";
import { authClient } from "@/lib/auth-client";
import { classifyEmail } from "@/lib/emailClassifier";

const TOKEN_KEY = "xempla_auth_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Frontend auth API powered directly by Better Auth and Next.js route handlers.
 * Completely eliminates any external backend server dependencies.
 */
export const authApi = {
  /**
   * Dispatches a 6-digit passwordless OTP via Better Auth & company SMTP service.
   */
  async requestOtp(email: string): Promise<OtpRequestResponse> {
    const classification = classifyEmail(email);
    const { error } = await authClient.emailOTP.sendVerificationOTP({
      email: email.trim(),
      type: "sign-in",
    });

    if (error) {
      throw new Error(error.message || "Failed to dispatch verification code. Please try again.");
    }

    return {
      success: true,
      message: "Verification code sent successfully.",
      email: email.trim(),
      email_type: classification.emailType,
      eligible_credits: classification.credits,
      cooldown_seconds: 60,
      expires_in_seconds: 600,
    };
  },

  /**
   * Verifies the 6-digit OTP, creates the account with eligible credits if new, and logs in.
   */
  async verifyOtp(email: string, otp: string): Promise<AuthSessionResponse> {
    const result = await authClient.emailOTP.verifyEmail({
      email: email.trim(),
      otp: otp.trim(),
    });

    if (result.error) {
      throw new Error(result.error.message || "Invalid or expired verification code.");
    }

    const resData = result.data as Record<string, unknown> | undefined;
    const userRaw = (resData?.user || resData) as Record<string, unknown> | undefined;
    const classification = classifyEmail(email);
    const fallbackCredits = classification.credits || (classification.emailType === "work" ? 200 : 150);

    const userProfile: UserProfile = {
      id: (userRaw?.id as string) || "user-" + Date.now(),
      email: (userRaw?.email as string) || email.trim(),
      normalized_email: ((userRaw?.email as string) || email.trim()).toLowerCase(),
      email_type: (userRaw?.emailType as "work" | "personal") || classification.emailType,
      emailType: (userRaw?.emailType as "work" | "personal") || classification.emailType,
      credit_balance:
        typeof userRaw?.creditBalance === "number" ? userRaw.creditBalance : fallbackCredits,
      creditBalance:
        typeof userRaw?.creditBalance === "number" ? userRaw.creditBalance : fallbackCredits,
      is_verified: true,
      isVerified: true,
      auth_provider: "email_otp",
      full_name: (userRaw?.name as string) || null,
      created_at:
        typeof userRaw?.createdAt === "string" || typeof userRaw?.createdAt === "number"
          ? new Date(userRaw.createdAt).toISOString()
          : new Date().toISOString(),
    };

    const session: AuthSessionResponse = {
      access_token: (resData?.token as string) || "better-auth-session",
      token_type: "bearer",
      is_new_user: true,
      credits_awarded: userProfile.credit_balance,
      user: userProfile,
    };

    if (session.access_token) {
      setAuthToken(session.access_token);
    }

    return session;
  },

  /**
   * Retrieves active session details and user profile from Better Auth.
   */
  async getCurrentUser(): Promise<UserProfile> {
    const { data, error } = await authClient.getSession();
    if (error || !data?.user) {
      throw new Error("No active authenticated session found.");
    }

    const userRaw = data.user as unknown as {
      id: string;
      email: string;
      emailType?: "work" | "personal";
      creditBalance?: number;
      isVerified?: boolean;
      emailVerified?: boolean;
      name?: string | null;
      createdAt?: Date | string | number;
    };
    const classification = classifyEmail(userRaw.email);

    return {
      id: userRaw.id,
      email: userRaw.email,
      normalized_email: userRaw.email.toLowerCase(),
      email_type: (userRaw.emailType as "work" | "personal") || classification.emailType,
      emailType: (userRaw.emailType as "work" | "personal") || classification.emailType,
      credit_balance:
        typeof userRaw.creditBalance === "number" ? userRaw.creditBalance : classification.credits,
      creditBalance:
        typeof userRaw.creditBalance === "number" ? userRaw.creditBalance : classification.credits,
      is_verified: Boolean(userRaw.isVerified ?? userRaw.emailVerified),
      isVerified: Boolean(userRaw.isVerified ?? userRaw.emailVerified),
      auth_provider: "email_otp",
      full_name: userRaw.name || null,
      created_at: new Date(userRaw.createdAt || Date.now()).toISOString(),
    };
  },

  /**
   * Retrieves OAuth authorization status / URL.
   */
  async getOAuthUrl(provider: "google" | "microsoft"): Promise<OAuthAuthorizeResponse> {
    return {
      provider,
      is_configured: false,
      message: `${provider === "google" ? "Google" : "Microsoft"} OAuth credentials not configured in environment variables.`,
    };
  },

  /**
   * Logs out the user and destroys the active session cookie.
   */
  async logout(): Promise<void> {
    try {
      await authClient.signOut();
    } finally {
      clearAuthToken();
    }
  },
};
