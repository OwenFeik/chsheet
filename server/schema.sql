CREATE TABLE IF NOT EXISTS sheets (
    id INTEGER PRIMARY KEY,
    sheet JSON,
    updated INTEGER
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL,
    salt VARCHAR(32) NOT NULL,
    hashed_password VARCHAR(128) NOT NULL,
    email VARCHAR(256),
);

CREATE INDEX IF NOT EXISTS ON users(username);
