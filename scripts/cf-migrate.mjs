import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const isLocal = args.includes("--local");
const flag = isLocal ? "--local" : "--remote";

const result = spawnSync("npx", ["wrangler", "d1", "migrations", "apply", "DB", flag], {
  stdio: "inherit"
});

process.exit(result.status ?? 0);
