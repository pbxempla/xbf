"use client";

import React, { useMemo, useState } from "react";
import { ArrowRight, Building2, Check, Loader2, Mail, User as UserIcon } from "lucide-react";
import { classifyEmail } from "@/lib/emailClassifier";
import { authClient } from "@/lib/auth-client";
import { OtpRequestResponse } from "@/types/auth";
import { GoogleLogo, MicrosoftLogo, XemplaLogo } from "@/components/icons/Icons";

interface SignupFormProps {
  onOtpRequested: (data: OtpRequestResponse) => void;
}

export function SignupForm({ onOtpRequested }: SignupFormProps) {
  const [isSignInMode, setIsSignInMode] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const classification = useMemo(() => classifyEmail(email), [email]);

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    setErrorMessage(null);
    setOauthNotice(null);
  };

  const handleUseWorkEmailInstead = () => {
    const username = email.split("@")[0] || "name";
    setEmail(`${username}@company.com`);
    setErrorMessage(null);
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!classification.isValid) {
      setErrorMessage("Please enter a valid email address (e.g., name@company.com).");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setOauthNotice(null);

    try {
      const { error } = await authClient.emailOTP.sendVerificationOTP({
        email: email.trim(),
        type: "sign-in",
      });

      if (error) {
        throw new Error(error.message || "Failed to send verification code. Please try again.");
      }

      onOtpRequested({
        success: true,
        message: "A 6-digit verification code has been dispatched to your email.",
        email: email.trim(),
        email_type: classification.emailType,
        eligible_credits: classification.credits,
        cooldown_seconds: 60,
        expires_in_seconds: 600,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthClick = (provider: "google" | "microsoft") => {
    const providerName = provider === "google" ? "Google" : "Microsoft";
    setErrorMessage(null);
    setOauthNotice(
      `${providerName} OAuth is not configured with client credentials. Please use passwordless email OTP.`,
    );
  };

  return (
    <div className="auth-form-content flex w-full flex-col font-sans text-[#191c1f]">
      <div className="auth-form-brand mb-8">
        <XemplaLogo />
      </div>

      <div className="auth-form-intro mb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#5c5e60]">
          A clearer way to work
        </p>
        <h1 className="text-[34px] font-medium leading-[1.08] tracking-[-0.04em] text-[#191c1f] sm:text-[40px]">
          {isSignInMode ? "Welcome back." : "Start something great."}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#505a63]">
          {isSignInMode
            ? "Enter your email and we’ll send you a secure sign-in code."
            : "Create your Xempla account and bring your work together."}
        </p>
      </div>

      {errorMessage && (
        <div role="alert" className="mb-5 rounded-xl border border-[#e23b4a]/20 bg-[#e23b4a]/5 px-4 py-3 text-sm text-[#8b0000]">
          {errorMessage}
        </div>
      )}

      {oauthNotice && (
        <div role="status" className="mb-5 rounded-xl border border-[#ec7e00]/20 bg-[#ec7e00]/5 px-4 py-3 text-sm leading-5 text-[#6b4200]">
          {oauthNotice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor="email-input" className="text-sm font-semibold text-[#191c1f]">
            Email address
          </label>
          {classification.isValid && !isSignInMode && (
            <span aria-live="polite" className="inline-flex items-center gap-1.5 text-right text-xs text-[#505a63]">
              {classification.emailType === "personal" ? (
                <UserIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#494fdf]" />
              ) : (
                <Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-[#494fdf]" />
              )}
              <span>
                {classification.emailType === "personal" ? "Personal" : "Work"} email ·{" "}
                <span className="font-semibold text-[#191c1f]">{classification.credits} credits</span>
              </span>
            </span>
          )}
        </div>
        <div className="relative">
          <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8d969e]" />
          <input
            id="email-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="name@company.com"
            disabled={loading}
            className="h-14 w-full rounded-xl border border-[#e2e2e7] bg-white pl-12 pr-12 text-base tracking-[0.01em] text-[#191c1f] outline-none transition-colors placeholder:text-[#8d969e] focus:border-[#494fdf] focus:ring-2 focus:ring-[#494fdf]/15 disabled:bg-[#f4f4f4]"
          />
          {classification.isValid && (
            <span className="absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#00a87e]/10 text-[#006400]">
              <Check aria-label="Valid email" className="h-3 w-3" />
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex h-12 w-full items-center justify-between rounded-full bg-black px-6 text-sm font-semibold tracking-[0.01em] text-white transition-colors hover:bg-[#191c1f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="mx-auto flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending secure code...
            </span>
          ) : (
            <>
              <span>
                {!isSignInMode && classification.isValid
                  ? `Continue with ${classification.credits} credits`
                  : "Continue with email"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {classification.isValid && classification.emailType === "personal" && !isSignInMode && (
          <button
            type="button"
            onClick={handleUseWorkEmailInstead}
            className="mt-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-full border border-[#e2e2e7] px-6 py-2 text-left text-sm font-medium text-[#191c1f] transition-colors hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf]"
          >
            <span>Sign up with work email to get 200 credits</span>
            <Building2 aria-hidden="true" className="h-4 w-4 shrink-0" />
          </button>
        )}
      </form>

      <div className="auth-oauth-options">
        <div className="my-5 flex items-center gap-4 text-xs text-[#8d969e]">
          <span className="h-px flex-1 bg-[#e2e2e7]" />
          or continue with
          <span className="h-px flex-1 bg-[#e2e2e7]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleOAuthClick("google")}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#e2e2e7] text-sm font-semibold text-[#191c1f] transition-colors hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf]"
          >
            <GoogleLogo className="h-[18px] w-[18px]" />
            Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuthClick("microsoft")}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#e2e2e7] text-sm font-semibold text-[#191c1f] transition-colors hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf]"
          >
            <MicrosoftLogo className="h-[18px] w-[18px]" />
            Microsoft
          </button>
        </div>
      </div>

      <p className="auth-form-toggle mt-6 text-center text-sm text-[#505a63]">
        {isSignInMode ? "New to Xempla?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setIsSignInMode(!isSignInMode);
            setErrorMessage(null);
            setOauthNotice(null);
          }}
          className="font-semibold text-[#376cd5] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf]"
        >
          {isSignInMode ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
