import { NextResponse } from "next/server";

import { toEngineProjectPayload } from "@/lib/assembler/api";

export const runtime = "nodejs";

const ENGINE_URL = process.env.ASSEMBLER_ENGINE_URL ?? "http://localhost:8001";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      let incoming: FormData;
      try {
        incoming = await request.formData();
      } catch {
        return NextResponse.json(
          {
            error:
              "Upload too large for Next.js proxy. Use Episode folder mode, or upload directly via the workspace (engine :8001).",
          },
          { status: 413 },
        );
      }
      const engineForm = new FormData();
      const scenesJson = incoming.get("scenes_json");
      const imageNaming = incoming.get("image_naming") ?? "auto";

      if (!(scenesJson instanceof File)) {
        return NextResponse.json({ error: "Scenes JSON file is required." }, { status: 400 });
      }

      engineForm.append("scenes_json", scenesJson, scenesJson.name);
      engineForm.append("image_naming", String(imageNaming));

      for (const [, value] of incoming.entries()) {
        if (value instanceof File && value !== scenesJson) {
          engineForm.append("images", value, value.name);
        }
      }

      const response = await fetch(`${ENGINE_URL}/validate/upload`, {
        method: "POST",
        body: engineForm,
      });
      const payload = await response.json();

      if (!response.ok) {
        return NextResponse.json({ error: payload.detail ?? "Validation failed." }, { status: response.status });
      }

      return NextResponse.json(payload);
    }

    const body = await request.json();
    const engineBody =
      "project_dir" in body || "projectDir" in body ? toEngineProjectPayload(body) : body;
    const response = await fetch(`${ENGINE_URL}/validate/project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(engineBody),
    });
    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: result.detail ?? "Validation failed." }, { status: response.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("fetch failed")
        ? "Cannot reach assembler engine. Start it with `npm run engine:up`."
        : error instanceof Error
          ? error.message
          : "Unexpected validation error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}