import { spawnSync } from "node:child_process";
import { webcrypto } from "node:crypto";

const args = process.argv.slice(2);
const flag = args.includes("--local") ? "--local" : "--remote";

const pepper = process.env.PASSWORD_PEPPER;
if (!pepper) {
  console.error("PASSWORD_PEPPER is required to seed the admin user.");
  process.exit(1);
}

const adminPassword = process.env.ADMIN_PASSWORD || "Admin123";
const adminPhone = "01000000000";
const adminUsername = "admin";
const adminName = "Admin";
const adminEmail = "admin@cafe.local";
const adminId = "admin-default";

const encoder = new TextEncoder();
const bufferToHex = (buffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

const generateSalt = () => {
  const bytes = webcrypto.getRandomValues(new Uint8Array(16));
  return bufferToHex(bytes.buffer);
};

const hashPassword = async (password, salt, pepperValue) => {
  const keyMaterial = await webcrypto.subtle.importKey(
    "raw",
    encoder.encode(password + pepperValue),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derived = await webcrypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100_000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  return bufferToHex(derived);
};

const escapeSql = (value) => value.replace(/'/g, "''");

const run = (command) => {
  const result = spawnSync("npx", ["wrangler", "d1", "execute", "DB", flag, "--command", command], {
    stdio: "inherit"
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const main = async () => {
  const salt = generateSalt();
  const hash = await hashPassword(adminPassword, salt, pepper);
  const now = new Date().toISOString();

  const insertUser = `INSERT OR IGNORE INTO users (id, role, name, email, phone, username, password_hash, password_salt, must_change_password, created_at, updated_at, is_active)
VALUES ('${adminId}', 'admin', '${escapeSql(adminName)}', '${escapeSql(adminEmail)}', '${adminPhone}', '${escapeSql(adminUsername)}', '${hash}', '${salt}', 1, '${now}', '${now}', 1);`;

  const updateUser = `UPDATE users SET role = 'admin', name = '${escapeSql(adminName)}', email = '${escapeSql(adminEmail)}', phone = '${adminPhone}', username = '${escapeSql(adminUsername)}', password_hash = '${hash}', password_salt = '${salt}', must_change_password = 1, updated_at = '${now}', is_active = 1 WHERE id = '${adminId}' OR phone = '${adminPhone}' OR username = '${escapeSql(adminUsername)}';`;

  const insertPoints = `INSERT OR IGNORE INTO user_points (user_id, points_total, updated_at)
VALUES ('${adminId}', 0, '${now}');`;

  run(insertUser);
  run(updateUser);
  run(insertPoints);

  console.log("Default admin user seeded.");
  console.log(`Username: ${adminUsername}`);
  console.log(`Phone: ${adminPhone}`);
  console.log(`Password: ${adminPassword}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
