CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username CITEXT UNIQUE NOT NULL,
    salt CHAR(32) NOT NULL,
    hashed_password CHAR(128) NOT NULL,
    recovery_key CHAR(32) NOT NULL,
    email VARCHAR(256),
    created BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    userid INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    session_key CHAR(64) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    start_time BIGINT NOT NULL,
    end_time BIGINT
);

CREATE INDEX IF NOT EXISTS
    idx_user_sessions_session_key ON user_sessions(session_key);

CREATE TABLE IF NOT EXISTS sheets (
    id SERIAL PRIMARY KEY,
    code CHAR(32) NOT NULL,
    userid INTEGER REFERENCES users ON DELETE SET NULL,
    title VARCHAR(32) NOT NULL,
    sheet JSON NOT NULL,
    created BIGINT NOT NULL,
    updated BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sheets_code ON sheets(code);
