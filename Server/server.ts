const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
module.exports = app;

enum validPages {
  "quick-sell" = "quick-sell",
  "prices-status" = "prices-status",
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("client"));
//
app.get("/:page", function (req, res) {
  const askedPage = req.params.page;

  if (Object.keys(validPages).includes(askedPage))
    return res.sendFile(
      path.join(__dirname, "../dist/Public", `${validPages[askedPage]}.js`)
    );

  return res.send({ status: "fail", message: "invalid file name" });
});

app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});
