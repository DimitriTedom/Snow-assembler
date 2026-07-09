import { NextResponse } from "next/server";

import { toEngineProjectPayload } from "@/lib/assembler/api";
import { formatEngineFetchError, isAbortError } from "@/lib/assembler/engine-errors";
import { fetchEngine } from "@/lib/assembler/engine-fetch";

export const runtime = "nodejs";
export const maxDuration = 3600;

export async function POST(request: Request) {
  const engineAbort = new AbortController();
  const onClientAbort = () => engineAbort.abort();

  if (request.signal.aborted) {
    return NextResponse.json({ error: "Validation cancelled." }, { status: 499 });
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

      const response = await fetchEngine({
        path: "/validate/upload",
        method: "POST",
        body: engineForm,
        signal: engineAbort.signal,
        context: "validate",
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
    const response = await fetchEngine({
      path: "/validate/project",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(engineBody),
      signal: engineAbort.signal,
      context: "validate",
    });
    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: result.detail ?? "Validation failed." }, { status: response.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (request.signal.aborted || engineAbort.signal.aborted || isAbortError(error)) {
      return NextResponse.json({ error: "Validation cancelled." }, { status: 499 });
    }

    const message =
      error instanceof Error ? error.message : formatEngineFetchError(error, "validate");

    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    request.signal.removeEventListener("abort", onClientAbort);
  }
}