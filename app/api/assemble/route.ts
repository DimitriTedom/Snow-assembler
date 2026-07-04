import { NextResponse } from "next/server";

import { toEngineProjectPayload } from "@/lib/assembler/api";

export const runtime = "nodejs";
export const maxDuration = 300;

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
      const narration = incoming.get("narration");

      if (!(scenesJson instanceof File)) {
        return NextResponse.json({ error: "Scenes JSON file is required." }, { status: 400 });
      }
      if (!(narration instanceof File)) {
        return NextResponse.json({ error: "Narration audio file is required." }, { status: 400 });
      }

      engineForm.append("scenes_json", scenesJson, scenesJson.name);
      engineForm.append("narration", narration, narration.name);
      engineForm.append("image_naming", String(incoming.get("image_naming") ?? "auto"));
      engineForm.append("width", String(incoming.get("width") ?? "1920"));
      engineForm.append("height", String(incoming.get("height") ?? "1080"));
      engineForm.append("fps", String(incoming.get("fps") ?? "30"));
      engineForm.append("motion", String(incoming.get("motion") ?? "none"));

      for (const [, value] of incoming.entries()) {
        if (value instanceof File && value !== scenesJson && value !== narration) {
          engineForm.append("images", value, value.name);
        }
      }

      const response = await fetch(`${ENGINE_URL}/assemble/images/upload`, {
        method: "POST",
        body: engineForm,
      });

      if (!response.ok) {
        const payload = await response.json();
        return NextResponse.json({ error: payload.detail ?? "Assembly failed." }, { status: response.status });
      }

      const buffer = await response.arrayBuffer();
      const sceneCount = response.headers.get("X-Snow-Scene-Count") ?? "0";
      const totalDuration = response.headers.get("X-Snow-Total-Duration") ?? "0";

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": 'attachment; filename="assembled.mp4"',
          "X-Snow-Scene-Count": sceneCount,
          "X-Snow-Total-Duration": totalDuration,
        },
      });
    }

    const body = await request.json();
    const engineBody =
      "project_dir" in body || "projectDir" in body ? toEngineProjectPayload(body) : body;
    const response = await fetch(`${ENGINE_URL}/assemble/images/project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(engineBody),
    });
    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: result.detail ?? "Assembly failed." }, { status: response.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("fetch failed")
        ? "Cannot reach assembler engine. Start it with `npm run engine:up`."
        : error instanceof Error
          ? error.message
          : "Unexpected assembly error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}