PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN username TEXT;

UPDATE users SET username = phone WHERE username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
