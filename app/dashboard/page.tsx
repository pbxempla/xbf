"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-app-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-app-accent border-t-transparent" />
        <p role="status" className="text-sm text-app-muted">Loading your workspace…</p>
      </div>
    );
  }

  if (!session) return null;

  if (pageError || !profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-app-canvas px-6 text-center">
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
          className="flex min-h-11 items-center justify-center rounded-lg bg-app-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-[#30363b] active:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
        >
          Retry
        </button>
      </main>
    );
  }

  const firstName = profile.full_name?.trim().split(/\s+/)[0] || "there";

  return (
    <div className="flex min-h-screen w-full flex-col bg-app-canvas text-app-ink">
      <UploadHeader
        userEmail={profile.email}
        userName={profile.full_name || undefined}
        creditBalance={profile.credit_balance}
        onLogout={handleLogout}
      />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
            Welcome back, {firstName}.
          </h1>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:gap-14">
          <section className="rounded-2xl border border-app-line bg-app-surface p-6 sm:p-8">
            <h2 className="text-2xl font-medium tracking-tight">Upload facility data</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-app-muted">
              Choose a CSV or Excel file to map facility and work-order fields.
            </p>
            <button
              type="button"
              onClick={() => router.push("/upload")}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-app-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-app-accent-strong active:bg-[#204d9c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
            >
              Choose a file
            </button>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-app-muted">Account details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4 lg:flex-col lg:gap-1">
                <dt className="text-app-muted">Email</dt>
                <dd className="break-all font-medium text-app-ink sm:text-right lg:text-left">
                  {profile.email}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-app-muted">Account type</dt>
                <dd className="font-medium capitalize text-app-ink">{profile.email_type}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-app-muted">Email status</dt>
                <dd className="font-medium text-app-ink">
                  {profile.is_verified ? "Verified" : "Unverified"}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </main>
    </div>
  );
}
