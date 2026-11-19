"use client";

import { WorkspaceSkeleton } from "@/components/ui/Skeleton";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ApiError, getCurrentUser } from "@/lib/api";
import { UserProfile } from "@/types/auth";
import { UploadScreen } from "@/components/upload/UploadScreen";

export default function UploadPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (isPending || !session) return;

    let active = true;
    getCurrentUser()
      .then((user) => {
        if (active) {
          setProfileError(null);
          setProfile(user);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/");
          return;
        }
        setProfileError(
          error instanceof Error ? error.message : "Unable to load your account profile.",
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
      setProfileError(error instanceof Error ? error.message : "Unable to sign out.");
    }
  };

  if (isPending) {
    return (
      <WorkspaceSkeleton label="Loading your workspace" />
    );
  }

  if (!session || profileError) {
    if (profileError) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-app-canvas px-6 text-center">
          <p role="alert" className="max-w-md text-sm leading-6 text-[#8b0000]">{profileError}</p>
          <button
            type="button"
            onClick={() => {
              setProfile(null);
              setProfileError(null);
              setRetryCount((count) => count + 1);
            }}
            className="flex min-h-11 items-center justify-center rounded-lg bg-app-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-[#30363b] active:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
          >
            Retry
          </button>
        </main>
      );
    }
    return null;
  }

  if (!profile) {
    return (
      <WorkspaceSkeleton label="Loading your workspace" />
    );
  }

  return (
    <UploadScreen
      userEmail={profile.email}
      userName={profile.full_name || undefined}
      creditBalance={profile.credit_balance}
      onLogout={handleLogout}
    />
  );
}
