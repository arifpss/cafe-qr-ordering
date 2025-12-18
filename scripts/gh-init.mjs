import { spawnSync } from "node:child_process";

const repoName = process.env.GH_REPO || "cafe-qr-ordering";

const check = spawnSync("gh", ["--version"], { stdio: "ignore" });
if (check.status !== 0) {
  console.error("GitHub CLI (gh) is not installed.");
  process.exit(1);
}

const result = spawnSync(
  "gh",
  ["repo", "create", repoName, "--public", "--source", ".", "--remote", "origin", "--push"],
  { stdio: "inherit" }
);

process.exit(result.status ?? 0);
