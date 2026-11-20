"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceSkeleton } from "@/components/ui/Skeleton";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ProfileOverviewCard } from "@/components/profile/ProfileOverviewCard";
import { authClient } from "@/lib/auth-client";
import { ApiError, getCurrentUser } from "@/lib/api";
import type { UserProfile } from "@/types/auth";

export default function ProfilePage() {
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
        setPageError(error instanceof Error ? error.message : "Unable to load your profile.");
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
    return <WorkspaceSkeleton variant="dashboard" label="Loading your profile" />;
  }
  if (!session) return null;

  if (pageError || !profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-app-canvas px-6 text-center">
        <p role="alert" className="max-w-md text-sm leading-6 text-[#8b0000]">
          {pageError || "Unable to load your profile."}
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
      title="Your profile"
      current="profile"
      userEmail={profile.email}
      userName={profile.full_name || undefined}
      creditBalance={profile.credit_balance}
      onLogout={handleLogout}
    >
      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
      <div className="min-w-0">
      <ProfileOverviewCard profile={profile} onProfile={setProfile} />

      </div>
      <div aria-hidden="true" className="hidden min-h-40 lg:block" />
      </div>
    </DashboardShell>
  );
}
