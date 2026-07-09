import { NextResponse } from "next/server";

import { formatEngineFetchError } from "@/lib/assembler/engine-errors";
import { fetchEngine } from "@/lib/assembler/engine-fetch";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = await fetchEngine({ path: `/assemble/jobs/${id}`, context: "assemble" });
    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: payload.detail ?? "Job not found." }, { status: response.status });
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : formatEngineFetchError(error, "assemble");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = await fetchEngine({ path: `/assemble/jobs/${id}`, method: "DELETE", context: "assemble" });
    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: payload.detail ?? "Job not found." }, { status: response.status });
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : formatEngineFetchError(error, "assemble");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}