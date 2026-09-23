// Leaves Draft Mode (deletes the __prerender_bypass cookie) and goes back to the page.
//   GET or POST /api/preview/disable?redirect=/articles/mon-article
// Only same-site relative paths are accepted as redirect target.
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

function safeTarget(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

async function disable(request: NextRequest) {
  (await draftMode()).disable();
  redirect(safeTarget(request.nextUrl.searchParams.get("redirect")));
}

export const GET = disable;
export const POST = disable;
