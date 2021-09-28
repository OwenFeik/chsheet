CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username CITEXT UNIQUE NOT NULL,
    salt CHAR(32) NOT NULL,
    hashed_password CHAR(128) NOT NULL,
    recovery_key CHAR(32) NOT NULL,
    email VARCHAR(256)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS sheets (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users,
    title VARCHAR(32) NOT NULL,
    sheet JSON NOT NULL,
    updated INTEGER NOT NULL,
    id_hash CHAR(32) GENERATED ALWAYS AS (MD5((id + userid)::TEXT)) STORED
);

CREATE INDEX IF NOT EXISTS idx_sheets_id_hash ON sheets(id_hash);
