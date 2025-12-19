import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { z } from "zod";

interface Bindings {
  DB: D1Database;
  SESSION_SECRET: string;
  PASSWORD_PEPPER: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URL?: string;
  ENVIRONMENT?: string;
}

interface Variables {
  user?: UserRecord;
}

type HonoEnv = { Bindings: Bindings; Variables: Variables };

type UserRecord = {
  id: string;
  role: "customer" | "admin" | "manager" | "chef" | "employee";
  name: string;
  email: string | null;
  phone: string;
  username: string | null;
  must_change_password: number;
  is_active: number;
};

const app = new Hono<HonoEnv>();

const SESSION_COOKIE = "cafe_session";
const SESSION_DAYS = 45;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

const parseJson = async <T>(req: Request, schema: z.ZodSchema<T>) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(JSON.stringify(parsed.error.flatten()));
  }
  return parsed.data;
};

const getClientIp = (req: Request) => {
  return req.headers.get("CF-Connecting-IP") || req.headers.get("x-forwarded-for") || "unknown";
};

const isRateLimited = (key: string) => {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (now - entry.lastAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_LOGIN_ATTEMPTS;
};

const recordLoginAttempt = (key: string) => {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.lastAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
  } else {
    loginAttempts.set(key, { count: entry.count + 1, lastAttempt: now });
  }
};

const parseCookies = (cookieHeader: string | null) => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((cookie) => {
    const [key, ...rest] = cookie.trim().split("=");
    cookies[key] = rest.join("=");
  });
  return cookies;
};

const setSessionCookie = (c: any, token: string | null) => {
  const isSecure = c.req.url.startsWith("https") || c.env.ENVIRONMENT === "production";
  const expires = token
    ? new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toUTCString()
    : new Date(0).toUTCString();
  const parts = [
    `${SESSION_COOKIE}=${token ?? ""}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expires}`
  ];
  if (isSecure) parts.push("Secure");
  c.header("Set-Cookie", parts.join("; "));
};

const bufferToHex = (buffer: ArrayBuffer) => {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const hashToken = async (token: string, secret: string) => {
  const data = new TextEncoder().encode(token + secret);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(digest);
};

const generateSalt = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return bufferToHex(bytes.buffer);
};

const hashPassword = async (password: string, salt: string, pepper: string) => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password + pepper),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
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

const verifyPassword = async (password: string, salt: string, pepper: string, hash: string) => {
  const candidate = await hashPassword(password, salt, pepper);
  return candidate === hash;
};

const generateToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bufferToHex(bytes.buffer);
};

const generateOrderCode = () => {
  const date = new Date();
  const part = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `ORD-${part}-${rand}`;
};

const generateTempPassword = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const digits = Array.from(bytes).map((b) => (b % 10).toString());
  return digits.join("");
};

const getUserPoints = async (db: D1Database, userId: string) => {
  const row = await db
    .prepare("SELECT points_total FROM user_points WHERE user_id = ?")
    .bind(userId)
    .first<{ points_total: number }>();
  return row?.points_total ?? 0;
};

const getBadgeForPoints = async (db: D1Database, points: number) => {
  const row = await db
    .prepare(
      "SELECT key, display_name_en, display_name_bn, min_points, discount_percent FROM badge_levels WHERE min_points <= ? ORDER BY min_points DESC LIMIT 1"
    )
    .bind(points)
    .first<{
      key: string;
      display_name_en: string;
      display_name_bn: string;
      min_points: number;
      discount_percent: number;
    }>();
  if (!row) {
    return {
      key: "NEWBIE",
      displayName: "Newbie",
      minPoints: 0,
      discountPercent: 0
    };
  }
  return {
    key: row.key,
    displayName: row.display_name_en,
    minPoints: row.min_points,
    discountPercent: row.discount_percent
  };
};

const buildUserProfile = async (db: D1Database, user: UserRecord) => {
  const points = await getUserPoints(db, user.id);
  const badge = await getBadgeForPoints(db, points);
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    username: user.username ?? user.phone,
    points,
    badge,
    discountPercent: badge.discountPercent,
    mustChangePassword: Boolean(user.must_change_password)
  };
};

const getSessionUser = async (c: any) => {
  const cookieHeader = c.req.header("Cookie");
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = await hashToken(token, c.env.SESSION_SECRET);
  const session = await c.env.DB.prepare(
    "SELECT user_id, expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?"
  )
    .bind(tokenHash, new Date().toISOString())
    .first<{ user_id: string; expires_at: string }>();
  if (!session) return null;
  const user = await c.env.DB.prepare(
    "SELECT id, role, name, email, phone, username, must_change_password, is_active FROM users WHERE id = ? AND is_active = 1"
  )
    .bind(session.user_id)
    .first<UserRecord>();
  if (!user) return null;
  await c.env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?")
    .bind(new Date().toISOString(), tokenHash)
    .run();
  return user;
};

const requireAuth = async (c: any, next: any) => {
  const user = c.get("user") as UserRecord | undefined;
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
};

const requireRole = (roles: UserRecord["role"][]) => {
  return async (c: any, next: any) => {
    const user = c.get("user") as UserRecord | undefined;
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!roles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    return next();
  };
};

const insertAuditLog = async (
  db: D1Database,
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  payload?: unknown
) => {
  await db
    .prepare(
      "INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      crypto.randomUUID(),
      actorUserId,
      action,
      entityType,
      entityId,
      payload ? JSON.stringify(payload) : null,
      new Date().toISOString()
    )
    .run();
};

const createOrderEvent = async (
  db: D1Database,
  orderId: string,
  eventType: string,
  userId?: string | null,
  payload?: unknown
) => {
  await db
    .prepare(
      "INSERT INTO order_events (id, order_id, event_type, by_user_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(
      crypto.randomUUID(),
      orderId,
      eventType,
      userId ?? null,
      payload ? JSON.stringify(payload) : null,
      new Date().toISOString()
    )
    .run();
};

app.use("*", async (c, next) => {
  const user = await getSessionUser(c);
  if (user) {
    c.set("user", user);
  }
  await next();
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.post("/api/auth/register-customer", async (c) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().regex(/^\d{10,15}$/)
    });
    const data = await parseJson(c.req.raw, schema);
    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE phone = ?")
      .bind(data.phone)
      .first();
    if (existing) {
      return c.json({ error: "Phone already registered" }, 409);
    }
    const password = generateTempPassword();
    const salt = generateSalt();
    const hash = await hashPassword(password, salt, c.env.PASSWORD_PEPPER);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      "INSERT INTO users (id, role, name, email, phone, username, password_hash, password_salt, must_change_password, created_at, updated_at, is_active) VALUES (?, 'customer', ?, ?, ?, ?, ?, ?, 0, ?, ?, 1)"
    )
      .bind(userId, data.name, data.email || null, data.phone, data.phone, hash, salt, now, now)
      .run();
    await c.env.DB.prepare("INSERT INTO user_points (user_id, points_total, updated_at) VALUES (?, 0, ?)")
      .bind(userId, now)
      .run();

    const token = generateToken();
    const tokenHash = await hashToken(token, c.env.SESSION_SECRET);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await c.env.DB.prepare(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(crypto.randomUUID(), userId, tokenHash, expiresAt, now, now)
      .run();

    const user = await c.env.DB.prepare(
      "SELECT id, role, name, email, phone, username, must_change_password, is_active FROM users WHERE id = ?"
    )
      .bind(userId)
      .first<UserRecord>();

    setSessionCookie(c, token);
    const profile = await buildUserProfile(c.env.DB, user!);
    return c.json({ user: profile, tempPassword: password });
  } catch (error) {
    return c.json({ error: "Invalid registration", details: String(error) }, 400);
  }
});

app.post("/api/auth/login", async (c) => {
  try {
    const schema = z
      .object({
        identifier: z.string().min(1).optional(),
        phone: z.string().min(1).optional(),
        password: z.string().min(4)
      })
      .refine((data) => Boolean(data.identifier || data.phone), {
        message: "Identifier is required"
      });
    const data = await parseJson(c.req.raw, schema);
    const identifier = (data.identifier ?? data.phone ?? "").trim();
    const ip = getClientIp(c.req.raw);
    if (isRateLimited(ip)) {
      return c.json({ error: "Too many attempts. Please wait." }, 429);
    }
    const user = await c.env.DB.prepare(
      "SELECT id, role, name, email, phone, username, password_hash, password_salt, must_change_password, is_active FROM users WHERE (phone = ? OR username = ?) AND is_active = 1"
    )
      .bind(identifier, identifier)
      .first<any>();
    if (!user) {
      recordLoginAttempt(ip);
      return c.json({ error: "Invalid credentials" }, 401);
    }
    const ok = await verifyPassword(data.password, user.password_salt, c.env.PASSWORD_PEPPER, user.password_hash);
    if (!ok) {
      recordLoginAttempt(ip);
      return c.json({ error: "Invalid credentials" }, 401);
    }
    const now = new Date().toISOString();
    const token = generateToken();
    const tokenHash = await hashToken(token, c.env.SESSION_SECRET);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await c.env.DB.prepare(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(crypto.randomUUID(), user.id, tokenHash, expiresAt, now, now)
      .run();
    setSessionCookie(c, token);
    const profile = await buildUserProfile(c.env.DB, user as UserRecord);
    return c.json({ user: profile });
  } catch (error) {
    return c.json({ error: "Invalid login", details: String(error) }, 400);
  }
});

app.post("/api/auth/logout", async (c) => {
  const cookieHeader = c.req.header("Cookie");
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE];
  if (token) {
    const tokenHash = await hashToken(token, c.env.SESSION_SECRET);
    await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
  setSessionCookie(c, null);
  return c.json({ ok: true });
});

app.get("/api/auth/me", async (c) => {
  const user = c.get("user") as UserRecord | undefined;
  if (!user) {
    return c.json({ user: null });
  }
  const profile = await buildUserProfile(c.env.DB, user);
  return c.json({ user: profile });
});

app.post("/api/auth/change-password", requireAuth, async (c) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(4),
      newPassword: z.string().min(6)
    });
    const data = await parseJson(c.req.raw, schema);
    const user = c.get("user") as UserRecord;
    const record = await c.env.DB.prepare(
      "SELECT password_hash, password_salt FROM users WHERE id = ?"
    )
      .bind(user.id)
      .first<any>();
    const ok = await verifyPassword(data.currentPassword, record.password_salt, c.env.PASSWORD_PEPPER, record.password_hash);
    if (!ok) {
      return c.json({ error: "Invalid password" }, 401);
    }
    const salt = generateSalt();
    const hash = await hashPassword(data.newPassword, salt, c.env.PASSWORD_PEPPER);
    await c.env.DB.prepare(
      "UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 0, updated_at = ? WHERE id = ?"
    )
      .bind(hash, salt, new Date().toISOString(), user.id)
      .run();
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: "Invalid request", details: String(error) }, 400);
  }
});

app.get("/api/auth/google/start", (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_REDIRECT_URL) {
    return c.json({ error: "Google auth not configured" }, 501);
  }
  return c.json({ error: "Not implemented" }, 501);
});

app.get("/api/auth/google/callback", (c) => {
  return c.json({ error: "Not implemented" }, 501);
});

app.get("/api/settings/theme", async (c) => {
  const row = await c.env.DB.prepare("SELECT value_json FROM settings WHERE key = 'theme'").first<{ value_json: string }>();
  const value = row?.value_json ? JSON.parse(row.value_json) : { theme: "cyberpunk" };
  return c.json({ theme: value.theme ?? "cyberpunk" });
});

app.get("/api/menu", async (c) => {
  const tableCode = c.req.query("tableCode");
  if (!tableCode) {
    return c.json({ error: "Missing tableCode" }, 400);
  }
  const table = await c.env.DB.prepare(
    "SELECT tables.id, tables.code, tables.label, tables.location_id, locations.name as location_name FROM tables JOIN locations ON locations.id = tables.location_id WHERE tables.code = ? AND tables.is_active = 1"
  )
    .bind(tableCode)
    .first<any>();
  if (!table) {
    return c.json({ error: "Table not found" }, 404);
  }
  const categories = await c.env.DB.prepare(
    "SELECT id, slug, name_en, name_bn, sort_order FROM categories WHERE is_active = 1 ORDER BY sort_order"
  ).all();
  const products = await c.env.DB.prepare(
    "SELECT * FROM products WHERE is_active = 1 ORDER BY is_featured DESC, is_trending DESC, is_hot DESC, created_at DESC"
  ).all();
  const themeRow = await c.env.DB.prepare("SELECT value_json FROM settings WHERE key = 'theme'").first<{ value_json: string }>();
  const themeValue = themeRow?.value_json ? JSON.parse(themeRow.value_json) : { theme: "cyberpunk" };
  const user = c.get("user") as UserRecord | undefined;
  let customer = null;
  let previousItems: any[] = [];
  if (user?.role === "customer") {
    customer = await buildUserProfile(c.env.DB, user);
    const prev = await c.env.DB.prepare(
      "SELECT DISTINCT products.* FROM orders JOIN order_items ON order_items.order_id = orders.id JOIN products ON products.id = order_items.product_id WHERE orders.customer_id = ? ORDER BY orders.placed_at DESC LIMIT 6"
    )
      .bind(user.id)
      .all();
    previousItems = prev.results;
  }
  return c.json({
    table: { id: table.id, code: table.code, label: table.label },
    location: { id: table.location_id, name: table.location_name },
    theme: themeValue.theme ?? "cyberpunk",
    categories: categories.results,
    products: products.results,
    customer,
    previousItems
  });
});

app.get("/api/products", async (c) => {
  const category = c.req.query("category");
  const hot = c.req.query("hot");
  const trending = c.req.query("trending");
  const filters: string[] = ["is_active = 1"];
  const binds: any[] = [];
  if (category) {
    filters.push("category_id = (SELECT id FROM categories WHERE slug = ?)");
    binds.push(category);
  }
  if (hot === "1") {
    filters.push("is_hot = 1");
  }
  if (trending === "1") {
    filters.push("is_trending = 1");
  }
  const sql = `SELECT * FROM products WHERE ${filters.join(" AND ")}`;
  const rows = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ products: rows.results });
});

app.post("/api/orders", requireAuth, async (c) => {
  try {
    const schema = z.object({
      tableCode: z.string().min(1),
      notes: z.string().optional(),
      items: z.array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(20) })).min(1)
    });
    const data = await parseJson(c.req.raw, schema);
    const user = c.get("user") as UserRecord;
    if (user.role !== "customer") {
      return c.json({ error: "Only customers can place orders" }, 403);
    }
    const table = await c.env.DB.prepare(
      "SELECT id, location_id FROM tables WHERE code = ? AND is_active = 1"
    )
      .bind(data.tableCode)
      .first<any>();
    if (!table) {
      return c.json({ error: "Table not found" }, 404);
    }
    const ids = data.items.map((item) => item.productId);
    const placeholders = ids.map(() => "?").join(",");
    const productRows = await c.env.DB.prepare(`SELECT * FROM products WHERE id IN (${placeholders}) AND is_active = 1`)
      .bind(...ids)
      .all();
    const productMap = new Map(productRows.results.map((p: any) => [p.id, p]));
    const items = data.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Invalid product");
      return { product, qty: item.qty };
    });
    const subtotal = items.reduce((sum, item) => sum + item.product.price_tk * item.qty, 0);
    const points = await getUserPoints(c.env.DB, user.id);
    const badge = await getBadgeForPoints(c.env.DB, points);
    const discountAmount = Math.round((subtotal * badge.discountPercent) / 100);
    const totalAfter = Math.max(0, subtotal - discountAmount);

    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      "INSERT INTO orders (id, order_code, location_id, table_id, customer_id, status, placed_at, total_before_discount_tk, discount_percent_applied, discount_amount_tk, total_after_discount_tk, points_earned, notes) VALUES (?, ?, ?, ?, ?, 'PLACED', ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        orderId,
        generateOrderCode(),
        table.location_id,
        table.id,
        user.id,
        now,
        subtotal,
        badge.discountPercent,
        discountAmount,
        totalAfter,
        totalAfter,
        data.notes ?? null
      )
      .run();

    const itemStatements = items.map((item) =>
      c.env.DB.prepare(
        "INSERT INTO order_items (id, order_id, product_id, product_name_snapshot_en, product_name_snapshot_bn, unit_price_snapshot_tk, qty, line_total_tk, options_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        crypto.randomUUID(),
        orderId,
        item.product.id,
        item.product.name_en,
        item.product.name_bn,
        item.product.price_tk,
        item.qty,
        item.product.price_tk * item.qty,
        null
      )
    );
    await c.env.DB.batch(itemStatements);
    await createOrderEvent(c.env.DB, orderId, "PLACED", user.id, null);

    return c.json({ orderId });
  } catch (error) {
    return c.json({ error: "Unable to place order", details: String(error) }, 400);
  }
});

app.get("/api/orders/current", requireAuth, async (c) => {
  const tableCode = c.req.query("tableCode");
  if (!tableCode) {
    return c.json({ error: "Missing tableCode" }, 400);
  }
  const table = await c.env.DB.prepare("SELECT id FROM tables WHERE code = ?")
    .bind(tableCode)
    .first<any>();
  if (!table) {
    return c.json({ error: "Table not found" }, 404);
  }
  const order = await c.env.DB.prepare(
    "SELECT * FROM orders WHERE table_id = ? AND status IN ('PLACED','ACCEPTED','PREPARING','READY') ORDER BY placed_at DESC LIMIT 1"
  )
    .bind(table.id)
    .first<any>();
  if (!order) {
    return c.json({ order: null });
  }
  const items = await c.env.DB.prepare("SELECT * FROM order_items WHERE order_id = ?")
    .bind(order.id)
    .all();
  order.items = items.results;
  return c.json({ order });
});

app.get("/api/orders/history", requireAuth, async (c) => {
  const user = c.get("user") as UserRecord;
  if (user.role !== "customer") {
    return c.json({ error: "Only customers can view history" }, 403);
  }
  const orders = await c.env.DB.prepare("SELECT * FROM orders WHERE customer_id = ? ORDER BY placed_at DESC LIMIT 50")
    .bind(user.id)
    .all();
  return c.json({ orders: orders.results });
});

app.get("/api/orders/:id", requireAuth, async (c) => {
  const orderId = c.req.param("id");
  const order = await c.env.DB.prepare("SELECT * FROM orders WHERE id = ?")
    .bind(orderId)
    .first<any>();
  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }
  const user = c.get("user") as UserRecord;
  if (user.role === "customer" && order.customer_id !== user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const items = await c.env.DB.prepare("SELECT * FROM order_items WHERE order_id = ?")
    .bind(orderId)
    .all();
  const review = await c.env.DB.prepare("SELECT id FROM reviews WHERE order_id = ?")
    .bind(orderId)
    .first();
  order.items = items.results;
  return c.json({ order, reviewed: Boolean(review) });
});

app.post("/api/orders/:id/review", requireAuth, async (c) => {
  try {
    const schema = z.object({ rating: z.number().int().min(1).max(10), comment: z.string().optional() });
    const data = await parseJson(c.req.raw, schema);
    const orderId = c.req.param("id");
    const order = await c.env.DB.prepare("SELECT customer_id, status FROM orders WHERE id = ?")
      .bind(orderId)
      .first<any>();
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    const user = c.get("user") as UserRecord;
    if (user.role !== "customer" || order.customer_id !== user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }
    if (order.status !== "SERVED") {
      return c.json({ error: "Order not served yet" }, 400);
    }
    const existing = await c.env.DB.prepare("SELECT id FROM reviews WHERE order_id = ?")
      .bind(orderId)
      .first();
    if (existing) {
      return c.json({ error: "Review already submitted" }, 409);
    }
    await c.env.DB.prepare(
      "INSERT INTO reviews (id, order_id, customer_id, rating_1_10, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(crypto.randomUUID(), orderId, user.id, data.rating, data.comment ?? null, new Date().toISOString())
      .run();
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: "Invalid review", details: String(error) }, 400);
  }
});

app.get("/api/staff/orders", requireRole(["chef", "employee", "manager", "admin"]), async (c) => {
  const statusParam = c.req.query("status");
  const statuses = statusParam ? statusParam.split(",") : ["PLACED"];
  const placeholders = statuses.map(() => "?").join(",");
  const orders = await c.env.DB.prepare(
    `SELECT orders.*, tables.label as table_label FROM orders JOIN tables ON tables.id = orders.table_id WHERE orders.status IN (${placeholders}) ORDER BY orders.placed_at ASC`
  )
    .bind(...statuses)
    .all();
  const orderIds = orders.results.map((order: any) => order.id);
  if (!orderIds.length) {
    return c.json({ orders: [] });
  }
  const itemPlaceholders = orderIds.map(() => "?").join(",");
  const items = await c.env.DB.prepare(`SELECT * FROM order_items WHERE order_id IN (${itemPlaceholders})`)
    .bind(...orderIds)
    .all();
  const grouped = new Map<string, any[]>();
  items.results.forEach((item: any) => {
    const list = grouped.get(item.order_id) ?? [];
    list.push(item);
    grouped.set(item.order_id, list);
  });
  const ordersWithItems = orders.results.map((order: any) => ({
    ...order,
    items: grouped.get(order.id) ?? []
  }));
  return c.json({ orders: ordersWithItems });
});

app.post("/api/staff/orders/:id/accept", requireRole(["employee", "manager", "admin"]), async (c) => {
  try {
    const schema = z.object({ etaMinutes: z.number().int().min(1).max(120) });
    const data = await parseJson(c.req.raw, schema);
    const orderId = c.req.param("id");
    const order = await c.env.DB.prepare("SELECT status FROM orders WHERE id = ?")
      .bind(orderId)
      .first<any>();
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    if (order.status !== "PLACED") {
      return c.json({ error: "Order cannot be accepted" }, 400);
    }
    const now = new Date();
    const etaAt = new Date(now.getTime() + data.etaMinutes * 60000).toISOString();
    await c.env.DB.prepare(
      "UPDATE orders SET status = 'ACCEPTED', accepted_at = ?, eta_minutes = ?, eta_at = ? WHERE id = ?"
    )
      .bind(now.toISOString(), data.etaMinutes, etaAt, orderId)
      .run();
    const user = c.get("user") as UserRecord;
    await createOrderEvent(c.env.DB, orderId, "ACCEPTED", user.id, { etaMinutes: data.etaMinutes });
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: "Invalid request", details: String(error) }, 400);
  }
});

app.post("/api/staff/orders/:id/status", requireRole(["chef", "employee", "manager", "admin"]), async (c) => {
  try {
    const schema = z.object({ status: z.enum(["PREPARING", "READY", "SERVED", "CANCELLED"]) });
    const data = await parseJson(c.req.raw, schema);
    const orderId = c.req.param("id");
    const order = await c.env.DB.prepare("SELECT status, customer_id, points_earned FROM orders WHERE id = ?")
      .bind(orderId)
      .first<any>();
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    const now = new Date().toISOString();
    const updates: string[] = ["status = ?"];
    const binds: any[] = [data.status];
    if (data.status === "PREPARING") {
      updates.push("accepted_at = COALESCE(accepted_at, ?)");
      binds.push(now);
    }
    if (data.status === "READY") {
      updates.push("eta_at = COALESCE(eta_at, ?)");
      binds.push(now);
    }
    if (data.status === "SERVED" && order.status !== "SERVED") {
      updates.push("served_at = ?");
      binds.push(now);
    }
    binds.push(orderId);
    await c.env.DB.prepare(`UPDATE orders SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...binds)
      .run();
    if (data.status === "SERVED") {
      await c.env.DB.prepare(
        "UPDATE user_points SET points_total = points_total + ?, updated_at = ? WHERE user_id = ?"
      )
        .bind(order.points_earned, now, order.customer_id)
        .run();
    }
    const user = c.get("user") as UserRecord;
    await createOrderEvent(c.env.DB, orderId, data.status, user.id, null);
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: "Invalid request", details: String(error) }, 400);
  }
});

app.get("/api/admin/categories", requireRole(["admin", "manager"]), async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const pageSize = Math.min(Number(c.req.query("pageSize") ?? 20), 100);
  const offset = (page - 1) * pageSize;
  const items = await c.env.DB.prepare("SELECT * FROM categories ORDER BY sort_order LIMIT ? OFFSET ?")
    .bind(pageSize, offset)
    .all();
  const total = await c.env.DB.prepare("SELECT COUNT(*) as count FROM categories").first<{ count: number }>();
  return c.json({ items: items.results, total: total?.count ?? 0 });
});

app.post("/api/admin/categories", requireRole(["admin", "manager"]), async (c) => {
  try {
    const schema = z.object({
      name_en: z.string().min(1),
      name_bn: z.string().min(1),
      slug: z.string().min(1),
      sort_order: z.number().int().default(0)
    });
    const data = await parseJson(c.req.raw, schema);
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO categories (id, slug, name_en, name_bn, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)"
    )
      .bind(id, data.slug, data.name_en, data.name_bn, data.sort_order)
      .run();
    const user = c.get("user") as UserRecord;
    await insertAuditLog(c.env.DB, user.id, "CREATE", "category", id, data);
    return c.json({ id });
  } catch (error) {
    return c.json({ error: "Invalid category", details: String(error) }, 400);
  }
});

app.put("/api/admin/categories/:id", requireRole(["admin", "manager"]), async (c) => {
  try {
    const schema = z.object({
      name_en: z.string().min(1).optional(),
      name_bn: z.string().min(1).optional(),
      slug: z.string().min(1).optional(),
      sort_order: z.number().int().optional()
    });
    const data = await parseJson(c.req.raw, schema);
    const id = c.req.param("id");
    await c.env.DB.prepare(
      "UPDATE categories SET name_en = COALESCE(?, name_en), name_bn = COALESCE(?, name_bn), slug = COALESCE(?, slug), sort_order = COALESCE(?, sort_order) WHERE id = ?"
    )
      .bind(data.name_en ?? null, data.name_bn ?? null, data.slug ?? null, data.sort_order ?? null, id)
      .run();
    const user = c.get("user") as UserRecord;
    await insertAuditLog(c.env.DB, user.id, "UPDATE", "category", id, data);
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: "Invalid update", details: String(error) }, 400);
  }
});

app.delete("/api/admin/categories/:id", requireRole(["admin", "manager"]), async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("UPDATE categories SET is_active = 0 WHERE id = ?").bind(id).run();
  const user = c.get("user") as UserRecord;
  await insertAuditLog(c.env.DB, user.id, "DEACTIVATE", "category", id, null);
  return c.json({ ok: true });
});

app.get("/api/admin/products", requireRole(["admin", "manager"]), async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const pageSize = Math.min(Number(c.req.query("pageSize") ?? 20), 200);
  const offset = (page - 1) * pageSize;
  const items = await c.env.DB.prepare("SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .bind(pageSize, offset)
    .all();
  const total = await c.env.DB.prepare("SELECT COUNT(*) as count FROM products").first<{ count: number }>();
  return c.json({ items: items.results, total: total?.count ?? 0 });
});

app.post("/api/admin/products", requireRole(["admin", "manager"]), async (c) => {
  try {
    const schema = z.object({
      category_id: z.string().min(1),
      slug: z.string().min(1),
      name_en: z.string().min(1),
      name_bn: z.string().min(1),
      description_en: z.string().min(1),
      description_bn: z.string().min(1),
      price_tk: z.number().int().min(1),
      is_active: z.number().int().optional(),
      is_featured: z.boolean().optional(),
      is_trending: z.boolean().optional(),
      is_hot: z.boolean().optional(),
      media_image_url: z.string().optional().nullable(),
      media_video_url: z.string().optional().nullable()
    });
    const data = await parseJson(c.req.raw, schema);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      "INSERT INTO products (id, category_id, slug, name_en, name_bn, description_en, description_bn, price_tk, is_active, is_featured, is_trending, is_hot, media_image_url, media_video_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        id,
        data.category_id,
        data.slug,
        data.name_en,
        data.name_bn,
        data.description_en,
        data.description_bn,
        data.price_tk,
        data.is_active ?? 1,
        data.is_featured ? 1 : 0,
        data.is_trending ? 1 : 0,
        data.is_hot ? 1 : 0,
        data.media_image_url ?? null,
        data.media_video_url ?? null,
        now,
        now
      )
      .run();
    const user = c.get("user") as UserRecord;
    await insertAuditLog(c.env.DB, user.id, "CREATE", "product", id, data);
    return c.json({ id });
  } catch (error) {
    return c.json({ error: "Invalid product", details: String(error) }, 400);
  }
});

app.put("/api/admin/products/:id", requireRole(["admin", "manager"]), async (c) => {
  try {
    const schema = z.object({
      category_id: z.string().min(1).optional(),
      slug: z.string().min(1).optional(),
      name_en: z.string().min(1).optional(),
      name_bn: z.string().min(1).optional(),
      description_en: z.string().min(1).optional(),
      description_bn: z.string().min(1).optional(),
      price_tk: z.number().int().min(1).optional(),
      is_active: z.number().int().optional(),
      is_featured: z.boolean().optional(),
      is_trending: z.boolean().optional(),
      is_hot: z.boolean().optional(),
      media_image_url: z.string().optional().nullable(),
      media_video_url: z.string().optional().nullable()
    });
    const data = await parseJson(c.req.raw, schema);
    const id = c.req.param("id");
    await c.env.DB.prepare(
      "UPDATE products SET category_id = COALESCE(?, category_id), slug = COALESCE(?, slug), name_en = COALESCE(?, name_en), name_bn = COALESCE(?, name_bn), description_en = COALESCE(?, description_en), description_bn = COALESCE(?, description_bn), price_tk = COALESCE(?, price_tk), is_active = COALESCE(?, is_active), is_featured = COALESCE(?, is_featured), is_trending = COALESCE(?, is_trending), is_hot = COALESCE(?, is_hot), media_image_url = COALESCE(?, media_image_url), media_video_url = COALESCE(?, media_video_url), updated_at = ? WHERE id = ?"
    )
      .bind(
        data.category_id ?? null,
        data.slug ?? null,
        data.name_en ?? null,
        data.name_bn ?? null,
        data.description_en ?? null,
        data.description_bn ?? null,
        data.price_tk ?? null,
        data.is_active ?? null,
        data.is_featured ?? null,
        data.is_trending ?? null,
        data.is_hot ?? null,
        data.media_image_url ?? null,
        data.media_video_url ?? null,
        new Date().toISOString(),
        id
      )
      .run();
    const user = c.get("user") as UserRecord;
    await insertAuditLog(c.env.DB, user.id, "UPDATE", "product", id, data);
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: "Invalid update", details: String(error) }, 400);
  }
});

app.delete("/api/admin/products/:id", requireRole(["admin", "manager"]), async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("UPDATE products SET is_active = 0 WHERE id = ?").bind(id).run();
  const user = c.get("user") as UserRecord;
  await insertAuditLog(c.env.DB, user.id, "DEACTIVATE", "product", id, null);
  return c.json({ ok: true });
});

app.get("/api/admin/locations", requireRole(["admin", "manager"]), async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT id, name, address, is_active, created_at FROM locations ORDER BY created_at DESC"
  ).all();
  return c.json({ items: rows.results });
});

app.get("/api/admin/tables", requireRole(["admin", "manager"]), async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM tables ORDER BY label").all();
  return c.json({ items: rows.results });
});

app.post("/api/admin/tables", requireRole(["admin", "manager"]), async (c) => {
  try {
    const schema = z.object({
      location_id: z.string().min(1),
      code: z.string().min(1),
      label: z.string().min(1)
    });
    const data = await parseJson(c.req.raw, schema);
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO tables (id, location_id, code, label, is_active) VALUES (?, ?, ?, ?, 1)"
    )
      .bind(id, data.location_id, data.code, data.label)
      .run();
    const user = c.get("user") as UserRecord;
    await insertAuditLog(c.env.DB, user.id, "CREATE", "table", id, data);
    return c.json({ id });
  } catch (error) {
    return c.json({ error: "Invalid table", details: String(error) }, 400);
  }
});

app.put("/api/admin/tables/:id", requireRole(["admin", "manager"]), async (c) => {
  try {
    const schema = z.object({
      code: z.string().min(1).optional(),
      label: z.string().min(1).optional(),
      is_active: z.number().int().optional()
    });
    const data = await parseJson(c.req.raw, schema);
    const id = c.req.param("id");
    await c.env.DB.prepare(
      "UPDATE tables SET code = COALESCE(?, code), label = COALESCE(?, label), is_active = COALESCE(?, is_active) WHERE id = ?"
    )
      .bind(data.code ?? null, data.label ?? null, data.is_active ?? null, id)
      .run();
    const user = c.get("user") as UserRecord;
    await insertAuditLog(c.env.DB, user.id, "UPDATE", "table", id, data);
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: "Invalid table update", details: String(error) }, 400);
  }
});

app.get("/api/admin/users", requireRole(["admin", "manager"]), async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const pageSize = Math.min(Number(c.req.query("pageSize") ?? 20), 200);
  const offset = (page - 1) * pageSize;
  const items = await c.env.DB.prepare(
    "SELECT id, role, name, email, phone, username, must_change_password, is_active FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?"
  )
    .bind(pageSize, offset)
    .all();
  const total = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>();
  return c.json({ items: items.results, total: total?.count ?? 0 });
});

app.post("/api/admin/users", requireRole(["admin", "manager"]), async (c) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      phone: z.string().regex(/^\d{10,15}$/),
      email: z.string().email().optional().or(z.literal("")),
      role: z.enum(["admin", "manager", "chef", "employee", "customer"]),
      password: z.string().min(4),
      username: z.string().min(3).optional()
    });
    const data = await parseJson(c.req.raw, schema);
    const username = (data.username ?? data.phone).trim();
    const salt = generateSalt();
    const hash = await hashPassword(data.password, salt, c.env.PASSWORD_PEPPER);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      "INSERT INTO users (id, role, name, email, phone, username, password_hash, password_salt, must_change_password, created_at, updated_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 1)"
    )
      .bind(id, data.role, data.name, data.email || null, data.phone, username, hash, salt, now, now)
      .run();
    await c.env.DB.prepare("INSERT INTO user_points (user_id, points_total, updated_at) VALUES (?, 0, ?)")
      .bind(id, now)
      .run();
    const user = c.get("user") as UserRecord;
    await insertAuditLog(c.env.DB, user.id, "CREATE", "user", id, data);
    return c.json({ id });
  } catch (error) {
    return c.json({ error: "Invalid user", details: String(error) }, 400);
  }
});

app.put("/api/admin/users/:id", requireRole(["admin", "manager"]), async (c) => {
  try {
    const schema = z.object({
      role: z.enum(["admin", "manager", "chef", "employee", "customer"]).optional(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().regex(/^\d{10,15}$/).optional(),
      username: z.string().min(3).optional(),
      is_active: z.number().int().optional()
    });
    const data = await parseJson(c.req.raw, schema);
    const id = c.req.param("id");
    await c.env.DB.prepare(
      "UPDATE users SET role = COALESCE(?, role), name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone), username = COALESCE(?, username), is_active = COALESCE(?, is_active), updated_at = ? WHERE id = ?"
    )
      .bind(
        data.role ?? null,
        data.name ?? null,
        data.email ?? null,
        data.phone ?? null,
        data.username ?? null,
        data.is_active ?? null,
        new Date().toISOString(),
        id
      )
      .run();
    const user = c.get("user") as UserRecord;
    await insertAuditLog(c.env.DB, user.id, "UPDATE", "user", id, data);
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: "Invalid user update", details: String(error) }, 400);
  }
});

app.get("/api/admin/reports/sales", requireRole(["admin", "manager"]), async (c) => {
  const range = c.req.query("range") ?? "daily";
  const format = range === "monthly" ? "%Y-%m" : range === "yearly" ? "%Y" : "%Y-%m-%d";
  const rows = await c.env.DB.prepare(
    `SELECT strftime('${format}', served_at) as period, SUM(total_after_discount_tk) as total FROM orders WHERE status = 'SERVED' GROUP BY period ORDER BY period DESC LIMIT 60`
  ).all();
  return c.json({ rows: rows.results });
});

app.get("/api/admin/reports/best-items", requireRole(["admin", "manager"]), async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT product_name_snapshot_en as name, SUM(qty) as qty FROM order_items JOIN orders ON orders.id = order_items.order_id WHERE orders.status = 'SERVED' GROUP BY product_name_snapshot_en ORDER BY qty DESC LIMIT 10"
  ).all();
  return c.json({ items: rows.results });
});

app.get("/api/admin/reports/badges", requireRole(["admin", "manager"]), async (c) => {
  const badgeRows = await c.env.DB.prepare(
    "SELECT key, display_name_en, min_points FROM badge_levels ORDER BY min_points ASC"
  ).all();
  const pointsRows = await c.env.DB.prepare(
    "SELECT user_points.points_total FROM user_points JOIN users ON users.id = user_points.user_id WHERE users.role = 'customer'"
  ).all();
  const points = pointsRows.results.map((row: any) => row.points_total as number);
  const badges = badgeRows.results as { key: string; display_name_en: string; min_points: number }[];
  const distribution = badges.map((badge, index) => {
    const next = badges[index + 1];
    const count = points.filter((value) => value >= badge.min_points && (!next || value < next.min_points)).length;
    return { key: badge.key, label: badge.display_name_en, count };
  });
  return c.json({ distribution });
});

app.get("/api/admin/leaderboard", requireRole(["admin", "manager"]), async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT users.name, user_points.points_total FROM user_points JOIN users ON users.id = user_points.user_id WHERE users.role = 'customer' ORDER BY user_points.points_total DESC LIMIT 100"
  ).all();
  const leaderboard = rows.results.map((row: any, index: number) => ({
    rank: index + 1,
    name: row.name,
    points: row.points_total
  }));
  return c.json({ leaderboard });
});

app.get("/api/leaderboard", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT users.name, user_points.points_total FROM user_points JOIN users ON users.id = user_points.user_id WHERE users.role = 'customer' ORDER BY user_points.points_total DESC LIMIT 100"
  ).all();
  const leaderboard = rows.results.map((row: any, index: number) => ({
    rank: index + 1,
    name: row.name
  }));
  return c.json({ leaderboard });
});

app.get("/api/admin/settings/theme", requireRole(["admin", "manager"]), async (c) => {
  const row = await c.env.DB.prepare("SELECT value_json FROM settings WHERE key = 'theme'").first<{ value_json: string }>();
  const value = row?.value_json ? JSON.parse(row.value_json) : { theme: "cyberpunk" };
  return c.json({ theme: value.theme ?? "cyberpunk" });
});

app.post("/api/admin/settings/theme", requireRole(["admin", "manager"]), async (c) => {
  try {
    const schema = z.object({ theme: z.enum(["cyberpunk", "windows11", "apple"]) });
    const data = await parseJson(c.req.raw, schema);
    await c.env.DB.prepare(
      "INSERT INTO settings (key, value_json) VALUES ('theme', ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json"
    )
      .bind(JSON.stringify({ theme: data.theme }))
      .run();
    const user = c.get("user") as UserRecord;
    await insertAuditLog(c.env.DB, user.id, "UPDATE", "settings", "theme", data);
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: "Invalid theme", details: String(error) }, 400);
  }
});

app.get("/api/admin/settings/discounts", requireRole(["admin", "manager"]), async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT key, display_name_en, display_name_bn, min_points, discount_percent FROM badge_levels ORDER BY sort_order"
  ).all();
  return c.json({ badges: rows.results });
});

app.post("/api/admin/settings/discounts", requireRole(["admin", "manager"]), async (c) => {
  try {
    const schema = z.object({
      badges: z.array(
        z.object({
          key: z.string().min(1),
          discount_percent: z.number().int().min(0).max(100)
        })
      )
    });
    const data = await parseJson(c.req.raw, schema);
    const statements = data.badges.map((badge) =>
      c.env.DB.prepare("UPDATE badge_levels SET discount_percent = ? WHERE key = ?").bind(
        badge.discount_percent,
        badge.key
      )
    );
    await c.env.DB.batch(statements);
    const user = c.get("user") as UserRecord;
    await insertAuditLog(c.env.DB, user.id, "UPDATE", "badge_levels", "discounts", data);
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: "Invalid discounts", details: String(error) }, 400);
  }
});

export const onRequest = handle(app);
export default app;
