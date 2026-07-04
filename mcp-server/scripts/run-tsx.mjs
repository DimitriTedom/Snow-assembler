import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tsxBin = join(root, "node_modules", "tsx", "dist", "cli.mjs");
const args = process.argv.slice(2);

if (!existsSync(tsxBin)) {
  console.error("tsx not found. Run: npm install");
  process.exit(1);
}

const result = spawnSync(process.execPath, [tsxBin, ...args], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);