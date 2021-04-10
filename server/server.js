const http = require("http");
const fs = require("fs");
const path = require("path");

const postgres = require("postgres");

const sql = postgres();

const CONTENT_ROOT = __dirname.replace("/server", "/content");

function validate_file_name(string) {
    if (string.indexOf("\0") !== -1)
        return false;
    if (!/^[a-z0-9/._]+$/.test(string))
        return false;
    return true;
}

http.createServer(function (req, res) {
    let target = path.join(
        CONTENT_ROOT,
        (req.url === "/" ? "/index.html" : req.url)
    ); 

    if (!validate_file_name(target)) {
        res.writeHead(400);
        res.end("<h1>400 Bad Request: Invalid filename.</h1>");
        return;
    }

    if (target.indexOf(CONTENT_ROOT) !== 0) {
        res.writeHead(403);
        res.end("<h1>403 Forbidden: No access rights.</h1>");
        return;
    }
 
    fs.readFile(target, function (err, data) {
        if (err) {
            res.writeHead(404);
            res.end("<h1>404 Not Found: Content doesn't exist.</h1>");
            return;
        }
        res.writeHead(200);
        res.end(data);
    });
}).listen(8080);

console.log("Server running on http://localhost:8080");
