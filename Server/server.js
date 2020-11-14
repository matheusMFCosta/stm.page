const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
module.exports = app;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("client"));

console.log(path.join(__dirname, "../Public", "plg.js"));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "../Public", "plg.js"));
});

// GET method route
app.get("/sampleRoute", function (req, res) {
  res.send("GET request to the homepage");
});

// POST method route
app.post("/sampleRoute", function (req, res) {
  res.send("POST request to the homepage");
});

var port = process.env.PORT || 4040;
app.listen(port);
console.log("Listening on port " + port);

app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});
