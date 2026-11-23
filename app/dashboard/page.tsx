"use client";

import { WorkspaceSkeleton } from "@/components/ui/Skeleton";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ApiError, getCurrentUser } from "@/lib/api";
import { UserProfile } from "@/types/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { HeadlineStats, InsightLenses, useInsights } from "@/components/insights/InsightLenses";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const insights = useInsights(undefined, Boolean(session));

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
      <WorkspaceSkeleton variant="dashboard" label="Loading your workspace" />
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
    <DashboardShell
      title={`Welcome back, ${firstName}`}
      userEmail={profile.email}
      userName={profile.full_name || undefined}
      creditBalance={profile.credit_balance}
      onLogout={handleLogout}
    >
      {!profile.profile_complete ? (
        <section
          aria-label="Complete your profile"
          className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="text-lg font-medium tracking-tight">Complete your profile</h2>
            <p className="mt-1 text-sm text-app-muted">
              Add your job title, company and role to finish setting up your account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition-colors hover:bg-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
          >
            Complete profile
          </button>
        </section>
      ) : null}

      <HeadlineStats state={insights} />

      <AnalysisPanel email={profile.email} />

      <section
        aria-label="Insight areas"
        className="mt-4 rounded-3xl bg-white p-6"
      >
        <h2 className="text-lg font-medium tracking-tight">Insight areas</h2>
        <p className="mt-1 text-sm text-app-muted">
          The key numbers for your latest upload, one card per insight area.
        </p>
        <div className="mt-5">
          <InsightLenses state={insights} />
        </div>
      </section>
    </DashboardShell>
  );
}
