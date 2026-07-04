import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const prismaBin = join(root, "node_modules", "prisma", "build", "index.js");
const args = process.argv.slice(2);

if (!existsSync(prismaBin)) {
  console.error("Prisma CLI not found. Run: npm install");
  process.exit(1);
}

const result = spawnSync(process.execPath, [prismaBin, ...args], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);