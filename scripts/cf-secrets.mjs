import { spawnSync } from "node:child_process";

const projectName = process.env.CF_PAGES_PROJECT || "cafe-qr-ordering";
const required = ["SESSION_SECRET", "PASSWORD_PEPPER"];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`${key} is required as an environment variable.`);
    process.exit(1);
  }
}

const setSecret = (key) => {
  const value = process.env[key];
  if (!value) return;
  const result = spawnSync(
    "npx",
    ["wrangler", "pages", "secret", "put", key, "--project-name", projectName],
    { input: value, stdio: ["pipe", "inherit", "inherit"] }
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

["SESSION_SECRET", "PASSWORD_PEPPER", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URL"].forEach(
  setSecret
);
