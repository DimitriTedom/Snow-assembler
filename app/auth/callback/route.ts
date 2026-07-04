import { NextResponse } from "next/server";

// Placeholder callback route (useful for OAuth / magic links later).
export function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/dashboard";
  return NextResponse.redirect(new URL(next, url.origin));
}
