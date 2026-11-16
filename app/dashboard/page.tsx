"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, Coins, UploadCloud } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ApiError, getCurrentUser } from "@/lib/api";
import { UserProfile } from "@/types/auth";
import { UploadHeader } from "@/components/upload/UploadHeader";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isPending && !session) router.replace("/");
  }, [isPending, session, router]);

  useEffect(() => {
    if (isPending || !session) return;

    let active = true;
    getCurrentUser()
      .then((user) => {
        if (!active) return;
        setProfile(user);
        setPageError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/");
          return;
        }
        setPageError(
          error instanceof Error ? error.message : "Unable to load your dashboard.",
        );
      });

    return () => {
      active = false;
    };
  }, [isPending, session, router, retryCount]);

  const handleLogout = async () => {
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message || "Unable to sign out.");
      router.replace("/");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to sign out.");
    }
  };

  if (isPending || (session && !profile && !pageError)) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#494fdf] border-t-transparent" />
        <p className="text-sm text-[#505a63]">Loading your dashboard...</p>
      </div>
    );
  }

  if (!session) return null;

  if (pageError || !profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-white px-6 text-center">
        <p role="alert" className="max-w-md text-sm leading-6 text-[#8b0000]">
          {pageError || "Unable to load your dashboard."}
        </p>
        <button
          type="button"
          onClick={() => {
            setProfile(null);
            setPageError(null);
            setRetryCount((count) => count + 1);
          }}
          className="flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition-colors hover:bg-[#191c1f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf]"
        >
          Retry
        </button>
      </main>
    );
  }

  const firstName = profile.full_name?.trim().split(/\s+/)[0] || "there";

  return (
    <div className="flex min-h-screen w-full flex-col bg-white text-[#191c1f]">
      <UploadHeader
        sectionLabel="Dashboard"
        userEmail={profile.email}
        userName={profile.full_name || undefined}
        emailType={profile.email_type}
        creditBalance={profile.credit_balance}
        onLogout={handleLogout}
      />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#5c5e60]">
            Workspace overview
          </p>
          <h1 className="text-[36px] font-medium leading-[1.05] tracking-[-0.04em] sm:text-[48px]">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#505a63] sm:text-base">
            Your facility workspace is ready. Here&apos;s your account at a glance.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <section className="rounded-[20px] bg-black p-6 text-white sm:p-8">
            <div className="flex items-center gap-3 text-white/65">
              <Coins aria-hidden="true" className="h-5 w-5" />
              <h2 className="text-sm font-semibold">Available credits</h2>
            </div>
            <p className="mt-6 text-5xl font-medium tracking-tight">
              {profile.credit_balance}
              <span className="ml-2 text-base font-normal text-white/65">credits</span>
            </p>
            <p className="mt-4 text-sm text-white/65">
              Credits are available for your Xempla workspace.
            </p>
          </section>

          <section className="rounded-[20px] border border-[#e2e2e7] bg-white p-6 sm:p-8">
            <h2 className="text-xl font-medium tracking-tight">Account details</h2>
            <dl className="mt-5 divide-y divide-[#e2e2e7] text-sm">
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-[#5c5e60]">Email</dt>
                <dd className="break-all text-right font-medium">{profile.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-[#5c5e60]">Account type</dt>
                <dd className="inline-flex items-center gap-2 font-medium capitalize">
                  <Building2 aria-hidden="true" className="h-4 w-4 text-[#494fdf]" />
                  {profile.email_type}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-[#5c5e60]">Email status</dt>
                <dd className="inline-flex items-center gap-2 font-medium text-[#006400]">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  {profile.is_verified ? "Verified" : "Unverified"}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="mt-5 flex flex-col gap-6 rounded-[20px] border border-[#e2e2e7] bg-[#f4f4f4] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#191c1f]">
              <UploadCloud aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-medium tracking-tight">Start with your facility data</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#505a63]">
                Upload a CSV or Excel file to begin mapping your facility information.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/upload")}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white transition-colors hover:bg-[#191c1f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf]"
          >
            Continue to upload
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </section>
      </main>
    </div>
  );
}
