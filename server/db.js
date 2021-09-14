const path = require("path");
const postgres = require("postgres");

const SCHEMA_FILE = path.join(__dirname, "schema.sql");

const POSTGRES_URL = (
    "postgresql://"
    + process.env.POSTGRES_USER
    + ":"
    + process.env.POSTGRES_PASSWORD
    + "@"
    + process.env.POSTGRES_CONTAINER
    + ":5432/"
    + process.env.POSTGRES_DB
);

console.log("Connecting to", POSTGRES_URL);
const sql = postgres(POSTGRES_URL);

(
    async () => {
        console.log("Initialising database schema.")
        await sql.file(SCHEMA_FILE);
    }
)().then(
    console.log("Initialised database schema.")
)

module.exports = sql;
