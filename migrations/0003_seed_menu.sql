PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO products (
  id, category_id, slug, name_en, name_bn, description_en, description_bn,
  price_tk, is_active, is_featured, is_trending, is_hot,
  media_image_url, media_video_url, created_at, updated_at
) VALUES
  ('prod-espresso', 'cat-hot-coffee', 'espresso', 'Espresso', 'এসপ্রেসো', 'Rich espresso shot.', 'ঘন এসপ্রেসো শট।', 180, 1, 1, 1, 1, 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=600&q=80', NULL, datetime('now'), datetime('now')),
  ('prod-double-espresso', 'cat-hot-coffee', 'double-espresso', 'Double Espresso', 'ডাবল এসপ্রেসো', 'Double shot for bold flavor.', 'বোল্ড স্বাদের ডাবল শট।', 240, 1, 0, 1, 1, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-americano', 'cat-hot-coffee', 'americano', 'Americano', 'আমেরিকানো', 'Espresso with hot water.', 'গরম পানিতে এসপ্রেসো।', 220, 1, 0, 1, 1, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-cappuccino', 'cat-hot-coffee', 'cappuccino', 'Cappuccino', 'ক্যাপুচিনো', 'Foamy cappuccino.', 'ফোমি ক্যাপুচিনো।', 260, 1, 1, 1, 1, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-latte', 'cat-hot-coffee', 'latte', 'Latte', 'লাতে', 'Creamy milk latte.', 'ক্রিমি মিল্ক লাতে।', 280, 1, 1, 1, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-flat-white', 'cat-hot-coffee', 'flat-white', 'Flat White', 'ফ্ল্যাট হোয়াইট', 'Smooth espresso and milk.', 'মসৃণ এসপ্রেসো ও দুধ।', 300, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-mocha', 'cat-hot-coffee', 'mocha', 'Mocha', 'মোকা', 'Chocolate infused coffee.', 'চকলেটি কফি।', 320, 1, 1, 1, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-macchiato', 'cat-hot-coffee', 'macchiato', 'Macchiato', 'ম্যাকিয়াতো', 'Espresso with foam.', 'ফোমসহ এসপ্রেসো।', 240, 1, 0, 0, 1, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-cortado', 'cat-hot-coffee', 'cortado', 'Cortado', 'করতাদো', 'Balanced espresso and milk.', 'সমানুপাতিক এসপ্রেসো ও দুধ।', 260, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now')),

  ('prod-iced-americano', 'cat-iced-coffee', 'iced-americano', 'Iced Americano', 'আইসড আমেরিকানো', 'Chilled espresso with water.', 'ঠান্ডা এসপ্রেসো ও পানি।', 220, 1, 1, 1, 1, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-iced-latte', 'cat-iced-coffee', 'iced-latte', 'Iced Latte', 'আইসড লাতে', 'Chilled milk latte.', 'ঠান্ডা মিল্ক লাতে।', 300, 1, 1, 1, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-cold-brew', 'cat-iced-coffee', 'cold-brew', 'Cold Brew', 'কোল্ড ব্রু', 'Slow-steeped cold brew.', 'ধীরগতিতে তৈরি কোল্ড ব্রু।', 320, 1, 0, 1, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-iced-mocha', 'cat-iced-coffee', 'iced-mocha', 'Iced Mocha', 'আইসড মোকা', 'Chocolate iced coffee.', 'চকলেটি আইসড কফি।', 340, 1, 0, 1, 0, NULL, NULL, datetime('now'), datetime('now')),

  ('prod-hot-chocolate', 'cat-non-coffee', 'hot-chocolate', 'Hot Chocolate', 'হট চকলেট', 'Rich cocoa drink.', 'সমৃদ্ধ কোকো পানীয়।', 260, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-matcha-latte', 'cat-non-coffee', 'matcha-latte', 'Matcha Latte', 'ম্যাচা লাতে', 'Creamy matcha latte.', 'ক্রিমি ম্যাচা লাতে।', 320, 1, 1, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-vanilla-milkshake', 'cat-non-coffee', 'vanilla-milkshake', 'Vanilla Milkshake', 'ভ্যানিলা মিল্কশেক', 'Cold vanilla shake.', 'ঠান্ডা ভ্যানিলা শেক।', 280, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now')),

  ('prod-black-tea', 'cat-tea', 'black-tea', 'Black Tea', 'কালো চা', 'Classic black tea.', 'ক্লাসিক কালো চা।', 120, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-green-tea', 'cat-tea', 'green-tea', 'Green Tea', 'সবুজ চা', 'Light green tea.', 'হালকা সবুজ চা।', 140, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-masala-chai', 'cat-tea', 'masala-chai', 'Masala Chai', 'মাসালা চা', 'Spiced milk tea.', 'মসলা দুধ চা।', 160, 1, 1, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-lemon-tea', 'cat-tea', 'lemon-tea', 'Lemon Tea', 'লেবু চা', 'Refreshing lemon tea.', 'সতেজ লেবু চা।', 150, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-iced-tea', 'cat-tea', 'iced-tea', 'Iced Tea', 'আইসড চা', 'Chilled tea with lemon.', 'লেবুসহ ঠান্ডা চা।', 180, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now')),

  ('prod-croissant', 'cat-snacks', 'croissant', 'Croissant', 'ক্রোয়াসাঁ', 'Buttery croissant.', 'বাটারি ক্রোয়াসাঁ।', 180, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-muffin', 'cat-snacks', 'muffin', 'Muffin', 'মাফিন', 'Soft blueberry muffin.', 'নরম ব্লুবেরি মাফিন।', 160, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-garlic-bread', 'cat-snacks', 'garlic-bread', 'Garlic Bread', 'গার্লিক ব্রেড', 'Toasted garlic bread.', 'টোস্টেড গার্লিক ব্রেড।', 200, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-fries', 'cat-snacks', 'fries', 'Fries', 'ফ্রাইস', 'Crispy fries.', 'ক্রিসপি ফ্রাইস।', 220, 1, 1, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-sandwich-chicken', 'cat-snacks', 'sandwich-chicken', 'Sandwich (Chicken)', 'স্যান্ডউইচ (চিকেন)', 'Grilled chicken sandwich.', 'গ্রিলড চিকেন স্যান্ডউইচ।', 320, 1, 0, 1, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-sandwich-veg', 'cat-snacks', 'sandwich-veg', 'Sandwich (Veg)', 'স্যান্ডউইচ (সবজি)', 'Fresh veggie sandwich.', 'তাজা সবজি স্যান্ডউইচ।', 280, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now')),

  ('prod-brownie', 'cat-dessert', 'brownie', 'Brownie', 'ব্রাউনি', 'Fudgy chocolate brownie.', 'চকলেট ব্রাউনি।', 200, 1, 1, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-cheesecake', 'cat-dessert', 'cheesecake', 'Cheesecake', 'চিজকেক', 'Classic cheesecake slice.', 'ক্লাসিক চিজকেক।', 350, 1, 1, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-chocolate-cake', 'cat-dessert', 'chocolate-cake', 'Chocolate Cake', 'চকলেট কেক', 'Moist chocolate cake.', 'নরম চকলেট কেক।', 320, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now')),
  ('prod-tiramisu', 'cat-dessert', 'tiramisu', 'Tiramisu', 'তিরামিসু', 'Coffee-infused tiramisu.', 'কফি স্বাদের তিরামিসু।', 380, 1, 0, 0, 0, NULL, NULL, datetime('now'), datetime('now'));
