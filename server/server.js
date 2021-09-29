const cookieParser = require("cookie-parser");
const express = require("express");

const db = require("./db.js");
const auth = require("./auth.js");

const CONTENT_ROOT = __dirname.replace("/server", "/content");

const COOKIE_OPTIONS = {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 1 month
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

app.post("/save", (req, res) => {
    let session_key = req.body.session_key;
    let sheet = req.body.sheet;
    let title = req.body.title;

    if (!(session_key && sheet && title)) {
        res.writeHead(400);
        return;
    }

    if (!db.valid_sheet_title(title)) {
        respond(res, 200, { success: false, reason: "Invalid sheet title." });
        return;
    }

    let user_id;
    let session = auth.get_session(req.body.session_key);
    if (session) {
        user_id = session.user;
    }
    else {
        respond(res, 401, { success: false, reason: "Session key invalid." });
        return;
    }

    db.create_sheet(
        user_id,
        auth.create_salt(),
        title,
        sheet,
        new Date().getTime(),
        (err, record) => {
            if (err) {
                database_error(res);
                return;
            }
            else {
                respond(
                    res,
                    200,
                    {
                        success: true,
                        sheet: record.code,
                        updated: record.updated
                    }
                );
            }
        }
    );
});

app.get("/load", (req, res) => {    
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
                    title: record.title,
                    sheet: record.sheet,
                    updated: record.updated
                }
            );
        }
        else {
            respond(res, 404, { success: false, reason: "Sheet not found." });
        }
    });
});

app.listen(8080);
console.log("Server running on http://localhost:8080");

function database_error(res) {
    respond(res, 500, { success: false, reason: "Database error." });
}

function respond(res, code, body) {
    res.writeHead(code);
    res.end(JSON.stringify(body));
}
