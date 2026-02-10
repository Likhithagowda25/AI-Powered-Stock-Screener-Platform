const express = require("express");
const router = express.Router();
const { translateQuery } = require("../controllers/llm.controller");

router.post("/translate", translateQuery);

module.exports = router;