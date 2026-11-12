"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { setAuthToken } from "@/lib/api";
import { AuthSessionResponse, UserProfile } from "@/types/auth";

interface OtpVerificationProps {
  email: string;
  eligibleCredits: number;
  initialCooldown?: number;
  onSuccess: (session: AuthSessionResponse) => void;
  onChangeEmail: () => void;
}

export function OtpVerification({
  email,
  eligibleCredits,
  initialCooldown = 60,
  onSuccess,
  onChangeEmail,
}: OtpVerificationProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(initialCooldown);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown effect
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // Auto focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      setDigits(nextDigits);
      return;
    }

    const nextDigits = [...digits];
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6).split("");
      pasted.forEach((char, i) => {
        if (i < 6) nextDigits[i] = char;
      });
      setDigits(nextDigits);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    nextDigits[index] = cleaned[0];
    setDigits(nextDigits);

    if (index < 5 && cleaned) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const nextDigits = [...digits];
    pasteData.split("").forEach((char, idx) => {
      if (idx < 6) nextDigits[idx] = char;
    });
    setDigits(nextDigits);

    const focusIdx = Math.min(pasteData.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otp = digits.join("");
    if (otp.length < 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      // Submitting the 6-digit code calls authClient.emailOTP.verifyEmail({ email, otp })
      const result = await authClient.emailOTP.verifyEmail({
        email: email.trim(),
        otp,
      });

      if (result.error) {
        throw new Error(result.error.message || "Invalid or expired verification code.");
      }

      const resData = result.data as any;
      const userRaw = resData?.user || resData;
      const emailType: "work" | "personal" =
        userRaw?.emailType === "work" || eligibleCredits === 200 ? "work" : "personal";
      const creditBalance =
        typeof userRaw?.creditBalance === "number" ? userRaw.creditBalance : eligibleCredits;

      const userProfile: UserProfile = {
        id: userRaw?.id || "user-" + Date.now(),
        email: userRaw?.email || email.trim(),
        normalized_email: (userRaw?.email || email.trim()).toLowerCase(),
        email_type: emailType,
        emailType: emailType,
        credit_balance: creditBalance,
        creditBalance: creditBalance,
        is_verified: true,
        isVerified: true,
        auth_provider: "email_otp",
        full_name: userRaw?.name || null,
        created_at: new Date(userRaw?.createdAt || Date.now()).toISOString(),
      };

      const session: AuthSessionResponse = {
        access_token: resData?.token || "better-auth-session",
        token_type: "bearer",
        is_new_user: true,
        credits_awarded: creditBalance,
        user: userProfile,
      };

      if (session.access_token) {
        setAuthToken(session.access_token);
      }

      onSuccess(session);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const { error } = await authClient.emailOTP.sendVerificationOTP({
        email: email.trim(),
        type: "sign-in",
      });

      if (error) {
        throw new Error(error.message || "Failed to resend code.");
      }

      setCountdown(60);
      setInfoMessage("A new verification code has been dispatched to your email.");
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Failed to resend code. Please try again later.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full flex flex-col animate-fade-in">
      {/* Back button */}
      <button
        type="button"
        onClick={onChangeEmail}
        className="self-start inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-8 cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Back to email address</span>
      </button>

      {/* Heading */}
      <h1 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-[#0F172A] font-sans leading-tight">
        Enter verification code
      </h1>

      {/* Subtitle */}
      <p className="text-[14px] text-slate-500 mt-2.5 font-normal leading-relaxed">
        We sent a 6-digit code to <strong className="text-slate-900 font-semibold">{email}</strong>.
        Enter it below to sign in and claim your{" "}
        <span className="font-bold text-[#2563EB]">{eligibleCredits} credits</span>.
      </p>

      {/* Error / Alert */}
      {errorMessage && (
        <div className="mt-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 animate-fade-in">
          {errorMessage}
        </div>
      )}

      {/* Info Notice (e.g. Resent) */}
      {infoMessage && (
        <div className="mt-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 animate-fade-in">
          {infoMessage}
        </div>
      )}

      {/* 6-Digit OTP Input Form */}
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              disabled={loading}
              className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border transition-all outline-none ${
                digit
                  ? "border-[#3B28CC] bg-indigo-50/20 text-[#1E1B4B]"
                  : "border-slate-200 bg-white text-slate-900"
              } focus:border-[#3B28CC] focus:ring-4 focus:ring-indigo-100/70`}
            />
          ))}
        </div>

        {/* Submit Verification Button */}
        <button
          type="submit"
          disabled={loading || digits.join("").length < 6}
          className="mt-7 w-full h-[50px] px-5 rounded-xl bg-[#2b26c7] hover:bg-[#251fb8] text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Verifying code...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>Verify & Access Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          )}
        </button>
      </form>

      {/* Resend Code Section with Countdown */}
      <div className="mt-6 flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-100">
        <span>Didn&apos;t receive the code?</span>

        <button
          type="button"
          onClick={handleResendOtp}
          disabled={countdown > 0 || resending}
          className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:text-[#1D4ED8] disabled:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {resending ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Sending...</span>
            </>
          ) : countdown > 0 ? (
            <span>Resend code in {countdown}s</span>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Resend code</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
