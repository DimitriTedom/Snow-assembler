import { formatEngineFetchError } from "@/lib/assembler/engine-errors";
import { getPublicEngineUrl } from "@/lib/assembler/engine-url";

type UploadTarget = "validate" | "assemble";

const API_PATHS: Record<UploadTarget, string> = {
  validate: "/api/validate",
  assemble: "/api/assemble",
};

const ENGINE_PATHS: Record<UploadTarget, string> = {
  validate: "/validate/upload",
  assemble: "/assemble/images/upload",
};

/** Post multipart uploads via same-origin API, falling back to direct engine access. */
export async function postAssemblerUpload(target: UploadTarget, formData: FormData, signal?: AbortSignal) {
  const apiResponse = await fetch(API_PATHS[target], {
    method: "POST",
    body: formData,
    signal,
  }).catch((error) => {
    throw new Error(formatEngineFetchError(error, target === "validate" ? "validate" : "assemble"));
  });

  if (apiResponse.status !== 413) {
    return apiResponse;
  }

  const engineResponse = await fetch(`${getPublicEngineUrl()}${ENGINE_PATHS[target]}`, {
    method: "POST",
    body: formData,
    signal,
  }).catch((error) => {
    throw new Error(formatEngineFetchError(error, target === "validate" ? "validate" : "assemble"));
  });

  return engineResponse;
}