/**
 * This assumes that the Postgres instance will be available when it is
 * initially run. At time of writing, the docker-compose.yml takes care of this
 * through a health check dependency.
 */

const path = require("path");
const postgres = require("postgres");


/* Connect to the Postgres instance, in other container */
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

/* Run schema.sql to ensure that it's up to date. */
const SCHEMA_FILE = path.join(__dirname, "schema.sql");
(
    async () => {
        console.log("Initialising database schema.")
        await sql.file(SCHEMA_FILE);
    }
)().then(
    console.log("Initialised database schema.")
)

/* Functions exposed for access from importing files. */
const expose = {};
module.exports = expose;
