CREATE TABLE IF NOT EXISTS sheets (
    id SERIAL PRIMARY KEY,
    sheet JSON,
    updated INTEGER
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL,
    salt VARCHAR(32) NOT NULL,
    hashed_password VARCHAR(128) NOT NULL,
    email VARCHAR(256)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
