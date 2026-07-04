import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tscBin = join(root, "node_modules", "typescript", "lib", "tsc.js");
const args = process.argv.slice(2);

if (!existsSync(tscBin)) {
  console.error("TypeScript compiler not found. Run: npm install");
  process.exit(1);
}

const result = spawnSync(process.execPath, [tscBin, ...args], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);