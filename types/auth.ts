export type EmailType = "personal" | "work" | "unknown";

export interface EmailClassification {
  isValid: boolean;
  email: string;
  normalizedEmail: string;
  domain: string;
  emailType: EmailType;
  credits: number;
  error?: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  normalized_email?: string;
  email_type: "personal" | "work";
  emailType?: "personal" | "work";
  credit_balance: number;
  creditBalance?: number;
  is_verified: boolean;
  email_verified?: boolean;
  isVerified?: boolean;
  auth_provider?: string;
  full_name?: string | null;
  name?: string | null;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
  createdAt?: string | Date;
  is_new_user?: boolean;
  credits_awarded?: number;
}

export interface AuthSessionResponse {
  is_new_user: boolean;
  credits_awarded: number;
  user: UserProfile;
}

export interface OtpRequestResponse {
  success: boolean;
  message: string;
  email: string;
  email_type: string;
  eligible_credits: number;
  cooldown_seconds: number;
  expires_in_seconds: number;
}

export interface OAuthAuthorizeResponse {
  provider: string;
  authorization_url?: string | null;
  state?: string | null;
  is_configured: boolean;
  message?: string | null;
}
