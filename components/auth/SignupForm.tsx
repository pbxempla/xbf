"use client";

import React, { useState, useMemo } from "react";
import { Mail, Check, User as UserIcon, Building2, ArrowRight, Loader2 } from "lucide-react";
import { classifyEmail } from "@/lib/emailClassifier";
import { authApi } from "@/lib/api";
import { OtpRequestResponse } from "@/types/auth";
import { XemplaLogo, CoinsStackIcon, GoogleLogo, MicrosoftLogo } from "@/components/icons/Icons";

interface SignupFormProps {
  onOtpRequested: (data: OtpRequestResponse) => void;
}

export function SignupForm({ onOtpRequested }: SignupFormProps) {
  const [isSignInMode, setIsSignInMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  // Real-time email classification
  const classification = useMemo(() => {
    return classifyEmail(email);
  }, [email]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errorMessage) setErrorMessage(null);
    if (oauthNotice) setOauthNotice(null);
  };

  const handleUseWorkEmailInstead = () => {
    // Focus email input and suggest company domain
    const parts = email.split("@");
    const username = parts[0] || "name";
    setEmail(`${username}@company.com`);
    setErrorMessage(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

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
      const res = await authApi.requestOtp(email.trim());
      onOtpRequested(res);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthClick = async (provider: "google" | "microsoft") => {
    setErrorMessage(null);
    setOauthNotice(null);
    try {
      const res = await authApi.getOAuthUrl(provider);
      if (res.is_configured && res.authorization_url) {
        window.location.href = res.authorization_url;
      } else {
        setOauthNotice(
          res.message ||
            `${provider === "google" ? "Google" : "Microsoft"} OAuth is not configured with client credentials. Set ${
              provider === "google" ? "GOOGLE_CLIENT_ID" : "MICROSOFT_CLIENT_ID"
            } in the backend environment.`
        );
      }
    } catch (err: unknown) {
      const error = err as Error;
      setOauthNotice(error.message || `Unable to initialize ${provider} login.`);
    }
  };

  return (
    <div className="w-full flex flex-col">
      {/* Top Xempla Logo */}
      <div className="mb-10">
        <XemplaLogo />
      </div>

      {/* Main Heading */}
      <h1 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-[#0F172A] font-sans leading-tight">
        {isSignInMode ? "Sign in to your account" : "Create your Xempla account"}
      </h1>

      {/* Subtitle */}
      <p className="text-[14px] text-slate-500 mt-2.5 font-normal">
        {isSignInMode
          ? "Welcome back! Enter your email for instant passwordless sign-in."
          : "Get started with instant credit points and passwordless login."}
      </p>

      {/* Error or Alert Message */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {/* OAuth Unconfigured Notice Banner */}
      {oauthNotice && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 flex items-start gap-2">
          <span className="shrink-0 text-amber-600 font-bold">ℹ</span>
          <span>{oauthNotice}</span>
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
        {/* Email Input Field */}
        <div>
          <label
            htmlFor="email-input"
            className="block text-xs font-semibold text-slate-700 mb-2"
          >
            Email address
          </label>

          <div className="relative flex items-center">
            {/* Left Mail Icon */}
            <div className="absolute left-4 text-slate-400 pointer-events-none">
              <Mail className="w-5 h-5 stroke-[1.8]" />
            </div>

            {/* Main Input Field */}
            <input
              id="email-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Enter your email address"
              disabled={loading}
              className="w-full h-[52px] pl-11 pr-11 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-[#3B28CC] focus:ring-4 focus:ring-indigo-100/60 outline-none transition-all"
            />

            {/* Right Success Checkmark when email is valid */}
            {classification.isValid && (
              <div className="absolute right-3.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-scale-in">
                <Check className="w-3.5 h-3.5 stroke-[2.8]" />
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Email Detection Status Badge */}
        {classification.isValid && !isSignInMode && (
          <div className="pt-0.5 animate-fade-in">
            {classification.emailType === "personal" ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EEF2FF] text-[#4F46E5] text-xs font-medium border border-indigo-100">
                <UserIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Personal email detected</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EFF6FF] text-[#2563EB] text-xs font-medium border border-blue-100">
                <Building2 className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Work email detected</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons Section */}
        <div className="mt-3 flex flex-col gap-3">
          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[50px] px-5 rounded-xl bg-[#2b26c7] hover:bg-[#251fb8] text-white font-medium text-sm transition-all flex items-center justify-between shadow-lg shadow-indigo-600/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <div className="w-full flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Generating secure code...</span>
              </div>
            ) : (
              <>
                <span>Continue with this email</span>

                {/* Credit Pill and Arrow (shown when email is classified) */}
                {classification.isValid && !isSignInMode ? (
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 text-xs">|</span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <CoinsStackIcon className="w-3.5 h-3.5 text-white" />
                      <span>{classification.credits} Credits</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white ml-0.5" />
                  </div>
                ) : (
                  <ArrowRight className="w-4 h-4 text-white" />
                )}
              </>
            )}
          </button>

          {/* Secondary Action: Work Email Alternative (shown ONLY when Personal Email is detected) */}
          {classification.isValid &&
            classification.emailType === "personal" &&
            !isSignInMode && (
              <button
                type="button"
                onClick={handleUseWorkEmailInstead}
                className="w-full h-[50px] px-5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm transition-all flex items-center justify-between shadow-xs cursor-pointer animate-fade-in"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-600" />
                  <span>Use your work email instead</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-300 text-xs">|</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB]">
                    <CoinsStackIcon className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>200 Credits</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 ml-0.5" />
                </div>
              </button>
            )}
        </div>
      </form>

      {/* "or continue with" Divider */}
      <div className="relative my-7 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <span className="relative bg-white px-3 text-xs text-slate-400 font-medium">
          or continue with
        </span>
      </div>

      {/* OAuth Buttons Section */}
      <div className="flex flex-col gap-3">
        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={() => handleOAuthClick("google")}
          className="w-full h-[48px] px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm transition-all flex items-center justify-center gap-3 shadow-xs cursor-pointer"
        >
          <GoogleLogo className="w-5 h-5 shrink-0" />
          <span>Continue with Google</span>
        </button>

        {/* Microsoft OAuth Button */}
        <button
          type="button"
          onClick={() => handleOAuthClick("microsoft")}
          className="w-full h-[48px] px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm transition-all flex items-center justify-center gap-3 shadow-xs cursor-pointer"
        >
          <MicrosoftLogo className="w-5 h-5 shrink-0" />
          <span>Continue with Microsoft</span>
        </button>
      </div>

      {/* Switch between Sign Up and Sign In */}
      <div className="mt-8 text-center text-xs sm:text-sm text-slate-500">
        {isSignInMode ? (
          <>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignInMode(false);
                setErrorMessage(null);
                setOauthNotice(null);
              }}
              className="font-bold text-[#2563EB] hover:text-[#1d4ed8] hover:underline cursor-pointer"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignInMode(true);
                setErrorMessage(null);
                setOauthNotice(null);
              }}
              className="font-bold text-[#2563EB] hover:text-[#1d4ed8] hover:underline cursor-pointer"
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
