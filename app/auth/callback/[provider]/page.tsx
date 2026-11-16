"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { XemplaLogo } from "@/components/icons/Icons";

function OAuthCallbackContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const provider = (params?.provider as string) || "oauth";
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const processAuth = async () => {
      if (errorParam) {
        if (isMounted) {
          setErrorMessage(
            errorDescription || `Authentication was cancelled or failed with ${provider}.`
          );
          setStatus("error");
        }
        return;
      }

      if (!code) {
        if (isMounted) {
          setErrorMessage("No authorization code was provided by the authentication provider.");
          setStatus("error");
        }
        return;
      }

      try {
        const { data, error } = await authClient.getSession();
        if (error || !data?.session) {
          throw new Error(
            `${provider} OAuth is not configured. Please sign in with email OTP.`,
          );
        }
        if (isMounted) {
          setStatus("success");
          router.replace("/upload");
        }
      } catch (err: unknown) {
        if (isMounted) {
          const error = err as Error;
          setErrorMessage(error.message || "Failed to complete authentication.");
          setStatus("error");
        }
      }
    };

    processAuth();

    return () => {
      isMounted = false;
    };
  }, [code, state, errorParam, errorDescription, provider, router]);

  return (
    <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col items-center text-center">
      <div className="mb-6">
        <XemplaLogo />
      </div>

      {status === "loading" ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#3B28CC]" />
          <div>
            <h2 className="text-lg font-bold text-slate-900 capitalize">
              Authenticating with {provider}...
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Please wait while we verify your account credentials.
            </p>
          </div>
        </div>
      ) : status === "error" && errorMessage ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Authentication Failed</h2>
            <p className="text-xs text-red-600 mt-1.5 leading-relaxed bg-red-50 p-3 rounded-lg border border-red-100">
              {errorMessage}
            </p>
          </div>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2b26c7] text-white text-xs font-semibold hover:bg-[#251fb8] transition-all shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Sign in
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-[#3B28CC]" />
            Loading authentication handler...
          </div>
        }
      >
        <OAuthCallbackContent />
      </Suspense>
    </main>
  );
}
