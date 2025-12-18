import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectName = process.env.CF_PAGES_PROJECT || "cafe-qr-ordering";
const dbName = process.env.CF_D1_NAME || "cafe-qr-db";

const wranglerBin = existsSync(resolve("node_modules/.bin/wrangler"))
  ? resolve("node_modules/.bin/wrangler")
  : "npx";

const wrapArgs = (args) => (wranglerBin === "npx" ? ["wrangler", ...args] : args);

const run = (args, options = {}) => {
  const result = spawnSync(wranglerBin, wrapArgs(args), {
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8"
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result;
};

console.log(`Creating D1 database: ${dbName}`);
const d1Result = run(["d1", "create", dbName], { capture: true });
const output = `${d1Result.stdout ?? ""}${d1Result.stderr ?? ""}`;
const jsonMatch = output.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const dbId = parsed?.d1_databases?.[0]?.database_id;
    if (dbId) {
      const configPath = resolve("wrangler.jsonc");
      const config = readFileSync(configPath, "utf8");
      const updated = config.replace(/\"database_id\"\\s*:\\s*\"[^\"]*\"/, `"database_id": "${dbId}"`);
      writeFileSync(configPath, updated);
      console.log(`Updated wrangler.jsonc with database_id ${dbId}`);
    }
  } catch (error) {
    console.warn("Could not parse D1 create output. Update wrangler.jsonc manually.");
  }
} else {
  console.warn("Could not find D1 JSON output. Update wrangler.jsonc manually.");
}

console.log(`Creating Pages project: ${projectName}`);
run(["pages", "project", "create", projectName, "--production-branch", "main"]);
