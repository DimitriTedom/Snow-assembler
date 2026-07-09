import type { AssemblyJob, ProjectAssemblySettings } from "@/lib/assembler/types";

export async function startAssemblyJob(settings: ProjectAssemblySettings, signal?: AbortSignal) {
  const response = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
    signal,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to start assembly job.");
  }
  return payload as AssemblyJob;
}

export async function getAssemblyJob(jobId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store", signal });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to fetch assembly job.");
  }
  return payload as AssemblyJob;
}

export async function cancelAssemblyJob(jobId: string) {
  const response = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to cancel assembly job.");
  }
  return payload as AssemblyJob;
}

export function waitForAssemblyJob(
  jobId: string,
  options?: {
    signal?: AbortSignal;
    onUpdate?: (job: AssemblyJob) => void;
    intervalMs?: number;
  },
) {
  const intervalMs = options?.intervalMs ?? 1500;

  return new Promise<AssemblyJob>((resolve, reject) => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) clearInterval(timer);
    };

    const poll = async () => {
      try {
        const job = await getAssemblyJob(jobId, options?.signal);
        options?.onUpdate?.(job);

        if (job.status === "completed") {
          stop();
          resolve(job);
        } else if (job.status === "failed") {
          stop();
          reject(new Error(job.error ?? job.message ?? "Assembly failed."));
        } else if (job.status === "cancelled") {
          stop();
          reject(new DOMException("Cancelled", "AbortError"));
        }
      } catch (error) {
        stop();
        reject(error);
      }
    };

    if (options?.signal?.aborted) {
      reject(new DOMException("Cancelled", "AbortError"));
      return;
    }

    options?.signal?.addEventListener(
      "abort",
      () => {
        stop();
        void cancelAssemblyJob(jobId);
        reject(new DOMException("Cancelled", "AbortError"));
      },
      { once: true },
    );

    void poll();
    timer = setInterval(() => void poll(), intervalMs);
  });
}