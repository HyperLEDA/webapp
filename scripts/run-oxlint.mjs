import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = dirname(fileURLToPath(import.meta.resolve("oxlint-plugin-anti-slop")));
const dest = join(repoRoot, ".oxlint-plugins", "anti-slop");

rmSync(dest, { recursive: true, force: true });
mkdirSync(dirname(dest), { recursive: true });
cpSync(source, dest, { recursive: true });
writeFileSync(join(dest, "package.json"), JSON.stringify({ type: "module" }));

const result = spawnSync(join(repoRoot, "node_modules", ".bin", "oxlint"), process.argv.slice(2), {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
