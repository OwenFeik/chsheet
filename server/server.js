const express = require("express");

const db = require("./db.js");
const auth = require("./auth.js");

const CONTENT_ROOT = __dirname.replace("/server", "/content");

db.init();

const app = express();

app.use(express.static(CONTENT_ROOT));

app.use(express.json());

app.post("/login", (req, res) => {
    if (!(req.body.user && req.body.password)) {
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
            res.writeHead(200);
            res.end({
                success: false,
                reason: "User does not exist."
            });
            return;
        }

        if (auth.check_password(user)) {
            res.writeHead(200);
            res.end({
                success: true,
                session_key: auth.begin_session(user.id).session_key
            });
        }
        else {
            res.writeHead(200);
            res.end({
                success: false,
                reason: "Incorrect password."
            });
        }
    });
});

app.post("/register", (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let email = req.body.email;

    if (!(username && password)) {
        res.writeHead(400);
        res.end();
        return;
    }

    if (!auth.valid_username(username)) {
        res.writeHead(200);
        res.end({
            success: false,
            reason: "Invalid username."
        });
    }

    if (!auth.valid_email(email)) {
        res.writeHead(200);
        res.end({
            success: false,
            reason: "Invalid email."
        })
    }

    db.get_user(username, (err, user) => {
        if (err) {
            database_error(res);
            return;
        }

        if (user !== undefined) {
            res.writeHead(200);
            res.end({
                success: false,
                reason: "User already exists."
            });
            return;
        }

        if (!auth.valid_password(password)) {
            res.writeHead(200);
            res.end({
                success: false,
                reason: "Invalid password."
            });
            return;
        }

        auth.new_user(username, password, email, (err, user) => {
            if (err) {
                database_error(res);
                return;
            }

            res.writeHead(200);
            res.end({
                success: true,
                recovery_key: user.recovery_key,
                session_key: auth.begin_session(user.id)
            });
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
        res.writeHead(200);
        res.end({
            success: false,
            reason: "Invalid sheet title."
        });
        return;
    }

    let user_id;
    let session = auth.get_session(req.body.session_key);
    if (session) {
        user_id = session.user;
    }
    else {
        res.writeHead(401);
        res.end({
            success: false,
            reason: "Session key invalid."
        });
        return;
    }

    db.create_sheet(
        user_id,
        title,
        sheet,
        new Date().getTime(),
        (err, record) => {
            if (err) {
                database_error(res);
                return;
            }
            else {
                res.writeHead(200);
                res.end({
                    success: true,
                    sheet: record.id_hash,
                    updated: record.updated  
                });
            }
        }
    );
});

app.get("/load", (req, res) => {    
    let id_hash = req.body.sheet_id_hash;

    if (!db.valid_id_hash(id_hash)) {
        res.writeHead(200);
        res.end({
            success: false,
            reason: "Invalid sheet id hash."
        });
        return;
    }

    db.get_sheet(id_hash, (err, record) => {
        if (err) {
            database_error(res);
            return;
        }

        if (record) {
            res.writeHead(200);
            res.end({
                success: true,
                title: record.title,
                sheet: record.sheet,
                updated: record.updated
            });    
        }
        else {
            res.writeHead(404);
            res.end({
                success: false,
                reason: "Sheet not found."
            });
        }
    });
});

app.listen(8080);
console.log("Server running on http://localhost:8080");

function database_error(res) {
    res.writeHead(500);
    res.end({
        success: false,
        reason: "Database error"
    });
}
