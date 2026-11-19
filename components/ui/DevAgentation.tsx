"use client";

import { Agentation } from "agentation";

/** Dev-only visual feedback toolbar. Renders nothing in production builds. */
export function DevAgentation() {
  if (process.env.NODE_ENV !== "development") return null;
  return <Agentation endpoint="http://localhost:4747" />;
}
