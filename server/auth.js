const crypto = require("crypto");

const db = require("./db.js");

// Password hashing details
const HASH_SALT_LENGTH = 16;
const HASH_ITERATIONS = 1024;
const HASH_KEYLEN = 64;
const HASH_TYPE = "blake2b512";

// Random key used for password reset
const RECOVERY_KEY_LENGTH = 16;

// Email validation regex, from
// https://github.com/angular/angular/blob/master/packages/forms/src/validators.ts
const EMAIL_REGEX = /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function create_salt(length) {
    return crypto.randomBytes(length).toString('hex');
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
        hash_password(password, salt),
        create_salt(RECOVERY_KEY_LENGTH),
        email,
        callback
    );
}

function check_password(user) {
    return hash_password(password, user.salt) === user.hashed_password;
}

function valid_username(username) {
    return /^[a-z0-9_-]{2,16}$/i.test(username);
}

function valid_password(password) {
    return password.length >= 8;
}

function valid_email(email) {
    return EMAIL_REGEX.test(email);
}

class Session {
    constructor(user_id) {
        this.user = user_id;
        this.session_key = crypto.randomBytes(32).toString("hex");
    }
}

class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    begin(user_id) {
        let new_session = new Session(user_id);
        this.sessions.set(new_session.session_key, new_session);
        return new_session;
    }

    end(session_key) {
        this.sessions.delete(session_key);
    }

    get(session_key) {
        return this.sessions.get(session_key);
    }
}

const session_manager = new SessionManager();

exports.new_user = new_user;
exports.check_password = check_password;
exports.valid_username = valid_username;
exports.valid_password = valid_password;
exports.valid_email = valid_email;
exports.begin_session = session_manager.begin;
exports.end_session = session_manager.end;
exports.get_session = session_manager.get;
