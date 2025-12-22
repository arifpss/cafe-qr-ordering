PRAGMA foreign_keys = OFF;

ALTER TABLE order_items RENAME TO order_items_old;
ALTER TABLE order_events RENAME TO order_events_old;
ALTER TABLE reviews RENAME TO reviews_old;
ALTER TABLE orders RENAME TO orders_old;

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_code TEXT NOT NULL UNIQUE,
  location_id TEXT NOT NULL REFERENCES locations(id),
  table_id TEXT NOT NULL REFERENCES tables(id),
  customer_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('RECEIVED','PREPARING','SERVING','SERVED','PAYMENT_RECEIVED','CANCELLED')),
  placed_at TEXT NOT NULL,
  accepted_at TEXT,
  eta_minutes INTEGER,
  eta_at TEXT,
  served_at TEXT,
  total_before_discount_tk INTEGER NOT NULL,
  discount_percent_applied INTEGER NOT NULL,
  discount_amount_tk INTEGER NOT NULL,
  total_after_discount_tk INTEGER NOT NULL,
  points_earned INTEGER NOT NULL,
  notes TEXT
);

INSERT INTO orders (
  id,
  order_code,
  location_id,
  table_id,
  customer_id,
  status,
  placed_at,
  accepted_at,
  eta_minutes,
  eta_at,
  served_at,
  total_before_discount_tk,
  discount_percent_applied,
  discount_amount_tk,
  total_after_discount_tk,
  points_earned,
  notes
)
SELECT
  id,
  order_code,
  location_id,
  table_id,
  customer_id,
  CASE status
    WHEN 'PLACED' THEN 'RECEIVED'
    WHEN 'ACCEPTED' THEN 'PREPARING'
    WHEN 'READY' THEN 'SERVING'
    WHEN 'SERVED' THEN 'SERVED'
    WHEN 'CANCELLED' THEN 'CANCELLED'
    ELSE 'RECEIVED'
  END AS status,
  placed_at,
  accepted_at,
  eta_minutes,
  eta_at,
  served_at,
  total_before_discount_tk,
  discount_percent_applied,
  discount_amount_tk,
  total_after_discount_tk,
  points_earned,
  notes
FROM orders_old;

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name_snapshot_en TEXT NOT NULL,
  product_name_snapshot_bn TEXT NOT NULL,
  unit_price_snapshot_tk INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  line_total_tk INTEGER NOT NULL,
  options_json TEXT
);

INSERT INTO order_items (
  id,
  order_id,
  product_id,
  product_name_snapshot_en,
  product_name_snapshot_bn,
  unit_price_snapshot_tk,
  qty,
  line_total_tk,
  options_json
)
SELECT
  id,
  order_id,
  product_id,
  product_name_snapshot_en,
  product_name_snapshot_bn,
  unit_price_snapshot_tk,
  qty,
  line_total_tk,
  options_json
FROM order_items_old;

CREATE TABLE IF NOT EXISTS order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  event_type TEXT NOT NULL,
  by_user_id TEXT REFERENCES users(id),
  payload_json TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO order_events (
  id,
  order_id,
  event_type,
  by_user_id,
  payload_json,
  created_at
)
SELECT
  id,
  order_id,
  event_type,
  by_user_id,
  payload_json,
  created_at
FROM order_events_old;

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  customer_id TEXT NOT NULL REFERENCES users(id),
  rating_1_10 INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO reviews (
  id,
  order_id,
  customer_id,
  rating_1_10,
  comment,
  created_at
)
SELECT
  id,
  order_id,
  customer_id,
  rating_1_10,
  comment,
  created_at
FROM reviews_old;

DROP TABLE order_items_old;
DROP TABLE order_events_old;
DROP TABLE reviews_old;
DROP TABLE orders_old;

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_placed ON orders(placed_at);

PRAGMA foreign_keys = ON;
