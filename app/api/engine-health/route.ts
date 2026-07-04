import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ENGINE_URL = process.env.ASSEMBLER_ENGINE_URL ?? "http://localhost:8001";

export async function GET() {
  try {
    const response = await fetch(`${ENGINE_URL}/health`, { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", ffmpeg: "unavailable", detail: payload.detail ?? "Engine unhealthy." },
        { status: response.status },
      );
    }

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      {
        status: "offline",
        service: "snow-assembler-engine",
        ffmpeg: "Cannot reach engine. Start it with `npm run engine:up`.",
      },
      { status: 503 },
    );
  }
}