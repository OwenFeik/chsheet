CREATE TABLE IF NOT EXISTS sheets (
    id INTEGER PRIMARY KEY,
    sheet JSON,
    updated INTEGER
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(32),
    salt VARCHAR(32),
    hashed_password VARCHAR(128)
);
