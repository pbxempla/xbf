"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getCurrentUser } from "@/lib/api";
import { AuthSessionResponse, UserProfile } from "@/types/auth";
import { XemplaLogo } from "@/components/icons/Icons";

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
      const result = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp,
      });

      if (result.error) {
        throw new Error(result.error.message || "Invalid or expired verification code.");
      }

      const userProfile: UserProfile = await getCurrentUser();

      const session: AuthSessionResponse = {
        is_new_user: userProfile.is_new_user ?? false,
        credits_awarded: userProfile.credits_awarded ?? 0,
        user: userProfile,
      };

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
      const { error } = await authClient.emailOtp.sendVerificationOtp({
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
    <div className="flex w-full flex-col font-sans text-[#191c1f] animate-fade-in">
      <div className="mb-12">
        <XemplaLogo />
      </div>

      <button
        type="button"
        onClick={onChangeEmail}
        className="group mb-7 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#505a63] transition-colors hover:text-[#191c1f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf]"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Change email address</span>
      </button>

      <h1 className="text-[34px] font-medium leading-[1.08] tracking-[-0.04em] text-[#191c1f] sm:text-[40px]">
        Enter verification code
      </h1>

      <p className="mt-3 text-sm leading-6 text-[#505a63]">
        We sent a 6-digit code to <strong className="font-semibold text-[#191c1f]">{email}</strong>.
        Enter it below to continue. New accounts receive{" "}
        <span className="font-semibold text-[#191c1f]">{eligibleCredits} credits</span>.
      </p>

      {errorMessage && (
        <div role="alert" className="mt-5 rounded-xl border border-[#e23b4a]/20 bg-[#e23b4a]/5 px-4 py-3 text-sm text-[#8b0000] animate-fade-in">
          {errorMessage}
        </div>
      )}

      {infoMessage && (
        <div role="status" className="mt-5 rounded-xl border border-[#00a87e]/20 bg-[#00a87e]/5 px-4 py-3 text-sm text-[#006400] animate-fade-in">
          {infoMessage}
        </div>
      )}

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
              aria-label={`Verification digit ${idx + 1}`}
              className={`h-14 min-w-0 flex-1 rounded-xl border text-center text-xl font-medium text-[#191c1f] outline-none transition-colors focus:border-[#494fdf] focus:ring-2 focus:ring-[#494fdf]/15 sm:h-14 sm:text-2xl ${
                digit
                  ? "border-[#494fdf] bg-white"
                  : "border-[#e2e2e7] bg-white"
              }`}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || digits.join("").length < 6}
          className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold tracking-[0.01em] text-white transition-colors hover:bg-[#191c1f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf] disabled:cursor-not-allowed disabled:opacity-50"
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

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#e2e2e7] pt-4 text-sm text-[#505a63]">
        <span>Didn&apos;t receive the code?</span>

        <button
          type="button"
          onClick={handleResendOtp}
          disabled={countdown > 0 || resending}
          className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-[#376cd5] transition-colors hover:text-[#191c1f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf] disabled:cursor-not-allowed disabled:text-[#8d969e]"
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
