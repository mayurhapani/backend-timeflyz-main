const express = require("express");
const router = express.Router();

const { createGuest } = require("../../controllers/v1/guest/guest.controller");

router.post("/create", createGuest);

module.exports = router;
