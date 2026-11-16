"use client";

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
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#494fdf] border-t-transparent" />
        <p className="text-sm text-[#505a63]">Loading session...</p>
      </div>
    );
  }

  if (!session || profileError) {
    if (profileError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-white px-6 text-center">
          <p role="alert" className="max-w-md text-sm leading-6 text-[#8b0000]">{profileError}</p>
          <button
            type="button"
            onClick={() => {
              setProfile(null);
              setProfileError(null);
              setRetryCount((count) => count + 1);
            }}
            className="flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition-colors hover:bg-[#191c1f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf]"
          >
            Retry
          </button>
        </div>
      );
    }
    return null;
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#494fdf] border-t-transparent" />
        <p className="text-sm text-[#505a63]">Loading your workspace...</p>
      </div>
    );
  }

  return (
    <UploadScreen
      userEmail={profile.email}
      userName={profile.full_name || undefined}
      emailType={profile.email_type}
      creditBalance={profile.credit_balance}
      onLogout={handleLogout}
    />
  );
}
