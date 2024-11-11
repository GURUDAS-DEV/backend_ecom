const express = require("express");
const router = express.Router();
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { storeDataInDb, userDb, processOrderData } = require("../db/order"); 

require("dotenv").config({ path: path.join(__dirname, "../.env") });

router.use(express.json());

const generateSmallId = () => uuidv4().substring(0, 6);

router.post("/order", async (req, res) => {
    try {
        const { sku, quantity } = req.body;

        const uniqueId = generateSmallId();

        await storeDataInDb(sku, quantity, uniqueId);

        res.status(200).json({ id: uniqueId, message: "Data stored successfully" });
    } catch (error) {
        console.error("Error in /order route:", error);
        res.status(500).json({ message: "An error occurred" });
    }
});

router.post("/user", async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const id = await userDb(name, email, phone);
        res.status(200).json({userid:id});
    } catch (error) {
        console.error("Error in /user route:", error);
        res.status(500).json({ message: "An error occurred" });
    }
});

router.post("/create", async (req, res) => {
    try {
        const { userId, uniqueIds } = req.body; // Expecting an array of unique IDs and a userId

        if (!Array.isArray(uniqueIds) || !userId) {
            return res.status(400).json({ message: "Invalid input" });
        }

        // Send the entire array of uniqueIds and userId to processOrderData
        await processOrderData(uniqueIds, userId); // Assuming processOrderData accepts the entire array and userId

        res.status(200).json({ message: "Data processed successfully" });
    } catch (error) {
        console.error("Error in /create route:", error);
        res.status(500).json({ message: "An error occurred" });
    }
});

module.exports = router;
