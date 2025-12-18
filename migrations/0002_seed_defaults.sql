PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO locations (id, name, address, is_active, created_at)
VALUES ('loc-main', 'Main Cafe', '123 Cafe Street', 1, datetime('now'));

INSERT OR IGNORE INTO tables (id, location_id, code, label, is_active)
VALUES
  ('table-0001', 'loc-main', 'TBL-0001', 'Table 1', 1),
  ('table-0002', 'loc-main', 'TBL-0002', 'Table 2', 1),
  ('table-0003', 'loc-main', 'TBL-0003', 'Table 3', 1),
  ('table-0004', 'loc-main', 'TBL-0004', 'Table 4', 1),
  ('table-0005', 'loc-main', 'TBL-0005', 'Table 5', 1),
  ('table-0006', 'loc-main', 'TBL-0006', 'Table 6', 1),
  ('table-0007', 'loc-main', 'TBL-0007', 'Table 7', 1),
  ('table-0008', 'loc-main', 'TBL-0008', 'Table 8', 1),
  ('table-0009', 'loc-main', 'TBL-0009', 'Table 9', 1),
  ('table-0010', 'loc-main', 'TBL-0010', 'Table 10', 1),
  ('table-0011', 'loc-main', 'TBL-0011', 'Table 11', 1),
  ('table-0012', 'loc-main', 'TBL-0012', 'Table 12', 1);

INSERT OR IGNORE INTO badge_levels (key, display_name_en, display_name_bn, min_points, discount_percent, sort_order)
VALUES
  ('NEWBIE', 'Newbie', 'নতুন', 1, 0, 1),
  ('PLATINUM', 'Platinum', 'প্লাটিনাম', 1000, 0, 2),
  ('CROWN', 'Crown', 'ক্রাউন', 10000, 0, 3),
  ('PRO', 'Pro', 'প্রো', 25000, 0, 4),
  ('VIP', 'VIP', 'ভিআইপি', 100000, 0, 5),
  ('VVIP', 'VVIP', 'ভিভিআইপি', 250000, 0, 6),
  ('ULTIMATE', 'Ultimate', 'আল্টিমেট', 500000, 0, 7);

INSERT OR IGNORE INTO settings (key, value_json)
VALUES ('theme', '{"theme":"cyberpunk"}');

INSERT OR IGNORE INTO categories (id, slug, name_en, name_bn, sort_order, is_active)
VALUES
  ('cat-hot-coffee', 'hot-coffee', 'Hot Coffee', 'গরম কফি', 1, 1),
  ('cat-iced-coffee', 'iced-coffee', 'Iced Coffee', 'ঠান্ডা কফি', 2, 1),
  ('cat-tea', 'tea', 'Tea', 'চা', 3, 1),
  ('cat-non-coffee', 'non-coffee', 'Non-Coffee', 'নন-কফি', 4, 1),
  ('cat-snacks', 'snacks', 'Snacks', 'স্ন্যাকস', 5, 1),
  ('cat-dessert', 'dessert', 'Dessert', 'ডেজার্ট', 6, 1);
