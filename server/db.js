const postgres = require("postgres");

const sql = postgres({
    host: "chsheet_database_1",
    database: "chsheet",
    username: "postgres",
    password: "password"
});

module.exports = sql;
