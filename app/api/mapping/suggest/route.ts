import { NextResponse } from "next/server";

// Deprecated. AI mapping suggestions are now requested from the authenticated
// FastAPI endpoint (POST /uploads/{id}/mapping/ai-suggestions) through the
// /api/backend proxy. This route no longer talks to any provider and the
// OpenRouter key is not read by the frontend.
export function POST() {
  return NextResponse.json(
    {
      detail:
        "This endpoint was removed. Request AI suggestions from the mapping page.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
