import { spawnSync } from "node:child_process";

const projectName = process.env.CF_PAGES_PROJECT || "cafe-qr-ordering";

const result = spawnSync(
  "npx",
  ["wrangler", "pages", "deploy", "dist", "--project-name", projectName, "--branch", "main"],
  { stdio: "inherit" }
);

process.exit(result.status ?? 0);
