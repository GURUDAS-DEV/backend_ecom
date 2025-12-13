const express = require("express");
const router = express.Router();
const path = require("path");
const { otpSenderMail } = require("../mail/admin-confirm");
const { enquireMail, quotation_mail } = require("../db/order");
require("dotenv").config();  // works locally, ignored on Railway


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
  
module.exports = router