const express = require("express");

const router = express.Router();

// Display the dashboard page
router.get("/", (req, res) => {
  res.render("loginPage");
});

module.exports = router;
