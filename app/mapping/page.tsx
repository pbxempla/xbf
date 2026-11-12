"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Database, Layers, CheckCircle2 } from "lucide-react";
import { UploadHeader } from "@/components/upload/UploadHeader";
import { authClient } from "@/lib/auth-client";

interface CachedDatasetInfo {
  fileName: string;
  fileSize: number;
  formattedSize: string;
  fileType: string;
  headers: string[];
  rowCount: number;
  columnCount: number;
}

export default function MappingPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [dataset] = useState<CachedDatasetInfo | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("xempla_current_dataset");
        if (stored) {
          return JSON.parse(stored) as CachedDatasetInfo;
        }
      } catch {
        // Ignore JSON parse error
      }
    }
    return null;
  });

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F5F6FE]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-[#F5F6FE] via-[#EDF0FE] to-[#F5F7FF] flex flex-col">
      <UploadHeader
        userEmail={session?.user?.email}
        userName={session?.user?.name || undefined}
      />

      <main className="w-full px-6 sm:px-8 lg:px-12 py-8 flex flex-col flex-1">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-100 rounded-lg px-3 py-1.5 shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Upload</span>
          </Link>
        </div>

        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100/90 flex flex-col gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Stage 2 • Schema Mapping
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-1">
              Data Mapping Foundation
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Your dataset has been validated and parsed. Schema mapping will map these columns into Xempla entities.
            </p>
          </div>

          {dataset ? (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{dataset.fileName}</h3>
                    <p className="text-xs text-slate-500">
                      {dataset.formattedSize} • {dataset.rowCount.toLocaleString()} rows • {dataset.columnCount} columns
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready to Map
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Detected Columns ({dataset.headers.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {dataset.headers.map((h, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium border border-slate-200"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs">No dataset in memory. Please upload a file first.</p>
              <Link
                href="/upload"
                className="mt-3 inline-block px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
              >
                Go to Upload
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
