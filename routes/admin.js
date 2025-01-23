const express = require("express");
const router = express.Router();
const path = require("path");
const { enquiriesDb, updateStatus, quotation, fetchAndCategorizeData, finalizeQuotation } = require("../db/admin");
const { quotation_mail } = require("../db/order");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
router.use(express.json());

router.get("/getEnquiries", async (req, res) => {
    try {
        // Fetch page and limit from query params (default to page 1, limit 15)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;

        // Fetch sorting options from query params
        const { datesort, statussort } = req.query;

        // Call the database function to get the enquiries with pagination and sorting
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

        // Validate that `details` and `items` are present and correctly formatted
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

            // Assuming `quotation` is a function that processes each item
            await quotation(rate, discount, order_id, cart_id, delivery);
        }

        // Assuming `fetchAndCategorizeData` and `finalizeQuotation` are functions that process and finalize the response
        const response = await fetchAndCategorizeData(cart_id);
        console.log("heatshrink", response.heatshrink,"dowells",response.dowells, "m3", response.m3)
        const pdf_url= await finalizeQuotation(cart_id, response.heatshrink, response.dowells, response.m3, Payment, Validity);
        const urls = [];
  
        // Check if the URLs are non-null and add to the array
        if (pdf_url.heatshrinkDetails) urls.push(pdf_url.heatshrinkDetails);
        if (pdf_url.dowellsDetails) urls.push(pdf_url.dowellsDetails);
        if (pdf_url.m3Details) urls.push(pdf_url.m3Details);
        await quotation_mail(cart_id, urls , Reply )
        res.status(200).json({ success: true, message: "quotation sent successfully"});
    } catch (error) {
        console.error("Error in /quotation", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while processing the quotations.",
        });
    }
});




module.exports = router;