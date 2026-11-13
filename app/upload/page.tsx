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
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-linear-to-b from-[#F5F6FE] via-[#EDF0FE] to-[#F5F7FF]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading session...</p>
      </div>
    );
  }

  if (!session || profileError) {
    if (profileError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F5F6FE] px-6 text-center">
          <p role="alert" className="text-sm text-red-700">{profileError}</p>
          <button
            type="button"
            onClick={() => {
              setProfile(null);
              setProfileError(null);
              setRetryCount((count) => count + 1);
            }}
            className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white"
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
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F5F6FE]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading your workspace...</p>
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
