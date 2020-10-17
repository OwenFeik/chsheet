const http = require("http");
const fs = require("fs");

const content_dir = __dirname.replace("/server", "/content");

http.createServer(function (req, res) {
    fs.readFile(content_dir + req.url, function (err, data) {
      if (err) {
        res.writeHead(404);
        res.end(JSON.stringify(err));
        return;
      }
      res.writeHead(200);
      res.end(data);
    });
}).listen(3000);

console.log("Server running on http://localhost:3000");
