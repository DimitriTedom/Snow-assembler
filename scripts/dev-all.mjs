import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
  return result.status ?? 1;
}

console.log("Starting FFmpeg assembler engine (Docker)...");
const engineStatus = run("docker", ["compose", "up", "engine", "--build", "-d"]);
if (engineStatus !== 0) {
  console.error("Failed to start engine. Is Docker running?");
  process.exit(engineStatus);
}

if (!existsSync(nextBin)) {
  console.error("Next.js binary not found. Run: npm install");
  process.exit(1);
}

console.log("Starting Next.js dev server...");
const nextStatus = spawnSync(process.execPath, [nextBin, "dev"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(nextStatus.status ?? 1);