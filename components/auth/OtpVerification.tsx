"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { authApi } from "@/lib/api";
import { AuthSessionResponse } from "@/types/auth";

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
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      setDigits(nextDigits);
      return;
    }

    const nextDigits = [...digits];
    // If user enters or pastes into a single field
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

    // Auto-advance to next input
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

    // Focus last filled or next input
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
      const response = await authApi.verifyOtp(email, otp);
      onSuccess(response);
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
      const res = await authApi.requestOtp(email);
      setCountdown(res.cooldown_seconds || 60);
      setInfoMessage("A new verification code has been dispatched to your email.");
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Failed to resend code. Please wait.");
    } finally {
      setResending(false);
    }
  };

  const isComplete = digits.every((d) => d.length === 1);

  return (
    <div className="w-full flex flex-col animate-fade-in">
      {/* Back button / Change email link */}
      <button
        type="button"
        onClick={onChangeEmail}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors self-start"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Change email address
      </button>

      {/* Main Heading */}
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A] font-sans">
        Verify your email
      </h1>

      {/* Subtitle */}
      <p className="text-[14px] text-slate-500 mt-2.5 leading-relaxed">
        We&apos;ve sent a 6-digit verification code to{" "}
        <span className="font-semibold text-slate-900">{email}</span>. Enter the code below to claim your{" "}
        <span className="font-semibold text-[#2563EB]">{eligibleCredits} credits</span> and continue.
      </p>

      {/* Form Error Banner */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Info Banner */}
      {infoMessage && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
          {infoMessage}
        </div>
      )}

      {/* 6-Digit Code Input Form */}
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
            Verification code
          </label>

          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={loading}
                className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-[#3B28CC] focus:ring-4 focus:ring-indigo-100 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
              />
            ))}
          </div>
        </div>

        {/* Verify Action Button */}
        <button
          type="submit"
          disabled={loading || !isComplete}
          className="w-full h-12.5 rounded-xl bg-[#2b26c7] hover:bg-[#251fb8] text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Verifying code...</span>
            </>
          ) : (
            <>
              <span>Verify & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Resend Code Section */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Didn&apos;t receive the code?</span>
          {countdown > 0 ? (
            <span className="font-medium text-slate-400">
              Resend code in <strong className="text-slate-700 font-mono">{countdown}s</strong>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending}
              className="font-semibold text-[#2563EB] hover:text-[#1d4ed8] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {resending ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend code"
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
