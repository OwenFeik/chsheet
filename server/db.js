/**
 * This assumes that the Postgres instance will be available when it is
 * initially run. At time of writing, the docker-compose.yml takes care of this
 * through a health check dependency.
 */

const crypto = require("crypto");
const path = require("path");

const postgres = require("postgres");

/* Contains database schema. */
const SCHEMA_FILE = path.join(__dirname, "schema.sql");

/* Postgres instance, in other container */
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

const HASH_SALT_LENGTH = 16;
const HASH_ITERATIONS = 1024;
const HASH_KEYLEN = 64;
const HASH_TYPE = "blake2b512";

const sql;

const init = () => {
    console.log("Connecting to", POSTGRES_URL);
    sql = postgres(POSTGRES_URL);
    
    (
        async () => {
            console.log("Initialising database schema.")
            await sql.file(SCHEMA_FILE);
        }
    )().then(
        console.log("Initialised database schema.")
    )   
};
exports.init = init;

const create_salt = () => {
    return crypto.randomBytes(HASH_SALT_LENGTH).toString('hex');
};

const hash_password = (plaintext, salt) => {
    return crypto.pbkdf2Sync(
        plaintext,
        salt,
        HASH_ITERATIONS,
        HASH_KEYLEN,
        HASH_TYPE
    ).toString('hex');
};
