import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ENGINE_URL = process.env.ASSEMBLER_ENGINE_URL ?? "http://localhost:8001";

export async function GET() {
  try {
    const response = await fetch(`${ENGINE_URL}/system/stats`, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Engine returned an error while reading system stats." },
        { status: response.status },
      );
    }

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json(
      { error: "Cannot reach engine. Start it with `npm run engine:up`." },
      { status: 503 },
    );
  }
}