/**
 * This assumes that the Postgres instance will be available when it is
 * initially run. At time of writing, the docker-compose.yml takes care of this
 * through a health check dependency.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { Client } = require("pg");

/* Contains database schema. */
const SCHEMA_FILE = path.join(__dirname, "schema.sql");

const HASH_SALT_LENGTH = 16;
const HASH_ITERATIONS = 1024;
const HASH_KEYLEN = 64;
const HASH_TYPE = "blake2b512";

const client = new Client();

function init() {
    console.log("Connecting to database.");
    client.connect();

    console.log("Initialising database schema.")
    fs.readFile(SCHEMA_FILE, "utf8", (err, data) => {
        if (err) {
            console.error("Error while loading schema: ", err);
        }
        else {
            client.query(data).catch(
                e => console.error(
                    "Error while running schema: ", e.stack
                )
            ).then(
                _ => console.log("Successfully ran schema.")
            );
        }
    });
}

function where_string(where, i = 1) {
    if (where === null) {
        return ["", []];
    }
    
    let string = "";
    let params = [];
    for ([k, v] of Object.entries(where)) {
        if (string) {
            string += " AND ";
        }
        string += `${k} = $${i}`;
        params.push(v);
    }

    if (string) {
        return [" WHERE " + string, params];
    }
    return ["", []];
}

function select(table, columns = ["*"], where = null, callback) {
    const [string, params] = where_string(where);
    client.query(
        `SELECT ${columns.join(", ")} FROM ${table}${string};`,
        params,
        callback
    );
}

function select_one(table, columns, where, callback) {
    select(table, columns, where, (err, res) => {
        if (err) {
            callback(err, res);
        }
        else {
            callback(err, res.rows[0]);
        }
    });
}

function select_one_column(table, column, where, callback) {
    select(table, [column], where, (err, res) => {
        if (err) {
            callback(err, res);
        }
        else {
            callback(err, res.rows[0][column]);
        }
    });
}

function insert_parameter_string(table, columns) {
    let i = 1;
    let column_string = "";
    let parameterised_string = "";

    columns.forEach(col => {
        column_string += col + ", ";
        parameterised_string += "$" + i.toString() + ", ";
        i++;
    });

    column_string = column_string.slice(0, -2);
    parameterised_string = parameterised_string.slice(0, -2);

    return `(${column_string}) VALUES (${parameterised_string})`;
}

function insert(table, values, callback = null) {
    const query_string = (
        "INSERT INTO "
        + table
        + " "
        + insert_parameter_string(table, Object.keys(values))
        + " "
        + " RETURNING *"
        + ";"
    );
    console.log(query_string);

    const params = Object.values(values);

    if (callback) {
        client.query(query_string, params, (err, res) => {
            if (err) {
                callback(err, res);
            }
            else {
                callback(err, res.rows[0]);
            }
        });
    }
    else {
        client.query(query_string, params);
    }
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

function check_password(password, username, callback) {
    select_one(
        "users",
        ["hashed_password", "salt"],
        { "username": username },
        (err, user) => {
            if (err) {
                callback(false); // On database error, fail authentication.
            }
            else {
                callback(
                    hash_password(password, user.salt) === user.hashed_password
                );
            }
        }
    );
}

function create_user(password, username, email = null, callback = null) {
    const salt = create_salt();
    insert(
        "users",
        {
            "username": username,
            "salt": salt,
            "hashed_password": hash_password(password, salt),
            "email": email
        },
        (err, res) => {
            if (err) {
                console.error("Database error in create_user: ", err.stack);
            }
            else if (callback) {
                callback(res);
            }
        }
    );
}

exports.init = init;
exports.check_password = check_password;
exports.create_user = create_user;
