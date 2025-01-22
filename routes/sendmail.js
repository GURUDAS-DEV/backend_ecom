const express = require("express");
const router = express.Router();
const path = require("path");
const { otpSenderMail } = require("../mail/admin-confirm");
const { enquireMail, quotation_mail } = require("../db/order");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

router.use(express.json());

router.post("/enquiryMail", async (req, res) => {
    try {
      const { email, cart_id } = req.body;
  
      if (!email || !cart_id) {
        return res.status(400).json({
          success: false,
          message: "Email and cart_id are required fields.",
        });
      }
  
      const response = await enquireMail(email, cart_id, "We have received your order enquiry");
  
      if (response) {
        return res.status(200).json({
          success: true,
          message: "Enquiry email sent successfully.",
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to send enquiry email.",
        });
      }
    } catch (error) {
      console.error("Error in /enquiryMail route:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error. Please try again later.",
      });
    }
  }); 

  router.post("/quotationMail", async (req, res) => {
    try {
      const { cart_id, heatshrink, dowells, r3m ,reply} = req.body;
      const urls = [];
  
      // Check if the URLs are non-null and add to the array
      if (heatshrink) urls.push(heatshrink);
      if (dowells) urls.push(dowells);
      if (r3m) urls.push(r3m);
  
      // Call the async function to process and send the email
      const success = await quotation_mail(cart_id, urls, reply);
      if (success) {
        res.status(200).json({ message: "Quotation email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send quotation email" });
      }
    } catch (error) {
      console.error("Error in /quotationMail route:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  

module.exports = router