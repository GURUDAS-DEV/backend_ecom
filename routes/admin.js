const express = require("express");
const router = express.Router();
const path = require("path");
const { enquiriesDb, updateStatus, quotation, fetchAndCategorizeData, finalizeQuotation } = require("../db/admin");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
router.use(express.json());

router.get("/getEnquiries", async(req,res)=>{
    try {
        const response = await enquiriesDb()
        if(response)
        res.status(200).json({success: true, response})
    } catch (error) {
        console.error("error in /getEnquiries", error);
        res.status(500).json({success: false, message:"An error occured while fetching enquiries"})
    }
})

router.post("/statusUpdate", async(req,res)=>{
    try {
        const {status, cart_id} = req.body
        const response = await updateStatus(status, cart_id);
        res.status(200).json({success:true,response})
    } catch (error) {
        console.error("error in /statusUpdate", error);
        res.status(500).json({success: false, message:"An error occured while updating status"})
    }
})

router.post("/quotation", async (req, res) => {
    try {
        const dataArray = req.body; 
        if (!Array.isArray(dataArray)) {
            return res.status(400).json({ success: false, message: "Invalid input format. Expected an array of objects." });
        }
        console.log("dataarray", dataArray)
        const cart_id = dataArray[0]?.cart_id;
        console.log(cart_id)
        for (const data of dataArray) {
            console.log("data", data)
            const { cart_id, order_id, rate, discount } = data;

            if (!cart_id || !order_id || rate == null || discount == null) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required fields in one of the objects",
                });
            }

             await quotation(rate, discount, order_id, cart_id);
        }
        const response = await  fetchAndCategorizeData(cart_id)
        console.log("Response from fetchAndCategorizeData:", response);
        const final_response = await finalizeQuotation(cart_id, response.heatshrink)
        res.status(200).json({ success: true, final_response });
    } catch (error) {
        console.error("Error in /quotation", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while processing the quotations.",
        });
    }
});


module.exports = router;