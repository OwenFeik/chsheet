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

const HASH_SALT_LENGTH = 16;
const HASH_ITERATIONS = 1024;
const HASH_KEYLEN = 64;
const HASH_TYPE = "blake2b512";

const sql;

function init() {
    console.log("Connecting to database.");

    // URL provided through environment variables.
    sql = postgres();
    
    // Run schema file to ensure tables readied.
    (
        async () => {
            console.log("Initialising database schema.")
            await sql.file(SCHEMA_FILE);
        }
    )().then(
        console.log("Initialised database schema.")
    )   
}

function where_string(where) {
    let ret = "";
    for ([k, v] of Object.entries(where)) {
        if (ret) {
            ret += " AND ";
        }
        ret += `${ k } = ${ v }`;
    }

    if (ret) {
        return " WHERE " + ret;
    }
    return "";
}

async function select(table, columns = ["*"], where = null) {
    return await sql`
        SELECT ${ sql(columns) } FROM ${ sql(table) }${ where_string(where) };
    `;
}

async function select_one(table, columns = ["*"], where = null) {
    const [result] = select(table, columns, where);
    return result;
}

async function select_one_column(table, column, where = null) {
    const [result] = select(table, [column], where);
    return result[column];
}

async function insert(table, values) {
    const [record] = await sql`
        INSERT INTO ${ sql(table) } ${ sql(values) } RETURNING *;
    `;
    return record;
}

function create_salt() {
    return crypto.randomBytes(HASH_SALT_LENGTH).toString('hex');
}

function hash_password(password, salt) {
    return crypto.pbkdf2Sync(
        password,
        salt,
        HASH_ITERATIONS,
        HASH_KEYLEN,
        HASH_TYPE
    ).toString('hex');
}

async function check_password(password, username) {
    const [user] = await select(
        "users", ["hashed_password", "salt"], { "username": username }
    );
    return hash_password(password, user.salt) === user.hashed_password;
}

async function create_user(password, username, email=null) {
    const salt = create_salt();
    return await insert(
        "users",
        {
            "username": username,
            "salt": salt,
            "hashed_password": hash_password(password, salt),
            "email": email
        }
    );
}

exports.init = init;
exports.check_password = check_password;
exports.create_user = create_user;
