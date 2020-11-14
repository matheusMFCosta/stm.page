const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
module.exports = app;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("client"));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "../Public", "plg.js"));
});

app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});
