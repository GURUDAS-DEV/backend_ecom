const express = require("express");
const router = express.Router();
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

router.use(express.json());

router.get("/enquiryMail", async(req,res)=>{
    res.send("working")
})

module.exports = router