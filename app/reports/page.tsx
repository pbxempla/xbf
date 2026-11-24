"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WorkspaceSkeleton } from "@/components/ui/Skeleton";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useInsights } from "@/components/insights/InsightLenses";
import { ReportView } from "@/components/reports/ReportView";
import { authClient } from "@/lib/auth-client";
import { ApiError, getCurrentUser } from "@/lib/api";
import { fetchAnalyticsSummary } from "@/lib/mapping/api";
import type { AnalyticsSummary } from "@/lib/mapping/contracts";
import type { UserProfile } from "@/types/auth";

export default function ReportsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const insights = useInsights(undefined, Boolean(session));
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  const uploadId = insights.status === "ready" ? insights.insights.upload_id : null;

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
        setPageError(error instanceof Error ? error.message : "Unable to load your account.");
      });
    return () => {
      active = false;
    };
  }, [isPending, session, router, retryCount]);

  // The engine summary is optional: the report still works from the computed insights alone.
  useEffect(() => {
    if (!uploadId) return;
    let active = true;
    fetchAnalyticsSummary(uploadId)
      .then((result) => {
        if (active) setSummary(result);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [uploadId]);

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
    return <WorkspaceSkeleton variant="dashboard" label="Loading your report" />;
  }
  if (!session) return null;

  if (pageError || !profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-app-canvas px-6 text-center">
        <p role="alert" className="max-w-md text-sm leading-6 text-[#8b0000]">
          {pageError || "Unable to load your account."}
        </p>
        <button
          type="button"
          onClick={() => {
            setProfile(null);
            setPageError(null);
            setRetryCount((count) => count + 1);
          }}
          className="flex min-h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
        >
          Retry
        </button>
      </main>
    );
  }

  return (
    <DashboardShell
      title="Report"
      current="reports"
      userEmail={profile.email}
      userName={profile.full_name || undefined}
      creditBalance={profile.credit_balance}
      onLogout={handleLogout}
    >
      <div className="mt-4">
        {insights.status === "loading" ? (
          <div role="status" aria-label="Loading report" className="space-y-4">
            <div className="h-32 animate-pulse rounded-3xl bg-white" />
            <div className="h-48 animate-pulse rounded-3xl bg-white" />
            <div className="h-48 animate-pulse rounded-3xl bg-white" />
          </div>
        ) : insights.status === "empty" ? (
          <section className="rounded-3xl bg-white p-8 text-center">
            <h2 className="text-lg font-medium tracking-tight">No report yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-app-muted">
              Upload a work-order export and map its columns. Your report appears here as soon as the
              analysis has run.
            </p>
            <Link
              href="/upload"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white hover:bg-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
            >
              Upload data
            </Link>
          </section>
        ) : insights.status === "error" ? (
          <p role="alert" className="rounded-3xl bg-white p-6 text-sm text-[#8b0000]">
            {insights.message}
          </p>
        ) : (
          <ReportView insights={insights.insights} summary={summary} />
        )}
      </div>
    </DashboardShell>
  );
}
