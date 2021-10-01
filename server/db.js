/**
 * This assumes that the Postgres instance will be available when it is
 * initially run. At time of writing, the docker-compose.yml takes care of this
 * through a health check dependency.
 */

const fs = require("fs");
const path = require("path");

const { Client } = require("pg");

const SCHEMA_FILE = path.join(__dirname, "schema.sql");

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
            client.query(data).then(
                _ => console.log("Successfully ran schema.")
            ).catch(
                e => console.error(
                    "Error while running schema: ", e.stack
                )
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

function column_string(columns) {
    if (columns instanceof Array) {
        return columns.join(", ");
    }
    else if (typeof columns === "string") {
        return columns;
    }
    return "";
}

function select(table, columns = "*", where = null, callback) {
    const [string, params] = where_string(where);
    client.query(
        `SELECT ${column_string(columns)} FROM ${table}${string};`,
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
    select(table, column, where, (err, res) => {
        if (err) {
            callback(err, res);
        }
        else {
            callback(err, res.rows[0][column]);
        }
    });
}

function insert_parameter_string(columns) {
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
        + insert_parameter_string(Object.keys(values))
        + " "
        + " RETURNING *"
        + ";"
    );

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

function update(table, values, where) {
    const columns = Object.keys(values);
    const [where_str, where_params] = where_string(
        where, columns.length
    );
    const params = Object.values(values).concat(where_params);
    const query_string = (
        "UPDATE "
        + table
        + "SET "
        + insert_parameter_string(Object.keys(values))
        + where_str
        + ";"
    );

    client.query(query_string, params);
}

function get_user(username, callback) {
    select_one("users", "*", { "username": username }, callback);
}

function create_user(
    username, salt, hashed_password, recovery_key, email, callback
) {
    insert(
        "users",
        {
            "username": username,
            "salt": salt,
            "hashed_password": hashed_password,
            "recovery_key": recovery_key,
            "email": email
        },
        callback
    );
}

function valid_sheet_title(title) {
    return title.length <= 32;
}

function create_sheet(userid, code, title, sheet, updated, callback) {
    insert(
        "sheets",
        {
            "userid": userid,
            "code": code,
            "title": title,
            "sheet": sheet,
            "updated": updated
        },
        callback
    );
}

function valid_sheet_code(code) {
    return /^[a-z0-9]{32}$/.test(code);
}

function get_sheet(code, callback) {
    select_one("sheets", "*", { "code": code }, callback);
}

function create_user_session(session, callback) {
    insert(
        "user_sessions",
        {
            "userid": session.user_id,
            "session_key": session.session_key,
            "active": session.active,
            "start_time": session.start_time,
            "end_time": session.end_time
        },
        callback
    );
}

exports.init = init;
exports.get_user = get_user;
exports.create_user = create_user;
exports.valid_sheet_title = valid_sheet_title;
exports.create_sheet = create_sheet;
exports.valid_sheet_code = valid_sheet_code;
exports.get_sheet = get_sheet;
exports.create_user_session = create_user_session;
