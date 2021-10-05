/**
 * This assumes that the Postgres instance will be available when it is
 * initially run. At time of writing, the docker-compose.yml takes care of this
 * through a health check dependency.
 */

const fs = require("fs");
const path = require("path");

const { Client } = require("pg");

// Interval in which to retry connecting to the database, seconds
const CONNECTION_RETRY_INTERVAL = 2;

// Database schema file
const SCHEMA_FILE = path.join(__dirname, "schema.sql");

var client;


function new_client() {
    client = new Client();
    client.on("error", err => console.error(err));    
}

function init() {
    console.log("Connecting to database.");
    new_client();
    client.connect(err => {
        if (err) {
            console.log(err);
            console.log("Failed to connect to database.");
            console.log(
                `Waiting ${CONNECTION_RETRY_INTERVAL} seconds and retrying.`
            );
            setTimeout(init, CONNECTION_RETRY_INTERVAL * 1000);        
        }
        else {
            console.log("Database connection established.");
            console.log("Initialising database schema.");
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

function update_parameter_string(columns) {
    let ret = "";
    let i = 1;
    columns.forEach(column => {
        ret += column + " = $" + i.toString() + ", ";
        i += 1;
    });
    
    return " SET " + ret.slice(0, -2);
}

function update(table, values, where, callback) {
    const columns = Object.keys(values);
    const [where_str, where_params] = where_string(
        where, columns.length + 1
    );
    const params = Object.values(values).concat(where_params);
    const query_string = (
        "UPDATE "
        + table
        + update_parameter_string(Object.keys(values))
        + where_str
        + " RETURNING *;"
    );

    if (callback) {
        client.query(query_string, params, callback);
    }
    else {
        client.query(query_string, params);
    }
}

function update_one(table, values, where, callback) {
    update(table, values, where, (err, res) => {
        if (err) {
            callback(err, res);
        }
        else {
            callback(err, res.rows[0]);
        }
    });
}

/* End database functionality */
/* Begin user related functions */

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
            "email": email,
            "created": new Date().getTime()
        },
        callback
    );
}

function change_user_password(
    id, new_salt, new_hashed_password, new_recovery_key, callback
) {
    update_one(
        "users",
        {
            "salt": new_salt,
            "hashed_password": new_hashed_password,
            "recovery_key": new_recovery_key
        },
        { "id": id },
        callback
    );
}

/* End user related functions */
/* Begin sheet related functions */

function valid_sheet_title(title) {
    return title.length > 0 && title.length <= 32;
}

function valid_sheet_code(code) {
    return /^[a-z0-9]{32}$/.test(code);
}

function valid_sheet_updated(updated) {
    // 16e11 ~ 13/09/2020, roughly valid date range.
    return (typeof updated === "number") && updated > 16e11;
}

function create_sheet(userid, code, title, sheet, updated, callback) {
    insert(
        "sheets",
        {
            "userid": userid,
            "code": code,
            "title": title,
            "sheet": sheet,
            "created": new Date().getTime(),
            "updated": updated
        },
        callback
    );
}

function update_sheet(code, sheet, updated, callback) {
    /* We update based on both userid and code to ensure that only the owner 
        of a sheet can update it. */
    update_one(
        "sheets",
        {
            "sheet": sheet,
            "updated": updated
        },
        {
            "code": code
        },
        callback
    );
}

function get_sheet(code, callback) {
    select_one("sheets", "*", { "code": code }, callback);
}

function check_title_exists(userid, title, callback) {
    select("sheets", "*", {"userid": userid, "title": title}, callback);
}

/* End sheet related functions */
/* Begin user session related functions */

function create_user_session(session, callback) {
    insert(
        "user_sessions",
        {
            "userid": session.userid,
            "session_key": session.session_key,
            "active": session.active,
            "start_time": session.start_time,
            "end_time": session.end_time
        },
        callback
    );
}

function end_user_session(id, end_time) {
    update(
        "user_sessions",
        { "active": false, "end_time": end_time },
        { "id": id }
    );
}

function end_user_sessions(userid, callback) {
    update(
        "user_sessions",
        { "active": false, "end_time": new Date().getTime() },
        { "userid": userid },
        callback
    );
}

function get_user_session(session_key, callback) {
    select_one(
        "user_sessions",
        "*",
        { "session_key": session_key },
        callback
    );
}

/* End user session related functions */

exports.init = init;
exports.get_user = get_user;
exports.create_user = create_user;
exports.change_user_password = change_user_password;
exports.valid_sheet_title = valid_sheet_title;
exports.valid_sheet_code = valid_sheet_code;
exports.valid_sheet_updated = valid_sheet_updated;
exports.create_sheet = create_sheet;
exports.update_sheet = update_sheet;
exports.get_sheet = get_sheet;
exports.check_title_exists = check_title_exists;
exports.create_user_session = create_user_session;
exports.end_user_session = end_user_session;
exports.end_user_sessions = end_user_sessions; 
exports.get_user_session = get_user_session;
