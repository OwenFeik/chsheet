const crypto = require("crypto");

const db = require("./db.js");

// Password hashing details
const HASH_SALT_LENGTH = 16;
const HASH_ITERATIONS = 1024;
const HASH_KEYLEN = 64;
const HASH_TYPE = "blake2b512";

// Random key used for password reset
const RECOVERY_KEY_LENGTH = 16;

// Validation constants
const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 16;
const USERNAME_VALIDATION_REGEX = new RegExp(
    `^[a-z0-9_-]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`, "i"
);
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 256;

const SESSION_KEY_LENGTH = 32;

// Email validation regex, from
// https://github.com/angular/angular/blob/master/packages/forms/src/validators.ts
const EMAIL_REGEX = /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function create_salt(length = HASH_SALT_LENGTH) {
    return crypto.randomBytes(length).toString('hex');
}

function valid_salt(salt, length) {
    return (
        typeof salt === "string"
        && salt.length === length
        && /^[a-z0-9]+$/.test(salt)
    );
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

function new_user(username, password, email = null, callback = null) {
    let salt = create_salt(HASH_SALT_LENGTH);
    db.create_user(
        username,
        salt,
        hash_password(password, salt),
        create_salt(RECOVERY_KEY_LENGTH),
        email,
        callback
    );
}

function reset_password(user, new_password, callback) {
    let salt = create_salt(HASH_SALT_LENGTH);
    db.change_user_password(
        user.id,
        salt,
        hash_password(new_password, salt),
        create_salt(RECOVERY_KEY_LENGTH),
        (err, updated_user) => {
            session_manager.end_user_sessions(
                user.id,
                () => callback(err, updated_user)
            );
        }
    );
}

function check_password(password, user) {
    return hash_password(password, user.salt) === user.hashed_password;
}

function valid_username(username) {
    return USERNAME_VALIDATION_REGEX.test(username);
}

function valid_password(password) {
    return (
        password.length >= PASSWORD_MIN_LENGTH
        && password.length <= PASSWORD_MAX_LENGTH
    );
}

function valid_email(email) {
    // Note: email is not currently a compulsory field, so null is acceptable.
    // However if an email is supplied it must be valid.
    return email === null || EMAIL_REGEX.test(email);
}

function valid_session_key(session_key) {
    return valid_salt(session_key, SESSION_KEY_LENGTH * 2);
}

class Session {
    constructor(
        userid,
        session_key = null,
        active = true,
        start_time = null,
        end_time = null,
        id = null
    ) {
        this.id = id;
        this.userid = userid;
        this.session_key = session_key || create_salt(SESSION_KEY_LENGTH);
        this.active = active;
        this.start_time = start_time || new Date().getTime();
        this.end_time = end_time;

        if (session_key === null) {
            this.store();
        }
    }

    store() {
        db.create_user_session(this, (err, record) => {
            if (!err) {
                this.id = record.id;
            }
            else {
                console.error("Failed to store user session: ", err);
            }
        });
    }

    end() {
        this.active = false;
        this.end_time = new Date().getTime();

        db.end_user_session(this.id, this.end_time);
    }

    static from_record(record) {
        return new Session(
            record.userid,
            record.session_key,
            record.active,
            record.start_time,
            record.end_time,
            record.id
        );
    }
}

class SessionManager {
    static MAX_CACHED_SESSIONS = 100000;

    constructor() {
        this.sessions = new Map();
    }

    begin(userid) {
        let new_session = new Session(userid);
        this.cache(new_session);
        return new_session;
    }

    end(session_key) {
        this.get(session_key, (err, session) => {
            if (err) {
                console.log("Error ending session: ", err);
            }
            else {
                session.end();
                this.sessions.delete(session_key);    
            }
        });
    }

    end_user_sessions(userid, callback) {
        db.end_user_sessions(userid, (err, res) => {
            if (err) {
                console.log("Error ending sessions: ", err);
            }
            else {
                res.rows.forEach(session => {
                    this.sessions.delete(session.session_key);
                });
            }

            callback();
        });
    }

    trim_cache() {
        if (this.sessions.size > SessionManager.MAX_CACHED_SESSIONS) {
            let n = this.sessions.size - SessionManager.MAX_CACHED_SESSIONS;
            let remove_from_cache = [];
            for (session_key of this.sessions.keys()) {
                remove_from_cache.push(session_key);
                if (remove_from_cache.length === n) {
                    break;
                }
            }

            remove_from_cache.forEach(session_key => {
                this.sessions.delete(session_key);
            });
        }
    }

    cache(session) {
        this.sessions.set(session.session_key, session);
        this.trim_cache();
    }

    get(session_key, callback) {
        if (this.sessions.has(session_key)) {
            callback(null, this.sessions.get(session_key));
            return;
        }

        db.get_user_session(session_key, (err, record) => {
            if (err || !record) {
                callback(err, null);
            }
            else {
                let session = Session.from_record(record);
                this.cache(session);
                callback(err, session);
            }
        });
    }
}

const session_manager = new SessionManager();

exports.create_salt = create_salt;
exports.new_user = new_user;
exports.reset_password = reset_password;
exports.check_password = check_password;
exports.valid_username = valid_username;
exports.valid_password = valid_password;
exports.valid_email = valid_email;
exports.valid_session_key = valid_session_key;
exports.begin_session = userid => session_manager.begin(userid);
exports.end_session = (session_key, callback) => session_manager.end(
    session_key, callback
);
exports.get_session = (session_key, callback) => session_manager.get(
    session_key, callback
);
