const express = require("express");
const router = express.Router();
const path = require("path");
const { enquiriesDb, updateStatus, quotation, fetchAndCategorizeData, finalizeQuotation, discard } = require("../db/admin");
const { quotation_mail } = require("../db/order");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
router.use(express.json());

router.get("/getEnquiries", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;

        const { datesort, statussort } = req.query;

        const response = await enquiriesDb(page, limit, datesort, statussort);

        res.status(200).json({ success: true, response });
    } catch (error) {
        console.error("Error in /getEnquiries", error);
        res.status(500).json({ success: false, message: "An error occurred while fetching enquiries" });
    }
});

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
        const { details, items } = req.body;

        if (!details || !items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: "Invalid input format. Expected an object with 'details' and 'items'.",
            });
        }

        const { Payment, Validity, Reply } = details;

        if (!Payment || !Validity || !Reply ) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields in 'details' object.",
            });
        }

        const cart_id = items[0]?.cart_id;

        for (const data of items) {
            const { cart_id, order_id, rate, discount, delivery } = data;

            if (!cart_id || !order_id || rate == null || delivery == null) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required fields in one of the items.",
                });
            }

            await quotation(rate, discount, order_id, cart_id, delivery);
        }
        
        const response = await fetchAndCategorizeData(cart_id);
        console.log("heatshrink", response.heatshrink,"dowells",response.dowells, "m3", response.m3)
        const pdf_url= await finalizeQuotation(cart_id, response.heatshrink, response.dowells, response.m3, Payment, Validity);
        const urls = [];

        if (pdf_url?.heatshrinkDetails) urls.push(pdf_url.heatshrinkDetails);
        if (pdf_url?.dowellsDetails) urls.push(pdf_url.dowellsDetails);
        if (pdf_url?.m3Details) urls.push(pdf_url.m3Details);        
        await quotation_mail(cart_id, urls , Reply )
        await updateStatus("Opened", cart_id)
        res.status(200).json({ success: true, message: "quotation sent successfully",urls: urls});
    } catch (error) {
        console.error("Error in /quotation", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while processing the quotations.",
        });
    }
});

router.post("/discard", async (req, res) => {
    try {
        const { edit, order_id, cart_id } = req.body;

        // Determine sku and cat_no based on edit value
        const data = edit.startsWith("3M") 
            ? { sku: edit, cat_no: null } 
            : { sku: null, cat_no: edit };

        // Pass order_id, cart_id, sku, and cat_no to discard function
        const response = await discard(order_id, cart_id, data.sku, data.cat_no);

        res.status(200).json({ success: true, response });
    } catch (error) {
        console.error("Error in /discard", error);
        res.status(500).json({ success: false, message: "An error occurred while discarding item" });
    }
});


module.exports = router;