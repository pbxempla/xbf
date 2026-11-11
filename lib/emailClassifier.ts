import type { EmailClassification } from "@/types/auth";

export const PERSONAL_DOMAINS: Set<string> = new Set([
  // Google
  "gmail.com",
  "googlemail.com",
  // Microsoft
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "passport.com",
  // Yahoo
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "yahoo.ca",
  "yahoo.fr",
  "yahoo.de",
  // Apple
  "icloud.com",
  "me.com",
  "mac.com",
  // AOL
  "aol.com",
  "aim.com",
  // Proton
  "proton.me",
  "protonmail.com",
  "pm.me",
  // Zoho Personal
  "zoho.com",
  "zohomail.com",
  // Other consumer mail providers
  "mail.com",
  "gmx.com",
  "gmx.net",
  "tutanota.com",
  "tuta.io",
  "yandex.com",
  "yandex.ru",
  "fastmail.com",
  "fastmail.fm",
  "hushmail.com",
  "inbox.com",
  "rediffmail.com",
  "comcast.net",
  "sbcglobal.net",
  "att.net",
  "verizon.net",
]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validates whether string is a complete email address format with a valid TLD.
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  // Valid email regex requiring username, @, domain name, and minimum 2-char TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Classifies an email as 'personal' or 'work' and calculates eligible credits.
 * If email is incomplete or invalid, returns isValid: false, emailType: 'unknown'.
 */
export function classifyEmail(email: string): EmailClassification {
  if (!email || !isValidEmailFormat(email)) {
    return {
      isValid: false,
      email: email || "",
      normalizedEmail: "",
      domain: "",
      emailType: "unknown",
      credits: 0,
      error: email && email.includes("@") ? "Please enter a valid email address." : null,
    };
  }

  const normalized = normalizeEmail(email);
  const parts = normalized.split("@");
  const domain = parts[1] || "";

  if (PERSONAL_DOMAINS.has(domain)) {
    return {
      isValid: true,
      email: email.trim(),
      normalizedEmail: normalized,
      domain,
      emailType: "personal",
      credits: 150,
      error: null,
    };
  }

  return {
    isValid: true,
    email: email.trim(),
    normalizedEmail: normalized,
    domain,
    emailType: "work",
    credits: 200,
    error: null,
  };
}
