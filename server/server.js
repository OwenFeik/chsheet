const cookieParser = require("cookie-parser");
const express = require("express");

const db = require("./db.js");
const auth = require("./auth.js");

const CONTENT_ROOT = __dirname.replace("/server", "/content");

const COOKIE_OPTIONS = {
    maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
    sameSite: "lax"
};

db.init();

const app = express();

app.use(express.static(CONTENT_ROOT));
app.use(express.json());
app.use(cookieParser());

app.post("/login", (req, res) => {
    if (!(req.body.username && req.body.password)) {
        res.writeHead(400);
        res.end();
        return;
    }

    db.get_user(req.body.username, (err, user) => {
        if (err) {
            database_error(res);
            return;
        }

        if (user === undefined) {
            respond(
                res, 200, { success: false, reason: "User does not exist." }
            );
            return;
        }

        if (auth.check_password(req.body.password, user)) {
            const session_key = auth.begin_session(user.id).session_key;
            res.cookie("session_key", session_key, COOKIE_OPTIONS);
            res.cookie("username", req.body.username, COOKIE_OPTIONS);
            respond(
                res,
                200,
                {
                    success: true,
                    username: req.body.username
                }
            );
        }
        else {
            respond(
                res,
                200,
                { success: false, reason: "Incorrect password." }
            );
        }
    });
});

app.post("/logout", (req, res) => {
    if (!req.cookies.session_key) {
        respond(res, 200, { success: true });
        return;
    }

    res.clearCookie("session_key");
    res.clearCookie("username");
    auth.end_session(req.cookies.session_key);
    respond(res, 200, { success: true });
});

app.post("/register", (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let email = req.body.email;

    if (!(username && password)) {
        res.writeHead(400);
        return;
    }

    if (!auth.valid_username(username)) {
        respond(res, 200, { success: false, reason: "Invalid username." });
        return;
    }

    if (!auth.valid_email(email)) {
        respond(res, 200, { success: false, reason: "Invalid email." });
        return;
    }

    db.get_user(username, (err, user) => {
        if (err) {
            database_error(res);
            return;
        }

        if (user !== undefined) {
            respond(
                res, 200, { success: false, reason: "User already exists." }
            );
            return;
        }

        if (!auth.valid_password(password)) {
            respond(res, 200, { success: false, reason: "Invalid password." }); 
            return;
        }

        auth.new_user(username, password, email, (err, user) => {
            if (err) {
                database_error(res);
                return;
            }

            const session_key = auth.begin_session(user.id).session_key;
            res.cookie("session_key", session_key, COOKIE_OPTIONS);
            res.cookie("username", req.body.username, COOKIE_OPTIONS);

            respond(
                res,
                200,
                {
                    success: true,
                    recovery_key: user.recovery_key
                }
            );
        });
    });
});

app.post("/reset", (req, res) => {
    let username = req.body.username;
    let new_password = req.body.new_password;
    let recovery_key = req.body.recovery_key;

    if (!(username && new_password && recovery_key)) {
        res.writeHead(400);
        return;
    }

    if (!auth.valid_password(new_password)) {
        respond(res, 200, { success: false, reason: "Invalid password." });
    }

    db.get_user(username, (err, user) => {
        if (err) {
            database_error(res);
            return;
        }

        if (!user) {
            respond(res, 200, { success: false, reason: "User doesn't exist."});            
            return;
        }

        if (user.recovery_key !== recovery_key) {
            respond(
                res, 200, { success: false, reason: "Incorrect recovery key."}
            );
            return;
        }

        auth.reset_password(user, new_password, (err, updated_user) => {
            if (err) {
                database_error(res);
                return;
            }

            let session = auth.begin_session(updated_user.id);
            res.cookie("session_key", session.session_key, COOKIE_OPTIONS);
            res.cookie("username", updated_user.username, COOKIE_OPTIONS);

            respond(
                res,
                200,
                {
                    success: true,
                    recovery_key: updated_user.recovery_key,
                    session_key: session.session_key
                }
            );
        });
    });
});

function update_sheet(res, userid, code, sheet, updated, overwrite) {
    db.get_sheet(code, (err, record) => {
        if (err) {
            database_error(res);
            return;
        }

        if (record.userid !== userid) {
            respond(
                res,
                401,
                { success: false, reason: "Sheet belongs to a different user." }
            );
            return;
        }

        if (record.updated > updated) {
            if (overwrite) {
                // We'll overwrite the newer sheet, so now is the latest update.
                updated = new Date().getTime();
            }
            else {
                respond(
                    res,
                    200,
                    {
                        success: false,
                        reason: "Server has more recent version."
                    }
                );
                return;
            }
        }

        db.update_sheet(code, sheet, updated, (err, updated_record) => {
            if (err) {
                database_error(res);
                return;
            }

            if (updated_record) {
                respond(res, 200, { success: true, time: updated });
            }
            else {
                respond(
                    res,
                    200,
                    { success: false, reason: "Sheet deleted during update." }
                );
            }
        });
    });
}

function create_sheet(res, userid, title, sheet, updated, overwrite) {
    db.check_title_exists(userid, title, (err, record) => {
        if (err) {
            database_error(res);
            return;
        }

        if (record) {
            if (overwrite) {
                db.update_sheet(
                    record.code,
                    sheet,
                    updated,
                    (err, record) => {
                        if (err) {
                            database_error(res);
                        }
                        else {
                            respond(
                                res,
                                200,
                                {
                                    success: true,
                                    code: record.code,
                                    time: record.updated
                                }
                            );
                        }
                    }
                );
            }
            else {
                respond(
                    res,
                    200,
                    {
                        success: false,
                        reason: "Title in use.",
                        code: record.code
                    }
                );  
            }
            return;
        }
        
        db.create_sheet(
            userid,
            auth.create_salt(),
            title,
            sheet,
            updated,
            (err, record) => {
                if (err) {
                    database_error(res);
                }
                else {
                    respond(
                        res,
                        200,
                        {
                            success: true,
                            code: record.code,
                            time: record.updated
                        }
                    );
                }
            }
        );    
    });
}

app.post("/save", (req, res) => {
    let session_key = req.body.session_key;
    let code = req.body.code;
    let sheet = req.body.sheet;
    let title = req.body.title;
    let updated = req.body.updated;
    let overwrite = req.body.overwrite || false;

    if (!(session_key && sheet && updated && (title || code))) {
        res.writeHead(400);
        return;
    }

    if (title && !db.valid_sheet_title(title)) {
        respond(res, 200, { success: false, reason: "Invalid sheet title." });
        return;
    }

    if (code && !db.valid_sheet_code(code)) {
        respond(res, 200, { success: false, reason: "Invalid sheet code." });
        return;
    }

    if (!db.valid_sheet_updated(updated)) {
        // If no updated time provided or invalid time provided, assume updated
        // presently.
        updated = new Date().getTime();
    }

    session_handling(res, session_key, session => {
        if (code) {
            update_sheet(res, session.userid, code, sheet, updated, overwrite);
        }
        else {
            create_sheet(res, session.userid, title, sheet, updated);
        }
    });
});

app.get("/load", (req, res) => {    
    // Allow loading of single sheets without authentication, this allows one
    // to share their sheet by url.
    let code = req.body.sheet_code;

    if (!db.valid_code(code)) {
        respond(res, 200, { success: false, reason: "Invalid sheet id hash." });
        return;
    }

    db.get_sheet(code, (err, record) => {
        if (err) {
            database_error(res);
            return;
        }

        if (record) {
            respond(
                res,
                200,
                {
                    success: true,
                    code: record.code,
                    title: record.title,
                    sheet: record.sheet,
                    time: record.updated
                }
            );
        }
        else {
            respond(res, 404, { success: false, reason: "Sheet not found." });
        }
    });
});

app.get("/loadall", (req, res) => {
    session_handling(res, req.body.session_key, session => {
        db.get_all_sheets(session.userid, (err, records) => {
            if (err) {
                database_error(err);
                return;
            }

            let sheets = records.map(record => {
                return {
                    code: record.code,
                    title: record.title,
                    sheet: record.sheet,
                    time: record.updated
                };
            });

            respond(res, 200, { success: true, sheets: sheets });
        });
    });
});

app.listen(8080);
console.log("Server running on http://localhost:8080");

// Respond to a request with the supplied status code and JSON body.
function respond(res, code, body) {
    res.writeHead(code);
    res.end(Object.assign(JSON.stringify(body), { status: code }));
}

// Generic response for if a database error occurs.
function database_error(res) {
    respond(res, 500, { success: false, reason: "Database error." });
}

// Checks if a session key has the right format, returning true if so or
// responding to the request as such if not.
function validate_session_key(res, session_key) {
    if (auth.valid_session_key(session_key)) {
        return true;
    }
    respond(res, 200, { success: false, reason: "Invalid session key." });
    return false;
}

// Attempts to get the session for a given session key, calling callback with
// the session if successful or responding to the request with an appropriate
// message if not.
function session_handling(res, session_key, callback) {
    if (validate_session_key(res, session_key)) {
        auth.get_session(session_key, (err, session) => {
            if (err) {
                database_error(res);
            }
            else if (session) {
                callback(session);
            }
            else {
                respond(
                    res, 401, { success: false, reason: "Session expired." }
                );
            }
        });
    }
}
