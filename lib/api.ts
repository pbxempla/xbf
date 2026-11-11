import {
  AuthSessionResponse,
  OAuthAuthorizeResponse,
  OtpRequestResponse,
  UserProfile,
} from "@/types/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMessage =
        data?.detail ||
        data?.message ||
        `Request failed with status code ${res.status}`;
      throw new ApiError(errorMessage, res.status);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network or server offline error
    throw new ApiError(
      "Unable to connect to the authentication server. Please check your backend connection.",
      0
    );
  }
}

export const authApi = {
  async requestOtp(email: string): Promise<OtpRequestResponse> {
    return request<OtpRequestResponse>("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async verifyOtp(email: string, otp: string): Promise<AuthSessionResponse> {
    const res = await request<AuthSessionResponse>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
    if (res.access_token) {
      setAuthToken(res.access_token);
    }
    return res;
  },

  async getCurrentUser(): Promise<UserProfile> {
    return request<UserProfile>("/users/me");
  },

  async getOAuthUrl(provider: "google" | "microsoft"): Promise<OAuthAuthorizeResponse> {
    return request<OAuthAuthorizeResponse>(`/auth/oauth/${provider}/authorize`);
  },

  async logout(): Promise<void> {
    try {
      await request<{ success: boolean }>("/auth/logout", { method: "POST" });
    } finally {
      clearAuthToken();
    }
  },
};
