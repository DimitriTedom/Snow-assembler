import { NextResponse } from "next/server";

import { DEFAULT_PRESETS } from "@/lib/assembler/presets";
import { fetchEngine } from "@/lib/assembler/engine-fetch";

export async function GET() {
  try {
    const response = await fetchEngine({ path: "/presets", context: "validate" });
    if (response.ok) {
      return NextResponse.json(await response.json());
    }
  } catch {
    // fall through to bundled defaults
  }

  return NextResponse.json({ presets: DEFAULT_PRESETS });
}