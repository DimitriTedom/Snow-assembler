import { formatEngineFetchError } from "@/lib/assembler/engine-errors";

const ENGINE_URL = process.env.ASSEMBLER_ENGINE_URL ?? "http://localhost:8001";

type EngineFetchOptions = {
  path: string;
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  signal?: AbortSignal;
  context?: "assemble" | "validate";
};

export async function fetchEngine(options: EngineFetchOptions) {
  const { path, method = "GET", headers, body, signal, context = "assemble" } = options;

  try {
    return await fetch(`${ENGINE_URL}${path}`, {
      method,
      headers,
      body,
      signal,
    });
  } catch (error) {
    throw new Error(formatEngineFetchError(error, context));
  }
}