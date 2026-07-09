import { NextResponse } from "next/server";

import { toEngineProjectPayload } from "@/lib/assembler/api";
import { formatEngineFetchError, isAbortError } from "@/lib/assembler/engine-errors";
import { fetchEngine } from "@/lib/assembler/engine-fetch";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const engineBody = toEngineProjectPayload(body);
    const response = await fetchEngine({
      path: "/assemble/jobs",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(engineBody),
      context: "assemble",
    });
    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: payload.detail ?? "Failed to start job." }, { status: response.status });
    }
    return NextResponse.json(payload);
  } catch (error) {
    if (isAbortError(error)) {
      return NextResponse.json({ error: "Cancelled." }, { status: 499 });
    }
    const message = error instanceof Error ? error.message : formatEngineFetchError(error, "assemble");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}