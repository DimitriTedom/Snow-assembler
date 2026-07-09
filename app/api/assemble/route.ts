import { NextResponse } from "next/server";

import { toEngineProjectPayload } from "@/lib/assembler/api";
import { normalizeOutputFilename } from "@/lib/assembler/filename";
import { formatEngineFetchError, isAbortError } from "@/lib/assembler/engine-errors";
import { fetchEngine } from "@/lib/assembler/engine-fetch";

export const runtime = "nodejs";
export const maxDuration = 3600;

export async function POST(request: Request) {
  const engineAbort = new AbortController();
  const onClientAbort = () => engineAbort.abort();

  if (request.signal.aborted) {
    return NextResponse.json({ error: "Assembly cancelled." }, { status: 499 });
  }
  request.signal.addEventListener("abort", onClientAbort);

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
      engineForm.append("transition", String(incoming.get("transition") ?? "none"));
      engineForm.append(
        "transition_duration",
        String(incoming.get("transition_duration") ?? "0.4"),
      );
      engineForm.append("quality", String(incoming.get("quality") ?? "standard"));
      engineForm.append("export_captions", String(incoming.get("export_captions") ?? "false"));
      const outputFilename = normalizeOutputFilename(String(incoming.get("output_filename") ?? "assembled.mp4"));
      engineForm.append("output_filename", outputFilename);

      for (const [, value] of incoming.entries()) {
        if (value instanceof File && value !== scenesJson && value !== narration) {
          engineForm.append("images", value, value.name);
        }
      }

      const response = await fetchEngine({
        path: "/assemble/images/upload",
        method: "POST",
        body: engineForm,
        signal: engineAbort.signal,
        context: "assemble",
      });

      if (!response.ok) {
        const payload = await response.json();
        return NextResponse.json({ error: payload.detail ?? "Assembly failed." }, { status: response.status });
      }

      const buffer = await response.arrayBuffer();
      const sceneCount = response.headers.get("X-Snow-Scene-Count") ?? "0";
      const totalDuration = response.headers.get("X-Snow-Total-Duration") ?? "0";
      const resolvedFilename =
        response.headers.get("X-Snow-Output-Filename") ?? outputFilename;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="${resolvedFilename}"`,
          "X-Snow-Scene-Count": sceneCount,
          "X-Snow-Output-Filename": resolvedFilename,
          "X-Snow-Total-Duration": totalDuration,
        },
      });
    }

    const body = await request.json();
    const engineBody =
      "project_dir" in body || "projectDir" in body ? toEngineProjectPayload(body) : body;
    const assemblePath =
      engineBody.media_type === "videos"
        ? "/assemble/videos/project"
        : "/assemble/images/project";

    const response = await fetchEngine({
      path: assemblePath,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(engineBody),
      signal: engineAbort.signal,
      context: "assemble",
    });
    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: result.detail ?? "Assembly failed." }, { status: response.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (request.signal.aborted || engineAbort.signal.aborted || isAbortError(error)) {
      return NextResponse.json({ error: "Assembly cancelled." }, { status: 499 });
    }

    const message =
      error instanceof Error ? error.message : formatEngineFetchError(error, "assemble");

    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    request.signal.removeEventListener("abort", onClientAbort);
  }
}