"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { UploadScreen } from "@/components/upload/UploadScreen";

export default function UploadPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/");
    }
  }, [isPending, session, router]);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch {
      // Ignore
    }
    router.replace("/");
  };

  if (isPending) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-linear-to-b from-[#F5F6FE] via-[#EDF0FE] to-[#F5F7FF]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <UploadScreen
      userEmail={session.user?.email}
      userName={session.user?.name || undefined}
      onLogout={handleLogout}
    />
  );
}
