import { spawnSync } from "node:child_process";

const projectName = process.env.CF_PAGES_PROJECT || "cafe-qr-ordering";
const dbName = process.env.CF_D1_NAME || "cafe-qr-db";

const run = (args) => {
  const result = spawnSync("npx", ["wrangler", ...args], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

console.log(`Creating D1 database: ${dbName}`);
run(["d1", "create", dbName, "--binding", "DB", "--update-config"]);

console.log(`Creating Pages project: ${projectName}`);
run(["pages", "project", "create", projectName, "--production-branch", "main"]);
